<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\OtherIncome;
use App\Models\IncomeCategory;
use App\Models\Branch;
use App\Models\Account;
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
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }

        return AuthHelper::getBranchId();
    }

    private function resolveCompanyId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? Branch::find($branchId)?->company_id : null;
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

    // ── Other Income CRUD ──────────────────────────────────────────────────

    /**
     * GET /api/other-incomes
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = OtherIncome::with(['incomeCategory', 'account', 'creator'])
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

        // Filter by account
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
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
        
        $allowedSorts = ['income_date', 'income_number', 'amount', 'created_at'];
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
            'account_id'           => ['required', 'integer', Rule::exists('accounts', 'id')->where(fn($q) => $q->where('company_id', $companyId))],
            'income_category_id'   => ['nullable', 'integer', Rule::exists('income_categories', 'id')->where(fn($q) => $q->where('company_id', $companyId))],
            'income_number'        => ['nullable', 'string', 'max:50', Rule::unique('other_incomes')->where(fn($q) => $q->where('branch_id', $branchId))],
            'income_date'          => 'required|date',
            'description'          => 'nullable|string',
            'amount'               => 'required|numeric|min:0.01|max:999999999999.99',
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

        $income = DB::transaction(function () use ($validated, $companyId) {
            $income = OtherIncome::create($validated);
            
            // Update account balance (increase) — scoped to the caller's company
            $account = Account::where('company_id', $companyId)->find($validated['account_id']);
            if ($account) {
                $account->balance += $validated['amount'];
                $account->save();
            }
            
            return $income;
        });

        $income->load(['incomeCategory', 'account', 'creator']);

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
            ->with(['incomeCategory', 'account', 'creator', 'company', 'branch'])
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
            'account_id'           => ['sometimes', 'integer', Rule::exists('accounts', 'id')->where(fn($q) => $q->where('company_id', $companyId))],
            'income_category_id'   => ['nullable', 'integer', Rule::exists('income_categories', 'id')->where(fn($q) => $q->where('company_id', $companyId))],
            'income_number'        => ['sometimes', 'string', 'max:50', Rule::unique('other_incomes')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($income->id)],
            'income_date'          => 'sometimes|date',
            'description'          => 'nullable|string',
            'amount'               => 'sometimes|numeric|min:0.01|max:999999999999.99',
            'note'                 => 'nullable|string',
        ]);

        DB::transaction(function () use ($income, $validated, $companyId) {
            $oldAmount = $income->amount;
            $oldAccountId = $income->account_id;
            $newAmount = $validated['amount'] ?? $oldAmount;
            $newAccountId = $validated['account_id'] ?? $oldAccountId;

            // If account changed or amount changed, update balances
            if ($oldAccountId != $newAccountId || $oldAmount != $newAmount) {
                // Reverse old account balance
                if ($oldAccountId) {
                    $oldAccount = Account::where('company_id', $companyId)->find($oldAccountId);
                    if ($oldAccount) {
                        $oldAccount->balance -= $oldAmount;
                        $oldAccount->save();
                    }
                }

                // Update new account balance
                if ($newAccountId) {
                    $newAccount = Account::where('company_id', $companyId)->find($newAccountId);
                    if ($newAccount) {
                        $newAccount->balance += $newAmount;
                        $newAccount->save();
                    }
                }
            }

            $income->update($validated);
        });

        $income->load(['incomeCategory', 'account', 'creator']);

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
            // Reverse account balance
            if ($income->account_id) {
                $account = Account::find($income->account_id);
                if ($account) {
                    $account->balance -= $income->amount;
                    $account->save();
                }
            }
            
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

        // Update account balance for the new income
        if ($newIncome->account_id) {
            $account = Account::find($newIncome->account_id);
            if ($account) {
                $account->balance += $newIncome->amount;
                $account->save();
            }
        }

        $newIncome->load(['incomeCategory', 'account', 'creator']);

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

        // Filter by account
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
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
        } elseif ($groupBy === 'account') {
            $report = $query->selectRaw('account_id, SUM(amount) as total_amount, COUNT(*) as count')
                ->with('account')
                ->groupBy('account_id')
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
            ->with(['incomeCategory', 'account']);

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
            'Account' => $income->account?->name ?? 'N/A',
            'Description' => $income->description ?? '',
            'Amount' => $income->amount,
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

        // Top accounts
        $topAccounts = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->selectRaw('account_id, SUM(amount) as total')
            ->with('account')
            ->groupBy('account_id')
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
            'top_accounts' => $topAccounts,
            'monthly_trend' => $monthlyTrend,
        ]);
    }

    /**
     * GET /api/other-incomes/account-summary
     */
    public function accountSummary(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $accountSummary = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->selectRaw('account_id, SUM(amount) as total_amount, COUNT(*) as count')
            ->with('account')
            ->groupBy('account_id')
            ->orderBy('total_amount', 'desc')
            ->get();

        $totalAll = $accountSummary->sum('total_amount');

        return response()->json([
            'data' => $accountSummary,
            'summary' => [
                'total_accounts' => $accountSummary->count(),
                'total_amount' => $totalAll,
            ],
        ]);
    }

    /**
     * GET /api/other-incomes/category-summary
     */
    public function categorySummary(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $categorySummary = OtherIncome::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->selectRaw('income_category_id, SUM(amount) as total_amount, COUNT(*) as count')
            ->with('incomeCategory')
            ->groupBy('income_category_id')
            ->orderBy('total_amount', 'desc')
            ->get();

        $totalAll = $categorySummary->sum('total_amount');

        return response()->json([
            'data' => $categorySummary,
            'summary' => [
                'total_categories' => $categorySummary->count(),
                'total_amount' => $totalAll,
            ],
        ]);
    }
}