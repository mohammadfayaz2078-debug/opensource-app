<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnItem extends Model
{
    protected $fillable = [
        'sale_return_id', 'sale_item_id', 'product_id', 'unit_id',
        'quantity', 'unit_price', 'total', 'notes',
    ];

    protected $casts = [
        'quantity'   => 'decimal:4',
        'unit_price' => 'decimal:2',
        'total'      => 'decimal:2',
    ];

    public function saleReturn(): BelongsTo { return $this->belongsTo(SaleReturn::class); }
    public function saleItem(): BelongsTo   { return $this->belongsTo(SaleItem::class); }
    public function product(): BelongsTo    { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo       { return $this->belongsTo(Unit::class); }
}
