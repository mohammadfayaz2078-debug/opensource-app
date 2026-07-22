<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Purchase extends Model
{
    use SoftDeletes;

    const PAYMENT_STATUS_UNPAID  = 'unpaid';
    const PAYMENT_STATUS_PARTIAL = 'partial';
    const PAYMENT_STATUS_PAID    = 'paid';

    const REFUND_STATUS_NONE    = 'none';
    const REFUND_STATUS_PARTIAL = 'partial';
    const REFUND_STATUS_FULL    = 'full';

    const DISCOUNT_TYPE_PERCENT = 'percent';
    const DISCOUNT_TYPE_FIXED   = 'fixed';

    protected $fillable = [
        'company_id', 'branch_id', 'supplier_id', 'created_by', 'account_id',
        'reference_no', 'purchase_date', 'due_date',
        'subtotal', 'discount_type', 'discount_value',
        'shipping_cost', 'total_amount', 'paid_amount', 'due_amount',
        'payment_status', 'refund_status', 'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'subtotal'      => 'decimal:2',
        'discount_value'=> 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount'  => 'decimal:2',
        'paid_amount'   => 'decimal:2',
        'due_amount'    => 'decimal:2',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo    { return $this->belongsTo(Branch::class); }
    public function supplier(): BelongsTo  { return $this->belongsTo(Supplier::class); }
    public function account(): BelongsTo   { return $this->belongsTo(Account::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany       { return $this->hasMany(PurchaseItem::class); }
    public function returns(): HasMany     { return $this->hasMany(PurchaseReturn::class); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }

    public function scopeByPaymentStatus(Builder $query, string $status): Builder
    {
        return $query->where('payment_status', $status);
    }

    public function scopeByRefundStatus(Builder $query, string $status): Builder
    {
        return $query->where('refund_status', $status);
    }

    public function scopeByDateRange(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('purchase_date', [$from, $to]);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('reference_no', 'like', "%{$term}%");
        });
    }

    public function canBeEdited(): bool      
    { 
        return $this->payment_status === self::PAYMENT_STATUS_UNPAID && $this->refund_status === self::REFUND_STATUS_NONE; 
    }
    
    public function canBeCancelled(): bool   
    { 
        return $this->payment_status === self::PAYMENT_STATUS_UNPAID && $this->refund_status === self::REFUND_STATUS_NONE; 
    }
    
    public function canBeReturned(): bool
    {
        return $this->payment_status !== self::PAYMENT_STATUS_UNPAID && $this->refund_status !== self::REFUND_STATUS_FULL;
    }

    public function isFullyRefunded(): bool
    {
        return $this->refund_status === self::REFUND_STATUS_FULL;
    }

    public function recalculate(): void
    {
        $subtotal = (float) $this->items()->sum('total');
        $discountAmount = $this->discount_type === self::DISCOUNT_TYPE_PERCENT
            ? round($subtotal * (float) $this->discount_value / 100, 2)
            : (float) $this->discount_value;
        $totalAmount = round($subtotal - $discountAmount + (float) $this->shipping_cost, 2);
        $dueAmount = round($totalAmount - (float) $this->paid_amount, 2);

        $this->update([
            'subtotal'     => $subtotal,
            'total_amount' => $totalAmount,
            'due_amount'   => $dueAmount,
        ]);
    }

    public function updatePaymentStatus(): void
    {
        $status = match (true) {
            $this->due_amount <= 0  => self::PAYMENT_STATUS_PAID,
            $this->paid_amount > 0  => self::PAYMENT_STATUS_PARTIAL,
            default                 => self::PAYMENT_STATUS_UNPAID,
        };
        $this->update(['payment_status' => $status]);
    }

    public function updateRefundStatus(): void
    {
        $items = $this->items()->get();
        $totalItems = $items->count();
        
        if ($totalItems === 0) {
            $this->update(['refund_status' => self::REFUND_STATUS_NONE]);
            return;
        }
        
        $fullyRefundedCount = 0;
        foreach ($items as $item) {
            $refundedQty = (float) ($item->refunded_quantity ?? 0);
            $quantity = (float) $item->quantity;
            
            if ($refundedQty >= $quantity && $quantity > 0) {
                $fullyRefundedCount++;
            }
        }
        
        $status = match (true) {
            $fullyRefundedCount === 0                    => self::REFUND_STATUS_NONE,
            $fullyRefundedCount === $totalItems          => self::REFUND_STATUS_FULL,
            default                                      => self::REFUND_STATUS_PARTIAL,
        };
        
        $this->update(['refund_status' => $status]);
    }

    public static function generateReferenceNo(int $branchId): string
    {
        $prefix = "BILL-";
        $last   = static::where('branch_id', $branchId)
            ->where('reference_no', 'like', "{$prefix}%")
            ->withTrashed()
            ->orderBy('reference_no', 'desc')
            ->lockForUpdate()
            ->value('reference_no');
        $seq = $last ? (int) substr($last, -6) + 1 : 1;
        return "{$prefix}" . str_pad($seq, 6, '0', STR_PAD_LEFT);
    }
}