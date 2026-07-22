<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class PurchaseReturn extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'purchase_id', 'supplier_id', 'created_by',
        'reference_no', 'return_date', 'total_amount',
        'reason', 'notes',
    ];

    protected $casts = [
        'return_date'  => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo    { return $this->belongsTo(Branch::class); }
    public function purchase(): BelongsTo  { return $this->belongsTo(Purchase::class); }
    public function supplier(): BelongsTo  { return $this->belongsTo(Supplier::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany       { return $this->hasMany(PurchaseReturnItem::class); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }

    // In PurchaseReturn.php model
    public static function generateReferenceNo(int $branchId): string
    {
        $year   = date('Y');
        $month  = date('m');
        $prefix = "PR-{$year}{$month}-";
        $last   = static::where('branch_id', $branchId)
            ->where('reference_no', 'like', "{$prefix}%")
            ->withTrashed()
            ->orderBy('reference_no', 'desc')
            ->value('reference_no');
        $seq = $last ? (int) substr($last, -5) + 1 : 1;
        return "{$prefix}" . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }


    // In PurchaseItem.php model
    public function updateRefundStatus(): void
    {
        $refundedQty = (float) ($this->refunded_quantity ?? 0);
        $quantity = (float) $this->quantity;

        $status = match (true) {
            $refundedQty <= 0                   => 'none',
            $refundedQty >= $quantity           => 'full',
            default                             => 'partial',
        };

        $this->refund_status = $status;
    }
}
