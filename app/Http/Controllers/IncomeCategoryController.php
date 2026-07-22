<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\IncomeCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IncomeCategoryController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Resolve branch ID based on authenticated user
     */
    private function resolveBranchId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }

        return AuthHelper::getBranchId();
    }

    private function resolveCompanyId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    // ── Income Categories CRUD ─────────────────────────────────────────────

    /**
     * GET /api/income-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = IncomeCategory::with(['creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by active status
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['name', 'created_at', 'is_active'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $categories = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_categories' => $query->count(),
            'active_categories' => IncomeCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->count(),
            'categories_with_accounts' => IncomeCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count(),
        ];

        return response()->json([
            'data'         => $categories->items(),
            'total'        => $categories->total(),
            'per_page'     => $categories->perPage(),
            'current_page' => $categories->currentPage(),
            'last_page'    => $categories->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/income-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'is_active'         => 'nullable|boolean',
        ]);

        // Check for duplicate name within branch
        $exists = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'An income category with this name already exists in this branch.'
            ], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();
        
        // Set default active status
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $category = IncomeCategory::create($validated);
        $category->load(['creator']);

        return response()->json([
            'data'    => $category,
            'message' => 'Income category created successfully.',
        ], 201);
    }

    /**
     * GET /api/income-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $category = IncomeCategory::where('branch_id', $branchId)
            ->with(['creator', 'company'])
            ->findOrFail($id);

        // Load related other incomes count if needed
        $category->other_incomes_count = $category->otherIncomes()->count();

        return response()->json(['data' => $category]);
    }

    /**
     * PUT /api/income-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $category  = IncomeCategory::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'description'       => 'nullable|string',
            'is_active'         => 'nullable|boolean',
        ]);

        // Check for duplicate name (excluding current category)
        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $exists = IncomeCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $category->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'An income category with this name already exists in this branch.'
                ], 422);
            }
        }
        
        $category->update($validated);
        $category->load(['creator']);

        return response()->json([
            'data'    => $category,
            'message' => 'Income category updated successfully.',
        ]);
    }

    /**
     * DELETE /api/income-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = IncomeCategory::where('branch_id', $branchId)->findOrFail($id);

        // Check if category has any associated other incomes
        if ($category->otherIncomes()->exists()) {
            return response()->json([
                'message' => 'Cannot delete income category because it has associated income records.',
                'other_incomes_count' => $category->otherIncomes()->count()
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Income category deleted successfully.']);
    }

    /**
     * POST /api/income-categories/{id}/toggle-status
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = IncomeCategory::where('branch_id', $branchId)->findOrFail($id);
        
        $category->is_active = !$category->is_active;
        $category->save();
        
        return response()->json([
            'data'    => $category,
            'message' => $category->is_active ? 'Income category activated.' : 'Income category deactivated.',
        ]);
    }

    /**
     * GET /api/income-categories/list
     * Get list of income categories for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getCategoryList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true);
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }
        
        $categories = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'description']);
        
        return response()->json([
            'data' => $categories->map(fn($category) => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
            ])
        ]);
    }

    /**
     * GET /api/income-categories/export
     * Export income categories to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $categories = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('name')
            ->get();

        $exportData = $categories->map(fn($category) => [
            'Name' => $category->name,
            'Description' => $category->description ?? '',
            'Status' => $category->is_active ? 'Active' : 'Inactive',
            'Created At' => $category->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/income-categories/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'category_ids' => 'required|array',
            'category_ids.*' => 'integer|exists:income_categories,id',
        ]);
        
        $categories = IncomeCategory::where('branch_id', $branchId)
            ->whereIn('id', $validated['category_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($categories as $category) {
            // Check if category has associated other incomes
            if ($category->otherIncomes()->exists()) {
                $errors[] = [
                    'id' => $category->id,
                    'name' => $category->name,
                    'error' => 'Has associated income records',
                ];
                continue;
            }
            
            try {
                $category->delete();
                $deleted++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $category->id,
                    'name' => $category->name,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return response()->json([
            'deleted' => $deleted,
            'errors' => $errors,
            'message' => "{$deleted} category(ies) deleted successfully.",
        ]);
    }

    /**
     * GET /api/income-categories/stats
     * Get statistics about income categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function stats(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $active = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->count();

        $recentlyAdded = IncomeCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'created_at']);
        
        return response()->json([
            'total_categories' => $total,
            'active_categories' => $active,
            'inactive_categories' => $total - $active,
            'recently_added' => $recentlyAdded,
        ]);
    }
}