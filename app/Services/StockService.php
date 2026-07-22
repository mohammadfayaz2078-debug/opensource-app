<?php

namespace App\Services;

use App\Models\StockBalance;
use App\Models\StockTransaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * Record a stock movement (IN or OUT) and update the running balance.
     */
    public static function record(
        int    $companyId,
        int    $branchId,
        int    $productId,
        string $movementType,
        float  $quantity,
        float  $unitCost,
        string $referenceType,
        int    $referenceId,
        ?string $notes = null,
        ?int    $unitId = null,
    ): StockTransaction {

        $balance = StockBalance::where([
            'company_id' => $companyId,
            'branch_id'  => $branchId,
            'product_id' => $productId,
        ])->first();

        if (!$balance) {
            $balance = StockBalance::create([
                'company_id' => $companyId,
                'branch_id'  => $branchId,
                'product_id' => $productId,
                'quantity'   => 0,
                'avg_cost'   => 0,
                'total_value'=> 0,
            ]);
        }

        $currentQty      = (float) $balance->quantity;
        $currentTotalVal = (float) $balance->total_value;

        if ($movementType === StockTransaction::MOVEMENT_OUT) {
            if ($currentQty + 1e-9 < $quantity) {
                throw new \RuntimeException(
                    "Insufficient stock for product #{$productId}. Available: {$currentQty}, requested: {$quantity}."
                );
            }
        }

        if ($movementType === StockTransaction::MOVEMENT_IN) {
            $newTotalVal = $currentTotalVal + ($quantity * $unitCost);
            $newQty      = $currentQty + $quantity;
            $balance->quantity   = $newQty;
            $balance->avg_cost   = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
            $balance->total_value = round($newTotalVal, 2);
        } else {
            $newQty      = max(0, $currentQty - $quantity);
            $newTotalVal = max(0, $currentTotalVal - ($quantity * (float) $balance->avg_cost));
            $balance->quantity   = $newQty;
            $balance->total_value = round($newTotalVal, 2);
            $balance->avg_cost   = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
        }

        $balance->last_movement_at = now();
        $balance->save();

        $transaction = StockTransaction::create([
            'company_id'         => $companyId,
            'branch_id'          => $branchId,
            'product_id'         => $productId,
            'reference_type'     => $referenceType,
            'reference_id'       => $referenceId,
            'movement_type'      => $movementType,
            'quantity'           => $quantity,
            'unit_cost'          => $unitCost,
            'total_cost'         => round($quantity * $unitCost, 2),
            'balance_qty'        => $balance->quantity,
            'unit_id'            => $unitId,
            'notes'              => $notes,
            'created_by'         => Auth::id(),
        ]);

        return $transaction;
    }

    /**
     * Reverse stock transactions for a given reference (e.g. cancelled receive).
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

            $balance = StockBalance::where([
                'company_id' => $txn->company_id,
                'branch_id'  => $txn->branch_id,
                'product_id' => $txn->product_id,
            ])->first();

            if ($balance) {
                $currentQty      = (float) $balance->quantity;
                $currentTotalVal = (float) $balance->total_value;

                if ($oppositeType === StockTransaction::MOVEMENT_IN) {
                    $newTotalVal = $currentTotalVal + ((float) $txn->quantity * (float) $txn->unit_cost);
                    $newQty      = $currentQty + (float) $txn->quantity;
                } else {
                    $newQty      = max(0, $currentQty - (float) $txn->quantity);
                    $newTotalVal = max(0, $currentTotalVal - ((float) $txn->quantity * (float) $balance->avg_cost));
                }

                $balance->quantity    = $newQty;
                $balance->avg_cost    = $newQty > 0 ? round($newTotalVal / $newQty, 2) : 0;
                $balance->total_value = round($newTotalVal, 2);
                $balance->last_movement_at = now();
                $balance->save();
            }

            StockTransaction::create([
                'company_id'         => $txn->company_id,
                'branch_id'          => $txn->branch_id,
                'product_id'         => $txn->product_id,
                'reference_type'     => 'Reversal:' . $referenceType,
                'reference_id'       => $referenceId,
                'movement_type'      => $oppositeType,
                'quantity'           => $txn->quantity,
                'unit_cost'          => $txn->unit_cost,
                'total_cost'         => $txn->total_cost,
                'balance_qty'        => $balance?->quantity ?? 0,
                'unit_id'            => $txn->unit_id,
                'notes'              => $reason,
                'created_by'         => Auth::id(),
            ]);
        }
    }
}
