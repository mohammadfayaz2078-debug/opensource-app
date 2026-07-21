<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductCategoryController extends Controller
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

    // ── Product Categories CRUD ────────────────────────────────────────────

    /**
     * GET /api/product-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = ProductCategory::with(['branch'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

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
        
        $allowedSorts = ['name', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $categories = $query->paginate($perPage);

        // Get product counts for each category
        foreach ($categories as $category) {
            $category->products_count = $category->products()->count();
        }

        // Calculate summary statistics
        $summary = [
            'total_categories' => $query->count(),
            'categories_with_products' => ProductCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->has('products')
                ->count(),
            'categories_without_products' => ProductCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->doesntHave('products')
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
     * POST /api/product-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        // Check for duplicate name within branch
        $exists = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A product category with this name already exists in this branch.'
            ], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;

        $category = ProductCategory::create($validated);
        $category->load(['branch']);
        $category->products_count = 0;

        return response()->json([
            'data'    => $category,
            'message' => 'Product category created successfully.',
        ], 201);
    }

    /**
     * GET /api/product-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $category = ProductCategory::where('branch_id', $branchId)
            ->with(['branch', 'company'])
            ->findOrFail($id);

        // Get product count
        $category->products_count = $category->products()->count();
        
        // Get recent products in this category (limit 5)
        $category->recent_products = $category->products()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'sku', 'price']);

        return response()->json(['data' => $category]);
    }

    /**
     * PUT /api/product-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $category  = ProductCategory::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        // Check for duplicate name (excluding current category)
        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $exists = ProductCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $category->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A product category with this name already exists in this branch.'
                ], 422);
            }
        }
        
        $category->update($validated);
        $category->load(['branch']);
        $category->products_count = $category->products()->count();

        return response()->json([
            'data'    => $category,
            'message' => 'Product category updated successfully.',
        ]);
    }

    /**
     * DELETE /api/product-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = ProductCategory::where('branch_id', $branchId)->findOrFail($id);

        // Check if category has any associated products
        $productsCount = $category->products()->count();
        if ($productsCount > 0) {
            return response()->json([
                'message' => "Cannot delete product category because it has {$productsCount} product(s) associated with it.",
                'products_count' => $productsCount
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Product category deleted successfully.']);
    }

    /**
     * GET /api/product-categories/list
     * Get list of product categories for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getCategoryList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId);
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }
        
        $categories = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'description']);
        
        // Add product count for each category
        foreach ($categories as $category) {
            $category->products_count = $category->products()->count();
        }
        
        return response()->json([
            'data' => $categories->map(fn($category) => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'products_count' => $category->products_count,
            ])
        ]);
    }

    /**
     * GET /api/product-categories/export
     * Export product categories to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $categories = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('name')
            ->get();
        
        $exportData = $categories->map(fn($category) => [
            'Name' => $category->name,
            'Description' => $category->description ?? '',
            'Number of Products' => $category->products()->count(),
            'Created At' => $category->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/product-categories/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'category_ids' => 'required|array',
            'category_ids.*' => 'integer|exists:product_categories,id',
        ]);
        
        $categories = ProductCategory::where('branch_id', $branchId)
            ->whereIn('id', $validated['category_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($categories as $category) {
            // Check if category has associated products
            $productsCount = $category->products()->count();
            if ($productsCount > 0) {
                $errors[] = [
                    'id' => $category->id,
                    'name' => $category->name,
                    'error' => "Has {$productsCount} product(s) associated",
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
     * GET /api/product-categories/statistics
     * Get statistics about product categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $categoriesWithProducts = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->has('products')
            ->count();
        
        $categoriesWithoutProducts = $total - $categoriesWithProducts;
        
        // Get category with most products
        $topCategory = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->withCount('products')
            ->orderBy('products_count', 'desc')
            ->first();
        
        // Get recently added categories
        $recentlyAdded = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'created_at']);
        
        // Get product distribution
        $productDistribution = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->withCount('products')
            ->orderBy('products_count', 'desc')
            ->limit(10)
            ->get(['id', 'name', 'products_count']);
        
        return response()->json([
            'total_categories' => $total,
            'categories_with_products' => $categoriesWithProducts,
            'categories_without_products' => $categoriesWithoutProducts,
            'top_category' => $topCategory ? [
                'name' => $topCategory->name,
                'products_count' => $topCategory->products_count,
            ] : null,
            'recently_added' => $recentlyAdded,
            'product_distribution' => $productDistribution,
        ]);
    }

    /**
     * GET /api/product-categories/tree
     * Get hierarchical tree structure (for future parent-child relationship)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function tree(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        // For now, just return flat list since no parent-child relationship exists
        // This can be extended later if you add parent_id column
        $categories = ProductCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->withCount('products')
            ->orderBy('name')
            ->get()
            ->map(fn($category) => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'products_count' => $category->products_count,
                'children' => [], // For future nested categories
            ]);
        
        return response()->json(['data' => $categories]);
    }
}