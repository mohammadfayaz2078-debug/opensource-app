<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBalance extends Model
{
    protected $fillable = [
        'company_id', 'branch_id', 'product_id',
        'quantity', 'avg_cost', 'total_value',
        'last_movement_at',
    ];

    protected $casts = [
        'quantity'        => 'decimal:4',
        'avg_cost'        => 'decimal:2',
        'total_value'     => 'decimal:2',
        'last_movement_at'=> 'datetime',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo   { return $this->belongsTo(Branch::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
}
