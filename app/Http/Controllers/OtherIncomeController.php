<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\OtherIncome;
use App\Models\IncomeCategory;
use App\Models\Currency;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Services\JournalEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OtherIncomeController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Resolve branch ID based on authenticated user
     */
    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        return AuthHelper::getBranchId();
    }

    /**
     * Resolve company ID based on authenticated user
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin || AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    /**
     * Generate unique income number
     */
    private function generateIncomeNumber(int $branchId): string
    {
        $lastIncome = OtherIncome::where('branch_id', $branchId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastIncome || !$lastIncome->income_number) {
            $nextNumber = 1;
        } else {
            $lastNumber = (int) preg_replace('/[^0-9]/', '', $lastIncome->income_number);
            $nextNumber = $lastNumber + 1;
        }

        return 'INC-' . date('Ymd') . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate base amount using exchange rate
     */
    private function calculateBaseAmount(float $amount, int $currencyId, int $branchId): float
    {
        $branch = Branch::find($branchId);
        $baseCurrency = $branch?->baseCurrency;
        
        if (!$baseCurrency || $baseCurrency->id == $currencyId) {
            return round($amount, 2);
        }
        
        $currency = Currency::find($currencyId);
        if ($currency && $currency->latestRate) {
            $rate = (float) $currency->latestRate->rate;
            return round($amount * $rate, 2);
        }
        
        return round($amount, 2);
    }

    // ── Other Income CRUD ──────────────────────────────────────────────────

    /**
     * GET /api/other-incomes
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = OtherIncome::with(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Date range filter
        if ($request->filled('from_date')) {
            $query->whereDate('income_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('income_date', '<=', $request->to_date);
        }

        // Filter by income category
        if ($request->filled('income_category_id')) {
            $query->where('income_category_id', $request->income_category_id);
        }

        // Filter by currency
        if ($request->filled('currency_id')) {
            $query->where('currency_id', $request->currency_id);
        }

        // Filter by payment account
        if ($request->filled('payment_account_id')) {
            $query->where('payment_account_id', $request->payment_account_id);
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('income_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        // Amount range filter
        if ($request->filled('min_amount')) {
            $query->where('amount', '>=', $request->min_amount);
        }
        if ($request->filled('max_amount')) {
            $query->where('amount', '<=', $request->max_amount);
        }

        // Sorting
        $sortField = $request->get('sort_by', 'income_date');
        $sortOrder = $request->get('sort_order', 'desc');
        
        $allowedSorts = ['income_date', 'income_number', 'amount', 'amount_base', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('income_date', 'desc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $incomes = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_incomes' => $query->count(),
            'total_amount' => OtherIncome::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->sum('amount'),
            'total_amount_base' => OtherIncome::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->sum('amount_base'),
            'average_amount' => OtherIncome::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->avg('amount') ?? 0,
        ];

        return response()->json([
            'data'         => $incomes->items(),
            'total'        => $incomes->total(),
            'per_page'     => $incomes->perPage(),
            'current_page' => $incomes->currentPage(),
            'last_page'    => $incomes->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/other-incomes
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'income_category_id'   => 'nullable|exists:income_categories,id',
            'income_number'        => ['nullable', 'string', 'max:50', Rule::unique('other_incomes')->where(fn($q) => $q->where('branch_id', $branchId))],
            'income_date'          => 'required|date',
            'description'          => 'nullable|string',
            'amount'               => 'required|numeric|min:0.01|max:999999999999.99',
            'currency_id'          => 'nullable|exists:currencies,id',
            'exchange_rate'        => 'nullable|numeric|min:0.000001',
            'payment_account_id'   => 'nullable|exists:chart_of_accounts,id',
            'income_account_id'    => 'nullable|exists:chart_of_accounts,id',
            'note'                 => 'nullable|string',
        ]);

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();
        
        // Generate income number if not provided
        if (empty($validated['income_number'])) {
            $validated['income_number'] = $this->generateIncomeNumber($branchId);
        }
        
        // Set default currency if not provided
        if (empty($validated['currency_id'])) {
            $branch = Branch::find($branchId);
            $validated['currency_id'] = $branch?->base_currency_id;
        }
        
        // Calculate exchange rate and base amount
        if (empty($validated['exchange_rate'])) {
            $validated['exchange_rate'] = 1;
        }
        
        $validated['amount_base'] = $this->calculateBaseAmount(
            $validated['amount'],
            $validated['currency_id'],
            $branchId
        );

        // If income account not provided, try to get from category
        if (empty($validated['income_account_id']) && !empty($validated['income_category_id'])) {
            $category = IncomeCategory::find($validated['income_category_id']);
            if ($category && $category->income_account_id) {
                $validated['income_account_id'] = $category->income_account_id;
            }
        }

        $income = DB::transaction(function () use ($validated) {
            $income = OtherIncome::create($validated);
            
            // Create journal entry
            $this->createJournalEntry($income);
            
            return $income;
        });

        $income->load(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount', 'creator']);

        return response()->json([
            'data'    => $income,
            'message' => 'Income recorded successfully.',
        ], 201);
    }

    /**
     * GET /api/other-incomes/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $income = OtherIncome::where('branch_id', $branchId)
            ->with(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount', 'creator', 'company', 'branch'])
            ->findOrFail($id);

        return response()->json(['data' => $income]);
    }

    /**
     * PUT /api/other-incomes/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $income    = OtherIncome::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'income_category_id'   => 'nullable|exists:income_categories,id',
            'income_number'        => ['sometimes', 'string', 'max:50', Rule::unique('other_incomes')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($income->id)],
            'income_date'          => 'sometimes|date',
            'description'          => 'nullable|string',
            'amount'               => 'sometimes|numeric|min:0.01|max:999999999999.99',
            'currency_id'          => 'nullable|exists:currencies,id',
            'exchange_rate'        => 'nullable|numeric|min:0.000001',
            'payment_account_id'   => 'nullable|exists:chart_of_accounts,id',
            'income_account_id'    => 'nullable|exists:chart_of_accounts,id',
            'note'                 => 'nullable|string',
        ]);

        // Recalculate base amount if amount or currency changed
        if (isset($validated['amount']) || isset($validated['currency_id'])) {
            $amount = $validated['amount'] ?? $income->amount;
            $currencyId = $validated['currency_id'] ?? $income->currency_id;
            $validated['amount_base'] = $this->calculateBaseAmount($amount, $currencyId, $branchId);
        }

        // If income account not provided but category changed, try to get from new category
        if (empty($validated['income_account_id']) && isset($validated['income_category_id']) && $validated['income_category_id'] != $income->income_category_id) {
            $category = IncomeCategory::find($validated['income_category_id']);
            if ($category && $category->income_account_id) {
                $validated['income_account_id'] = $category->income_account_id;
            }
        }
        
        $oldData = $income->toArray();
        $income->update($validated);
        
        // Update journal entry if significant changes occurred
        if ($this->hasAccountingChanges($oldData, $income->toArray())) {
            DB::transaction(function () use ($income, $oldData) {
                $this->updateJournalEntry($income, $oldData);
            });
        }

        $income->load(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount', 'creator']);

        return response()->json([
            'data'    => $income,
            'message' => 'Income updated successfully.',
        ]);
    }

    /**
     * DELETE /api/other-incomes/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $income   = OtherIncome::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($income) {
            // Reverse journal entry
            $this->reverseJournalEntry($income);
            
            $income->delete();
        });

        return response()->json(['message' => 'Income deleted successfully.']);
    }

    /**
     * POST /api/other-incomes/{id}/duplicate
     */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $income   = OtherIncome::where('branch_id', $branchId)->findOrFail($id);

        $newIncome = $income->replicate();
        $newIncome->income_number = $this->generateIncomeNumber($branchId);
        $newIncome->income_date = now()->toDateString();
        $newIncome->created_by = Auth::id();
        $newIncome->push();

        $newIncome->load(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount', 'creator']);

        return response()->json([
            'data'    => $newIncome,
            'message' => 'Income duplicated successfully.',
        ], 201);
    }

    /**
     * GET /api/other-incomes/report
     */
    public function report(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Date range
        if ($request->filled('from_date')) {
            $query->whereDate('income_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('income_date', '<=', $request->to_date);
        }

        // Group by month/year
        $groupBy = $request->get('group_by', 'month');
        
        if ($groupBy === 'month') {
            $report = $query->selectRaw('YEAR(income_date) as year, MONTH(income_date) as month, SUM(amount) as total_amount, COUNT(*) as count')
                ->groupBy('year', 'month')
                ->orderBy('year', 'desc')
                ->orderBy('month', 'desc')
                ->get();
        } elseif ($groupBy === 'category') {
            $report = $query->selectRaw('income_category_id, SUM(amount) as total_amount, COUNT(*) as count')
                ->with('incomeCategory')
                ->groupBy('income_category_id')
                ->orderBy('total_amount', 'desc')
                ->get();
        } else {
            $report = $query->selectRaw('DATE(income_date) as date, SUM(amount) as total_amount, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->get();
        }

        $totalAmount = $query->sum('amount');
        $totalCount = $query->count();

        return response()->json([
            'data' => $report,
            'summary' => [
                'total_amount' => $totalAmount,
                'total_count' => $totalCount,
                'average_amount' => $totalCount > 0 ? $totalAmount / $totalCount : 0,
            ],
        ]);
    }

    /**
     * GET /api/other-incomes/export
     */
    public function export(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with(['incomeCategory', 'currency', 'paymentAccount', 'incomeAccount']);

        if ($request->filled('from_date')) {
            $query->whereDate('income_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('income_date', '<=', $request->to_date);
        }

        $incomes = $query->orderBy('income_date', 'desc')->get();

        $exportData = $incomes->map(fn($income) => [
            'Income Number' => $income->income_number,
            'Date' => $income->income_date->format('Y-m-d'),
            'Category' => $income->incomeCategory?->name ?? 'Uncategorized',
            'Description' => $income->description ?? '',
            'Amount' => $income->amount,
            'Currency' => $income->currency?->code ?? 'AFN',
            'Base Amount' => $income->amount_base,
            'Exchange Rate' => $income->exchange_rate,
            'Payment Account' => $income->paymentAccount?->name ?? '',
            'Income Account' => $income->incomeAccount?->name ?? '',
            'Notes' => $income->note ?? '',
            'Created At' => $income->created_at->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * GET /api/other-incomes/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        // Current month stats
        $currentMonthStart = now()->startOfMonth();
        $currentMonthEnd = now()->endOfMonth();

        $currentMonthTotal = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereBetween('income_date', [$currentMonthStart, $currentMonthEnd])
            ->sum('amount');

        $currentMonthCount = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereBetween('income_date', [$currentMonthStart, $currentMonthEnd])
            ->count();

        // Previous month stats
        $prevMonthStart = now()->subMonth()->startOfMonth();
        $prevMonthEnd = now()->subMonth()->endOfMonth();

        $prevMonthTotal = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereBetween('income_date', [$prevMonthStart, $prevMonthEnd])
            ->sum('amount');

        // Top categories
        $topCategories = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->selectRaw('income_category_id, SUM(amount) as total')
            ->with('incomeCategory')
            ->groupBy('income_category_id')
            ->orderBy('total', 'desc')
            ->limit(5)
            ->get();

        // Monthly trend (last 12 months)
        $monthlyTrend = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('income_date', '>=', now()->subMonths(12)->startOfMonth())
            ->selectRaw('YEAR(income_date) as year, MONTH(income_date) as month, SUM(amount) as total')
            ->groupBy('year', 'month')
            ->orderBy('year', 'asc')
            ->orderBy('month', 'asc')
            ->get();

        $percentageChange = $prevMonthTotal > 0 
            ? (($currentMonthTotal - $prevMonthTotal) / $prevMonthTotal) * 100 
            : ($currentMonthTotal > 0 ? 100 : 0);

        return response()->json([
            'current_month' => [
                'total' => $currentMonthTotal,
                'count' => $currentMonthCount,
            ],
            'previous_month' => [
                'total' => $prevMonthTotal,
            ],
            'percentage_change' => round($percentageChange, 2),
            'top_categories' => $topCategories,
            'monthly_trend' => $monthlyTrend,
        ]);
    }

    // ── Journal Entry Methods ─────────────────────────────────────────────

    /**
     * Create journal entry for income
     * Debit: Payment Account (Cash/Bank)
     * Credit: Income Account (Revenue)
     */
    private function createJournalEntry(OtherIncome $income): void
    {
        // Skip if accounts not configured
        if (!$income->payment_account_id || !$income->income_account_id) {
            return;
        }

        $description = sprintf(
            "Income: %s - %s",
            $income->income_number,
            $income->description ?? $income->incomeCategory?->name ?? 'Other Income'
        );

        JournalEntryService::postSimple(
            [
                'branch_id'      => $income->branch_id,
                'journal_type'   => 'other_income',
                'reference_type' => 'other_income',
                'reference_id'   => $income->id,
                'entry_date'     => $income->income_date->toDateString(),
                'description'    => $description,
                'currency'       => $income->currency?->code ?? 'USD',
                'exchange_rate'  => $income->exchange_rate,
            ],
            [
                'account_id'  => $income->payment_account_id,
                'amount'      => $income->amount_base,
                'description' => 'Income received',
            ],
            [
                'account_id'  => $income->income_account_id,
                'amount'      => $income->amount_base,
                'description' => 'Income recognized',
            ]
        );
    }

    /**
     * Update journal entry when income changes
     */
    private function updateJournalEntry(OtherIncome $income, array $oldData): void
    {
        // Reverse old entry
        $this->reverseJournalEntry($income, $oldData);
        // Create new entry
        $this->createJournalEntry($income);
    }

    /**
     * Reverse journal entry
     */
    private function reverseJournalEntry(OtherIncome $income, ?array $oldData = null): void
    {
        $amount = $oldData['amount_base'] ?? $income->amount_base;
        $paymentAccountId = $oldData['payment_account_id'] ?? $income->payment_account_id;
        $incomeAccountId = $oldData['income_account_id'] ?? $income->income_account_id;
        $incomeDate = isset($oldData['income_date']) ? date('Y-m-d', strtotime($oldData['income_date'])) : $income->income_date->toDateString();

        if (!$paymentAccountId || !$incomeAccountId) {
            return;
        }

        $description = sprintf(
            "Reversal: Income %s",
            $oldData['income_number'] ?? $income->income_number
        );

        JournalEntryService::postSimple(
            [
                'branch_id'      => $income->branch_id,
                'journal_type'   => 'other_income_reversal',
                'reference_type' => 'other_income',
                'reference_id'   => $income->id,
                'entry_date'     => now()->toDateString(),
                'description'    => $description,
                'currency'       => $income->currency?->code ?? 'USD',
                'exchange_rate'  => $income->exchange_rate,
            ],
            [
                'account_id'  => $incomeAccountId,
                'amount'      => $amount,
                'description' => 'Reversal - debit to income account',
            ],
            [
                'account_id'  => $paymentAccountId,
                'amount'      => $amount,
                'description' => 'Reversal - credit to payment account',
            ]
        );
    }

    /**
     * Check if accounting changes occurred
     */
    private function hasAccountingChanges(array $oldData, array $newData): bool
    {
        $fields = ['amount', 'amount_base', 'payment_account_id', 'income_account_id', 'currency_id', 'exchange_rate'];
        
        foreach ($fields as $field) {
            $oldValue = $oldData[$field] ?? null;
            $newValue = $newData[$field] ?? null;
            
            if ($oldValue != $newValue) {
                return true;
            }
        }
        
        return false;
    }
}