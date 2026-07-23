<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class StockTransaction extends Model
{
    const MOVEMENT_IN  = 'in';
    const MOVEMENT_OUT = 'out';

    const REF_PURCHASE        = 'Purchase';
    const REF_PURCHASE_RETURN = 'PurchaseReturn';
    const REF_SALE            = 'Sale';
    const REF_SALE_RETURN     = 'SaleReturn';
    const REF_ADJUSTMENT      = 'Adjustment';
    const REF_OPENING_STOCK   = 'OpeningStock';

    protected $fillable = [
        'company_id', 'branch_id', 'product_id',
        'unit_id', 'original_quantity', 'original_unit_id',
        'reference_type', 'reference_id',
        'movement_type', 'quantity', 'unit_cost', 'total_cost', 'balance_qty',
        'notes', 'created_by',
    ];

    protected $casts = [
        'quantity'           => 'decimal:4',
        'original_quantity'  => 'decimal:4',
        'unit_cost'          => 'decimal:2',
        'total_cost'         => 'decimal:2',
        'balance_qty'        => 'decimal:4',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo   { return $this->belongsTo(Branch::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo     { return $this->belongsTo(Unit::class); }
    public function originalUnit(): BelongsTo { return $this->belongsTo(Unit::class, 'original_unit_id'); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }

    public function scopeMovementIn(Builder $query): Builder
    {
        return $query->where('movement_type', self::MOVEMENT_IN);
    }

    public function scopeMovementOut(Builder $query): Builder
    {
        return $query->where('movement_type', self::MOVEMENT_OUT);
    }

    public function scopeByProduct(Builder $query, int $productId): Builder
    {
        return $query->where('product_id', $productId);
    }
}
