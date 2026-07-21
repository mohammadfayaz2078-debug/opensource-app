<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\WarehouseTower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WarehouseTowerController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Resolve branch ID based on authenticated user
     */
    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        return AuthHelper::getBranchId();
    }

    /**
     * Resolve company ID based on authenticated user
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin || AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    // ── Warehouse/Tower CRUD ────────────────────────────────────────────────

    /**
     * GET /api/warehouse-towers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = WarehouseTower::with(['branch', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filter by province
        if ($request->filled('province')) {
            $query->where('province', 'like', "%{$request->province}%");
        }

        // Filter by district
        if ($request->filled('district')) {
            $query->where('district', 'like', "%{$request->district}%");
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('street_address', 'like', "%{$search}%")
                    ->orWhere('village', 'like', "%{$search}%")
                    ->orWhere('district', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['name', 'type', 'province', 'district', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $locations = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total' => $query->count(),
            'warehouses' => WarehouseTower::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('type', 'warehouse')
                ->count(),
            'towers' => WarehouseTower::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('type', 'tower')
                ->count(),
            'provinces' => WarehouseTower::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->distinct('province')
                ->count('province'),
        ];

        return response()->json([
            'data'         => $locations->items(),
            'total'        => $locations->total(),
            'per_page'     => $locations->perPage(),
            'current_page' => $locations->currentPage(),
            'last_page'    => $locations->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/warehouse-towers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'street_address'  => 'nullable|string',
            'village'         => 'nullable|string|max:255',
            'district'        => 'nullable|string|max:255',
            'province'        => 'nullable|string|max:255',
            'country'         => 'nullable|string|max:255',
            'type'            => 'required|in:warehouse,tower',
            'gps_lat'         => 'nullable|numeric|min:-90|max:90',
            'gps_lng'         => 'nullable|numeric|min:-180|max:180',
        ]);

        // Check for duplicate name within branch
        $exists = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A warehouse/tower with this name already exists in this branch.'
            ], 422);
        }

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();

        $location = WarehouseTower::create($validated);
        $location->load(['branch', 'creator']);

        return response()->json([
            'data'    => $location,
            'message' => ucfirst($location->type) . ' created successfully.',
        ], 201);
    }

    /**
     * GET /api/warehouse-towers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $location = WarehouseTower::where('branch_id', $branchId)
            ->with(['branch', 'creator', 'company'])
            ->findOrFail($id);

        return response()->json(['data' => $location]);
    }

    /**
     * PUT /api/warehouse-towers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $location  = WarehouseTower::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'street_address'  => 'nullable|string',
            'village'         => 'nullable|string|max:255',
            'district'        => 'nullable|string|max:255',
            'province'        => 'nullable|string|max:255',
            'country'         => 'nullable|string|max:255',
            'type'            => 'sometimes|in:warehouse,tower',
            'gps_lat'         => 'nullable|numeric|min:-90|max:90',
            'gps_lng'         => 'nullable|numeric|min:-180|max:180',
        ]);

        // Check for duplicate name (excluding current location)
        if (isset($validated['name']) && $validated['name'] !== $location->name) {
            $exists = WarehouseTower::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $location->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A warehouse/tower with this name already exists in this branch.'
                ], 422);
            }
        }
        
        $location->update($validated);
        $location->load(['branch', 'creator']);

        return response()->json([
            'data'    => $location,
            'message' => ucfirst($location->type) . ' updated successfully.',
        ]);
    }

    /**
     * DELETE /api/warehouse-towers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $location = WarehouseTower::where('branch_id', $branchId)->findOrFail($id);

        // Check if location has any associated records (inventory, assignments, etc.)
        // You can add relationships here when they exist
        // if ($location->inventories()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete location because it has associated inventory records.'
        //     ], 422);
        // }

        $location->delete();

        return response()->json(['message' => ucfirst($location->type) . ' deleted successfully.']);
    }

    /**
     * POST /api/warehouse-towers/{id}/change-type
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function changeType(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $location = WarehouseTower::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'type' => 'required|in:warehouse,tower',
        ]);

        $oldType = $location->type;
        $location->type = $validated['type'];
        $location->save();

        return response()->json([
            'data'    => $location,
            'message' => "Type changed from {$oldType} to {$location->type}.",
        ]);
    }

    /**
     * GET /api/warehouse-towers/list
     * Get list of locations for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getLocationList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId);
        
        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }
        
        $locations = $query->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'type', 'province', 'district']);
        
        return response()->json([
            'data' => $locations->map(fn($location) => [
                'id' => $location->id,
                'name' => $location->name,
                'type' => $location->type,
                'location' => trim(($location->district ? $location->district . ', ' : '') . $location->province),
            ])
        ]);
    }

    /**
     * GET /api/warehouse-towers/export
     * Export locations to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $locations = $query->orderBy('name')->get();
        
        $exportData = $locations->map(fn($location) => [
            'Name' => $location->name,
            'Type' => ucfirst($location->type),
            'Street Address' => $location->street_address ?? '',
            'Village' => $location->village ?? '',
            'District' => $location->district ?? '',
            'Province' => $location->province ?? '',
            'Country' => $location->country,
            'GPS Latitude' => $location->gps_lat ?? '',
            'GPS Longitude' => $location->gps_lng ?? '',
            'Created At' => $location->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/warehouse-towers/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'location_ids' => 'required|array',
            'location_ids.*' => 'integer|exists:warehouse_towers,id',
        ]);
        
        $locations = WarehouseTower::where('branch_id', $branchId)
            ->whereIn('id', $validated['location_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($locations as $location) {
            try {
                $location->delete();
                $deleted++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $location->id,
                    'name' => $location->name,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return response()->json([
            'deleted' => $deleted,
            'errors' => $errors,
            'message' => "{$deleted} location(s) deleted successfully.",
        ]);
    }

    /**
     * GET /api/warehouse-towers/statistics
     * Get statistics about locations
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $total = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();
        
        $warehouses = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('type', 'warehouse')
            ->count();
        
        $towers = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('type', 'tower')
            ->count();
        
        $locationsByProvince = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereNotNull('province')
            ->select('province')
            ->selectRaw('count(*) as count')
            ->groupBy('province')
            ->orderBy('count', 'desc')
            ->get();
        
        $recentlyAdded = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'type', 'province', 'created_at']);
        
        return response()->json([
            'total_locations' => $total,
            'warehouses' => $warehouses,
            'towers' => $towers,
            'warehouse_percentage' => $total > 0 ? round(($warehouses / $total) * 100, 2) : 0,
            'tower_percentage' => $total > 0 ? round(($towers / $total) * 100, 2) : 0,
            'locations_by_province' => $locationsByProvince,
            'recently_added' => $recentlyAdded,
        ]);
    }

    /**
     * GET /api/warehouse-towers/nearby
     * Get locations near GPS coordinates
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function nearby(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $validated = $request->validate([
            'lat' => 'required|numeric|min:-90|max:90',
            'lng' => 'required|numeric|min:-180|max:180',
            'radius' => 'nullable|numeric|min:0.1|max:100', // in kilometers
        ]);
        
        $radius = $validated['radius'] ?? 10; // Default 10km
        
        // Using Haversine formula to calculate distance
        $locations = WarehouseTower::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereNotNull('gps_lat')
            ->whereNotNull('gps_lng')
            ->selectRaw("*, 
                (6371 * acos(cos(radians(?)) * cos(radians(gps_lat)) * 
                cos(radians(gps_lng) - radians(?)) + 
                sin(radians(?)) * sin(radians(gps_lat)))) AS distance", 
                [$validated['lat'], $validated['lng'], $validated['lat']])
            ->having('distance', '<=', $radius)
            ->orderBy('distance', 'asc')
            ->get();
        
        return response()->json([
            'data' => $locations,
            'center' => [
                'lat' => $validated['lat'],
                'lng' => $validated['lng'],
            ],
            'radius_km' => $radius,
            'count' => $locations->count(),
        ]);
    }
}