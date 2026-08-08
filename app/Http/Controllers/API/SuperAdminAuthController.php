<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SuperAdmin;
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

        // Platform super admin (top of the tenant hierarchy)
        $superAdmin = SuperAdmin::where('email', $request->email)->first();

        if ($superAdmin && Hash::check($request->password, $superAdmin->password)) {
            $token = $superAdmin->createToken('superadmin_token')->plainTextToken;

            return response()->json([
                'user_type' => 'superadmin',
                'user' => $superAdmin,
                'token' => $token,
                'token_type' => 'Bearer',
                'permissions' => $this->getCompanyAdminPermissions(),
            ]);
        }

        $company = Company::where('email', $request->email)->first();

        if ($company && Hash::check($request->password, $company->manager_password)) {
            $token = $company->createToken('company_token')->plainTextToken;

            $permissions = $this->getCompanyAdminPermissions();

            return response()->json([
                'user_type' => 'company_admin',
                'user' => $company,
                'token' => $token,
                'token_type' => 'Bearer',
                'permissions' => $permissions
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if ($user && Hash::check($request->password, $user->password)) {
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

        return response()->json([
            'message' => 'Invalid credentials'
        ], 401);
    }

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

    private function getUserPermissions(User $user): array
    {
        if (!$user->role) {
            return [];
        }

        return $user->role->permissions ?? [];
    }

    public function me(Request $request)
    {
        $user = $request->user();

        if ($user instanceof SuperAdmin) {
            return response()->json([
                'user' => $user,
                'user_type' => 'superadmin',
                'permissions' => $this->getCompanyAdminPermissions(),
                'language' => $user->language ?? 'en',
            ]);
        }

        if ($user instanceof Company) {
            return response()->json([
                'user' => $user,
                'user_type' => 'company_admin',
                'permissions' => $this->getCompanyAdminPermissions()
            ]);
        }

        if ($user instanceof User) {
            $responseData = [
                'user' => $user->load(['role', 'company', 'branch']),
                'user_type' => 'user',
                'permissions' => $this->getUserPermissions($user),
                'language' => $user->language,
            ];

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
}
