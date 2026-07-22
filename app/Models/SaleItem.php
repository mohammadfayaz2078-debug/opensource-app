<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id', 'product_id', 'unit_id',
        'quantity', 'unit_price', 'discount', 'total',
        'notes',
    ];

    protected $casts = [
        'quantity'      => 'decimal:4',
        'unit_price'    => 'decimal:2',
        'total'         => 'decimal:2',
    ];

    public function sale(): BelongsTo    { return $this->belongsTo(Sale::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo    { return $this->belongsTo(Unit::class); }
}
