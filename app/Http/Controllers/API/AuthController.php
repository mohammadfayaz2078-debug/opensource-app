<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\Company;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use App\Helpers\AuthHelper;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
/**
 * Register a new user
 */
public function register(Request $request)
{
    Gate::authorize('perm', ['users', 'create']);

    try {
        $authUser = $request->user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'role_id' => 'required|exists:roles,id',
            'branch_id' => 'nullable|exists:branches,id',
            'company_id' => 'nullable|exists:companies,id',
            'language' => 'sometimes|in:en,fa,ps',
            'status' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Determine company_id and branch_id based on authenticated user
        $companyId = null;
        $branchId = null;
        $branch = null;

        if (AuthHelper::isBranchUser()) {
            // Regular user - force their own company and branch
            $companyId = AuthHelper::getCompanyId();
            $branchId = AuthHelper::getBranchId();
            
            // Get the branch to check user limit
            $branch = Branch::find($branchId);
        } elseif (AuthHelper::isCompanyAdmin()) {
            // Company admin - force their own company
            $companyId = AuthHelper::getCompanyId();
            $branchId = $request->branch_id; // Can select branch within their company
            
            // Verify branch belongs to this company
            if ($branchId) {
                $branch = Branch::where('id', $branchId)->where('company_id', $companyId)->first();
                if (!$branch) {
                    return response()->json([
                        'message' => 'Invalid branch for this company',
                        'errors' => [
                            'branch_id' => ['Invalid branch for this company']
                        ]
                    ], 422);
                }
            }
        } else {
            // Super Admin - can set from request
            $companyId = $request->company_id;
            $branchId = $request->branch_id;
            
            if ($branchId) {
                $branch = Branch::find($branchId);
            }
        }

        // If branch_id is required but not provided, return error
        if (!$branchId && !AuthHelper::isBranchUser()) {
            return response()->json([
                'message' => 'Branch selection is required',
                'errors' => [
                    'branch_id' => ['Branch selection is required']
                ]
            ], 422);
        }

        if (!$this->roleIsAvailableForBranch((int) $request->role_id, (int) $branchId)) {
            return response()->json([
                'message' => 'The selected role is not available for this branch',
                'errors' => ['role_id' => ['The selected role is not assigned to this branch']],
            ], 422);
        }

        // Check if branch exists and validate user limit
        if ($branch) {
            // Check if branch is active
            if (!$branch->is_active) {
                return response()->json([
                    'message' => 'Cannot register user to an inactive branch',
                    'errors' => [
                        'branch_id' => ['This branch is inactive. Please activate the branch first.']
                    ]
                ], 422);
            }

            // Get current user count for this branch
            $currentUserCount = User::where('branch_id', $branch->id)->count();
            $allowedUserCount = $branch->allowed_user_count ?? 1;

            // Check if user limit has been reached
            if ($currentUserCount >= $allowedUserCount) {
                return response()->json([
                    'message' => 'User limit reached for this branch',
                    'errors' => [
                        'branch_id' => [
                            sprintf(
                                'User limit reached for this branch. Maximum allowed: %d users. Current: %d users. No slots available.',
                                $allowedUserCount,
                                $currentUserCount
                            )
                        ]
                    ],
                    'branch_capacity' => [
                        'current_users' => $currentUserCount,
                        'max_allowed' => $allowedUserCount,
                        'remaining_slots' => 0,
                        'is_full' => true
                    ]
                ], 422);
            }

            // Check if there are remaining slots (warning, but not error)
            $remainingSlots = $allowedUserCount - $currentUserCount;
            if ($remainingSlots <= 0) {
                return response()->json([
                    'message' => 'No available user slots in this branch',
                    'errors' => [
                        'branch_id' => [
                            sprintf(
                                'No available user slots. Maximum capacity: %d users. Current: %d users.',
                                $allowedUserCount,
                                $currentUserCount
                            )
                        ]
                    ],
                    'branch_capacity' => [
                        'current_users' => $currentUserCount,
                        'max_allowed' => $allowedUserCount,
                        'remaining_slots' => 0,
                        'is_full' => true
                    ]
                ], 422);
            }
        }

        // Create the user
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'role_id' => $request->role_id,
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'language' => $request->language ?? 'en',
            'status' => $request->status ?? true,
        ]);

        // Get updated user count after registration
        $updatedUserCount = User::where('branch_id', $branchId)->count();
        $remainingSlotsAfter = ($branch->allowed_user_count ?? 1) - $updatedUserCount;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user->load(['role', 'company', 'branch']),
            'branch_capacity' => [
                'branch_name' => $branch ? $branch->branch_name : null,
                'current_users' => $updatedUserCount,
                'max_allowed' => $branch ? $branch->allowed_user_count : 1,
                'remaining_slots' => max(0, $remainingSlotsAfter),
                'is_full' => $remainingSlotsAfter <= 0
            ]
        ], 201);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Registration failed',
            'error' => $e->getMessage()
        ], 500);
    }
}
    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get users list
     */
    public function user(Request $request)
    {
        Gate::authorize('perm', ['users', 'view']);

        $query = User::with(['role', 'company', 'branch']);

        // Filter based on user type
        if (AuthHelper::isCompanyAdmin()) {
            // Company admin - show users from their company
            $companyId = AuthHelper::getCompanyId();
            $query->where('company_id', $companyId);
        } elseif (AuthHelper::isBranchUser()) {
            // Branch user - show only users from their branch
            $companyId = AuthHelper::getCompanyId();
            $branchId = AuthHelper::getBranchId();
            $query->where('company_id', $companyId)
                  ->where('branch_id', $branchId);
        }
        // Super admin - show all users

        // Search filter
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by role
        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        // Filter by company (only for super admin)
        if ($request->filled('company_id') && !AuthHelper::isCompanyAdmin() && !AuthHelper::isBranchUser()) {
            $query->where('company_id', $request->company_id);
        }

        // Filter by branch (only for super admin or company admin)
        if ($request->filled('branch_id')) {
            if (AuthHelper::isCompanyAdmin()) {
                // Verify branch belongs to their company
                $companyId = AuthHelper::getCompanyId();
                $branch = Branch::where('id', $request->branch_id)->where('company_id', $companyId)->first();
                if ($branch) {
                    $query->where('branch_id', $request->branch_id);
                }
            } elseif (!AuthHelper::isBranchUser()) {
                $query->where('branch_id', $request->branch_id);
            }
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', filter_var($request->status, FILTER_VALIDATE_BOOLEAN));
        }

        // Pagination
        $perPage = $request->per_page ?? 10;
        $users = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $users,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
            'user_info' => [
                'type' => AuthHelper::getUserType(),
                'company_id' => AuthHelper::getCompanyId(),
                'branch_id' => AuthHelper::getBranchId(),
            ]
        ]);
    }

    /**
     * Get single user
     */
    public function getUser($id)
    {
        Gate::authorize('perm', ['users', 'view']);

        $user = User::with(['role', 'company', 'branch'])->find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        // Check if user has access to this user
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            if ($user->company_id !== $companyId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            if ($user->branch_id !== $branchId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $user
        ]);
    }

/**
 * Update user
 */
public function updateUser(Request $request, $id)
{
    Gate::authorize('perm', ['users', 'edit']);

    $authUser = $request->user();
    $user = User::find($id);

    if (!$user) {
        return response()->json([
            'message' => 'User not found'
        ], 404);
    }

    // Check if user has access to update this user
    if (AuthHelper::isCompanyAdmin()) {
        $companyId = AuthHelper::getCompanyId();
        if ($user->company_id !== $companyId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
    } elseif (AuthHelper::isBranchUser()) {
        $branchId = AuthHelper::getBranchId();
        if ($user->branch_id !== $branchId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
    }

    $validator = Validator::make($request->all(), [
        'first_name' => 'required|string|max:255',
        'last_name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users,email,' . $id,
        'password' => 'nullable|string|min:8|confirmed',
        'phone' => 'nullable|string|max:20',
        'role_id' => 'required|exists:roles,id',
        'branch_id' => 'nullable|exists:branches,id',
        'company_id' => 'nullable|exists:companies,id',
        'language' => 'sometimes|in:en,fa,ps',
        'status' => 'sometimes|boolean',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    // Determine company_id and branch_id based on authenticated user
    $companyId = $user->company_id;
    $branchId = $user->branch_id;
    $newBranch = null;

    if (AuthHelper::isCompanyAdmin()) {
        // Company admin - force their own company
        $companyId = AuthHelper::getCompanyId();
        $branchId = $request->branch_id;
        
        // Verify branch belongs to their company
        if ($branchId) {
            $newBranch = Branch::where('id', $branchId)->where('company_id', $companyId)->first();
            if (!$newBranch) {
                return response()->json([
                    'message' => 'Invalid branch for this company',
                    'errors' => [
                        'branch_id' => ['Invalid branch for this company']
                    ]
                ], 422);
            }
        }
    } elseif (AuthHelper::isBranchUser()) {
        // Branch user - force their own company and branch
        $companyId = AuthHelper::getCompanyId();
        $branchId = AuthHelper::getBranchId();
    } else {
        // Super Admin - can set from request
        if ($request->has('company_id')) {
            $companyId = $request->company_id;
        }
        if ($request->has('branch_id')) {
            $branchId = $request->branch_id;
            if ($branchId) {
                $newBranch = Branch::find($branchId);
            }
        }
    }

    // If branch is being changed, check capacity of the new branch
    if ($branchId && $branchId !== $user->branch_id) {
        $branch = $newBranch ?? Branch::find($branchId);
        
        if ($branch) {
            // Check if branch is active
            if (!$branch->is_active) {
                return response()->json([
                    'message' => 'Cannot move user to an inactive branch',
                    'errors' => [
                        'branch_id' => ['This branch is inactive. Please activate the branch first.']
                    ]
                ], 422);
            }

            // Get current user count for this branch (excluding the user being moved)
            $currentUserCount = User::where('branch_id', $branch->id)
                ->where('id', '!=', $user->id)
                ->count();
            
            $allowedUserCount = $branch->allowed_user_count ?? 1;

            // Check if user limit has been reached
            if ($currentUserCount >= $allowedUserCount) {
                return response()->json([
                    'message' => 'User limit reached for the target branch',
                    'errors' => [
                        'branch_id' => [
                            sprintf(
                                'User limit reached for the target branch. Maximum allowed: %d users. Current: %d users. No slots available.',
                                $allowedUserCount,
                                $currentUserCount
                            )
                        ]
                    ],
                    'branch_capacity' => [
                        'current_users' => $currentUserCount,
                        'max_allowed' => $allowedUserCount,
                        'remaining_slots' => 0,
                        'is_full' => true
                    ]
                ], 422);
            }

            // Check if there are remaining slots
            $remainingSlots = $allowedUserCount - $currentUserCount;
            if ($remainingSlots <= 0) {
                return response()->json([
                    'message' => 'No available user slots in the target branch',
                    'errors' => [
                        'branch_id' => [
                            sprintf(
                                'No available user slots. Maximum capacity: %d users. Current: %d users.',
                                $allowedUserCount,
                                $currentUserCount
                            )
                        ]
                    ],
                    'branch_capacity' => [
                        'current_users' => $currentUserCount,
                        'max_allowed' => $allowedUserCount,
                        'remaining_slots' => 0,
                        'is_full' => true
                    ]
                ], 422);
            }
        }
    }

    if (!$this->roleIsAvailableForBranch((int) $request->role_id, (int) $branchId)) {
        return response()->json([
            'message' => 'The selected role is not available for this branch',
            'errors' => ['role_id' => ['The selected role is not assigned to this branch']],
        ], 422);
    }

    // Update user
    $user->first_name = $request->first_name;
    $user->last_name = $request->last_name;
    $user->email = $request->email;
    $user->phone = $request->phone;
    $user->role_id = $request->role_id;
    $user->company_id = $companyId;
    $user->branch_id = $branchId;
    
    if ($request->has('language')) {
        $user->language = $request->language;
    }
    
    if ($request->has('status')) {
        $user->status = $request->status;
    }

    if ($request->filled('password')) {
        $user->password = Hash::make($request->password);
    }

    $user->save();

    return response()->json([
        'message' => 'User updated successfully',
        'user' => $user->load(['role', 'company', 'branch'])
    ]);
}

    /**
     * Delete user
     */
    public function deleteUser($id)
    {
        Gate::authorize('perm', ['users', 'delete']);

        try {
            $user = User::findOrFail($id);

            // Prevent deleting yourself
            if (auth()->id() === $user->id) {
                return response()->json([
                    'message' => 'Cannot delete your own account'
                ], 403);
            }

            // Check if user has access to delete this user
            if (AuthHelper::isCompanyAdmin()) {
                $companyId = AuthHelper::getCompanyId();
                if ($user->company_id !== $companyId) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            } elseif (AuthHelper::isBranchUser()) {
                $branchId = AuthHelper::getBranchId();
                if ($user->branch_id !== $branchId) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            return DB::transaction(function () use ($user) {
                // Delete related tokens first
                $user->tokens()->delete();

                $user->delete();

                return response()->json([
                    'message' => 'User deleted successfully'
                ]);
            });
        } catch (\PDOException $e) {
            return response()->json([
                'message' => 'Database error: Cannot delete user due to related records.',
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json([
                'message' => 'Cannot delete this user because they have related records in the system.',
                'error' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get authenticated user profile
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        // Load relationships based on user type
        if (AuthHelper::isCompanyAdmin()) {
            $user = Company::with(['branches'])->find($user->id);
        } elseif (AuthHelper::isBranchUser()) {
            $user = $user->load(['role', 'company', 'branch']);
        } else {
            $user = $user->load(['role', 'company', 'branch']);
        }
        
        $permissions = $this->getUserPermissions($request->user());

        return response()->json([
            'user' => $user,
            'permissions' => $permissions,
            'language' => $user->language ?? 'en',
            'user_type' => AuthHelper::getUserType(),
        ]);
    }

    /**
     * Get user profile
     */
    public function getProfile(Request $request)
    {
        return $this->me($request);
    }

    /**
     * Update authenticated user's profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'current_password' => 'required_with:new_password',
            'new_password' => 'nullable|string|min:8|confirmed',
            'language' => 'sometimes|in:en,fa,ps',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify current password if trying to change password
        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect',
                    'errors' => ['current_password' => ['The current password is incorrect.']]
                ], 422);
            }

            $user->password = Hash::make($request->new_password);
        }

        $user->first_name = $request->first_name;
        $user->last_name = $request->last_name;
        $user->email = $request->email;
        $user->phone = $request->phone;
        
        if ($request->has('language')) {
            $user->language = $request->language;
        }
        
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(['role', 'company', 'branch'])
        ]);
    }

    /**
     * Get branches and roles for dropdowns
     */
    public function getBranchesAndRoles(Request $request)
    {
        $query = Role::query();
        
        if (AuthHelper::isBranchUser()) {
            // Branch user - show only roles from their branch
            $branchId = AuthHelper::getBranchId();
            $query->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)
                    ->orWhereHas('branches', fn ($branches) => $branches->where('branches.id', $branchId));
            });
        } elseif (AuthHelper::isCompanyAdmin()) {
            // Company admin - show roles from their company's branches
            $companyId = AuthHelper::getCompanyId();
            $branchIds = Branch::where('company_id', $companyId)->pluck('id')->toArray();
            $query->where(function($q) use ($branchIds) {
                $q->whereNull('branch_id')
                  ->orWhereIn('branch_id', $branchIds)
                  ->orWhereHas('branches', fn ($branches) => $branches->whereIn('branches.id', $branchIds));
            });
        }

        // Hide admin/superadmin roles from non-super-admin users
        if (AuthHelper::isCompanyAdmin() || AuthHelper::isBranchUser()) {
            $query->whereNotIn('role_name', ['admin', 'superadmin']);
        }

        $roles = $query->with('branches:id,branch_name')->get(['id', 'role_name', 'branch_id']);

        $branchQuery = Branch::query();
        
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $branchQuery->where('company_id', $companyId);
        } elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            $branchQuery->where('id', $branchId);
        }
        
        $branches = $branchQuery->get(['id', 'branch_name', 'branch_province']);

        // Get companies for super admin
        $companies = [];
        if (!AuthHelper::isCompanyAdmin() && !AuthHelper::isBranchUser()) {
            $companies = Company::get(['id', 'company_name']);
        }

        return response()->json([
            'branches' => $branches,
            'roles' => $roles,
            'companies' => $companies,
        ]);
    }

    private function roleIsAvailableForBranch(int $roleId, int $branchId): bool
    {
        return Role::whereKey($roleId)
            ->where(function ($query) use ($branchId) {
                $query->whereNull('branch_id')
                    ->orWhere('branch_id', $branchId)
                    ->orWhereHas('branches', fn ($branches) => $branches->where('branches.id', $branchId));
            })
            ->exists();
    }

    /**
     * Toggle user status
     */
    public function toggleStatus($id)
    {
        Gate::authorize('perm', ['users', 'edit']);

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        // Prevent deactivating yourself
        if (auth()->id() === $user->id) {
            return response()->json([
                'message' => 'Cannot change your own status'
            ], 403);
        }

        // Check access
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            if ($user->company_id !== $companyId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            if ($user->branch_id !== $branchId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $user->status = !$user->status;
        $user->save();

        return response()->json([
            'message' => $user->status ? 'User activated successfully' : 'User deactivated successfully',
            'status' => $user->status
        ]);
    }

    /**
     * Bulk delete users
     */
    public function bulkDelete(Request $request)
    {
        Gate::authorize('perm', ['users', 'delete']);

        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Remove current user from deletion list
        $userIds = array_diff($request->user_ids, [auth()->id()]);

        if (empty($userIds)) {
            return response()->json([
                'message' => 'No users to delete'
            ], 400);
        }

        // Apply access filtering
        $query = User::whereIn('id', $userIds);
        
        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $query->where('company_id', $companyId);
        } elseif (AuthHelper::isBranchUser()) {
            $branchId = AuthHelper::getBranchId();
            $query->where('branch_id', $branchId);
        }

        $count = $query->delete();

        return response()->json([
            'message' => "{$count} users deleted successfully",
            'deleted_count' => $count
        ]);
    }

    /**
     * Get user statistics
     */
    public function statistics(Request $request)
    {
        Gate::authorize('perm', ['users', 'view']);

        $query = User::query();

        if (AuthHelper::isCompanyAdmin()) {
            $companyId = AuthHelper::getCompanyId();
            $query->where('company_id', $companyId);
        } elseif (AuthHelper::isBranchUser()) {
            $companyId = AuthHelper::getCompanyId();
            $branchId = AuthHelper::getBranchId();
            $query->where('company_id', $companyId)
                  ->where('branch_id', $branchId);
        }

        $stats = [
            'total_users' => (clone $query)->count(),
            'active_users' => (clone $query)->where('status', true)->count(),
            'inactive_users' => (clone $query)->where('status', false)->count(),
            'users_by_role' => (clone $query)
                ->select('role_id', DB::raw('count(*) as total'))
                ->with('role:id,role_name')
                ->groupBy('role_id')
                ->get(),
            'users_by_branch' => (clone $query)
                ->select('branch_id', DB::raw('count(*) as total'))
                ->with('branch:id,branch_name')
                ->groupBy('branch_id')
                ->get(),
            'recent_users' => (clone $query)
                ->with(['role', 'branch'])
                ->latest()
                ->limit(5)
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get user permissions helper
     */
    private function getUserPermissions($user): array
    {
        if (AuthHelper::isCompanyAdmin()) {
            // Company admin has full access to their company's data
            return $this->getCompanyAdminPermissions();
        }
        
        if (!$user->role) {
            return [];
        }

        return $user->role->permissions ?? [];
    }

    /**
     * Get company admin permissions (full access)
     */
    private function getCompanyAdminPermissions(): array
    {
        $modules = config('permissions', []);
        $permissions = [];
        
        foreach ($modules as $module => $actions) {
            $permissions[$module] = [];
            foreach ($actions as $action => $defaultValue) {
                $permissions[$module][$action] = true;
            }
        }
        
        return $permissions;
    }
}
