<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class StockBalance extends Model
{
    protected $fillable = [
        'company_id', 'branch_id', 'product_id',
        'unit_category_id',
        'quantity', 'avg_cost', 'total_value', 'fifo_layers',
        'last_movement_at',
    ];

    protected $casts = [
        'quantity'         => 'decimal:4',
        'avg_cost'         => 'decimal:2',
        'total_value'      => 'decimal:2',
        'last_movement_at' => 'datetime',
        'fifo_layers'      => 'array',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo   { return $this->belongsTo(Branch::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function unitCategory(): BelongsTo { return $this->belongsTo(UnitCategory::class, 'unit_category_id'); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }

    public function scopeByProduct(Builder $query, int $productId): Builder
    {
        return $query->where('product_id', $productId);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->where('quantity', '<=', 0)
              ->orWhereIn('stock_balances.product_id', function ($sq) {
                  $sq->select('id')
                     ->from('products')
                     ->whereColumn('stock_balances.quantity', '<=', 'products.reorder_point')
                     ->where('reorder_point', '>', 0);
              });
        });
    }

    /**
     * Find or create balance for a given product + branch + unit category.
     */
    public static function findOrCreateFor(
        int $companyId,
        int $branchId,
        int $productId,
        ?int $unitCategoryId = null
    ): self {
        return static::firstOrCreate(
            [
                'company_id'       => $companyId,
                'branch_id'        => $branchId,
                'product_id'       => $productId,
                'unit_category_id' => $unitCategoryId,
            ],
            [
                'quantity'    => 0,
                'avg_cost'    => 0,
                'total_value' => 0,
                'fifo_layers' => [],
            ]
        );
    }
}
