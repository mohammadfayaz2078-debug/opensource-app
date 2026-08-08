<?php

namespace App\Http\Controllers;

use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    /**
     * Ensure only super admin can access
     */
    protected function authorizeSuperAdmin($request)
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        // Check if user is instance of SuperAdmin
        if (!($user instanceof \App\Models\SuperAdmin)) {
            abort(403, 'Unauthorized - Super admin access required');
        }
    }

    /**
     * Display a listing of super admins
     * GET /super-admin/super-admins
     */
    public function index(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $query = SuperAdmin::query();
        
        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        // Language filter
        if ($request->filled('language')) {
            $query->where('language', $request->language);
        }
        
        // Get per_page parameter
        $perPage = $request->input('per_page', 15);
        
        // Execute pagination
        $superAdmins = $query->latest()->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => $superAdmins->items(),
            'meta' => [
                'current_page' => $superAdmins->currentPage(),
                'last_page' => $superAdmins->lastPage(),
                'per_page' => $superAdmins->perPage(),
                'total' => $superAdmins->total(),
                'from' => $superAdmins->firstItem(),
                'to' => $superAdmins->lastItem(),
                'prev_page_url' => $superAdmins->previousPageUrl(),
                'next_page_url' => $superAdmins->nextPageUrl(),
            ]
        ]);
    }

    /**
     * Store a newly created super admin
     * POST /super-admin/super-admins
     */
    public function store(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:super_admins,email',
            'password' => 'required|string|min:6|confirmed',
            'language' => 'sometimes|in:en,fa,ps',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $request->except('password', 'password_confirmation');
        $data['password'] = Hash::make($request->password);
        
        // Set default language if not provided
        if (!isset($data['language'])) {
            $data['language'] = 'en';
        }
        
        $superAdmin = SuperAdmin::create($data);
        
        return response()->json([
            'success' => true,
            'message' => 'Super admin created successfully',
            'data' => $superAdmin
        ], 201);
    }

    /**
     * Display the specified super admin
     * GET /super-admin/super-admins/{id}
     */
    public function show(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);
        
        $superAdmin = SuperAdmin::find($id);
        
        if (!$superAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Super admin not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $superAdmin
        ]);
    }

    /**
     * Update the specified super admin
     * PUT/PATCH /super-admin/super-admins/{id}
     */
    public function update(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);
        
        $superAdmin = SuperAdmin::find($id);
        
        if (!$superAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Super admin not found'
            ], 404);
        }
        
        // Prevent self-update
        if ($superAdmin->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update your own account through this endpoint. Use profile update.'
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:super_admins,email,' . $id,
            'password' => 'nullable|string|min:6|confirmed',
            'language' => 'sometimes|in:en,fa,ps',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $request->except('password', 'password_confirmation');
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }
        
        $superAdmin->update($data);
        
        return response()->json([
            'success' => true,
            'message' => 'Super admin updated successfully',
            'data' => $superAdmin
        ]);
    }

    /**
     * Remove the specified super admin
     * DELETE /super-admin/super-admins/{id}
     */
    public function destroy(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);
        
        $superAdmin = SuperAdmin::find($id);
        
        if (!$superAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Super admin not found'
            ], 404);
        }
        
        // Prevent deleting yourself
        if ($superAdmin->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete your own account'
            ], 403);
        }
        
        // Check if there are any companies created by this super admin
        $companiesCount = \App\Models\Company::where('created_by', $superAdmin->id)->count();
        
        if ($companiesCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete super admin. They have created {$companiesCount} company(ies). Transfer or delete companies first."
            ], 400);
        }
        
        $superAdmin->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Super admin deleted successfully'
        ]);
    }

    /**
     * Toggle super admin status
     * POST /super-admin/super-admins/{id}/toggle-status
     */
    public function toggleStatus(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);
        
        $superAdmin = SuperAdmin::find($id);
        
        if (!$superAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Super admin not found'
            ], 404);
        }
        
        // Prevent toggling your own status
        if ($superAdmin->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change your own status'
            ], 403);
        }
        
        // This requires an 'is_active' column in super_admins table
        // If you want to implement this, add the column to migration:
        // $table->boolean('is_active')->default(true);
        
        // Check if is_active column exists (uncomment after adding column)
        /*
        $superAdmin->is_active = !$superAdmin->is_active;
        $superAdmin->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Super admin status updated successfully',
            'data' => [
                'id' => $superAdmin->id,
                'name' => $superAdmin->name,
                'is_active' => $superAdmin->is_active
            ]
        ]);
        */
        
        return response()->json([
            'success' => false,
            'message' => 'Status toggle not implemented. Add is_active column to super_admins table first.'
        ], 501);
    }

    /**
     * Update the authenticated super admin's language
     * POST /super-admin/language
     */
    public function updateLanguage(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $request->validate(['language' => 'required|in:en,fa,ps']);

        $user = $request->user();
        $user->language = $request->language;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Language updated',
            'language' => $user->language,
        ]);
    }

    /**
     * Logout the authenticated super admin
     * POST /super-admin/logout
     */
    public function logout(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current super admin profile
     * GET /super-admin/profile
     */
    public function profile(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $user = $request->user();
        
        return response()->json([
            'success' => true,
            'data' => $user
        ]);
    }

    /**
     * Update current super admin profile
     * PUT /super-admin/profile
     */
    public function updateProfile(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:super_admins,email,' . $user->id,
            'current_password' => 'required_with:new_password',
            'new_password' => 'nullable|string|min:6|confirmed',
            'language' => 'sometimes|in:en,fa,ps',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Verify current password if trying to change password
        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect',
                    'errors' => ['current_password' => ['The current password is incorrect.']]
                ], 422);
            }
            
            $user->password = Hash::make($request->new_password);
        }
        
        if ($request->filled('name')) {
            $user->name = $request->name;
        }
        
        if ($request->filled('email')) {
            $user->email = $request->email;
        }
        
        if ($request->filled('language')) {
            $user->language = $request->language;
        }
        
        $user->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => $user
        ]);
    }
}