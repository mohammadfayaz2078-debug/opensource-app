<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    const REFUND_STATUS_NONE    = 'none';
    const REFUND_STATUS_PARTIAL = 'partial';
    const REFUND_STATUS_FULL    = 'full';

    protected $fillable = [
        'purchase_id', 'product_id', 'unit_id',
        'quantity', 'unit_price', 'discount', 'total',
        'refund_status', 'refunded_quantity', 'refunded_amount',
        'notes',
    ];

    protected $casts = [
        'quantity'          => 'decimal:4',
        'unit_price'        => 'decimal:2',
        'total'             => 'decimal:2',
        'refunded_quantity' => 'decimal:4',
        'refunded_amount'   => 'decimal:2',
    ];

    public function purchase(): BelongsTo { return $this->belongsTo(Purchase::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo     { return $this->belongsTo(Unit::class); }

    /**
     * Check if this item can be refunded
     */
    public function canBeRefunded(): bool
    {
        return $this->purchase->payment_status !== Purchase::PAYMENT_STATUS_UNPAID 
            && $this->refund_status !== self::REFUND_STATUS_FULL
            && $this->quantity > 0;
    }

    /**
     * Get remaining quantity that can be refunded
     */
    public function getRefundableQuantity(): float
    {
        return max(0, (float) $this->quantity - (float) ($this->refunded_quantity ?? 0));
    }

    /**
     * Update refund status based on refunded quantity
     */
    public function updateRefundStatus(): void
    {
        $refundedQty = (float) ($this->refunded_quantity ?? 0);
        $quantity = (float) $this->quantity;

        $status = match (true) {
            $refundedQty <= 0                   => self::REFUND_STATUS_NONE,
            $refundedQty >= $quantity           => self::REFUND_STATUS_FULL,
            default                             => self::REFUND_STATUS_PARTIAL,
        };

        $this->refund_status = $status;
    }
}