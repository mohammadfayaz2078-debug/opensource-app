<?php

namespace App\Http\Controllers;

use App\Models\AccountType;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use App\Helpers\AuthHelper;
use Database\Seeders\AccountTypeSeeder;

class AccountTypeController extends Controller
{
    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();
        if ($user instanceof SuperAdmin) {
            return $request->input('branch_id') ? (int) $request->input('branch_id') : null;
        }
        // Company admin: branch_id must be passed from frontend
        if (AuthHelper::isCompanyAdmin()) {
            return $request->input('branch_id') ? (int) $request->input('branch_id') : null;
        }
        return AuthHelper::getBranchId();
    }

    /**
     * Display a listing of account types
     * GET /account-types
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $query = AccountType::withCount(['accounts', 'accountGroups'])
            ->where('branch_id', $branchId);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('internal_group')) {
            $query->where('internal_group', $request->internal_group);
        }

        $types = $query->orderBy('sequence')->orderBy('type')->get();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * Store a newly created account type
     * POST /account-types
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'create']);

        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:asset,liability,equity,income,expense',
            'internal_group' => 'required|in:balance_sheet,profit_loss,off_balance',
            'include_initial_balance' => 'boolean',
            'description' => 'nullable|string|max:500',
            'sequence' => 'nullable|integer|min:0',
        ]);

        $type = AccountType::create([
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'internal_group' => $validated['internal_group'],
            'include_initial_balance' => $validated['include_initial_balance'] ?? false,
            'description' => $validated['description'] ?? null,
            'sequence' => $validated['sequence'] ?? 10,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account type created successfully',
            'data' => $type,
        ], 201);
    }

    /**
     * Display the specified account type
     * GET /account-types/{id}
     */
    public function show(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $type = AccountType::withCount(['accounts', 'accountGroups'])
            ->where('branch_id', $branchId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $type,
        ]);
    }

    /**
     * Update the specified account type
     * PUT /account-types/{id}
     */
    public function update(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'edit']);

        $branchId = $this->resolveBranchId($request);
        $type = AccountType::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:asset,liability,equity,income,expense',
            'internal_group' => 'sometimes|required|in:balance_sheet,profit_loss,off_balance',
            'include_initial_balance' => 'boolean',
            'description' => 'nullable|string|max:500',
            'sequence' => 'nullable|integer|min:0',
        ]);

        $type->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Account type updated successfully',
            'data' => $type,
        ]);
    }

    /**
     * Remove the specified account type
     * DELETE /account-types/{id}
     */
    public function destroy(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'delete']);

        $branchId = $this->resolveBranchId($request);
        $type = AccountType::withCount(['accounts', 'accountGroups'])
            ->where('branch_id', $branchId)
            ->findOrFail($id);

        if ($type->accounts_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete: {$type->accounts_count} account(s) use this type.",
            ], 400);
        }

        if ($type->account_groups_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete: {$type->account_groups_count} account group(s) use this type.",
            ], 400);
        }

        $type->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account type deleted successfully',
        ]);
    }

    /**
     * Seed default account types for the authenticated user's branch.
     * POST /account-types/seed
     */
    public function seed(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'create']);

        $branchId = $this->resolveBranchId($request);

        if (!$branchId) {
            return response()->json([
                'success' => false,
                'message' => 'Branch ID is required and could not be resolved.',
            ], 422);
        }

        $existingCount = AccountType::where('branch_id', $branchId)->count();
        $defaultTypes = AccountTypeSeeder::getDefaultTypes();

        if ($existingCount >= count($defaultTypes)) {
            return response()->json([
                'success' => true,
                'already_seeded' => true,
                'message' => 'Account types have already been seeded for your branch.',
                'data' => [
                    'branch_id' => $branchId,
                    'total_account_types' => $existingCount,
                ],
            ]);
        }

        try {
            AccountTypeSeeder::seedForBranch($branchId);

            $count = AccountType::where('branch_id', $branchId)->count();

            return response()->json([
                'success' => true,
                'already_seeded' => false,
                'message' => 'Account types seeded successfully for your branch.',
                'data' => [
                    'branch_id' => $branchId,
                    'total_account_types' => $count,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to seed account types.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
