<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CompanyAdminController extends Controller
{
    /**
     * Ensure authenticated user is a company admin
     */
    protected function authorizeCompanyAdmin(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        if (!($user instanceof Company)) {
            abort(403, 'Unauthorized - Company admin access required');
        }

        return $user;
    }

    /**
     * Get company admin dashboard data (branches list + stats)
     */
    public function dashboard(Request $request)
    {
        $company = $this->authorizeCompanyAdmin($request);

        $branches = $company->branches()->withCount('users')->get();

        $stats = [
            'total_branches' => $branches->count(),
            'active_branches' => $branches->where('is_active', true)->count(),
            'inactive_branches' => $branches->where('is_active', false)->count(),
            'total_users' => $company->users()->count(),
        ];

        return response()->json([
            'success' => true,
            'company' => $company,
            'branches' => $branches,
            'stats' => $stats,
        ]);
    }

    /**
     * Get all branches for this company
     */
    public function branches(Request $request)
    {
        $company = $this->authorizeCompanyAdmin($request);

        $query = $company->branches()->withCount('users');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('branch_name', 'like', "%{$search}%")
                  ->orWhere('branch_province', 'like', "%{$search}%")
                  ->orWhere('branch_district', 'like', "%{$search}%")
                  ->orWhere('branch_phone', 'like', "%{$search}%")
                  ->orWhere('branch_email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $perPage = $request->input('per_page', 999);
        $branches = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $branches->items(),
            'meta' => [
                'current_page' => $branches->currentPage(),
                'last_page' => $branches->lastPage(),
                'per_page' => $branches->perPage(),
                'total' => $branches->total(),
            ]
        ]);
    }

    /**
     * Impersonate a branch (login as branch admin)
     * Similar to how SuperAdmin impersonates a company
     */
    public function impersonateBranch(Request $request, $id)
    {
        $company = $this->authorizeCompanyAdmin($request);

        $branch = Branch::where('id', $id)
            ->where('company_id', $company->id)
            ->first();

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'Branch not found or does not belong to your company.',
            ], 404);
        }

        if (!$branch->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot login to an inactive branch.',
            ], 403);
        }

        // Get permissions (full access since company admin is impersonating)
        $defaultPermissions = config('permissions', []);
        $allPerms = [];
        foreach ($defaultPermissions as $module => $actions) {
            $allPerms[$module] = [];
            foreach ($actions as $action => $value) {
                $allPerms[$module][$action] = true;
            }
        }

        // Find or create an admin role for this branch
        $adminRole = Role::where('role_name', 'admin')
            ->where('branch_id', $branch->id)
            ->first();

        if (!$adminRole) {
            $adminRole = Role::create([
                'role_name' => 'admin',
                'branch_id' => $branch->id,
                'permissions' => $allPerms,
            ]);
        } else {
            // Ensure admin role has full permissions
            $adminRole->update(['permissions' => $allPerms]);
        }

        // Prefer an existing admin user for this branch
        $branchUser = User::where('branch_id', $branch->id)
            ->where('role_id', $adminRole->id)
            ->where('status', true)
            ->first();

        if (!$branchUser) {
            // Create a branch admin user.
            // SECURITY: the password is a random secret (never a predictable value).
            // These accounts are impersonation vehicles only and are not meant to
            // be used for direct login.
            $branchUser = User::firstOrCreate(
                ['email' => 'admin@branch-' . $branch->id . '.local'],
                [
                    'company_id' => $company->id,
                    'branch_id' => $branch->id,
                    'role_id' => $adminRole->id,
                    'first_name' => 'Branch',
                    'last_name' => 'Admin',
                    'password' => \Illuminate\Support\Str::random(32),
                    'phone' => $branch->branch_phone,
                    'status' => true,
                    'language' => $company->language ?? 'en',
                ]
            );

            // Ensure admin role is assigned
            if ($branchUser->role_id !== $adminRole->id) {
                $branchUser->update(['role_id' => $adminRole->id, 'status' => true]);
            }
        }

        // Create token for the branch user
        $token = $branchUser->createToken('impersonated_branch_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => "Logged in to branch: {$branch->branch_name}",
            'user_type' => 'user',
            'user' => $branchUser->load(['role', 'company', 'branch']),
            'token' => $token,
            'token_type' => 'Bearer',
            'permissions' => $allPerms,
        ]);
    }

    /**
     * Update company language
     */
    public function updateLanguage(Request $request)
    {
        $company = $this->authorizeCompanyAdmin($request);

        $request->validate(['language' => 'required|in:en,fa,ps']);

        $company->language = $request->language;
        $company->save();

        return response()->json([
            'success' => true,
            'message' => 'Language updated',
            'language' => $company->language,
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $company = $this->authorizeCompanyAdmin($request);
        $company->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }
}
