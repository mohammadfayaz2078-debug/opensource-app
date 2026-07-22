<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\UnitCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UnitCategoryController extends Controller
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

    // ── Unit Categories CRUD ────────────────────────────────────────────────

    /**
     * GET /api/unit-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = UnitCategory::with(['creator', 'updater'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by measure type
        if ($request->filled('measure_type')) {
            $query->where('measure_type', $request->measure_type);
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
        
        $allowedSorts = ['name', 'measure_type', 'created_at'];
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
            'unit_categories' => UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', 'unit')
                ->count(),
            'weight_categories' => UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', 'weight')
                ->count(),
            'volume_categories' => UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', 'volume')
                ->count(),
            'length_categories' => UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', 'length')
                ->count(),
            'time_categories' => UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', 'time')
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
     * POST /api/unit-categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'measure_type' => 'required|in:unit,weight,volume,length,time',
        ]);

        // Check for duplicate name within branch
        $exists = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A unit category with this name already exists in this branch.'
            ], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();

        $category = UnitCategory::create($validated);
        $category->load(['creator', 'updater']);

        return response()->json([
            'data'    => $category,
            'message' => 'Unit category created successfully.',
        ], 201);
    }

    /**
     * GET /api/unit-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $category = UnitCategory::where('branch_id', $branchId)
            ->with(['creator', 'updater', 'company', 'units'])
            ->findOrFail($id);

        // Add units count
        $category->units_count = $category->units()->count();

        return response()->json(['data' => $category]);
    }

    /**
     * PUT /api/unit-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $category  = UnitCategory::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'measure_type' => 'sometimes|in:unit,weight,volume,length,time',
        ]);

        // Check for duplicate name (excluding current category)
        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $exists = UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $category->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A unit category with this name already exists in this branch.'
                ], 422);
            }
        }
        
        // Check if changing measure type when units exist
        if (isset($validated['measure_type']) && $validated['measure_type'] !== $category->measure_type) {
            $unitsCount = $category->units()->count();
            if ($unitsCount > 0) {
                return response()->json([
                    'message' => "Cannot change measure type because this category has {$unitsCount} unit(s) associated with it."
                ], 422);
            }
        }
        
        $validated['updated_by'] = Auth::id();
        $category->update($validated);
        $category->load(['creator', 'updater']);

        return response()->json([
            'data'    => $category,
            'message' => 'Unit category updated successfully.',
        ]);
    }

    /**
     * DELETE /api/unit-categories/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = UnitCategory::where('branch_id', $branchId)->findOrFail($id);

        // Check if category has any associated units
        $unitsCount = $category->units()->count();
        if ($unitsCount > 0) {
            return response()->json([
                'message' => "Cannot delete unit category because it has {$unitsCount} unit(s) associated with it.",
                'units_count' => $unitsCount
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Unit category deleted successfully.']);
    }

    /**
     * GET /api/unit-categories/list
     * Get list of unit categories for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getCategoryList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId);
        
        // Filter by measure type
        if ($request->filled('measure_type')) {
            $query->where('measure_type', $request->measure_type);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }
        
        $categories = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'measure_type']);
        
        return response()->json([
            'data' => $categories->map(fn($category) => [
                'id' => $category->id,
                'name' => $category->name,
                'measure_type' => $category->measure_type,
                'measure_type_label' => ucfirst($category->measure_type),
            ])
        ]);
    }

    /**
     * GET /api/unit-categories/export
     * Export unit categories to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('measure_type')) {
            $query->where('measure_type', $request->measure_type);
        }

        $categories = $query->orderBy('name')->get();
        
        $exportData = $categories->map(fn($category) => [
            'Name' => $category->name,
            'Measure Type' => ucfirst($category->measure_type),
            'Number of Units' => $category->units()->count(),
            'Created At' => $category->created_at->format('Y-m-d H:i:s'),
            'Created By' => $category->creator?->name ?? '—',
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/unit-categories/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'category_ids' => 'required|array',
            'category_ids.*' => 'integer|exists:unit_categories,id',
        ]);
        
        $categories = UnitCategory::where('branch_id', $branchId)
            ->whereIn('id', $validated['category_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($categories as $category) {
            // Check if category has associated units
            $unitsCount = $category->units()->count();
            if ($unitsCount > 0) {
                $errors[] = [
                    'id' => $category->id,
                    'name' => $category->name,
                    'error' => "Has {$unitsCount} unit(s) associated",
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
     * GET /api/unit-categories/measure-types
     * Get all available measure types
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getMeasureTypes(Request $request): JsonResponse
    {
        $measureTypes = [
            ['value' => 'unit', 'label' => 'Unit (Pieces, Each, etc.)', 'icon' => '🔢'],
            ['value' => 'weight', 'label' => 'Weight (kg, g, lb, etc.)', 'icon' => '⚖️'],
            ['value' => 'volume', 'label' => 'Volume (L, mL, gal, etc.)', 'icon' => '🧪'],
            ['value' => 'length', 'label' => 'Length (m, cm, ft, etc.)', 'icon' => '📏'],
            ['value' => 'time', 'label' => 'Time (days, hours, etc.)', 'icon' => '⏱️'],
        ];

        return response()->json(['data' => $measureTypes]);
    }

    /**
     * GET /api/unit-categories/statistics
     * Get statistics about unit categories
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $stats = [];
        $measureTypes = ['unit', 'weight', 'volume', 'length', 'time'];
        
        foreach ($measureTypes as $type) {
            $count = UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('measure_type', $type)
                ->count();
            
            $stats[$type] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0,
            ];
        }
        
        $categoriesWithUnits = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->has('units')
            ->count();
        
        $categoriesWithoutUnits = $total - $categoriesWithUnits;
        
        $recentlyAdded = UnitCategory::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'measure_type', 'created_at']);
        
        return response()->json([
            'total_categories' => $total,
            'by_measure_type' => $stats,
            'categories_with_units' => $categoriesWithUnits,
            'categories_without_units' => $categoriesWithoutUnits,
            'recently_added' => $recentlyAdded,
        ]);
    }

    /**
     * POST /api/unit-categories/seed-default
     * Seed default unit categories for a branch
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function seedDefault(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $defaultCategories = [
            ['name' => 'Pieces', 'measure_type' => 'unit'],
            ['name' => 'Boxes', 'measure_type' => 'unit'],
            ['name' => 'Packs', 'measure_type' => 'unit'],
            ['name' => 'Weight', 'measure_type' => 'weight'],
            ['name' => 'Volume', 'measure_type' => 'volume'],
            ['name' => 'Length', 'measure_type' => 'length'],
            ['name' => 'Time', 'measure_type' => 'time'],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($defaultCategories as $default) {
            $exists = UnitCategory::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('name', $default['name'])
                ->exists();

            if (!$exists) {
                UnitCategory::create([
                    'company_id' => $companyId,
                    'branch_id' => $branchId,
                    'name' => $default['name'],
                    'measure_type' => $default['measure_type'],
                    'created_by' => Auth::id(),
                ]);
                $created++;
            } else {
                $skipped++;
            }
        }

        return response()->json([
            'created' => $created,
            'skipped' => $skipped,
            'message' => "Created {$created} default unit categories. Skipped {$skipped} existing ones.",
        ]);
    }
}