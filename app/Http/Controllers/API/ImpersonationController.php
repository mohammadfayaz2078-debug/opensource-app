<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    /**
     * Ensure authenticated user is a company admin
     */
    protected function authorizeCompanyAdmin(Request $request): Company
    {
        $user = $request->user();

        if (!$user || !($user instanceof Company)) {
            abort(403, 'Unauthorized - Company admin access required');
        }

        return $user;
    }

    /**
     * Get all users for a specific branch (Company Admin only)
     */
    public function branchUsers(Request $request, $branchId)
    {
        $company = $this->authorizeCompanyAdmin($request);

        $branch = Branch::where('id', $branchId)
            ->where('company_id', $company->id)
            ->first();

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'Branch not found or does not belong to your company.',
            ], 404);
        }

        $query = User::where('branch_id', $branch->id)
            ->with(['role']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role ? $user->role->role_name : null,
                'status' => $user->status,
                'is_active' => $user->status,
            ];
        });

        return response()->json([
            'success' => true,
            'branch' => [
                'id' => $branch->id,
                'branch_name' => $branch->branch_name,
            ],
            'users' => $users,
        ]);
    }

    /**
     * Start impersonation - login as a specific branch user
     */
    public function startImpersonation(Request $request, $userId)
    {
        $company = $this->authorizeCompanyAdmin($request);

        // Find the user and verify they belong to this company
        $targetUser = User::where('id', $userId)
            ->where('company_id', $company->id)
            ->with(['role', 'branch'])
            ->first();

        if (!$targetUser) {
            return response()->json([
                'success' => false,
                'message' => 'User not found or does not belong to your company.',
            ], 404);
        }

        if (!$targetUser->status) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot impersonate an inactive user.',
            ], 403);
        }

        // Create a token for the impersonated user with a special name
        $tokenName = 'impersonated_by_company_' . $company->id;
        $token = $targetUser->createToken($tokenName)->plainTextToken;

        // Get permissions for the impersonated user
        $permissions = $targetUser->role ? ($targetUser->role->permissions ?? []) : [];

        return response()->json([
            'success' => true,
            'message' => "Now logged in as {$targetUser->full_name}",
            'impersonation' => true,
            'impersonated_by' => [
                'id' => $company->id,
                'company_name' => $company->company_name,
                'type' => 'company_admin',
            ],
            'user_type' => 'user',
            'user' => $targetUser->load(['role', 'company', 'branch']),
            'token' => $token,
            'token_type' => 'Bearer',
            'permissions' => $permissions,
        ]);
    }

    /**
     * Stop impersonation - return to company admin
     * Called with the impersonated user's token
     */
    public function stopImpersonation(Request $request)
    {
        $user = $request->user();

        if (!$user || !($user instanceof User)) {
            return response()->json([
                'success' => false,
                'message' => 'No active impersonation session.',
            ], 400);
        }

        // Check if this token is an impersonation token
        $currentToken = $user->currentAccessToken();
        $tokenName = $currentToken->name ?? '';

        if (!str_starts_with($tokenName, 'impersonated_by_company_')) {
            return response()->json([
                'success' => false,
                'message' => 'No active impersonation session.',
            ], 400);
        }

        // Extract company ID from token name
        $companyId = (int) str_replace('impersonated_by_company_', '', $tokenName);

        // Delete the impersonation token
        $currentToken->delete();

        return response()->json([
            'success' => true,
            'message' => 'Impersonation ended. Returning to Company Admin.',
            'company_id' => $companyId,
        ]);
    }

    /**
     * Check if current session is an impersonation
     */
    public function checkImpersonation(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'is_impersonating' => false,
            ], 401);
        }

        // If user is a User model, check token name
        if ($user instanceof User) {
            $currentToken = $user->currentAccessToken();
            $tokenName = $currentToken->name ?? '';

            if (str_starts_with($tokenName, 'impersonated_by_company_')) {
                $companyId = (int) str_replace('impersonated_by_company_', '', $tokenName);
                $company = Company::find($companyId);

                return response()->json([
                    'success' => true,
                    'is_impersonating' => true,
                    'impersonated_user' => [
                        'id' => $user->id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                    ],
                    'impersonated_by' => [
                        'id' => $companyId,
                        'company_name' => $company ? $company->company_name : null,
                        'type' => 'company_admin',
                    ],
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'is_impersonating' => false,
        ]);
    }

}
