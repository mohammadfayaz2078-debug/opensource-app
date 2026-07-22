<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Purchase;
use App\Models\PurchaseItem;
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
            'items.*.purchase_item_id'=> 'required|exists:purchase_items,id',
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

        $return = DB::transaction(function () use ($validated, $companyId, $branchId) {
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

            // Create return items and update purchase items
            foreach ($items as $itemData) {
                // Create return item
                $return->items()->create($itemData);

                // Update the original purchase item
                $purchaseItem = PurchaseItem::find($itemData['purchase_item_id']);
                if ($purchaseItem) {
                    // Update refunded quantity and amount
                    $purchaseItem->refunded_quantity = ((float) ($purchaseItem->refunded_quantity ?? 0)) + $itemData['quantity'];
                    $purchaseItem->refunded_amount = ((float) ($purchaseItem->refunded_amount ?? 0)) + $itemData['total'];
                    
                    // Update refund status using the model method
                    $purchaseItem->updateRefundStatus();
                    $purchaseItem->save();
                }
            }

            // Update the purchase
            $purchase = Purchase::find($validated['purchase_id']);
            if ($purchase) {
                // Recalculate purchase totals
                $purchase->recalculate();
                $purchase->updatePaymentStatus();
                $purchase->updateRefundStatus();
                $purchase->save();
            }

            // Update stock (movement out for purchase return)
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

            return $return;
        });

        $return->load(['purchase', 'supplier', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $return,
            'message' => 'Purchase return created. Stock and purchase records updated.',
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

    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $return = PurchaseReturn::where('branch_id', $branchId)
            ->with(['items'])
            ->findOrFail($id);

        $validated = $request->validate([
            'return_date'         => 'required|date',
            'reason'              => 'nullable|string',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.id'          => 'nullable|exists:purchase_return_items,id',
            'items.*.purchase_item_id'=> 'required|exists:purchase_items,id',
            'items.*.product_id'  => 'nullable|exists:products,id',
            'items.*.unit_id'     => 'nullable|exists:units,id',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.notes'       => 'nullable|string',
            'items.*.total'       => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($return, $validated, $companyId, $branchId) {
            // 1. Reverse stock movements for existing items
            foreach ($return->items as $item) {
                if ($item->product_id) {
                    StockService::reverse('PurchaseReturn', $return->id, 'Reversing for update');
                }
            }

            // 2. Restore original purchase item refund data
            foreach ($return->items as $returnItem) {
                if ($returnItem->purchase_item_id) {
                    $purchaseItem = PurchaseItem::find($returnItem->purchase_item_id);
                    if ($purchaseItem) {
                        $purchaseItem->refunded_quantity = ((float) ($purchaseItem->refunded_quantity ?? 0)) - $returnItem->quantity;
                        $purchaseItem->refunded_amount = ((float) ($purchaseItem->refunded_amount ?? 0)) - $returnItem->total;
                        $purchaseItem->updateRefundStatus();
                        $purchaseItem->save();
                    }
                }
            }

            // 3. Update return details
            $return->update([
                'return_date' => $validated['return_date'],
                'reason'      => $validated['reason'] ?? $return->reason,
                'notes'       => $validated['notes'] ?? $return->notes,
            ]);

            // 4. Delete existing return items
            $return->items()->delete();

            // 5. Create new return items
            $totalAmount = 0;
            $newItems = [];
            
            foreach ($validated['items'] as $itemData) {
                $total = $itemData['total'] ?? round($itemData['quantity'] * $itemData['unit_price'], 2);
                $totalAmount += $total;
                
                $newItem = $return->items()->create([
                    'purchase_item_id' => $itemData['purchase_item_id'],
                    'product_id'       => $itemData['product_id'],
                    'unit_id'          => $itemData['unit_id'] ?? null,
                    'quantity'         => $itemData['quantity'],
                    'unit_price'       => $itemData['unit_price'],
                    'total'            => $total,
                    'notes'            => $itemData['notes'] ?? null,
                ]);
                $newItems[] = $newItem;
            }

            // 6. Update return total
            $return->update(['total_amount' => $totalAmount]);

            // 7. Update purchase items with new refund data
            foreach ($newItems as $returnItem) {
                if ($returnItem->purchase_item_id) {
                    $purchaseItem = PurchaseItem::find($returnItem->purchase_item_id);
                    if ($purchaseItem) {
                        $purchaseItem->refunded_quantity = ((float) ($purchaseItem->refunded_quantity ?? 0)) + $returnItem->quantity;
                        $purchaseItem->refunded_amount = ((float) ($purchaseItem->refunded_amount ?? 0)) + $returnItem->total;
                        $purchaseItem->updateRefundStatus();
                        $purchaseItem->save();
                    }
                }
            }

            // 8. Update the purchase
            $purchase = Purchase::find($return->purchase_id);
            if ($purchase) {
                $purchase->recalculate();
                $purchase->updatePaymentStatus();
                $purchase->updateRefundStatus();
                $purchase->save();
            }

            // 9. Record new stock movements
            foreach ($newItems as $item) {
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
                        notes: "Updated return for {$return->reference_no}",
                        unitId: $item->unit_id,
                    );
                }
            }
        });

        $return->load(['purchase', 'supplier', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $return,
            'message' => 'Purchase return updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $return    = PurchaseReturn::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($return, $companyId, $branchId) {
            // Reverse stock movements
            StockService::reverse('PurchaseReturn', $return->id, 'Return cancelled');

            // Revert purchase item refund data
            foreach ($return->items as $returnItem) {
                if ($returnItem->purchase_item_id) {
                    $purchaseItem = PurchaseItem::find($returnItem->purchase_item_id);
                    if ($purchaseItem) {
                        $purchaseItem->refunded_quantity = ((float) ($purchaseItem->refunded_quantity ?? 0)) - $returnItem->quantity;
                        $purchaseItem->refunded_amount = ((float) ($purchaseItem->refunded_amount ?? 0)) - $returnItem->total;
                        $purchaseItem->updateRefundStatus();
                        $purchaseItem->save();
                    }
                }
            }

            // Update purchase
            $purchase = Purchase::find($return->purchase_id);
            if ($purchase) {
                $purchase->recalculate();
                $purchase->updatePaymentStatus();
                $purchase->updateRefundStatus();
                $purchase->save();
            }

            // Delete the return
            $return->delete();
        });

        return response()->json(['message' => 'Purchase return deleted. Stock and purchase records reverted.']);
    }

/**
 * Get refundable items from a purchase
 */
public function getRefundableItems(Request $request, int $purchaseId): JsonResponse
{
    $branchId = $this->resolveBranchId($request);
    
    $purchase = Purchase::where('branch_id', $branchId)
        ->with(['items.product', 'items.unit'])
        ->findOrFail($purchaseId);

    // Filter items that can be refunded
    $refundableItems = $purchase->items->filter(function ($item) {
        $refundableQty = (float) $item->quantity - (float) ($item->refunded_quantity ?? 0);
        return $refundableQty > 0;
    })->map(function ($item) {
        $refundableQty = (float) $item->quantity - (float) ($item->refunded_quantity ?? 0);
        
        return [
            'purchase_item_id' => $item->id,
            'product_id' => $item->product_id,
            'product_name' => $item->product->name ?? 'Unknown Product',
            'unit_id' => $item->unit_id,
            'unit_name' => $item->unit->name ?? 'N/A',
            'original_quantity' => $item->quantity,
            'refunded_quantity' => (float) ($item->refunded_quantity ?? 0),
            'refundable_quantity' => $refundableQty,
            'unit_price' => $item->unit_price,
            'total' => $item->total,
            'refund_status' => $item->refund_status ?? 'none',
        ];
    });

    return response()->json([
        'purchase_id' => $purchaseId,
        'purchase_reference' => $purchase->reference_no,
        'refundable_items' => $refundableItems->values()
    ]);
}
}