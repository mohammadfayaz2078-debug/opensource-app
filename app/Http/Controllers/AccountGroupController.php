<?php

namespace App\Http\Controllers;

use App\Models\AccountGroup;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Helpers\AuthHelper;

class AccountGroupController extends Controller
{
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
     * Display a listing of account groups
     * GET /account-groups
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $query = AccountGroup::with(['accountType', 'parent', 'children'])
            ->where('branch_id', $branchId);

        if ($request->filled('account_type_id')) {
            $query->where('account_type_id', $request->account_type_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code_prefix_start', 'like', "%{$search}%");
            });
        }

        $groups = $query->orderBy('code_prefix_start')->get();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    /**
     * Get account groups as a tree
     * GET /account-groups/tree
     */
    public function tree(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $tree = AccountGroup::with(['accountType', 'childrenRecursive'])
            ->where('branch_id', $branchId)
            ->whereNull('parent_id')
            ->orderBy('code_prefix_start')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }

    /**
     * Store a newly created account group
     * POST /account-groups
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'create']);

        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code_prefix_start' => 'required|string|max:20',
            'code_prefix_end' => 'nullable|string|max:20',
            'account_type_id' => 'required|exists:account_types,id',
            'parent_id' => 'nullable|exists:account_groups,id',
        ]);

        $group = AccountGroup::create([
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'code_prefix_start' => $validated['code_prefix_start'],
            'code_prefix_end' => $validated['code_prefix_end'] ?? null,
            'account_type_id' => $validated['account_type_id'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        $group->load(['accountType', 'parent']);

        return response()->json([
            'success' => true,
            'message' => 'Account group created successfully',
            'data' => $group,
        ], 201);
    }

    /**
     * Display the specified account group
     * GET /account-groups/{id}
     */
    public function show(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'view']);

        $branchId = $this->resolveBranchId($request);

        $group = AccountGroup::with(['accountType', 'parent', 'children', 'accounts.accountType'])
            ->where('branch_id', $branchId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $group,
        ]);
    }

    /**
     * Update the specified account group
     * PUT /account-groups/{id}
     */
    public function update(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'edit']);

        $branchId = $this->resolveBranchId($request);
        $group = AccountGroup::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code_prefix_start' => 'sometimes|required|string|max:20',
            'code_prefix_end' => 'nullable|string|max:20',
            'account_type_id' => 'sometimes|required|exists:account_types,id',
            'parent_id' => 'nullable|exists:account_groups,id',
        ]);

        // Prevent self-reference
        if (isset($validated['parent_id']) && $validated['parent_id'] == $group->id) {
            return response()->json([
                'success' => false,
                'message' => 'A group cannot be its own parent',
            ], 422);
        }

        $group->update($validated);
        $group->load(['accountType', 'parent']);

        return response()->json([
            'success' => true,
            'message' => 'Account group updated successfully',
            'data' => $group,
        ]);
    }

    /**
     * Remove the specified account group
     * DELETE /account-groups/{id}
     */
    public function destroy(Request $request, $id)
    {
        Gate::authorize('perm', ['chart_of_accounts', 'delete']);

        $branchId = $this->resolveBranchId($request);
        $group = AccountGroup::where('branch_id', $branchId)->findOrFail($id);

        // Check for children
        if ($group->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete group with child groups. Delete children first.',
            ], 400);
        }

        // Check for accounts using this group
        if ($group->accounts()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete group with assigned accounts. Reassign accounts first.',
            ], 400);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account group deleted successfully',
        ]);
    }
}
