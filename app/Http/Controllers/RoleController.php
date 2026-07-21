<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use App\Helpers\AuthHelper;

class RoleController extends Controller
{
    /**
     * Display a listing of roles with their permissions.
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['roles', 'view']);

        $query = Role::with('branch');

        // Apply branch filtering based on authenticated user type
        if (AuthHelper::isCompanyAdmin()) {
            // Company admin: show roles from all branches of their company
            $companyId = AuthHelper::getCompanyId();
            
            // Get all branch IDs for this company
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            
            // Show roles from these branches OR global roles (branch_id = null)
            $query->where(function($q) use ($branchIds) {
                $q->whereNull('branch_id') // Global roles
                  ->orWhereIn('branch_id', $branchIds); // Company branch roles
            });

        } 
        elseif (AuthHelper::isBranchUser()) {
            // Branch user: show only roles from their specific branch
            $branchId = AuthHelper::getBranchId();
            $query->where(function($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->orWhereNull('branch_id'); // Also include global roles
            });
        }

        // Hide admin/superadmin roles from non-super-admin users
        if (AuthHelper::isCompanyAdmin() || AuthHelper::isBranchUser()) {
            $query->whereNotIn('role_name', ['admin', 'superadmin']);
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('role_name', 'like', "%{$search}%");
        }

        // Filter by branch (only for super admin)
        if ($request->filled('branch_id') && !AuthHelper::isCompanyAdmin() && !AuthHelper::isBranchUser()) {
            $query->where('branch_id', $request->branch_id);
        }

        // Filter by global roles only
        if ($request->boolean('global_only')) {
            $query->whereNull('branch_id');
        }

        // Filter by branch-specific roles only
        if ($request->boolean('branch_specific_only')) {
            $query->whereNotNull('branch_id');
        }

        // Order by
        $query->orderBy('id', 'desc');

        // Pagination
        $perPage = $request->per_page ?? 10;
        $roles = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $roles,
            'meta' => [
                'current_page' => $roles->currentPage(),
                'last_page' => $roles->lastPage(),
                'per_page' => $roles->perPage(),
                'total' => $roles->total(),
            ],
            'user_info' => [
                'type' => AuthHelper::getUserType(),
                'company_id' => AuthHelper::getCompanyId(),
                'branch_id' => AuthHelper::getBranchId(),
            ]
        ]);
    }

    /**
     * Store a new role with permissions.
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['roles', 'create']);

        $validator = Validator::make($request->all(), [
            'role_name' => 'required|string|max:191|unique:roles,role_name',
            'permissions' => 'nullable|array',
            'branch_id' => 'required|integer|exists:branches,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Determine branch_id based on user type
        $branchId = null;
        
        if (AuthHelper::isCompanyAdmin()) {
            // Company admin: verify the branch belongs to their company
            $companyId = AuthHelper::getCompanyId();
            $branch = Branch::where('id', $request->branch_id)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$branch) {
                return response()->json([
                    'message' => 'You can only create roles for branches belonging to your company'
                ], 403);
            }
            
            $branchId = $request->branch_id;
        } 
        elseif (AuthHelper::isBranchUser()) {
            // Branch user: can only create roles for their own branch
            $branchId = AuthHelper::getBranchId();
            
            // Verify the requested branch matches their branch
            if ($request->branch_id != $branchId) {
                return response()->json([
                    'message' => 'You can only create roles for your own branch'
                ], 403);
            }
        }
        else {
            // Super admin - can create for any branch
            $branchId = $request->branch_id;
        }

        // Prepare permissions
        $permissions = null;
        if ($request->filled('permissions') && is_array($request->permissions)) {
            $permissions = $this->formatPermissions($request->permissions);
        }

        // Create role
        $role = Role::create([
            'role_name' => $request->role_name,
            'branch_id' => $branchId,
            'permissions' => $permissions
        ]);

        // Load branch relationship
        $role->load('branch');

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully',
            'data' => $role
        ], 201);
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role)
    {
        Gate::authorize('perm', ['roles', 'view']);

        // Check if user has access to this role
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            
            // Allow if role is global or belongs to company's branches
            if ($role->branch_id !== null && !in_array($role->branch_id, $branchIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } 
        elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            
            // Allow if role is global or belongs to user's branch
            if ($role->branch_id !== null && $role->branch_id !== $branchId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }
        // Super admin can access any role

        $role->load('branch');

        return response()->json([
            'success' => true,
            'data' => $role
        ]);
    }

    /**
     * Update a role and its permissions.
     */
    public function update(Request $request, Role $role)
    {
        Gate::authorize('perm', ['roles', 'edit']);

        // Check if user has access to this role
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            
            // Prevent editing if role doesn't belong to company's branches
            if ($role->branch_id !== null && !in_array($role->branch_id, $branchIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            // Prevent editing admin role
            if ($role->role_name === 'admin') {
                return response()->json(['message' => 'Cannot modify admin role'], 403);
            }
        } 
        elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            
            // Allow only if role belongs to user's branch
            if ($role->branch_id !== $branchId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            // Prevent editing admin role
            if ($role->role_name === 'admin') {
                return response()->json(['message' => 'Cannot modify admin role'], 403);
            }
        }
        // Super admin can edit any role

        $validator = Validator::make($request->all(), [
            'role_name' => 'sometimes|required|string|max:191|unique:roles,role_name,' . $role->id,
            'permissions' => 'nullable|array',
            'branch_id' => 'nullable|integer|exists:branches,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Prepare update data
        $updateData = [];

        // Update role name if provided
        if ($request->filled('role_name')) {
            $updateData['role_name'] = $request->role_name;
        }

        // Handle branch_id update (only for super admin)
        if ($request->has('branch_id') && !AuthHelper::isCompanyAdmin() && !AuthHelper::isBranchUser()) {
            // Don't allow changing admin role's branch_id
            if ($role->role_name !== 'admin') {
                $updateData['branch_id'] = $request->branch_id;
            }
        }

        // Update permissions if provided
        if ($request->filled('permissions') && is_array($request->permissions)) {
            $updateData['permissions'] = $this->formatPermissions($request->permissions);
        }

        // Update role if there are changes
        if (!empty($updateData)) {
            $role->update($updateData);
        }

        // Reload branch relationship
        $role->load('branch');

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully',
            'data' => $role
        ]);
    }

    /**
     * Delete a role.
     */
    public function destroy(Role $role)
    {
        Gate::authorize('perm', ['roles', 'delete']);

        // Check if user has access to this role
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            
            // Prevent deleting if role doesn't belong to company's branches
            if ($role->branch_id !== null && !in_array($role->branch_id, $branchIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            // Prevent deleting admin role
            if ($role->role_name === 'admin') {
                return response()->json(['message' => 'Cannot delete admin role'], 403);
            }
        } 
        elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            
            // Allow only if role belongs to user's branch
            if ($role->branch_id !== $branchId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            // Prevent deleting admin role
            if ($role->role_name === 'admin') {
                return response()->json(['message' => 'Cannot delete admin role'], 403);
            }
        }
        // Super admin can delete any role

        // Check if role is assigned to any users
        $userCount = \App\Models\User::where('role_id', $role->id)->count();

        if ($userCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this role. It is assigned to ' . $userCount . ' user(s).'
            ], 400);
        }

        // Safe to delete
        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully.'
        ]);
    }

    /**
     * Get all available modules from config.
     */
    public function getModules()
    {
        $modules = config('permissions', []);

        if (!is_array($modules)) {
            $modules = [];
        }

        return response()->json([
            'success' => true,
            'modules' => $modules
        ]);
    }

    /**
     * Get roles by branch
     */
    public function getByBranch(Branch $branch)
    {
        Gate::authorize('perm', ['roles', 'view']);

        $roles = Role::where('branch_id', $branch->id)
            ->orWhereNull('branch_id')
            ->get(['id', 'role_name', 'branch_id']);

        return response()->json([
            'success' => true,
            'data' => $roles
        ]);
    }

    /**
     * Get available roles for user assignment
     */
    public function getAvailableRoles(Request $request)
    {
        $query = Role::query();

        if (AuthHelper::isCompanyAdmin()) {
            // Company admin: show roles from their company's branches
            $companyId = AuthHelper::getCompanyId();
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            
            $query->where(function($q) use ($branchIds) {
                $q->whereNull('branch_id')
                  ->orWhereIn('branch_id', $branchIds);
            });
        } 
        elseif (AuthHelper::isBranchUser()) {
            // Branch user: show roles from their branch
            $branchId = AuthHelper::getBranchId();
            $query->where(function($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->orWhereNull('branch_id');
            });
        }

        // Hide admin/superadmin roles from non-super-admin users
        if (AuthHelper::isCompanyAdmin() || AuthHelper::isBranchUser()) {
            $query->whereNotIn('role_name', ['admin', 'superadmin']);
        }

        $roles = $query->get(['id', 'role_name']);

        return response()->json([
            'success' => true,
            'data' => $roles
        ]);
    }

    /**
     * Clone a role to another branch
     */
    public function cloneRole(Request $request, Role $role)
    {
        Gate::authorize('perm', ['roles', 'create']);

        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|exists:branches,id',
            'new_role_name' => 'required|string|max:191|unique:roles,role_name'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify branch access for company admin
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $branch = Branch::where('id', $request->branch_id)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$branch) {
                return response()->json([
                    'message' => 'You can only clone roles to branches belonging to your company'
                ], 403);
            }
        }
        elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            if ($request->branch_id != $branchId) {
                return response()->json([
                    'message' => 'You can only clone roles to your own branch'
                ], 403);
            }
        }

        $newRole = Role::create([
            'role_name' => $request->new_role_name,
            'branch_id' => $request->branch_id,
            'permissions' => $role->permissions
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Role cloned successfully',
            'data' => $newRole
        ], 201);
    }

    /**
     * Get role statistics
     */
    public function statistics()
    {
        Gate::authorize('perm', ['roles', 'view']);

        $stats = [
            'total_roles' => Role::count(),
            'global_roles' => Role::whereNull('branch_id')->count(),
            'branch_specific_roles' => Role::whereNotNull('branch_id')->count(),
            'roles_by_branch' => Role::whereNotNull('branch_id')
                ->select('branch_id', DB::raw('count(*) as total'))
                ->with('branch:id,branch_name')
                ->groupBy('branch_id')
                ->get(),
            'users_by_role' => DB::table('users')
                ->select('role_id', DB::raw('count(*) as total'))
                ->whereNotNull('role_id')
                ->groupBy('role_id')
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Format permissions based on module configuration
     */
    private function formatPermissions(array $permissions): array
    {
        $defaultModules = config('permissions', []);
        
        if (empty($defaultModules)) {
            return $permissions;
        }

        $formattedPermissions = [];

        foreach ($defaultModules as $module => $actions) {
            $formattedPermissions[$module] = [];

            foreach ($actions as $action => $defaultValue) {
                $formattedPermissions[$module][$action] = $permissions[$module][$action] ?? false;
            }
        }

        return $formattedPermissions;
    }
}