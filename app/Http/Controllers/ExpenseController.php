<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseType;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Helpers\AuthHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
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
        
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        if (AuthHelper::isCompanyAdmin()) {
            return AuthHelper::getCompanyId();
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    /**
     * GET /api/expenses
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'data' => [],
                'total' => 0,
                'summary' => [
                    'total_expenses' => 0,
                    'total_amount' => 0,
                ],
            ]);
        }

        $query = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->with([
                'expenseType',
                'account',
                'createdBy:id,first_name,last_name',
            ]);

        // ── Filters ───────────────────────────────────────────────────────────
        if ($request->filled('expense_type_id')) {
            $query->where('expense_type_id', $request->expense_type_id);
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('date', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('paid_to', 'like', "%{$search}%");
            });
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        // ── Sort ──────────────────────────────────────────────────────────────
        $sortBy = $request->get('sort_by', 'date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['date', 'amount', 'created_at'];

        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('date', 'desc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);

        if ($request->boolean('all')) {
            $expenses = $query->get();
            return response()->json([
                'data' => $expenses,
                'total' => $expenses->count(),
            ]);
        }

        $paginated = $query->paginate($perPage);

        $summary = [
            'total_expenses' => Expense::where('company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->count(),
            'total_amount' => Expense::where('company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->sum('amount') ?? 0,
        ];

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'summary' => $summary,
        ]);
    }

    /**
     * POST /api/expenses
     */
    public function store(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 422);
        }

        // Check if it's a bulk request
        $isBulk = $request->has('expenses') && is_array($request->expenses);

        if ($isBulk) {
            return $this->storeBulk($request, $branchId, $companyId);
        }

        return $this->storeSingle($request, $branchId, $companyId);
    }

    /**
     * Store a single expense
     */
    private function storeSingle(Request $request, ?int $branchId, int $companyId): JsonResponse
    {
        // Debug: Log the request data
        Log::info('Expense store request:', $request->all());

        $validated = $request->validate([
            'expense_type_id' => ['required', 'integer', Rule::exists('expense_types', 'id')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->where('is_active', true);
            })],
            'account_id' => ['required', 'integer', Rule::exists('accounts', 'id')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })],
            'amount' => 'required|numeric|min:0.01|max:999999999',
            'description' => 'nullable|string|max:500',
            'paid_to' => 'nullable|string|max:150',
            'date' => 'required|date|before_or_equal:today',
        ]);

        // Debug: Log validated data
        Log::info('Validated expense data:', $validated);

        // Check if account exists and has balance
        $account = Account::where('company_id', $companyId)->find($validated['account_id']);
        if (!$account) {
            return response()->json([
                'message' => 'Account not found or does not belong to this company.',
                'errors' => [
                    'account_id' => ['The selected account is invalid or does not belong to your company.']
                ]
            ], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['branch_id'] = $branchId;
        $validated['created_by'] = Auth::id();

        DB::beginTransaction();
        try {
            // Create expense
            $expense = Expense::create($validated);

            $balanceBefore = $account->balance;
            $balanceAfter = $balanceBefore - $validated['amount'];

            // Check if account has sufficient balance
            if ($balanceAfter < 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Insufficient balance in the selected account.',
                    'errors' => [
                        'amount' => ['Insufficient balance. Available: ' . number_format($balanceBefore, 2)]
                    ]
                ], 422);
            }

            // Update account balance
            $account->decrement('balance', $validated['amount']);

            // Create transaction log
            AccountTransaction::create([
                'account_id' => $account->id,
                'type' => 'Expense',
                'amount' => $validated['amount'],
                'balance_after' => $balanceAfter,
                'description' => 'Expense: ' . ($validated['description'] ?? 'Expense payment'),
                'reference_id' => $expense->id,
                'reference_type' => Expense::class,
                'created_by' => Auth::id(),
            ]);

            $expense->load([
                'expenseType',
                'account',
                'createdBy:id,first_name,last_name',
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Expense creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create expense: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data' => $expense,
            'message' => 'Expense created successfully.',
        ], 201);
    }

    /**
     * Store multiple expenses in bulk
     */
    private function storeBulk(Request $request, ?int $branchId, int $companyId): JsonResponse
    {
        // Debug: Log the request data
        Log::info('Bulk expense store request:', $request->all());

        $createdExpenses = [];
        $errors = [];

        try {
            // Validate FIRST, then start transaction after validation passes
            $validated = $request->validate([
                'expenses' => 'required|array|min:1',
                'expenses.*.expense_type_id' => ['required', 'integer', Rule::exists('expense_types', 'id')->where(function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)->where('is_active', true);
                })],
                'expenses.*.account_id' => ['required', 'integer', Rule::exists('accounts', 'id')->where(function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                })],
                'expenses.*.amount' => 'required|numeric|min:0.01|max:999999999',
                'expenses.*.description' => 'nullable|string|max:500',
                'expenses.*.paid_to' => 'nullable|string|max:150',
                'expenses.*.date' => 'required|date|before_or_equal:today',
            ]);

            DB::beginTransaction();

            foreach ($validated['expenses'] as $index => $expenseData) {
                try {
                    // Check if account exists
                    $account = Account::where('company_id', $companyId)->find($expenseData['account_id']);
                    if (!$account) {
                        $errors[] = [
                            'index' => $index,
                            'message' => 'Account not found or does not belong to this company.',
                        ];
                        continue;
                    }

                    // Add company and branch to each expense
                    $expenseData['company_id'] = $companyId;
                    $expenseData['branch_id'] = $branchId;
                    $expenseData['created_by'] = Auth::id();

                    // Create expense
                    $expense = Expense::create($expenseData);

                    $balanceBefore = $account->balance;
                    $balanceAfter = $balanceBefore - $expenseData['amount'];

                    // Check if account has sufficient balance
                    if ($balanceAfter < 0) {
                        $errors[] = [
                            'index' => $index,
                            'message' => 'Insufficient balance in account: ' . $account->name . ' (Available: ' . number_format($balanceBefore, 2) . ')',
                        ];
                        continue;
                    }

                    // Update account balance
                    $account->decrement('balance', $expenseData['amount']);

                    // Create transaction log
                    AccountTransaction::create([
                        'account_id' => $account->id,
                        'type' => 'Expense',
                        'amount' => $expenseData['amount'],
                        'balance_after' => $balanceAfter,
                        'description' => 'Expense: ' . ($expenseData['description'] ?? 'Expense payment'),
                        'reference_id' => $expense->id,
                        'reference_type' => Expense::class,
                        'created_by' => Auth::id(),
                    ]);

                    $createdExpenses[] = $expense;
                } catch (\Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'message' => $e->getMessage(),
                    ];
                    Log::error('Failed to create expense at index ' . $index . ': ' . $e->getMessage());
                }
            }

            // If all failed, rollback
            if (count($createdExpenses) === 0 && count($errors) > 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Failed to create expenses',
                    'errors' => $errors,
                ], 422);
            }

            DB::commit();

            // Load relationships for all created expenses
            foreach ($createdExpenses as $expense) {
                $expense->load([
                    'expenseType',
                    'account',
                    'createdBy:id,first_name,last_name',
                ]);
            }

            $successCount = count($createdExpenses);
            $errorCount = count($errors);

            $message = $successCount . ' expense(s) created successfully.';
            if ($errorCount > 0) {
                $message .= ' ' . $errorCount . ' expense(s) failed.';
            }

            return response()->json([
                'data' => $createdExpenses,
                'errors' => $errors,
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'message' => $message,
            ], $errorCount > 0 ? 207 : 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('Bulk expense validation failed: ' . json_encode($e->errors()));
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Bulk expense creation failed: ' . $e->getMessage() . '\n' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to create expenses: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/expenses/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        }

        $expense = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->with([
                'expenseType',
                'account',
                'createdBy:id,first_name,last_name,email',
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => $expense,
        ]);
    }

    /**
     * PUT /api/expenses/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 422);
        }

        $expense = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->findOrFail($id);

        $validated = $request->validate([
            'expense_type_id' => ['sometimes', 'integer', Rule::exists('expense_types', 'id')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->where('is_active', true);
            })],
            'account_id' => ['sometimes', 'integer', Rule::exists('accounts', 'id')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })],
            'amount' => 'sometimes|numeric|min:0.01|max:999999999',
            'description' => 'nullable|string|max:500',
            'paid_to' => 'nullable|string|max:150',
            'date' => 'sometimes|date|before_or_equal:today',
        ]);

        // If amount or account is changed, we need to handle balance updates
        if (isset($validated['amount']) || isset($validated['account_id'])) {
            DB::beginTransaction();
            try {
                // Reverse previous transaction (add back to old account)
                $oldAccount = Account::where('company_id', $companyId)->find($expense->account_id);
                if ($oldAccount) {
                    $oldAccount->increment('balance', $expense->amount);
                }

                // Update expense
                $expense->update($validated);

                // Apply new transaction
                $newAccountId = $validated['account_id'] ?? $expense->account_id;
                $newAmount = $validated['amount'] ?? $expense->amount;
                
                $newAccount = Account::where('company_id', $companyId)->findOrFail($newAccountId);
                
                $balanceAfter = $newAccount->balance - $newAmount;

                if ($balanceAfter < 0) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Insufficient balance in the selected account.',
                        'errors' => [
                            'amount' => ['Insufficient balance. Available: ' . number_format($newAccount->balance, 2)]
                        ]
                    ], 422);
                }

                $newAccount->decrement('balance', $newAmount);

                // Create transaction log for the new transaction
                AccountTransaction::create([
                    'account_id' => $newAccount->id,
                    'type' => 'Expense',
                    'amount' => $newAmount,
                    'balance_after' => $balanceAfter,
                    'description' => 'Expense updated: ' . ($validated['description'] ?? $expense->description ?? 'Expense payment'),
                    'reference_id' => $expense->id,
                    'reference_type' => Expense::class,
                    'created_by' => Auth::id(),
                ]);

                DB::commit();
            } catch (\Throwable $e) {
                DB::rollBack();
                Log::error('Expense update failed: ' . $e->getMessage());
                return response()->json(['message' => 'Failed to update expense: ' . $e->getMessage()], 500);
            }
        } else {
            // Simple update without balance changes
            $expense->update($validated);
        }

        $expense->refresh()->load([
            'expenseType',
            'account',
            'createdBy:id,first_name,last_name',
        ]);

        return response()->json([
            'data' => $expense,
            'message' => 'Expense updated successfully.',
        ]);
    }

    /**
     * DELETE /api/expenses/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        }

        $expense = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->findOrFail($id);

        DB::beginTransaction();
        try {
            // Reverse the transaction - add back to account
            $account = Account::where('company_id', $companyId)->find($expense->account_id);
            if ($account) {
                $account->increment('balance', $expense->amount);
            }

            // Delete the expense
            $expense->delete();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Expense deletion failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete expense: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => 'Expense deleted successfully.']);
    }

    /**
     * GET /api/expenses/summary
     */
    public function summary(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'summary' => [
                    'total_expenses' => 0,
                    'total_amount' => 0,
                ],
                'by_type' => [],
                'by_account' => [],
            ]);
        }

        $summary = [
            'total_expenses' => Expense::where('company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->count(),
            'total_amount' => Expense::where('company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->sum('amount') ?? 0,
        ];

        // Expenses by type
        $byType = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->selectRaw('expense_type_id, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('expense_type_id')
            ->with('expenseType:id,name')
            ->get();

        // Expenses by account
        $byAccount = Expense::where('company_id', $companyId)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->selectRaw('account_id, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('account_id')
            ->with('account:id,name')
            ->get();

        return response()->json([
            'summary' => $summary,
            'by_type' => $byType,
            'by_account' => $byAccount,
        ]);
    }
}