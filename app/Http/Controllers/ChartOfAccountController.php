<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\AccountType;
use App\Models\AccountGroup;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Helpers\AuthHelper;

class ChartOfAccountController extends Controller
{
    /**
     * Resolve the branch_id for the current user.
     * Super Admins and Company Admins must pass branch_id in the request.
     * Branch users use their own branch_id.
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
     * Display a listing of accounts (flat list with pagination)
     * GET /chart-of-accounts
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);
        $perPage = $request->per_page ?? 25;

        $query = ChartOfAccount::with(['accountType', 'accountGroup', 'parent', 'currency'])
            ->where('branch_id', $branchId);

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('tag', 'like', "%{$search}%");
            });
        }

        // Account type filter
        if ($request->filled('account_type_id')) {
            $query->where('account_type_id', $request->account_type_id);
        }

        // Account group filter
        if ($request->filled('account_group_id')) {
            $query->where('account_group_id', $request->account_group_id);
        }

        // Internal type filter (asset, liability, equity, income, expense)
        if ($request->filled('type')) {
            $query->whereHas('accountType', function ($q) use ($request) {
                $q->where('type', $request->type);
            });
        }

        // Active / deprecated filters
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('deprecated')) {
            $query->where('deprecated', filter_var($request->deprecated, FILTER_VALIDATE_BOOLEAN));
        }

        // Reconcilable filter
        if ($request->filled('allow_reconciliation')) {
            $query->where('allow_reconciliation', filter_var($request->allow_reconciliation, FILTER_VALIDATE_BOOLEAN));
        }

        $accounts = $query->orderBy('code')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    /**
     * Get accounts as a tree structure
     * GET /chart-of-accounts/tree
     */
    public function tree(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $query = ChartOfAccount::with(['accountType', 'accountGroup', 'currency', 'childrenRecursive'])
            ->where('branch_id', $branchId)
            ->whereNull('parent_id')
            ->orderBy('code');

        // Optional type filter for tree
        if ($request->filled('type')) {
            $query->whereHas('accountType', function ($q) use ($request) {
                $q->where('type', $request->type);
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $tree = $query->get();

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }

    /**
     * Store a newly created account
     * POST /chart-of-accounts
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'create']);

        $branchId = $this->resolveBranchId($request);

        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'Branch is required. Please select a branch first.',
            ], 422);
        }

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('chart_of_accounts')->where(function ($query) use ($branchId) {
                    return $query->where('branch_id', $branchId);
                }),
            ],
            'name' => 'required|string|max:255',
            'account_type_id' => 'required|exists:account_types,id',
            'account_group_id' => 'nullable|exists:account_groups,id',
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
            'currency_id' => 'nullable|exists:currencies,id',
            'allow_reconciliation' => 'boolean',
            'deprecated' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
            'tag' => 'nullable|string|max:100',
            'opening_debit' => 'nullable|numeric|min:0',
            'opening_credit' => 'nullable|numeric|min:0',
            'nature' => 'nullable|in:debit,credit',
        ]);

        return DB::transaction(function () use ($validated, $branchId) {
            // Auto-detect nature from account type if not provided
            $accountType = AccountType::find($validated['account_type_id']);
            $nature = $validated['nature'] ?? ($accountType->isDebitNature() ? 'debit' : 'credit');

            // Calculate level based on parent
            $level = 0;
            if (!empty($validated['parent_id'])) {
                $parent = ChartOfAccount::find($validated['parent_id']);
                if ($parent) {
                    $level = $parent->level + 1;
                }
            }

            $account = ChartOfAccount::create([
                'branch_id' => $branchId,
                'code' => $validated['code'],
                'name' => $validated['name'],
                'account_type_id' => $validated['account_type_id'],
                'account_group_id' => $validated['account_group_id'] ?? null,
                'parent_id' => $validated['parent_id'] ?? null,
                'currency_id' => $validated['currency_id'] ?? null,
                'allow_reconciliation' => $validated['allow_reconciliation'] ?? false,
                'deprecated' => $validated['deprecated'] ?? false,
                'is_active' => $validated['is_active'] ?? true,
                'description' => $validated['description'] ?? null,
                'tag' => $validated['tag'] ?? null,
                'opening_debit' => $validated['opening_debit'] ?? 0,
                'opening_credit' => $validated['opening_credit'] ?? 0,
                'current_balance' => 0,
                'nature' => $nature,
                'level' => $level,
            ]);

            $account->load(['accountType', 'accountGroup', 'parent', 'currency']);

            return response()->json([
                'success' => true,
                'message' => 'Account created successfully',
                'data' => $account,
            ], 201);
        });
    }

    /**
     * Display the specified account
     * GET /chart-of-accounts/{id}
     */
    public function show(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $user = Auth::user();
        $query = ChartOfAccount::with([
            'accountType',
            'accountGroup',
            'parent',
            'currency',
            'children.accountType',
        ]);

        // Super admin can view any account; others are scoped to their company
        if (!($user instanceof SuperAdmin)) {
            $branchId = $this->resolveBranchId($request);
            $query->where('branch_id', $branchId);
        }

        $account = $query->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $account,
        ]);
    }

    /**
     * Update the specified account
     * PUT /chart-of-accounts/{id}
     */
    public function update(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'edit']);

        $branchId = $this->resolveBranchId($request);

        $account = ChartOfAccount::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('chart_of_accounts')->where(function ($query) use ($branchId) {
                    return $query->where('branch_id', $branchId);
                })->ignore($account->id),
            ],
            'name' => 'sometimes|required|string|max:255',
            'account_type_id' => 'sometimes|required|exists:account_types,id',
            'account_group_id' => 'nullable|exists:account_groups,id',
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
            'currency_id' => 'nullable|exists:currencies,id',
            'allow_reconciliation' => 'boolean',
            'deprecated' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
            'tag' => 'nullable|string|max:100',
            'opening_debit' => 'nullable|numeric|min:0',
            'opening_credit' => 'nullable|numeric|min:0',
            'nature' => 'nullable|in:debit,credit',
        ]);

        // Prevent setting parent_id to self or to a descendant
        if (isset($validated['parent_id'])) {
            if ($validated['parent_id'] == $account->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'An account cannot be its own parent',
                ], 422);
            }

            // Check for circular reference
            if ($this->wouldCreateCircularReference($account->id, $validated['parent_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'This would create a circular parent-child reference',
                ], 422);
            }
        }

        return DB::transaction(function () use ($account, $validated) {
            // Recalculate level if parent changed
            if (isset($validated['parent_id'])) {
                if ($validated['parent_id']) {
                    $parent = ChartOfAccount::find($validated['parent_id']);
                    $validated['level'] = $parent ? $parent->level + 1 : 0;
                } else {
                    $validated['level'] = 0;
                }
            }

            $account->update($validated);
            $account->load(['accountType', 'accountGroup', 'parent', 'currency']);

            // Update children levels recursively if level changed
            $this->updateChildrenLevels($account);

            return response()->json([
                'success' => true,
                'message' => 'Account updated successfully',
                'data' => $account,
            ]);
        });
    }

    /**
     * Remove the specified account
     * DELETE /chart-of-accounts/{id}
     */
    public function destroy(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'delete']);

        $branchId = $this->resolveBranchId($request);

        $account = ChartOfAccount::where('branch_id', $branchId)->findOrFail($id);

        // Check if account has children
        if ($account->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete account with child accounts. Move or delete child accounts first.',
            ], 400);
        }

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully',
        ]);
    }

    /**
     * Toggle deprecated status
     * POST /chart-of-accounts/{id}/toggle-deprecated
     */
    public function toggleDeprecated(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'edit']);

        $branchId = $this->resolveBranchId($request);
        $account = ChartOfAccount::where('branch_id', $branchId)->findOrFail($id);

        $account->deprecated = !$account->deprecated;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => $account->deprecated ? 'Account marked as deprecated' : 'Account reactivated',
            'data' => $account,
        ]);
    }

    /**
     * Toggle active status
     * POST /chart-of-accounts/{id}/toggle-active
     */
    public function toggleActive(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'edit']);

        $branchId = $this->resolveBranchId($request);
        $account = ChartOfAccount::where('branch_id', $branchId)->findOrFail($id);

        $account->is_active = !$account->is_active;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => $account->is_active ? 'Account activated' : 'Account deactivated',
            'data' => $account,
        ]);
    }

    /**
     * Get all account types (for dropdowns)
     * GET /chart-of-accounts/types
     */
    public function getAccountTypes(Request $request)
    {
        $branchId = $this->resolveBranchId($request);

        $types = AccountType::where('branch_id', $branchId)
            ->orderBy('sequence')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * Get account groups for the current company (for dropdowns)
     * GET /chart-of-accounts/groups
     */
    public function getAccountGroups(Request $request)
    {
        $branchId = $this->resolveBranchId($request);

        $query = AccountGroup::with('accountType')
            ->where('branch_id', $branchId)
            ->orderBy('code_prefix_start');

        if ($request->filled('account_type_id')) {
            $query->where('account_type_id', $request->account_type_id);
        }

        $groups = $query->get();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    /**
     * Get accounts list for parent dropdown (excludes given id and its descendants)
     * GET /chart-of-accounts/parent-options
     */
    public function getParentOptions(Request $request)
    {
        $branchId = $this->resolveBranchId($request);

        $query = ChartOfAccount::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('code');

        // Exclude the current account and its descendants when editing
        if ($request->filled('exclude_id')) {
            $excludeIds = $this->getDescendantIds($request->exclude_id);
            $excludeIds[] = (int) $request->exclude_id;
            $query->whereNotIn('id', $excludeIds);
        }

        $accounts = $query->get(['id', 'code', 'name']);

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    /**
     * Bulk import accounts from a standard template
     * POST /chart-of-accounts/import
     */
    public function import(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'create']);

        $validated = $request->validate([
            'accounts' => 'required|array|min:1',
            'accounts.*.code' => 'required|string|max:20',
            'accounts.*.name' => 'required|string|max:255',
            'accounts.*.account_type_id' => 'required|exists:account_types,id',
            'accounts.*.parent_code' => 'nullable|string|max:20',
            'accounts.*.description' => 'nullable|string|max:1000',
        ]);

        $branchId = $this->resolveBranchId($request);
        $imported = 0;
        $errors = [];

        return DB::transaction(function () use ($validated, $branchId, &$imported, &$errors) {
            // First pass: create all accounts without parent references
            $codeToIdMap = [];

            foreach ($validated['accounts'] as $index => $row) {
                // Check for duplicate code
                $exists = ChartOfAccount::where('branch_id', $branchId)
                    ->where('code', $row['code'])
                    ->exists();

                if ($exists) {
                    $errors[] = "Row {$index}: Account code '{$row['code']}' already exists";
                    continue;
                }

                $accountType = AccountType::find($row['account_type_id']);
                $nature = $accountType->isDebitNature() ? 'debit' : 'credit';

                $account = ChartOfAccount::create([
                    'branch_id' => $branchId,
                    'code' => $row['code'],
                    'name' => $row['name'],
                    'account_type_id' => $row['account_type_id'],
                    'description' => $row['description'] ?? null,
                    'nature' => $nature,
                    'is_active' => true,
                ]);

                $codeToIdMap[$row['code']] = $account->id;
                $imported++;
            }

            // Second pass: set parent references
            foreach ($validated['accounts'] as $row) {
                if (!empty($row['parent_code']) && isset($codeToIdMap[$row['code']])) {
                    $parentId = $codeToIdMap[$row['parent_code']]
                        ?? ChartOfAccount::where('branch_id', $branchId)
                            ->where('code', $row['parent_code'])
                            ->value('id');

                    if ($parentId) {
                        $account = ChartOfAccount::find($codeToIdMap[$row['code']]);
                        $parent = ChartOfAccount::find($parentId);
                        $account->update([
                            'parent_id' => $parentId,
                            'level' => $parent ? $parent->level + 1 : 0,
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => "{$imported} accounts imported successfully",
                'imported' => $imported,
                'errors' => $errors,
            ]);
        });
    }

    /**
     * Get summary statistics for the chart of accounts
     * GET /chart-of-accounts/summary
     */
    public function summary(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $stats = [
            'total_accounts' => ChartOfAccount::where('branch_id', $branchId)->count(),
            'active_accounts' => ChartOfAccount::where('branch_id', $branchId)->where('is_active', true)->count(),
            'deprecated_accounts' => ChartOfAccount::where('branch_id', $branchId)->where('deprecated', true)->count(),
            'by_type' => ChartOfAccount::where('branch_id', $branchId)
                ->select('account_type_id', DB::raw('count(*) as count'))
                ->with('accountType:id,name,type')
                ->groupBy('account_type_id')
                ->get(),
            'by_internal_type' => DB::table('chart_of_accounts')
                ->join('account_types', 'chart_of_accounts.account_type_id', '=', 'account_types.id')
                ->where('chart_of_accounts.branch_id', $branchId)
                ->select('account_types.type', DB::raw('count(*) as count'))
                ->groupBy('account_types.type')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Check if setting parent_id would create a circular reference
     */
    private function wouldCreateCircularReference($accountId, $newParentId): bool
    {
        $descendantIds = $this->getDescendantIds($accountId);
        return in_array($newParentId, $descendantIds);
    }

    /**
     * Get all descendant IDs of an account
     */
    private function getDescendantIds($accountId): array
    {
        $ids = [];
        $children = ChartOfAccount::where('parent_id', $accountId)->pluck('id')->toArray();

        foreach ($children as $childId) {
            $ids[] = $childId;
            $ids = array_merge($ids, $this->getDescendantIds($childId));
        }

        return $ids;
    }

    /**
     * Recursively update children levels when parent level changes
     */
    private function updateChildrenLevels(ChartOfAccount $account): void
    {
        $children = $account->children;

        foreach ($children as $child) {
            $child->update(['level' => $account->level + 1]);
            $this->updateChildrenLevels($child);
        }
    }
}
