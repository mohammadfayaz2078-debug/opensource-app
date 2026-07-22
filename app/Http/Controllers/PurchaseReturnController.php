<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseReturnController extends Controller
{
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

    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = PurchaseReturn::with(['purchase', 'supplier', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('return_date', 'desc');

        if ($request->filled('search')) {
            $query->where('reference_no', 'like', "%{$request->search}%");
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $returns = $query->paginate($perPage);

        return response()->json([
            'data'         => $returns->items(),
            'total'        => $returns->total(),
            'per_page'     => $returns->perPage(),
            'current_page' => $returns->currentPage(),
            'last_page'    => $returns->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'purchase_id'             => 'required|exists:purchases,id',
            'supplier_id'             => 'nullable|exists:suppliers,id',
            'return_date'             => 'required|date',
            'reason'                  => 'nullable|string',
            'notes'                   => 'nullable|string',
            'items'                   => 'required|array|min:1',
            'items.*.purchase_item_id'=> 'nullable|exists:purchase_items,id',
            'items.*.product_id'      => 'nullable|exists:products,id',
            'items.*.unit_id'         => 'nullable|exists:units,id',
            'items.*.quantity'        => 'required|numeric|min:0.01',
            'items.*.unit_price'      => 'required|numeric|min:0',
            'items.*.notes'           => 'nullable|string',
        ]);

        $validated['company_id']   = $companyId;
        $validated['branch_id']    = $branchId;
        $validated['created_by']   = Auth::id();
        $validated['reference_no'] = PurchaseReturn::generateReferenceNo($branchId);

        $return = DB::transaction(function () use ($validated) {
            $items = $validated['items'];
            unset($validated['items']);

            $totalAmount = 0;
            foreach ($items as &$item) {
                $item['total'] = round($item['quantity'] * $item['unit_price'], 2);
                $totalAmount += $item['total'];
            }
            unset($item);

            $validated['total_amount'] = $totalAmount;
            $return = PurchaseReturn::create($validated);

            foreach ($items as $item) {
                $return->items()->create($item);
            }

            return $return;
        });

        DB::transaction(function () use ($return, $companyId, $branchId) {
            foreach ($return->items as $item) {
                if ($item->product_id) {
                    StockService::record(
                        companyId: $companyId,
                        branchId: $branchId,
                        productId: $item->product_id,
                        movementType: 'out',
                        quantity: $item->quantity,
                        unitCost: (float) $item->unit_price,
                        referenceType: 'PurchaseReturn',
                        referenceId: $return->id,
                        notes: "Return for {$return->reference_no}",
                        unitId: $item->unit_id,
                    );
                }
            }
        });

        $return->load(['purchase', 'supplier', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $return,
            'message' => 'Purchase return created. Stock updated.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $return = PurchaseReturn::where('branch_id', $branchId)
            ->with(['purchase', 'supplier', 'items.product', 'items.unit', 'creator'])
            ->findOrFail($id);

        return response()->json(['data' => $return]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $return    = PurchaseReturn::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($return, $companyId, $branchId) {
            StockService::reverse('PurchaseReturn', $return->id, 'Return cancelled');
            $return->delete();
        });

        return response()->json(['message' => 'Purchase return deleted. Stock reversed.']);
    }
}
