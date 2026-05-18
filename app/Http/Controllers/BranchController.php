<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Company;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Helpers\AuthHelper;

class BranchController extends Controller
{
    /**
     * Display a listing of branches
     */
    public function index(Request $request)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $perPage = $request->per_page ?? 10;
        $query = Branch::with('company');

        // Apply branch filtering based on authenticated user type
        if (AuthHelper::isCompanyAdmin()) {
            // Company admin: show all branches of their company
            $companyId = AuthHelper::getCompanyId();
            $query->where('company_id', $companyId);
            
            Log::info('Company admin fetching branches', ['company_id' => $companyId]);
        } 
        elseif (AuthHelper::isBranchUser()) {
            // Branch user: show only their specific branch
            $branchId = AuthHelper::getBranchId();
            $query->where('id', $branchId);
            
            Log::info('Branch user fetching their branch', ['branch_id' => $branchId]);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('branch_name', 'like', "%$search%")
                  ->orWhere('branch_slogan', 'like', "%$search%")
                  ->orWhere('branch_province', 'like', "%$search%")
                  ->orWhere('branch_district', 'like', "%$search%")
                  ->orWhere('branch_village', 'like', "%$search%")
                  ->orWhere('branch_street_address', 'like', "%$search%")
                  ->orWhere('branch_phone', 'like', "%$search%")
                  ->orWhere('branch_email', 'like', "%$search%");
            });
        }

        // Company filter (only for company admin? No, keep as is)
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        // Province filter
        if ($request->filled('branch_province')) {
            $query->where('branch_province', $request->branch_province);
        }

        // District filter
        if ($request->filled('branch_district')) {
            $query->where('branch_district', $request->branch_district);
        }

        // Status filter
        if ($request->filled('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $branches = $query->latest()->paginate($perPage);

        Log::info(['branches' => $branches]);
        
        // Add additional info for debugging
        $response = [
            'data' => $branches,
            'user_info' => [
                'type' => AuthHelper::getUserType(),
                'company_id' => AuthHelper::getCompanyId(),
                'branch_id' => AuthHelper::getBranchId(),
            ]
        ];
        
        return response()->json($response);
    }

    /**
     * Store a newly created branch
     */
    public function store(Request $request)
    {
        Gate::authorize('perm', ['branches', 'create']);

        $rules = [
            'branch_name' => 'required|string|max:255',
            'branch_slogan' => 'nullable|string|max:500',
            'branch_logo_url' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // Changed to file validation
            'branch_street_address' => 'nullable|string',
            'branch_village' => 'nullable|string|max:255',
            'branch_district' => 'nullable|string|max:255',
            'branch_province' => 'nullable|string|max:255',
            'branch_country' => 'nullable|string|max:100',
            'branch_phone' => 'nullable|string|max:50',
            'branch_email' => 'nullable|email|max:255',
            'branch_website' => 'nullable|url|max:500',
            'is_active' => 'boolean',
        ];

        $validated = $request->validate($rules);

        return DB::transaction(function () use ($validated, $request) {
            // Get the authenticated company
            $company = auth()->user();
            
            // Handle logo upload
            $logoPath = null;
            if ($request->hasFile('branch_logo_url')) {
                $logo = $request->file('branch_logo_url');
                $filename = time() . '_' . uniqid() . '.' . $logo->getClientOriginalExtension();
                $logoPath = $logo->storeAs('branch-logos', $filename, 'public');
            }
            
            // Create branch
            $branch = Branch::create([
                'company_id' => $company->id,
                'branch_name' => $validated['branch_name'],
                'branch_slogan' => $validated['branch_slogan'] ?? null,
                'branch_logo_url' => $logoPath, // Store the path instead of URL
                'branch_street_address' => $validated['branch_street_address'] ?? null,
                'branch_village' => $validated['branch_village'] ?? null,
                'branch_district' => $validated['branch_district'] ?? null,
                'branch_province' => $validated['branch_province'] ?? null,
                'branch_country' => $validated['branch_country'] ?? 'Afghanistan',
                'branch_phone' => $validated['branch_phone'] ?? null,
                'branch_email' => $validated['branch_email'] ?? null,
                'branch_website' => $validated['branch_website'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Seed default account types for the new branch
            \Database\Seeders\AccountTypeSeeder::seedForBranch($branch->id);

            // Load the company relationship
            $branch->load('company');

            return response()->json([
                'message' => 'Branch created successfully',
                'branch' => $branch,
            ], 201);
        });
    }
    /**
     * Display the specified branch
     */
    public function show(Branch $branch)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $branch->load(['company', 'users']);

        return response()->json([
            'success' => true,
            'data' => $branch,
            'full_address' => $branch->full_address,
        ]);
    }

    /**
     * Update the specified branch
     */
    public function update(Request $request, Branch $branch)
    {
        Gate::authorize('perm', ['branches', 'edit']);

        $validated = $request->validate([
            'branch_name' => 'sometimes|required|string|max:255',
            'branch_slogan' => 'nullable|string|max:500',
            'branch_logo_url' => 'nullable|url|max:500',
            'branch_street_address' => 'nullable|string',
            'branch_village' => 'nullable|string|max:255',
            'branch_district' => 'nullable|string|max:255',
            'branch_province' => 'nullable|string|max:255',
            'branch_country' => 'nullable|string|max:100',
            'branch_phone' => 'nullable|string|max:50',
            'branch_email' => 'nullable|email|max:255',
            'branch_website' => 'nullable|url|max:500',
            'base_currency_id' => 'nullable|integer|exists:currencies,id',
            'is_active' => 'boolean',
        ]);

        // Block base_currency_id change after transactions exist (like Odoo)
        if (
            array_key_exists('base_currency_id', $validated)
            && $validated['base_currency_id'] != $branch->base_currency_id
        ) {
            $hasPostedEntries = \App\Models\JournalEntry::where('branch_id', $branch->id)
                ->where('status', 'posted')
                ->exists();

            if ($hasPostedEntries) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot change base currency after journal entries have been posted. Create a new branch instead.',
                ], 422);
            }
        }

        $branch->update($validated);
        $branch->load('company');

        return response()->json([
            'success' => true,
            'message' => 'Branch updated successfully',
            'data' => $branch
        ]);
    }

    /**
     * Remove the specified branch
     */
    public function destroy(Branch $branch)
    {
        Gate::authorize('perm', ['branches', 'delete']);

        // Check if branch has users
        if ($branch->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete branch with existing users. Transfer or delete users first.'
            ], 400);
        }

        // Check if branch has positions
        if ($branch->positions()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete branch with existing positions. Delete positions first.'
            ], 400);
        }

        $branch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Branch deleted successfully'
        ]);
    }

    /**
     * Toggle branch status
     */
    public function toggleStatus(Branch $branch)
    {
        Gate::authorize('perm', ['branches', 'edit']);

        $branch->is_active = !$branch->is_active;
        $branch->save();

        return response()->json([
            'success' => true,
            'message' => $branch->is_active ? 'Branch activated successfully' : 'Branch deactivated successfully',
            'data' => [
                'id' => $branch->id,
                'branch_name' => $branch->branch_name,
                'is_active' => $branch->is_active
            ]
        ]);
    }

    /**
     * Bulk update branch status
     */
    public function bulkStatusUpdate(Request $request)
    {
        Gate::authorize('perm', ['branches', 'edit']);

        $validated = $request->validate([
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'exists:branches,id',
            'is_active' => 'required|boolean'
        ]);

        $count = Branch::whereIn('id', $validated['branch_ids'])
            ->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => "{$count} branches updated successfully",
            'updated_count' => $count
        ]);
    }

    /**
     * Get branches by company
     */
    public function getByCompany(Company $company)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $branches = $company->branches()
            ->where('is_active', true)
            ->get(['id', 'branch_name', 'branch_province', 'branch_district']);

        return response()->json([
            'success' => true,
            'data' => $branches
        ]);
    }

    /**
     * Get branches by province
     */
    public function getByProvince($province)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $branches = Branch::with('company')
            ->where('branch_province', $province)
            ->where('is_active', true)
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $branches
        ]);
    }

    /**
     * Get branch statistics
     */
    public function statistics(Request $request)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $stats = [
            'total_branches' => Branch::count(),
            'active_branches' => Branch::where('is_active', true)->count(),
            'inactive_branches' => Branch::where('is_active', false)->count(),
            'branches_by_province' => Branch::select('branch_province', DB::raw('count(*) as total'))
                ->whereNotNull('branch_province')
                ->groupBy('branch_province')
                ->get(),
            'branches_by_company' => Branch::select('company_id', DB::raw('count(*) as total'))
                ->with('company:id,company_name')
                ->groupBy('company_id')
                ->get(),
            'recent_branches' => Branch::with('company')
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
     * Export branches to CSV (optional)
     */
    public function export(Request $request)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $branches = Branch::with('company')->get();

        $filename = 'branches_export_' . date('Y-m-d_His') . '.csv';
        $handle = fopen('php://temp', 'w+');

        // Add headers
        fputcsv($handle, [
            'ID', 'Company Name', 'Branch Name', 'Slogan', 'Street Address',
            'Village', 'District', 'Province', 'Country', 'Phone', 'Email',
            'Website', 'Status', 'Created At'
        ]);

        // Add data
        foreach ($branches as $branch) {
            fputcsv($handle, [
                $branch->id,
                $branch->company->company_name ?? 'N/A',
                $branch->branch_name,
                $branch->branch_slogan,
                $branch->branch_street_address,
                $branch->branch_village,
                $branch->branch_district,
                $branch->branch_province,
                $branch->branch_country,
                $branch->branch_phone,
                $branch->branch_email,
                $branch->branch_website,
                $branch->is_active ? 'Active' : 'Inactive',
                $branch->created_at
            ]);
        }

        rewind($handle);
        $csvContent = stream_get_contents($handle);
        fclose($handle);

        return response($csvContent, 200)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }




    public function getProvinces()
    {
        $provinces = Branch::whereNotNull('branch_province')
            ->select('branch_province')
            ->distinct()
            ->pluck('branch_province');
        
        return response()->json(['data' => $provinces]);
    }
}