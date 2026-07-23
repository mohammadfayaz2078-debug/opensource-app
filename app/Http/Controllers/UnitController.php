<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Unit;
use App\Models\UnitCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UnitController extends Controller
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
     * Calculate inverse factor
     */
    private function calculateInverseFactor(float $factor): float
    {
        if ($factor == 0) {
            return 1;
        }
        return round(1 / $factor, 10);
    }

    /**
     * Validate that only one reference unit exists per category
     */
    private function validateReferenceUnit(int $categoryId, int $branchId, ?int $excludeUnitId = null): void
    {
        $query = Unit::where('branch_id', $branchId)
            ->where('category_id', $categoryId)
            ->where('uom_type', 'reference');
        
        if ($excludeUnitId) {
            $query->where('id', '!=', $excludeUnitId);
        }
        
        $existingReference = $query->exists();
        
        if ($existingReference) {
            throw new \RuntimeException('A reference unit already exists in this category. Only one reference unit is allowed per category.');
        }
    }

    // ── Units CRUD ─────────────────────────────────────────────────────────

    /**
     * GET /api/units
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Unit::with(['category', 'creator', 'updater'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by category
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by unit type
        if ($request->filled('uom_type')) {
            $query->where('uom_type', $request->uom_type);
        }

        // Filter by active status
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['name', 'uom_type', 'factor', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $units = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_units' => $query->count(),
            'reference_units' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'reference')
                ->count(),
            'bigger_units' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'bigger')
                ->count(),
            'smaller_units' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'smaller')
                ->count(),
            'active_units' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->count(),
        ];

        return response()->json([
            'data'         => $units->items(),
            'total'        => $units->total(),
            'per_page'     => $units->perPage(),
            'current_page' => $units->currentPage(),
            'last_page'    => $units->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/units
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'category_id' => 'required|exists:unit_categories,id',
            'name'        => 'required|string|max:255',
            'uom_type'    => 'required|in:reference,bigger,smaller',
            'factor'      => 'required_if:uom_type,bigger,smaller|nullable|numeric|min:0.0000000001|max:9999999999',
            'rounding'    => 'nullable|numeric|min:0.0000000001',
            'is_active'   => 'nullable|boolean',
        ]);

        // Verify category belongs to same branch
        $category = UnitCategory::where('id', $validated['category_id'])
            ->where('branch_id', $branchId)
            ->where('company_id', $companyId)
            ->first();

        if (!$category) {
            return response()->json([
                'message' => 'Invalid category for this branch.'
            ], 422);
        }

        // Check for duplicate name within category
        $exists = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('category_id', $validated['category_id'])
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A unit with this name already exists in the selected category.'
            ], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();

        // Handle reference unit
        if ($validated['uom_type'] === 'reference') {
            $validated['factor'] = 1;
            $validated['factor_inv'] = 1;
            
            // Check if reference unit already exists in this category
            try {
                $this->validateReferenceUnit($validated['category_id'], $branchId);
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        } else {
            // Calculate inverse factor for bigger/smaller units
            $validated['factor_inv'] = $this->calculateInverseFactor($validated['factor']);
        }

        // Set default rounding
        if (empty($validated['rounding'])) {
            $validated['rounding'] = 0.01;
        }

        // Set default active status
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $unit = Unit::create($validated);
        $unit->load(['category', 'creator', 'updater']);

        return response()->json([
            'data'    => $unit,
            'message' => 'Unit created successfully.',
        ], 201);
    }

    /**
     * GET /api/units/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $unit = Unit::where('branch_id', $branchId)
            ->with(['category', 'creator', 'updater', 'company', 'branch'])
            ->findOrFail($id);

        // Get reference unit info for context
        $referenceUnit = Unit::where('branch_id', $branchId)
            ->where('category_id', $unit->category_id)
            ->where('uom_type', 'reference')
            ->first();

        if ($referenceUnit) {
            $unit->reference_unit_name = $referenceUnit->name;
        }

        return response()->json(['data' => $unit]);
    }

    /**
     * PUT /api/units/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $unit      = Unit::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'category_id' => 'sometimes|exists:unit_categories,id',
            'name'        => 'sometimes|string|max:255',
            'uom_type'    => 'sometimes|in:reference,bigger,smaller',
            'factor'      => 'required_if:uom_type,bigger,smaller|nullable|numeric|min:0.0000000001|max:9999999999',
            'rounding'    => 'nullable|numeric|min:0.0000000001',
            'is_active'   => 'nullable|boolean',
        ]);

        // If category is being changed, verify new category belongs to same branch
        if (isset($validated['category_id']) && $validated['category_id'] != $unit->category_id) {
            $category = UnitCategory::where('id', $validated['category_id'])
                ->where('branch_id', $branchId)
                ->where('company_id', $companyId)
                ->first();

            if (!$category) {
                return response()->json([
                    'message' => 'Invalid category for this branch.'
                ], 422);
            }
        }

        // Check for duplicate name (excluding current unit)
        $categoryId = $validated['category_id'] ?? $unit->category_id;
        if (isset($validated['name']) && $validated['name'] !== $unit->name) {
            $exists = Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('category_id', $categoryId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $unit->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A unit with this name already exists in the selected category.'
                ], 422);
            }
        }

        $newUnitType = $validated['uom_type'] ?? $unit->uom_type;
        $newFactor = $validated['factor'] ?? $unit->factor;

        // Handle reference unit changes
        if ($newUnitType === 'reference') {
            $validated['factor'] = 1;
            $validated['factor_inv'] = 1;
            
            // Only validate if changing to reference from non-reference
            if ($unit->uom_type !== 'reference') {
                try {
                    $this->validateReferenceUnit($categoryId, $branchId, $unit->id);
                } catch (\RuntimeException $e) {
                    return response()->json(['message' => $e->getMessage()], 422);
                }
            }
        } elseif ($newUnitType !== 'reference' && $newFactor != $unit->factor) {
            // Calculate inverse factor for bigger/smaller units when factor changes
            $validated['factor_inv'] = $this->calculateInverseFactor($newFactor);
        }

        // If rounding not provided, keep existing
        if (!isset($validated['rounding'])) {
            $validated['rounding'] = $unit->rounding;
        }

        $validated['updated_by'] = Auth::id();
        $unit->update($validated);
        $unit->load(['category', 'creator', 'updater']);

        return response()->json([
            'data'    => $unit,
            'message' => 'Unit updated successfully.',
        ]);
    }

    /**
     * DELETE /api/units/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $unit     = Unit::where('branch_id', $branchId)->findOrFail($id);

        // Prevent deletion of reference unit if other units exist in the category
        if ($unit->uom_type === 'reference') {
            $otherUnitsCount = Unit::where('branch_id', $branchId)
                ->where('category_id', $unit->category_id)
                ->where('id', '!=', $unit->id)
                ->count();
            
            if ($otherUnitsCount > 0) {
                return response()->json([
                    'message' => "Cannot delete reference unit because there are {$otherUnitsCount} other unit(s) in this category. Please delete or reassign them first."
                ], 422);
            }
        }

        // Check if unit is being used in inventory or other modules (add when needed)
        // if ($unit->inventoryItems()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete unit because it is being used in inventory items.'
        //     ], 422);
        // }

        $unit->delete();

        return response()->json(['message' => 'Unit deleted successfully.']);
    }

    /**
     * POST /api/units/{id}/toggle-status
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $unit     = Unit::where('branch_id', $branchId)->findOrFail($id);
        
        $unit->is_active = !$unit->is_active;
        $unit->save();
        
        return response()->json([
            'data'    => $unit,
            'message' => $unit->is_active ? 'Unit activated.' : 'Unit deactivated.',
        ]);
    }

    /**
     * GET /api/units/list
     * Get list of units for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getUnitList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = Unit::with('category')
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true);
        
        // Filter by category
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        // Filter by unit type
        if ($request->filled('uom_type')) {
            $query->where('uom_type', $request->uom_type);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }
        
        $units = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'category_id', 'uom_type', 'factor', 'factor_inv', 'rounding']);
        
        return response()->json([
            'data' => $units->map(fn($unit) => [
                'id' => $unit->id,
                'name' => $unit->name,
                'category_id' => $unit->category_id,
                'category_name' => $unit->category?->name,
                'uom_type' => $unit->uom_type,
                'uom_type_label' => ucfirst($unit->uom_type),
                'factor' => $unit->factor,
                'factor_inv' => $unit->factor_inv,
                'rounding' => $unit->rounding,
            ])
        ]);
    }

    /**
     * GET /api/units/convert
     * Convert between units
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function convert(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'from_unit_id' => 'required|exists:units,id',
            'to_unit_id'   => 'required|exists:units,id',
            'quantity'     => 'required|numeric|min:0',
        ]);

        $fromUnit = Unit::where('id', $validated['from_unit_id'])
            ->where('branch_id', $branchId)
            ->where('company_id', $companyId)
            ->first();

        $toUnit = Unit::where('id', $validated['to_unit_id'])
            ->where('branch_id', $branchId)
            ->where('company_id', $companyId)
            ->first();

        if (!$fromUnit || !$toUnit) {
            return response()->json(['message' => 'Invalid units selected.'], 422);
        }

        // Check if units belong to same category
        if ($fromUnit->category_id !== $toUnit->category_id) {
            return response()->json([
                'message' => 'Cannot convert between different unit categories.'
            ], 422);
        }

        $quantity = $validated['quantity'];
        
        // Convert to reference unit first, then to target unit
        // Quantity in reference units = quantity * from_unit.factor_inv
        $quantityInReference = $quantity * $fromUnit->factor_inv;
        
        // Quantity in target units = quantity_in_reference * to_unit.factor
        $convertedQuantity = $quantityInReference * $toUnit->factor;
        
        // Apply rounding
        $roundedQuantity = round($convertedQuantity / $toUnit->rounding) * $toUnit->rounding;

        return response()->json([
            'from_unit' => [
                'id' => $fromUnit->id,
                'name' => $fromUnit->name,
                'factor' => $fromUnit->factor,
                'factor_inv' => $fromUnit->factor_inv,
            ],
            'to_unit' => [
                'id' => $toUnit->id,
                'name' => $toUnit->name,
                'factor' => $toUnit->factor,
                'factor_inv' => $toUnit->factor_inv,
            ],
            'quantity' => $quantity,
            'converted_quantity' => $roundedQuantity,
            'formula' => "{$quantity} {$fromUnit->name} = {$roundedQuantity} {$toUnit->name}",
        ]);
    }

    /**
     * GET /api/units/export
     * Export units to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = Unit::with('category')
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $units = $query->orderBy('name')->get();
        
        $exportData = $units->map(fn($unit) => [
            'Unit Name' => $unit->name,
            'Category' => $unit->category?->name ?? '—',
            'Type' => ucfirst($unit->uom_type),
            'Factor' => $unit->factor,
            'Inverse Factor' => $unit->factor_inv,
            'Rounding' => $unit->rounding,
            'Status' => $unit->is_active ? 'Active' : 'Inactive',
            'Created At' => $unit->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/units/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'unit_ids' => 'required|array',
            'unit_ids.*' => 'integer|exists:units,id',
        ]);
        
        $units = Unit::where('branch_id', $branchId)
            ->whereIn('id', $validated['unit_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($units as $unit) {
            // Prevent deletion of reference units with other units
            if ($unit->uom_type === 'reference') {
                $otherUnitsCount = Unit::where('branch_id', $branchId)
                    ->where('category_id', $unit->category_id)
                    ->where('id', '!=', $unit->id)
                    ->count();
                
                if ($otherUnitsCount > 0) {
                    $errors[] = [
                        'id' => $unit->id,
                        'name' => $unit->name,
                        'error' => "Reference unit with {$otherUnitsCount} other unit(s) in category",
                    ];
                    continue;
                }
            }
            
            try {
                $unit->delete();
                $deleted++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return response()->json([
            'deleted' => $deleted,
            'errors' => $errors,
            'message' => "{$deleted} unit(s) deleted successfully.",
        ]);
    }

    /**
     * GET /api/units/category/{categoryId}/reference
     * Get reference unit for a category
     *
     * @param Request $request
     * @param int $categoryId
     * @return JsonResponse
     */
    public function getReferenceUnit(Request $request, int $categoryId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $referenceUnit = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('category_id', $categoryId)
            ->where('uom_type', 'reference')
            ->first();

        if (!$referenceUnit) {
            return response()->json([
                'message' => 'No reference unit found for this category.'
            ], 404);
        }

        return response()->json(['data' => $referenceUnit]);
    }

    /**
     * GET /api/units/category/{categoryId}/units
     * Get all units for a category
     */
    public function getCategoryUnits(Request $request, int $categoryId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $units = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('category_id', $categoryId)
            ->get(['id', 'name', 'uom_type']);

        return response()->json(['data' => $units]);
    }

    /**
     * GET /api/units/statistics
     * Get statistics about units
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $active = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->count();
        
        $inactive = $total - $active;
        
        $byType = [
            'reference' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'reference')
                ->count(),
            'bigger' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'bigger')
                ->count(),
            'smaller' => Unit::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('uom_type', 'smaller')
                ->count(),
        ];
        
        $categoriesWithUnits = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->distinct('category_id')
            ->count('category_id');
        
        $recentlyAdded = Unit::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'category_id', 'uom_type', 'created_at']);
        
        return response()->json([
            'total_units' => $total,
            'active_units' => $active,
            'inactive_units' => $inactive,
            'by_type' => $byType,
            'categories_with_units' => $categoriesWithUnits,
            'recently_added' => $recentlyAdded,
        ]);
    }
}