<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    const REFUND_STATUS_NONE    = 'none';
    const REFUND_STATUS_PARTIAL = 'partial';
    const REFUND_STATUS_FULL    = 'full';

    protected $fillable = [
        'sale_id', 'product_id', 'unit_id',
        'quantity', 'unit_price', 'discount', 'total',
        'delivered_qty', 'refund_status', 'refunded_quantity', 'refunded_amount',
        'notes',
    ];

    protected $casts = [
        'quantity'          => 'decimal:4',
        'unit_price'        => 'decimal:2',
        'total'             => 'decimal:2',
        'delivered_qty'     => 'decimal:4',
        'refunded_quantity' => 'decimal:4',
        'refunded_amount'   => 'decimal:2',
    ];

    public function sale(): BelongsTo    { return $this->belongsTo(Sale::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo    { return $this->belongsTo(Unit::class); }

    /**
     * Check if this item can be refunded
     */
    public function canBeRefunded(): bool
    {
        return $this->sale->status === Sale::STATUS_CONFIRMED 
            && $this->refund_status !== self::REFUND_STATUS_FULL
            && $this->delivered_qty > 0;
    }


    // In SaleItem.php model
    public function updateRefundStatus(): void
    {
        $refundedQty = (float) $this->refunded_quantity;
        $deliveredQty = (float) $this->quantity; // Using quantity as delivered qty

        $status = match (true) {
            $refundedQty <= 0                   => 'none',
            $refundedQty >= $deliveredQty       => 'full',
            default                             => 'partial',
        };

        $this->refund_status = $status;
    }

    public function getRefundableQuantity(): float
    {
        return max(0, (float) $this->quantity - (float) $this->refunded_quantity);
    }
}