<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use App\Models\CurrencyRate;
use App\Models\Branch;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use App\Helpers\AuthHelper;

class CurrencyController extends Controller
{
    /**
     * Resolve the branch_id for the current user.
     */
    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();

        if ($user instanceof SuperAdmin) {
            return $request->input('branch_id') ? (int) $request->input('branch_id') : null;
        }

        if (AuthHelper::isCompanyAdmin()) {
            return $request->input('branch_id') ? (int) $request->input('branch_id') : null;
        }

        return AuthHelper::getBranchId();
    }

    /**
     * List all currencies for the branch
     * GET /currencies
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['currencies', 'view']);

        $branchId = $this->resolveBranchId($request);

        $query = Currency::with(['latestRate'])
            ->where('branch_id', $branchId);

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('symbol', 'like', "%{$search}%");
            });
        }

        // Active filter
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = $request->per_page ?? 25;
        $currencies = $query->orderBy('code')->paginate($perPage);

        // Get base currency ID for this branch
        $branch = Branch::find($branchId);
        $baseCurrencyId = $branch ? $branch->base_currency_id : null;

        // Append is_base flag to each currency
        $currencies->getCollection()->transform(function ($currency) use ($baseCurrencyId) {
            $currency->is_base = $currency->id === $baseCurrencyId;
            return $currency;
        });

        return response()->json([
            'success' => true,
            'data' => $currencies->items(),
            'meta' => [
                'current_page' => $currencies->currentPage(),
                'last_page' => $currencies->lastPage(),
                'per_page' => $currencies->perPage(),
                'total' => $currencies->total(),
                'from' => $currencies->firstItem(),
                'to' => $currencies->lastItem(),
            ],
            'base_currency_id' => $baseCurrencyId,
        ]);
    }

    /**
     * Store a new currency
     * POST /currencies
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['currencies', 'create']);

        $branchId = $this->resolveBranchId($request);

        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'Branch is required.',
            ], 422);
        }

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:10',
                Rule::unique('currencies')->where(fn ($q) => $q->where('branch_id', $branchId)),
            ],
            'name' => 'required|string|max:255',
            'symbol' => 'nullable|string|max:10',
            'decimal_places' => 'nullable|integer|min:0|max:6',
            'position' => 'nullable|in:before,after',
            'rounding' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'initial_rate' => 'nullable|numeric|min:0',
            'set_as_base' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($validated, $branchId, $request) {
            $currency = Currency::create([
                'branch_id' => $branchId,
                'code' => strtoupper($validated['code']),
                'name' => $validated['name'],
                'symbol' => $validated['symbol'] ?? null,
                'decimal_places' => $validated['decimal_places'] ?? 2,
                'position' => $validated['position'] ?? 'before',
                'rounding' => $validated['rounding'] ?? 0.01,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Create initial rate if provided (and not base currency)
            $setAsBase = filter_var($validated['set_as_base'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($setAsBase) {
                // Base currency always has rate = 1
                CurrencyRate::create([
                    'currency_id' => $currency->id,
                    'branch_id' => $branchId,
                    'rate' => 1.0000000000,
                    'inverse_rate' => 1.0000000000,
                    'date' => now()->toDateString(),
                ]);

                Branch::where('id', $branchId)->update(['base_currency_id' => $currency->id]);
            } elseif (!empty($validated['initial_rate']) && $validated['initial_rate'] > 0) {
                $rate = (float) $validated['initial_rate'];
                CurrencyRate::create([
                    'currency_id' => $currency->id,
                    'branch_id' => $branchId,
                    'rate' => $rate,
                    'inverse_rate' => 1 / $rate,
                    'date' => now()->toDateString(),
                ]);
            }

            $currency->load('latestRate');
            $currency->is_base = $setAsBase;

            return response()->json([
                'success' => true,
                'message' => 'Currency created successfully',
                'data' => $currency,
            ], 201);
        });
    }

    /**
     * Show a single currency with rate history
     * GET /currencies/{id}
     */
    public function show(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'view']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::with(['rates' => function ($q) {
            $q->orderByDesc('date')->limit(30);
        }])
            ->where('branch_id', $branchId)
            ->findOrFail($id);

        $branch = Branch::find($branchId);
        $currency->is_base = $branch && $branch->base_currency_id === $currency->id;

        return response()->json([
            'success' => true,
            'data' => $currency,
        ]);
    }

    /**
     * Update a currency
     * PUT /currencies/{id}
     */
    public function update(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'edit']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:10',
                Rule::unique('currencies')
                    ->where(fn ($q) => $q->where('branch_id', $branchId))
                    ->ignore($currency->id),
            ],
            'name' => 'sometimes|required|string|max:255',
            'symbol' => 'nullable|string|max:10',
            'decimal_places' => 'nullable|integer|min:0|max:6',
            'position' => 'nullable|in:before,after',
            'rounding' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $currency->update($validated);
        $currency->load('latestRate');

        $branch = Branch::find($branchId);
        $currency->is_base = $branch && $branch->base_currency_id === $currency->id;

        return response()->json([
            'success' => true,
            'message' => 'Currency updated successfully',
            'data' => $currency,
        ]);
    }

    /**
     * Delete a currency
     * DELETE /currencies/{id}
     */
    public function destroy(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'delete']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        // Prevent deleting the base currency
        $branch = Branch::find($branchId);
        if ($branch && $branch->base_currency_id === $currency->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete the base currency. Change the base currency first.',
            ], 400);
        }

        $currency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Currency deleted successfully',
        ]);
    }

    /**
     * Set a currency as the base (home) currency for the branch
     * POST /currencies/{id}/set-base
     */
    public function setBase(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'edit']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        return DB::transaction(function () use ($currency, $branchId) {
            Branch::where('id', $branchId)->update(['base_currency_id' => $currency->id]);

            // Ensure base currency has rate = 1 for today
            CurrencyRate::updateOrCreate(
                [
                    'currency_id' => $currency->id,
                    'branch_id' => $branchId,
                    'date' => now()->toDateString(),
                ],
                [
                    'rate' => 1.0000000000,
                    'inverse_rate' => 1.0000000000,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => $currency->code . ' set as base currency',
                'data' => $currency,
            ]);
        });
    }

    /**
     * Toggle active status
     * POST /currencies/{id}/toggle-active
     */
    public function toggleActive(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'edit']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        // Prevent deactivating base currency
        $branch = Branch::find($branchId);
        if ($branch && $branch->base_currency_id === $currency->id && $currency->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot deactivate the base currency.',
            ], 400);
        }

        $currency->is_active = !$currency->is_active;
        $currency->save();

        return response()->json([
            'success' => true,
            'message' => $currency->is_active ? 'Currency activated' : 'Currency deactivated',
            'data' => $currency,
        ]);
    }

    // ─── Exchange Rates ──────────────────────────────────────────

    /**
     * Get rate history for a currency
     * GET /currencies/{id}/rates
     */
    public function getRates(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'view']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        $query = CurrencyRate::where('currency_id', $currency->id)
            ->where('branch_id', $branchId)
            ->orderByDesc('date');

        if ($request->filled('from')) {
            $query->where('date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('date', '<=', $request->to);
        }

        $perPage = $request->per_page ?? 30;
        $rates = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $rates->items(),
            'meta' => [
                'current_page' => $rates->currentPage(),
                'last_page' => $rates->lastPage(),
                'per_page' => $rates->perPage(),
                'total' => $rates->total(),
                'from' => $rates->firstItem(),
                'to' => $rates->lastItem(),
            ],
        ]);
    }

    /**
     * Add or update an exchange rate for a specific date
     * POST /currencies/{id}/rates
     */
    public function storeRate(Request $request, $id)
    {
        Gate::authorize('perm', ['currencies', 'edit']);

        $branchId = $this->resolveBranchId($request);

        $currency = Currency::where('branch_id', $branchId)->findOrFail($id);

        // Prevent editing base currency rate
        $branch = Branch::find($branchId);
        if ($branch && $branch->base_currency_id === $currency->id) {
            return response()->json([
                'success' => false,
                'message' => 'Base currency rate is always 1. Cannot modify.',
            ], 400);
        }

        $validated = $request->validate([
            'rate' => 'required|numeric|gt:0',
            'date' => 'required|date',
        ]);

        $rate = (float) $validated['rate'];
        $inverseRate = 1 / $rate;

        /* ── Rate convention ──────────────────────────────────────────────────
         *  rate         = how many of THIS currency per 1 base-currency unit
         *                 (user-entered market rate: e.g. 1 USD = 63 AFN → rate=63)
         *  inverse_rate = how many base-currency units per 1 of THIS currency
         *                 (e.g. 1 AFN = 0.016 USD → inverse_rate=0.016)
         * ────────────────────────────────────────────────────────────────────── */

        $currencyRate = CurrencyRate::updateOrCreate(
            [
                'currency_id' => $currency->id,
                'branch_id' => $branchId,
                'date' => $validated['date'],
            ],
            [
                'rate' => $rate,
                'inverse_rate' => $inverseRate,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Exchange rate saved for ' . $validated['date'],
            'data' => $currencyRate,
        ]);
    }

    /**
     * Delete an exchange rate
     * DELETE /currencies/{id}/rates/{rateId}
     */
    public function destroyRate(Request $request, $id, $rateId)
    {
        Gate::authorize('perm', ['currencies', 'edit']);

        $branchId = $this->resolveBranchId($request);

        // Verify currency belongs to branch
        Currency::where('branch_id', $branchId)->findOrFail($id);

        $rate = CurrencyRate::where('currency_id', $id)
            ->where('branch_id', $branchId)
            ->findOrFail($rateId);

        $rate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Exchange rate deleted',
        ]);
    }

    /**
     * Convert amount between two currencies
     * POST /currencies/convert
     */
    public function convert(Request $request)
    {
        Gate::authorize('perm', ['currencies', 'view']);

        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'amount' => 'required|numeric',
            'from_currency_id' => 'required|exists:currencies,id',
            'to_currency_id' => 'required|exists:currencies,id',
            'date' => 'nullable|date',
        ]);

        $fromCurrency = Currency::where('branch_id', $branchId)->findOrFail($validated['from_currency_id']);
        $toCurrency = Currency::where('branch_id', $branchId)->findOrFail($validated['to_currency_id']);

        $result = $fromCurrency->convertTo(
            (float) $validated['amount'],
            $toCurrency,
            $validated['date'] ?? null
        );

        if ($result === null) {
            return response()->json([
                'success' => false,
                'message' => 'Exchange rates not available for the given currencies/date.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'amount' => (float) $validated['amount'],
                'from' => $fromCurrency->code,
                'to' => $toCurrency->code,
                'result' => $toCurrency->roundAmount($result),
                'rate_date' => $validated['date'] ?? now()->toDateString(),
            ],
        ]);
    }

    /**
     * Get all active currencies for dropdowns
     * GET /currencies/active-list
     */
    public function activeList(Request $request)
    {
        $branchId = $this->resolveBranchId($request);

        $currencies = Currency::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'symbol']);

        return response()->json([
            'success' => true,
            'data' => $currencies,
        ]);
    }
}
