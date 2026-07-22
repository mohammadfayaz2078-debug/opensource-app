<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Product;
use App\Models\ProductAttachment;
use App\Models\ProductCategory;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
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

    /**
     * Generate unique barcode if not provided
     */
    private function generateBarcode(int $branchId): string
    {
        $lastProduct = Product::where('branch_id', $branchId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastProduct || !$lastProduct->barcode) {
            $nextNumber = 1;
        } else {
            $lastNumber = (int) preg_replace('/[^0-9]/', '', $lastProduct->barcode);
            $nextNumber = $lastNumber + 1;
        }

        return 'PRD-' . str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Validate unit belongs to same category
     */
    private function validateUnitCategory(int $unitId, string $unitType, int $branchId): ?Unit
    {
        if (!$unitId) {
            return null;
        }

        $unit = Unit::where('id', $unitId)
            ->where('branch_id', $branchId)
            ->with('category')
            ->first();

        if (!$unit) {
            throw new \RuntimeException("Invalid {$unitType} unit selected.");
        }

        return $unit;
    }

    // ── Products CRUD ───────────────────────────────────────────────────────

    /**
     * GET /api/products
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Product::with([
            'category',
            'purchaseUnit',
            'saleUnit',
            'stockUnit',
        ])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by category
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // Price range filter
        if ($request->filled('min_price')) {
            $query->where('sale_price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('sale_price', '<=', $request->max_price);
        }

        // Low stock filter
        if ($request->boolean('low_stock')) {
            // This would need stock table, placeholder for now
            // $query->whereRaw('current_stock <= reorder_point');
        }

        // Sorting
        $sortField = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['name', 'sale_price', 'purchase_price', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $products = $query->paginate($perPage);

        // Add attachment counts
        foreach ($products as $product) {
            $product->attachments_count = $product->attachments()->count();
        }

        // Calculate summary statistics
        $summary = [
            'total_products' => $query->count(),
            'total_value' => Product::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->sum(DB::raw('purchase_price * 0')), // Placeholder for stock value
            'avg_price' => Product::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->avg('sale_price') ?? 0,
        ];

        return response()->json([
            'data'         => $products->items(),
            'total'        => $products->total(),
            'per_page'     => $products->perPage(),
            'current_page' => $products->currentPage(),
            'last_page'    => $products->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/products
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'                      => 'required|string|max:255',
            'barcode'                   => ['nullable', 'string', 'max:50', Rule::unique('products')->where(fn($q) => $q->where('branch_id', $branchId))],
            'category_id'               => 'nullable|exists:product_categories,id',
            'purchase_unit_id'          => 'nullable|exists:units,id',
            'sale_unit_id'              => 'nullable|exists:units,id',
            'stock_unit_id'             => 'nullable|exists:units,id',
            'purchase_price'            => 'nullable|numeric|min:0|max:999999999999.99',
            'sale_price'                => 'nullable|numeric|min:0|max:999999999999.99',
            'low_stock_warning_count'   => 'nullable|integer|min:0',
            'reorder_point'             => 'nullable|integer|min:0',
        ]);

        // Verify category belongs to branch
        if (!empty($validated['category_id'])) {
            $category = ProductCategory::where('id', $validated['category_id'])
                ->where('branch_id', $branchId)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$category) {
                return response()->json(['message' => 'Invalid category for this branch.'], 422);
            }
        }

        // Validate units belong to same category
        try {
            if (!empty($validated['purchase_unit_id'])) {
                $this->validateUnitCategory($validated['purchase_unit_id'], 'purchase', $branchId);
            }
            if (!empty($validated['sale_unit_id'])) {
                $this->validateUnitCategory($validated['sale_unit_id'], 'sale', $branchId);
            }
            if (!empty($validated['stock_unit_id'])) {
                $this->validateUnitCategory($validated['stock_unit_id'], 'stock', $branchId);
            }
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        
        // Generate barcode if not provided
        if (empty($validated['barcode'])) {
            $validated['barcode'] = $this->generateBarcode($branchId);
        }
        
        // Set default values
        $validated['purchase_price'] = $validated['purchase_price'] ?? 0;
        $validated['sale_price'] = $validated['sale_price'] ?? 0;
        $validated['low_stock_warning_count'] = $validated['low_stock_warning_count'] ?? 0;
        $validated['reorder_point'] = $validated['reorder_point'] ?? 0;

        $product = Product::create($validated);
        
        // Handle attachments
        if ($request->hasFile('attachments')) {
            $this->uploadAttachments($request->file('attachments'), $product, $branchId, $companyId);
        }

        $product->load([
            'category', 'purchaseUnit', 'saleUnit', 'stockUnit',
        ]);
        $product->attachments_count = $product->attachments()->count();

        return response()->json([
            'data'    => $product,
            'message' => 'Product created successfully.',
        ], 201);
    }

    /**
     * GET /api/products/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $product = Product::where('branch_id', $branchId)
            ->with([
                'category',
                'purchaseUnit',
                'saleUnit',
                'stockUnit',
                'attachments' => function($q) {
                    $q->orderBy('created_at', 'desc');
                }
            ])
            ->findOrFail($id);

        return response()->json(['data' => $product]);
    }

    /**
     * PUT /api/products/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $product   = Product::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'                      => 'sometimes|string|max:255',
            'barcode'                   => ['sometimes', 'string', 'max:50', Rule::unique('products')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($product->id)],
            'category_id'               => 'nullable|exists:product_categories,id',
            'purchase_unit_id'          => 'nullable|exists:units,id',
            'sale_unit_id'              => 'nullable|exists:units,id',
            'stock_unit_id'             => 'nullable|exists:units,id',
            'purchase_price'            => 'nullable|numeric|min:0|max:999999999999.99',
            'sale_price'                => 'nullable|numeric|min:0|max:999999999999.99',
            'low_stock_warning_count'   => 'nullable|integer|min:0',
            'reorder_point'             => 'nullable|integer|min:0',
        ]);

        // Verify category belongs to branch if changed
        if (isset($validated['category_id']) && $validated['category_id'] != $product->category_id) {
            $category = ProductCategory::where('id', $validated['category_id'])
                ->where('branch_id', $branchId)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$category) {
                return response()->json(['message' => 'Invalid category for this branch.'], 422);
            }
        }

        // Validate units
        try {
            if (isset($validated['purchase_unit_id'])) {
                $this->validateUnitCategory($validated['purchase_unit_id'], 'purchase', $branchId);
            }
            if (isset($validated['sale_unit_id'])) {
                $this->validateUnitCategory($validated['sale_unit_id'], 'sale', $branchId);
            }
            if (isset($validated['stock_unit_id'])) {
                $this->validateUnitCategory($validated['stock_unit_id'], 'stock', $branchId);
            }
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        
        $product->update($validated);
        
        // Handle new attachments
        if ($request->hasFile('attachments')) {
            $this->uploadAttachments($request->file('attachments'), $product, $branchId, $companyId);
        }

        $product->load([
            'category', 'purchaseUnit', 'saleUnit', 'stockUnit',
        ]);
        $product->attachments_count = $product->attachments()->count();

        return response()->json([
            'data'    => $product,
            'message' => 'Product updated successfully.',
        ]);
    }

    /**
     * DELETE /api/products/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $product  = Product::where('branch_id', $branchId)->findOrFail($id);

        // Check if product has any associated sales, purchase orders, or inventory
        // Add your checks here when those modules are implemented
        
        DB::transaction(function () use ($product) {
            // Delete all attachments and their files
            foreach ($product->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
                $attachment->delete();
            }
            
            $product->delete();
        });

        return response()->json(['message' => 'Product deleted successfully.']);
    }

    // ── Attachment Management ───────────────────────────────────────────────

    /**
     * Upload attachments for a product
     */
    private function uploadAttachments(array $files, Product $product, int $branchId, int $companyId): void
    {
        foreach ($files as $file) {
            $path = $file->store("products/{$product->id}", 'public');
            
            ProductAttachment::create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => $file->getClientOriginalExtension(),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'created_by' => Auth::id(),
            ]);
        }
    }

    /**
     * DELETE /api/products/{productId}/attachments/{attachmentId}
     */
    public function deleteAttachment(Request $request, int $productId, int $attachmentId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $product = Product::where('branch_id', $branchId)->findOrFail($productId);
        $attachment = $product->attachments()->findOrFail($attachmentId);
        
        // Delete file from storage
        Storage::disk('public')->delete($attachment->file_path);
        
        // Delete record
        $attachment->delete();
        
        return response()->json(['message' => 'Attachment deleted successfully.']);
    }

    /**
     * GET /api/products/{productId}/attachments
     */
    public function getAttachments(Request $request, int $productId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $product = Product::where('branch_id', $branchId)->findOrFail($productId);
        $attachments = $product->attachments()->orderBy('created_at', 'desc')->get();
        
        // Add full URL for each attachment
        foreach ($attachments as $attachment) {
            $attachment->url = Storage::disk('public')->url($attachment->file_path);
        }
        
        return response()->json(['data' => $attachments]);
    }

    /**
     * GET /api/products/export
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $products = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with(['category', 'purchaseUnit', 'saleUnit', 'stockUnit'])
            ->orderBy('name')
            ->get();
        
        $exportData = $products->map(fn($product) => [
            'Name' => $product->name,
            'Barcode' => $product->barcode,
            'Category' => $product->category?->name ?? 'Uncategorized',
            'Purchase Unit' => $product->purchaseUnit?->name ?? '—',
            'Sale Unit' => $product->saleUnit?->name ?? '—',
            'Stock Unit' => $product->stockUnit?->name ?? '—',
            'Purchase Price' => $product->purchase_price,
            'Sale Price' => $product->sale_price,
            'Low Stock Warning' => $product->low_stock_warning_count,
            'Reorder Point' => $product->reorder_point,
            'Created At' => $product->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * GET /api/products/barcode/{barcode}
     * Find product by barcode (for POS)
     */
    public function findByBarcode(Request $request, string $barcode): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $product = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('barcode', $barcode)
            ->with(['category', 'purchaseUnit', 'saleUnit', 'stockUnit'])
            ->first();
        
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }
        
        return response()->json(['data' => $product]);
    }

    /**
     * GET /api/products/statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $totalValue = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->sum(DB::raw('purchase_price * 0')); // Placeholder
        
        $avgPurchasePrice = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->avg('purchase_price') ?? 0;
        
        $avgSalePrice = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->avg('sale_price') ?? 0;
        
        $categoriesWithProducts = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->distinct('category_id')
            ->count('category_id');
        
        $recentProducts = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'sale_price', 'category_id', 'created_at']);
        
        return response()->json([
            'total_products' => $total,
            'total_inventory_value' => $totalValue,
            'average_purchase_price' => round($avgPurchasePrice, 2),
            'average_sale_price' => round($avgSalePrice, 2),
            'categories_with_products' => $categoriesWithProducts,
            'recent_products' => $recentProducts,
        ]);
    }

    /**
     * GET /api/products/list/options
     * Get list of products for dropdowns
     */
    public function getProductList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId);
        
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }
        
        $products = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'barcode', 'sale_price']);
        
        return response()->json(['data' => $products]);
    }
}