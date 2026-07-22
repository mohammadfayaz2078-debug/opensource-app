<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleReturnController extends Controller
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

        $query = SaleReturn::with(['sale', 'customer', 'creator'])
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
            'sale_id'             => 'required|exists:sales,id',
            'customer_id'         => 'nullable|exists:customers,id',
            'return_date'         => 'required|date',
            'reason'              => 'nullable|string',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.sale_item_id'=> 'required|exists:sale_items,id',
            'items.*.product_id'  => 'nullable|exists:products,id',
            'items.*.unit_id'     => 'nullable|exists:units,id',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.notes'       => 'nullable|string',
        ]);

        $validated['company_id']   = $companyId;
        $validated['branch_id']    = $branchId;
        $validated['created_by']   = Auth::id();
        $validated['reference_no'] = SaleReturn::generateReferenceNo($branchId);

        $return = DB::transaction(function () use ($validated, $companyId, $branchId) {
            $items = $validated['items'];
            unset($validated['items']);

            // Calculate total amount
            $totalAmount = 0;
            foreach ($items as &$item) {
                $item['total'] = round($item['quantity'] * $item['unit_price'], 2);
                $totalAmount += $item['total'];
            }
            unset($item);

            $validated['total_amount'] = $totalAmount;
            $return = SaleReturn::create($validated);

            // Create return items and update sale items
            foreach ($items as $itemData) {
                // Create return item
                $returnItem = $return->items()->create($itemData);

                // Update the original sale item
                $saleItem = SaleItem::find($itemData['sale_item_id']);
                if ($saleItem) {
                    // Update refunded quantity and amount
                    $saleItem->refunded_quantity += $itemData['quantity'];
                    $saleItem->refunded_amount += $itemData['total'];
                    
                    // Update refund status
                    $deliveredQty = (float) $saleItem->quantity; // Using quantity as delivered quantity
                    $refundedQty = (float) $saleItem->refunded_quantity;
                    
                    if ($refundedQty <= 0) {
                        $saleItem->refund_status = 'none';
                    } elseif ($refundedQty >= $deliveredQty) {
                        $saleItem->refund_status = 'full';
                    } else {
                        $saleItem->refund_status = 'partial';
                    }
                    
                    $saleItem->save();
                }
            }

            // Update the sale
            $sale = Sale::find($validated['sale_id']);
            if ($sale) {
                // Recalculate sale totals
                $sale->recalculate();
                $sale->updatePaymentStatus();

                // Check if all items are fully refunded
                $allItemsFullyRefunded = $sale->items()
                    ->where('refund_status', '!=', 'full')
                    ->doesntExist();

                if ($allItemsFullyRefunded && $sale->items()->count() > 0) {
                    $sale->status = Sale::STATUS_RETURNED;
                    $sale->save();
                }
            }

            // Update stock
            foreach ($return->items as $item) {
                if ($item->product_id) {
                    StockService::record(
                        companyId: $companyId,
                        branchId: $branchId,
                        productId: $item->product_id,
                        movementType: 'in',
                        quantity: $item->quantity,
                        unitCost: (float) $item->unit_price,
                        referenceType: 'SaleReturn',
                        referenceId: $return->id,
                        notes: "Return for {$return->reference_no}",
                        unitId: $item->unit_id,
                    );
                }
            }

            return $return;
        });

        $return->load(['sale', 'customer', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $return,
            'message' => 'Sale return created. Stock and sale records updated.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $return = SaleReturn::where('branch_id', $branchId)
            ->with(['sale', 'customer', 'items.product', 'items.unit', 'creator'])
            ->findOrFail($id);

        return response()->json(['data' => $return]);
    }



        /**
     * Update the specified sale return.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $return = SaleReturn::where('branch_id', $branchId)
            ->with(['items'])
            ->findOrFail($id);

        $validated = $request->validate([
            'return_date'         => 'required|date',
            'reason'              => 'nullable|string',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.id'          => 'nullable|exists:sale_return_items,id',
            'items.*.sale_item_id'=> 'required|exists:sale_items,id',
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
                    StockService::reverse('SaleReturn', $return->id, 'Reversing for update');
                }
            }

            // 2. Restore original sale item refund data
            foreach ($return->items as $returnItem) {
                if ($returnItem->sale_item_id) {
                    $saleItem = SaleItem::find($returnItem->sale_item_id);
                    if ($saleItem) {
                        $saleItem->refunded_quantity -= $returnItem->quantity;
                        $saleItem->refunded_amount -= $returnItem->total;
                        
                        $deliveredQty = (float) $saleItem->quantity;
                        $refundedQty = (float) $saleItem->refunded_quantity;
                        
                        if ($refundedQty <= 0) {
                            $saleItem->refund_status = 'none';
                        } elseif ($refundedQty >= $deliveredQty) {
                            $saleItem->refund_status = 'full';
                        } else {
                            $saleItem->refund_status = 'partial';
                        }
                        
                        $saleItem->save();
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
                    'sale_item_id' => $itemData['sale_item_id'],
                    'product_id'   => $itemData['product_id'],
                    'unit_id'      => $itemData['unit_id'] ?? null,
                    'quantity'     => $itemData['quantity'],
                    'unit_price'   => $itemData['unit_price'],
                    'total'        => $total,
                    'notes'        => $itemData['notes'] ?? null,
                ]);
                $newItems[] = $newItem;
            }

            // 6. Update return total
            $return->update(['total_amount' => $totalAmount]);

            // 7. Update sale items with new refund data
            foreach ($newItems as $returnItem) {
                if ($returnItem->sale_item_id) {
                    $saleItem = SaleItem::find($returnItem->sale_item_id);
                    if ($saleItem) {
                        $saleItem->refunded_quantity += $returnItem->quantity;
                        $saleItem->refunded_amount += $returnItem->total;
                        
                        $deliveredQty = (float) $saleItem->quantity;
                        $refundedQty = (float) $saleItem->refunded_quantity;
                        
                        if ($refundedQty <= 0) {
                            $saleItem->refund_status = 'none';
                        } elseif ($refundedQty >= $deliveredQty) {
                            $saleItem->refund_status = 'full';
                        } else {
                            $saleItem->refund_status = 'partial';
                        }
                        
                        $saleItem->save();
                    }
                }
            }

            // 8. Update the sale
            $sale = Sale::find($return->sale_id);
            if ($sale) {
                $sale->recalculate();
                $sale->updatePaymentStatus();

                // Check if all items are fully refunded
                $allItemsFullyRefunded = $sale->items()
                    ->where('refund_status', '!=', 'full')
                    ->doesntExist();

                if ($allItemsFullyRefunded && $sale->items()->count() > 0) {
                    $sale->status = Sale::STATUS_RETURNED;
                } else if ($sale->status === Sale::STATUS_RETURNED) {
                    // If sale was returned but not all items are refunded anymore
                    $sale->status = Sale::STATUS_CONFIRMED;
                }
                $sale->save();
            }

            // 9. Record new stock movements
            foreach ($newItems as $item) {
                if ($item->product_id) {
                    StockService::record(
                        companyId: $companyId,
                        branchId: $branchId,
                        productId: $item->product_id,
                        movementType: 'in',
                        quantity: $item->quantity,
                        unitCost: (float) $item->unit_price,
                        referenceType: 'SaleReturn',
                        referenceId: $return->id,
                        notes: "Updated return for {$return->reference_no}",
                        unitId: $item->unit_id,
                    );
                }
            }
        });

        $return->load(['sale', 'customer', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $return,
            'message' => 'Sale return updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $return    = SaleReturn::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($return, $companyId, $branchId) {
            // Reverse stock movements
            StockService::reverse('SaleReturn', $return->id, 'Return cancelled');

            // Revert sale item refund data
            foreach ($return->items as $returnItem) {
                if ($returnItem->sale_item_id) {
                    $saleItem = SaleItem::find($returnItem->sale_item_id);
                    if ($saleItem) {
                        // Subtract refunded quantities and amounts
                        $saleItem->refunded_quantity -= $returnItem->quantity;
                        $saleItem->refunded_amount -= $returnItem->total;
                        
                        // Update refund status
                        $deliveredQty = (float) $saleItem->quantity;
                        $refundedQty = (float) $saleItem->refunded_quantity;
                        
                        if ($refundedQty <= 0) {
                            $saleItem->refund_status = 'none';
                        } elseif ($refundedQty >= $deliveredQty) {
                            $saleItem->refund_status = 'full';
                        } else {
                            $saleItem->refund_status = 'partial';
                        }
                        
                        $saleItem->save();
                    }
                }
            }

            // Update sale
            $sale = Sale::find($return->sale_id);
            if ($sale) {
                $sale->recalculate();
                $sale->updatePaymentStatus();
                
                // If sale was marked as returned, revert to confirmed
                if ($sale->status === Sale::STATUS_RETURNED) {
                    $sale->status = Sale::STATUS_CONFIRMED;
                    $sale->save();
                }
            }

            // Delete the return
            $return->delete();
        });

        return response()->json(['message' => 'Sale return deleted. Stock and sale records reverted.']);
    }

    /**
     * Get refundable items from a sale
     */
    public function getRefundableItems(Request $request, int $saleId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $sale = Sale::where('branch_id', $branchId)
            ->with(['items.product', 'items.unit'])
            ->findOrFail($saleId);

        // Filter items that can be refunded
        $refundableItems = $sale->items->filter(function ($item) {
            $refundableQty = (float) $item->quantity - (float) $item->refunded_quantity;
            return $refundableQty > 0;
        })->map(function ($item) {
            $refundableQty = (float) $item->quantity - (float) $item->refunded_quantity;
            
            return [
                'sale_item_id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? 'Unknown Product',
                'unit_id' => $item->unit_id,
                'unit_name' => $item->unit->name ?? 'N/A',
                'original_quantity' => $item->quantity,
                'refunded_quantity' => $item->refunded_quantity,
                'refundable_quantity' => $refundableQty,
                'unit_price' => $item->unit_price,
                'total' => $item->total,
                'refund_status' => $item->refund_status,
            ];
        });

        return response()->json([
            'sale_id' => $saleId,
            'sale_reference' => $sale->reference_no,
            'refundable_items' => $refundableItems->values()
        ]);
    }
}