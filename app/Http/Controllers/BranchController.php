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
    $query = Branch::with('company')
        ->withCount([
            'users',
            'publicProducts'
        ]);

    // Apply branch filtering based on authenticated user type
    if (AuthHelper::isCompanyAdmin()) {
        $companyId = AuthHelper::getCompanyId();
        $query->where('company_id', $companyId);
        Log::info('Company admin fetching branches', ['company_id' => $companyId]);
    } 
    elseif (AuthHelper::isBranchUser()) {
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

    // Company filter
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

    return response()->json([
        'data' => $branches,
        'user_info' => [
            'type' => AuthHelper::getUserType(),
            'company_id' => AuthHelper::getCompanyId(),
            'branch_id' => AuthHelper::getBranchId(),
        ]
    ]);
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
            'branch_logo_url' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'branch_street_address' => 'nullable|string',
            'branch_village' => 'nullable|string|max:255',
            'branch_district' => 'nullable|string|max:255',
            'branch_province' => 'nullable|string|max:255',
            'branch_country' => 'nullable|string|max:100',
            'branch_phone' => 'nullable|string|max:50',
            'branch_email' => 'nullable|email|max:255',
            'branch_website' => 'nullable|url|max:500',
            'is_active' => 'boolean',
            'allowed_user_count' => 'nullable|integer|min:0|max:999',
            'allowed_product_publish_count' => 'nullable|integer|min:0|max:99999',
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
            
            // Create branch with new fields
            $branch = Branch::create([
                'company_id' => $company->id,
                'branch_name' => $validated['branch_name'],
                'branch_slogan' => $validated['branch_slogan'] ?? null,
                'branch_logo_url' => $logoPath,
                'branch_street_address' => $validated['branch_street_address'] ?? null,
                'branch_village' => $validated['branch_village'] ?? null,
                'branch_district' => $validated['branch_district'] ?? null,
                'branch_province' => $validated['branch_province'] ?? null,
                'branch_country' => $validated['branch_country'] ?? 'Afghanistan',
                'branch_phone' => $validated['branch_phone'] ?? null,
                'branch_email' => $validated['branch_email'] ?? null,
                'branch_website' => $validated['branch_website'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'allowed_user_count' => $validated['allowed_user_count'] ?? 1,
                'allowed_product_publish_count' => $validated['allowed_product_publish_count'] ?? 10,
            ]);

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
    $branch->loadCount(['products', 'publicProducts']);

    return response()->json([
        'success' => true,
        'data' => $branch,
        'full_address' => $branch->full_address,
        'statistics' => [
            'user_count' => $branch->users()->count(),
            'total_product_count' => $branch->products_count ?? 0,
            'public_product_count' => $branch->public_products_count ?? 0,
            'private_product_count' => ($branch->products_count ?? 0) - ($branch->public_products_count ?? 0),
            'allowed_user_count' => $branch->allowed_user_count,
            'allowed_product_publish_count' => $branch->allowed_product_publish_count,
            'remaining_user_slots' => max(0, $branch->allowed_user_count - $branch->users()->count()),
            'remaining_product_slots' => max(0, $branch->allowed_product_publish_count - ($branch->public_products_count ?? 0)),
            'user_limit_reached' => $branch->users()->count() >= $branch->allowed_user_count,
            'product_limit_reached' => ($branch->public_products_count ?? 0) >= $branch->allowed_product_publish_count,
        ]
    ]);
}

    /**
     * Update the specified branch
     */
public function update(Request $request, $id)
{
    Gate::authorize('perm', ['branches', 'edit']);

    $branch = Branch::findOrFail($id);

    $rules = [
        'branch_name' => 'required|string|max:255',
        'branch_slogan' => 'nullable|string|max:255',
        'branch_street_address' => 'nullable|string',
        'branch_village' => 'nullable|string|max:255',
        'branch_district' => 'nullable|string|max:255',
        'branch_province' => 'nullable|string|max:255',
        'branch_country' => 'nullable|string|max:255',
        'branch_phone' => 'nullable|string|max:20',
        'branch_email' => 'nullable|email|max:255',
        'branch_website' => 'nullable|url|max:255',
        'is_active' => 'boolean',
        'allowed_user_count' => 'nullable|integer|min:0',
        'allowed_product_publish_count' => 'nullable|integer|min:0',
    ];

    // Only validate logo as URL if it's a string (not a file)
    if ($request->has('branch_logo_url') && is_string($request->branch_logo_url)) {
        $rules['branch_logo_url'] = 'nullable|url|max:255';
    } else if ($request->hasFile('branch_logo_url')) {
        $rules['branch_logo_url'] = 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048';
    }

    $validated = $request->validate($rules);

    // Handle file upload for logo
    if ($request->hasFile('branch_logo_url')) {
        $file = $request->file('branch_logo_url');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('branch_logos', $filename, 'public');
        $validated['branch_logo_url'] = $path;
    }

    $branch->update($validated);

    return response()->json([
        'data' => $branch,
        'message' => 'Branch updated successfully.'
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
            ->get(['id', 'branch_name', 'branch_province', 'branch_district', 'allowed_user_count', 'allowed_product_publish_count']);

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
            'total_user_slots' => Branch::sum('allowed_user_count'),
            'total_product_slots' => Branch::sum('allowed_product_publish_count'),
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
                ->get(),
            'user_capacity_stats' => [
                'branches_at_capacity' => Branch::whereRaw('(SELECT COUNT(*) FROM users WHERE users.branch_id = branches.id) >= allowed_user_count')->count(),
                'branches_with_available_slots' => Branch::whereRaw('(SELECT COUNT(*) FROM users WHERE users.branch_id = branches.id) < allowed_user_count')->count(),
            ],
            'product_capacity_stats' => [
                'branches_at_capacity' => Branch::whereRaw('(SELECT COUNT(*) FROM products WHERE products.branch_id = branches.id) >= allowed_product_publish_count')->count(),
                'branches_with_available_slots' => Branch::whereRaw('(SELECT COUNT(*) FROM products WHERE products.branch_id = branches.id) < allowed_product_publish_count')->count(),
            ]
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

        // Add headers with new fields
        fputcsv($handle, [
            'ID', 'Company Name', 'Branch Name', 'Slogan', 'Street Address',
            'Village', 'District', 'Province', 'Country', 'Phone', 'Email',
            'Website', 'Status', 'Allowed Users', 'Allowed Products',
            'Current Users', 'Current Products', 'Created At'
        ]);

        // Add data
        foreach ($branches as $branch) {
            $userCount = $branch->users()->count();
            $productCount = $branch->products()->count() ?? 0;
            
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
                $branch->allowed_user_count,
                $branch->allowed_product_publish_count,
                $userCount,
                $productCount,
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

    /**
     * Update branch limits (user count and product publish count)
     */
    public function updateLimits(Request $request, Branch $branch)
    {
        Gate::authorize('perm', ['branches', 'edit']);

        $validated = $request->validate([
            'allowed_user_count' => 'required|integer|min:0|max:999',
            'allowed_product_publish_count' => 'required|integer|min:0|max:99999',
        ]);

        // Validate that the new limits don't conflict with existing data
        $currentUserCount = $branch->users()->count();
        if ($validated['allowed_user_count'] < $currentUserCount) {
            return response()->json([
                'success' => false,
                'message' => "Cannot reduce user limit below current user count ({$currentUserCount}). Please remove users first."
            ], 422);
        }

        $currentProductCount = $branch->products()->count() ?? 0;
        if ($validated['allowed_product_publish_count'] < $currentProductCount) {
            return response()->json([
                'success' => false,
                'message' => "Cannot reduce product publish limit below current product count ({$currentProductCount}). Please unpublish or remove products first."
            ], 422);
        }

        $branch->update([
            'allowed_user_count' => $validated['allowed_user_count'],
            'allowed_product_publish_count' => $validated['allowed_product_publish_count'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Branch limits updated successfully',
            'data' => [
                'id' => $branch->id,
                'branch_name' => $branch->branch_name,
                'allowed_user_count' => $branch->allowed_user_count,
                'allowed_product_publish_count' => $branch->allowed_product_publish_count,
                'current_user_count' => $currentUserCount,
                'current_product_count' => $currentProductCount,
            ]
        ]);
    }

    /**
     * Get branches with available user slots
     */
    public function getAvailableForUsers(Request $request)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $query = Branch::where('is_active', true)
            ->whereRaw('(SELECT COUNT(*) FROM users WHERE users.branch_id = branches.id) < branches.allowed_user_count');

        // Optional company filter
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        $branches = $query->get(['id', 'branch_name', 'allowed_user_count']);

        return response()->json([
            'success' => true,
            'data' => $branches
        ]);
    }

    /**
     * Get branches with available product slots
     */
    public function getAvailableForProducts(Request $request)
    {
        Gate::authorize('perm', ['branches', 'view']);

        $query = Branch::where('is_active', true)
            ->whereRaw('(SELECT COUNT(*) FROM products WHERE products.branch_id = branches.id) < branches.allowed_product_publish_count');

        // Optional company filter
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        $branches = $query->get(['id', 'branch_name', 'allowed_product_publish_count']);

        return response()->json([
            'success' => true,
            'data' => $branches
        ]);
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