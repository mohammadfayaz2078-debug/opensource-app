<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperAdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 👑 Check if user exists in super_admins table
        $superAdmin = SuperAdmin::where('email', $request->email)->first();

        if ($superAdmin && Hash::check($request->password, $superAdmin->password)) {
            $token = $superAdmin->createToken('super_admin_token')->plainTextToken;

            return response()->json([
                'user_type' => 'super_admin',
                'user' => $superAdmin,
                'token' => $token,
                'token_type' => 'Bearer'
            ]);
        }

        // 🏢 Check if user exists in companies table
        // Use 'email' column for login, and 'manager_password' for password check
        $company = Company::where('email', $request->email)->first();

        if ($company && Hash::check($request->password, $company->manager_password)) {
            $token = $company->createToken('company_token')->plainTextToken;
            
            // Get permissions for company admin (full access)
            $permissions = $this->getCompanyAdminPermissions();

            return response()->json([
                'user_type' => 'company_admin',
                'user' => $company,
                'token' => $token,
                'token_type' => 'Bearer',
                'permissions' => $permissions
            ]);
        }

        // 👤 Check regular users table
        $user = User::where('email', $request->email)->first();
        
        if ($user && Hash::check($request->password, $user->password)) {
            // Check if user is active
            if (!$user->status) {
                return response()->json([
                    'message' => 'Your account is deactivated. Please contact administrator.'
                ], 403);
            }
            
            $token = $user->createToken('user_token')->plainTextToken;
            $permissions = $this->getUserPermissions($user);

            return response()->json([
                'user_type' => 'user',
                'user' => $user->load(['role', 'company', 'branch']),
                'token' => $token,
                'token_type' => 'Bearer',
                'permissions' => $permissions
            ]);
        }

        // If no user found in any table
        return response()->json([
            'message' => 'Invalid credentials'
        ], 401);
    }

    /**
     * Get permissions for company admin (full access to their company)
     */
    private function getCompanyAdminPermissions(): array
    {
        $defaultPermissions = config('permissions', []);
        $allPermissions = [];
        
        foreach ($defaultPermissions as $module => $actions) {
            $allPermissions[$module] = [];
            foreach ($actions as $action => $value) {
                $allPermissions[$module][$action] = true;
            }
        }
        
        return $allPermissions;
    }

    /**
     * Get permissions for regular user
     */
    private function getUserPermissions(User $user): array
    {
        if (!$user->role) {
            return [];
        }

        return $user->role->permissions ?? [];
    }





    // In SuperAdminAuthController.php
    public function me(Request $request)
    {
        $user = $request->user();
        $userType = null;
        
        if ($user instanceof SuperAdmin) {
            $userType = 'super_admin';
            return response()->json([
                'user' => $user,
                'user_type' => $userType,
                'permissions' => $this->getSuperAdminPermissions()
            ]);
        }
        
        if ($user instanceof Company) {
            $userType = 'company_admin';
            return response()->json([
                'user' => $user,
                'user_type' => $userType,
                'permissions' => $this->getCompanyAdminPermissions()
            ]);
        }
        
        if ($user instanceof User) {
            $userType = 'user';
            $responseData = [
                'user' => $user->load(['role', 'company', 'branch']),
                'user_type' => $userType,
                'permissions' => $this->getUserPermissions($user),
                'language' => $user->language,
            ];

            // Check if this is an impersonation session
            $currentToken = $user->currentAccessToken();
            $tokenName = $currentToken->name ?? '';
            if (str_starts_with($tokenName, 'impersonated_by_company_')) {
                $companyId = (int) str_replace('impersonated_by_company_', '', $tokenName);
                $company = Company::find($companyId);
                $responseData['is_impersonating'] = true;
                $responseData['impersonated_by'] = [
                    'id' => $companyId,
                    'company_name' => $company ? $company->company_name : null,
                    'type' => 'company_admin',
                ];
            }

            return response()->json($responseData);
        }
        
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    private function getSuperAdminPermissions(): array
    {
        $defaultPermissions = config('permissions', []);
        $allPermissions = [];
        
        foreach ($defaultPermissions as $module => $actions) {
            $allPermissions[$module] = [];
            foreach ($actions as $action => $value) {
                $allPermissions[$module][$action] = true;
            }
        }
        
        return $allPermissions;
    }
}