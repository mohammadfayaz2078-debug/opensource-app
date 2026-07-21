<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

class CompanyController extends Controller
{
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
     * Display a listing of companies
     */
    public function index(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        // Start query with relations
        $query = Company::with('createdBy');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('company_email', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('manager_name', 'like', "%{$search}%")
                  ->orWhere('manager_phone', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Apply status filter
        if ($request->filled('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        // Apply language filter
        if ($request->filled('language')) {
            $query->where('language', $request->language);
        }

        // Apply city filter
        if ($request->filled('city')) {
            $query->where('city', 'like', "%{$request->city}%");
        }

        // Get per_page parameter
        $perPage = $request->input('per_page', 15);
        
        // Execute pagination
        $companies = $query->latest()->paginate($perPage);

        // Load counts for branches and users
        foreach ($companies as $company) {
            $company->branches_count = $company->branches()->count();
            $company->users_count = $company->users()->count();
        }

        return response()->json([
            'success' => true,
            'data' => $companies->items(),
            'meta' => [
                'current_page' => $companies->currentPage(),
                'last_page' => $companies->lastPage(),
                'per_page' => $companies->perPage(),
                'total' => $companies->total(),
                'from' => $companies->firstItem(),
                'to' => $companies->lastItem(),
                'prev_page_url' => $companies->previousPageUrl(),
                'next_page_url' => $companies->nextPageUrl(),
            ]
        ]);
    }

    /**
     * Store a newly created company
     */
    public function store(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $superAdmin = $request->user();

        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'company_address' => 'nullable|string',
            'company_phone' => 'nullable|string|max:20',
            'company_email' => 'required|email|unique:companies,company_email',
            'email' => 'required|email|unique:companies,email',  // Add manager email validation
            'city' => 'nullable|string|max:100',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'is_active' => 'boolean',
            'manager_name' => 'required|string|max:255',
            'manager_phone' => 'nullable|string|max:20',
            'manager_password' => 'required|string|min:6|confirmed',
            'language' => 'sometimes|in:en,fa,ps',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->except('logo', 'manager_password_confirmation');

        // Set language default if not provided
        if (!isset($data['language'])) {
            $data['language'] = 'en';
        }

        // Set created_by
        $data['created_by'] = $superAdmin->id;

        // Upload logo
        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo')->store('company-logos', 'public');
        }

        // Make sure email (manager email) is set
        if (!isset($data['email'])) {
            $data['email'] = $request->email;
        }

        $company = Company::create($data);

        // Load the created_by relation
        $company->load('createdBy');

        // Add counts
        $company->branches_count = 0;
        $company->users_count = 0;

        return response()->json([
            'success' => true,
            'message' => 'Company created successfully',
            'data' => $company
        ], 201);
    }

    /**
     * Display the specified company
     */
    public function show(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);
        
        $company = Company::with(['createdBy', 'branches', 'users'])->find($id);
        
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found'
            ], 404);
        }
        
        // Add counts
        $company->branches_count = $company->branches()->count();
        $company->users_count = $company->users()->count();
        
        return response()->json([
            'success' => true,
            'data' => $company
        ]);
    }

    /**
     * Update the specified company
     */
    public function update(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $company = Company::find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_name' => 'sometimes|required|string|max:255',
            'company_address' => 'nullable|string',
            'company_phone' => 'nullable|string|max:20',
            'company_email' => 'sometimes|required|email|unique:companies,company_email,' . $id,
            'email' => 'sometimes|required|email|unique:companies,email,' . $id,  // Add manager email validation
            'city' => 'nullable|string|max:100',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'is_active' => 'boolean',
            'manager_name' => 'sometimes|required|string|max:255',
            'manager_phone' => 'nullable|string|max:20',
            'manager_password' => 'nullable|string|min:6',
            'language' => 'sometimes|in:en,fa,ps',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->except('logo', 'manager_password');

        // Update password only if provided
        if ($request->filled('manager_password')) {
            $data['manager_password'] = $request->manager_password;
        }

        // Handle logo
        if ($request->hasFile('logo')) {
            if ($company->logo && Storage::disk('public')->exists($company->logo)) {
                Storage::disk('public')->delete($company->logo);
            }
            $data['logo'] = $request->file('logo')->store('company-logos', 'public');
        }

        $company->update($data);
        $company->load('createdBy');

        // Add counts
        $company->branches_count = $company->branches()->count();
        $company->users_count = $company->users()->count();

        return response()->json([
            'success' => true,
            'message' => 'Company updated successfully',
            'data' => $company
        ]);
    }

    /**
     * Delete company
     */
    public function destroy(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $company = Company::find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found'
            ], 404);
        }

        // Check for related records
        if ($company->branches()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete company with existing branches. Delete branches first.'
            ], 400);
        }

        if ($company->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete company with existing users. Delete users first.'
            ], 400);
        }

        // Delete logo if exists
        if ($company->logo && Storage::disk('public')->exists($company->logo)) {
            Storage::disk('public')->delete($company->logo);
        }

        $company->delete();

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully'
        ]);
    }

    /**
     * Toggle company status
     */
    public function toggleStatus(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $company = Company::find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found'
            ], 404);
        }

        $company->is_active = !$company->is_active;
        $company->save();

        return response()->json([
            'success' => true,
            'message' => 'Company status updated successfully',
            'data' => [
                'id' => $company->id,
                'company_name' => $company->company_name,
                'is_active' => $company->is_active
            ]
        ]);
    }

    /**
     * Get company statistics
     */
    public function statistics(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $stats = [
            'total_companies' => Company::count(),
            'active_companies' => Company::where('is_active', true)->count(),
            'inactive_companies' => Company::where('is_active', false)->count(),
            'companies_by_language' => [
                'en' => Company::where('language', 'en')->count(),
                'fa' => Company::where('language', 'fa')->count(),
                'ps' => Company::where('language', 'ps')->count(),
            ],
            'recent_companies' => Company::with('createdBy')
                ->latest()
                ->limit(5)
                ->get()
        ];

        // Add counts to recent companies
        foreach ($stats['recent_companies'] as $company) {
            $company->branches_count = $company->branches()->count();
            $company->users_count = $company->users()->count();
        }

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get all companies list (for dropdowns)
     */
    public function getCompaniesList(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $companies = Company::where('is_active', true)
            ->select('id', 'company_name', 'company_email')
            ->orderBy('company_name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $companies
        ]);
    }

    /**
     * Export companies to CSV
     */
    public function export(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $companies = Company::with('createdBy')->get();

        $filename = 'companies_export_' . date('Y-m-d_His') . '.csv';
        $handle = fopen('php://temp', 'w+');

        // Add headers
        fputcsv($handle, [
            'ID', 'Company Name', 'Company Email', 'Manager Email', 'Company Phone', 'Company Address',
            'City', 'Manager Name', 'Manager Phone', 'Language', 'Status',
            'Branches', 'Users', 'Created By', 'Created At'
        ]);

        // Add data
        foreach ($companies as $company) {
            fputcsv($handle, [
                $company->id,
                $company->company_name,
                $company->company_email,
                $company->email ?? '',
                $company->company_phone ?? '',
                $company->company_address ?? '',
                $company->city ?? '',
                $company->manager_name,
                $company->manager_phone ?? '',
                $company->language === 'fa' ? 'Dari' : ($company->language === 'ps' ? 'Pashto' : 'English'),
                $company->is_active ? 'Active' : 'Inactive',
                $company->branches()->count(),
                $company->users()->count(),
                $company->createdBy->name ?? 'N/A',
                $company->created_at
            ]);
        }

        rewind($handle);
        $csvContent = stream_get_contents($handle);
        fclose($handle);

        return response($csvContent, 200)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Impersonate a company admin (WHM-style login-as)
     * POST /super-admin/companies/{id}/impersonate
     */
    public function impersonate(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $company = Company::findOrFail($id);

        if (!$company->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot login to an inactive company.',
            ], 403);
        }

        // Create a token for the company
        $token = $company->createToken('impersonated_company_token')->plainTextToken;

        // Get permissions for company admin
        $defaultPermissions = config('permissions', []);
        $allPermissions = [];
        foreach ($defaultPermissions as $module => $actions) {
            $allPermissions[$module] = [];
            foreach ($actions as $action => $value) {
                $allPermissions[$module][$action] = true;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Logged in as {$company->company_name}",
            'user_type' => 'company_admin',
            'user' => $company,
            'token' => $token,
            'token_type' => 'Bearer',
            'permissions' => $allPermissions,
        ]);
    }
}