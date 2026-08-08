<?php

namespace App\Services;

use App\Models\StockBalance;
use App\Models\StockTransaction;
use App\Models\Unit;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Centralised service for recording stock movements.
 * Creates a StockTransaction record and updates the StockBalance.
 *
 * All stock quantities are stored in the unit category's reference unit.
 * Transaction quantities are converted to the reference unit using
 * the selected unit's factor_inv before being recorded in the balance.
 */
class StockService
{
    /**
     * Record a stock movement (IN or OUT) and update the running balance.
     */
    public static function record(
        int     $companyId,
        int     $branchId,
        int     $productId,
        string  $movementType,
        float   $quantity,
        float   $unitCost,
        string  $referenceType,
        int     $referenceId,
        ?string $notes = null,
        ?int    $unitId = null,
    ): StockTransaction {

        // ── Resolve unit category & convert quantity to reference unit ──
        $unitCategoryId = null;
        $refQuantity    = $quantity;
        $refUnitCost    = $unitCost;

        if ($unitId) {
            $unit = Unit::with('category')->find($unitId);
            if ($unit && $unit->category) {
                $unitCategoryId = $unit->category_id;
                $factorInv      = (float) $unit->factor_inv;

                $refQuantity = $quantity * $factorInv;
                $refUnitCost = $factorInv > 0 ? $unitCost / $factorInv : $unitCost;
            }
        }

        // ── Get or create stock balance (one record per product + branch + unit category) ──
        // lockForUpdate serializes concurrent movements for the same product/branch
        // so that simultaneous sales cannot both pass the overselling check.
        $balance = StockBalance::where([
            'company_id'       => $companyId,
            'branch_id'        => $branchId,
            'product_id'       => $productId,
        ])
        ->when($unitCategoryId, fn($q) => $q->where('unit_category_id', $unitCategoryId))
        ->lockForUpdate()
        ->first();

        if (!$balance) {
            $balance = StockBalance::create([
                'company_id'       => $companyId,
                'branch_id'        => $branchId,
                'product_id'       => $productId,
                'unit_category_id' => $unitCategoryId,
                'quantity'         => 0,
                'avg_cost'         => 0,
                'total_value'      => 0,
                'fifo_layers'      => null,
            ]);
        }

        $balanceQtyBefore = (float) $balance->quantity;

        // ── Block overselling ──
        if ($movementType === StockTransaction::MOVEMENT_OUT || $movementType === 'out') {
            if ($balanceQtyBefore + 1e-9 < $refQuantity) {
                throw new \RuntimeException(
                    "Insufficient stock for product #{$productId}. Available: {$balanceQtyBefore}, requested: {$refQuantity} (in reference units)."
                );
            }
        }

        // ── Update balance with valuation method ──
        self::updateBalanceWithValuation(
            $balance,
            $movementType,
            $refQuantity,
            $refUnitCost,
            $productId
        );

        $balanceQtyAfter = (float) $balance->quantity;

        // ── Create transaction record ──
        $transaction = StockTransaction::create([
            'company_id'         => $companyId,
            'branch_id'          => $branchId,
            'product_id'         => $productId,
            'unit_id'            => $unitId,
            'original_quantity'  => $quantity !== $refQuantity ? $quantity : null,
            'original_unit_id'   => $quantity !== $refQuantity ? $unitId : null,
            'reference_type'     => $referenceType,
            'reference_id'       => $referenceId,
            'movement_type'      => $movementType,
            'quantity'           => $refQuantity,
            'unit_cost'          => $refUnitCost,
            'total_cost'         => round($refQuantity * $refUnitCost, 2),
            'balance_qty'        => $balanceQtyAfter,
            'notes'              => $notes,
            'created_by'         => Auth::id(),
        ]);

        $balance->last_movement_at = now();
        $balance->save();

        return $transaction;
    }

    /**
     * Update balance using the product's valuation method (Average Cost or FIFO).
     */
    private static function updateBalanceWithValuation(
        StockBalance $balance,
        string $movementType,
        float $quantity,
        float $unitCost,
        int $productId
    ): void {
        $product = \App\Models\Product::find($productId);
        $valuationMethod = $product?->inventory_valuation_method ?? 'average';

        if ($movementType === StockTransaction::MOVEMENT_IN) {
            $currentQty       = (float) $balance->quantity;
            $currentAvgCost   = (float) $balance->avg_cost;
            $currentTotalVal  = (float) $balance->total_value;

            if ($valuationMethod === 'fifo') {
                $layers = json_decode($balance->fifo_layers ?? '[]', true) ?: [];
                $layers[] = [
                    'quantity'   => $quantity,
                    'unit_cost'  => $unitCost,
                    'total_cost' => $quantity * $unitCost,
                    'date'       => now()->toDateTimeString(),
                ];
                $balance->fifo_layers = json_encode($layers);

                $newTotalVal = $currentTotalVal + ($quantity * $unitCost);
                $newQty      = $currentQty + $quantity;
                $balance->avg_cost    = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
                $balance->total_value = round($newTotalVal, 2);
                $balance->quantity   = $newQty;
            } else {
                // Average Cost
                $newTotalVal = $currentTotalVal + ($quantity * $unitCost);
                $newQty      = $currentQty + $quantity;
                $balance->quantity   = $newQty;
                $balance->avg_cost    = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
                $balance->total_value = round($newTotalVal, 2);
            }
        } else {
            // OUT
            $currentQty      = (float) $balance->quantity;
            $currentTotalVal = (float) $balance->total_value;

            if ($valuationMethod === 'fifo') {
                $layers         = json_decode($balance->fifo_layers ?? '[]', true) ?: [];
                $remainingQty   = $quantity;
                $costOfGoodsSold = 0;
                $updatedLayers  = [];

                foreach ($layers as $layer) {
                    if ($remainingQty <= 0) {
                        $updatedLayers[] = $layer;
                        continue;
                    }

                    $layerQty = (float) $layer['quantity'];
                    if ($layerQty <= $remainingQty) {
                        $costOfGoodsSold += $layerQty * (float) $layer['unit_cost'];
                        $remainingQty -= $layerQty;
                    } else {
                        $costOfGoodsSold += $remainingQty * (float) $layer['unit_cost'];
                        $layer['quantity']   = $layerQty - $remainingQty;
                        $layer['total_cost'] = $layer['quantity'] * (float) $layer['unit_cost'];
                        $updatedLayers[] = $layer;
                        $remainingQty = 0;
                    }
                }

                $balance->fifo_layers = json_encode($updatedLayers);

                $newQty      = $currentQty - $quantity;
                $newTotalVal = $currentTotalVal - $costOfGoodsSold;
                $balance->quantity    = max(0, $newQty);
                $balance->total_value = max(0, round($newTotalVal, 2));
                $balance->avg_cost    = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
            } else {
                // Average Cost
                $newQty      = max(0, $currentQty - $quantity);
                $newTotalVal = max(0, $currentTotalVal - ($quantity * (float) $balance->avg_cost));
                $balance->quantity    = $newQty;
                $balance->total_value = round($newTotalVal, 2);
                $balance->avg_cost    = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
            }
        }

        $balance->save();
    }

    /**
     * Reverse stock transactions for a given reference (e.g. cancelled purchase/sale).
     */
    public static function reverse(
        string $referenceType,
        int    $referenceId,
        string $reason = 'Reversal'
    ): void {
        $transactions = StockTransaction::where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->get();

        foreach ($transactions as $txn) {
            $oppositeType = $txn->movement_type === StockTransaction::MOVEMENT_IN
                ? StockTransaction::MOVEMENT_OUT
                : StockTransaction::MOVEMENT_IN;

            // Resolve unit category from the transaction's unit_id
            $unitCategoryId = null;
            if ($txn->unit_id) {
                $unit = Unit::find($txn->unit_id);
                if ($unit) {
                    $unitCategoryId = $unit->category_id;
                }
            }

            // Get the balance
            $balance = StockBalance::where([
                'company_id' => $txn->company_id,
                'branch_id'  => $txn->branch_id,
                'product_id' => $txn->product_id,
            ])
            ->when($unitCategoryId, fn($q) => $q->where('unit_category_id', $unitCategoryId))
            ->lockForUpdate()
            ->first();

            if (!$balance) {
                $balance = StockBalance::create([
                    'company_id'       => $txn->company_id,
                    'branch_id'        => $txn->branch_id,
                    'product_id'       => $txn->product_id,
                    'unit_category_id' => $unitCategoryId,
                    'quantity'         => 0,
                    'avg_cost'         => 0,
                    'total_value'      => 0,
                    'fifo_layers'      => null,
                ]);
            }

            $refQty = (float) $txn->quantity;

            // Create reversal transaction
            StockTransaction::create([
                'company_id'         => $txn->company_id,
                'branch_id'          => $txn->branch_id,
                'product_id'         => $txn->product_id,
                'unit_id'            => $txn->unit_id,
                'original_quantity'  => $txn->original_quantity,
                'original_unit_id'   => $txn->original_unit_id,
                'reference_type'     => 'Reversal:' . $referenceType,
                'reference_id'       => $referenceId,
                'movement_type'      => $oppositeType,
                'quantity'           => $refQty,
                'unit_cost'          => $txn->unit_cost,
                'total_cost'         => $txn->total_cost,
                'balance_qty'        => 0, // updated below
                'notes'              => $reason,
                'created_by'         => Auth::id(),
            ]);

            // Update balance using valuation method
            self::updateBalanceWithValuation(
                $balance,
                $oppositeType,
                $refQty,
                (float) $txn->unit_cost,
                $txn->product_id
            );

            // Update the reversal transaction's balance_qty
            StockTransaction::where('reference_type', 'Reversal:' . $referenceType)
                ->where('reference_id', $referenceId)
                ->where('product_id', $txn->product_id)
                ->latest()
                ->first()
                ?->update(['balance_qty' => (float) $balance->quantity]);

            $balance->last_movement_at = now();
            $balance->save();
        }
    }
}
