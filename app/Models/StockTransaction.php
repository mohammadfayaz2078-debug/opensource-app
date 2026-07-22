<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransaction extends Model
{
    const MOVEMENT_IN  = 'in';
    const MOVEMENT_OUT = 'out';

    protected $fillable = [
        'company_id', 'branch_id', 'product_id',
        'reference_type', 'reference_id', 'movement_type',
        'quantity', 'unit_cost', 'total_cost', 'balance_qty',
        'unit_id', 'notes', 'created_by',
    ];

    protected $casts = [
        'quantity'     => 'decimal:4',
        'unit_cost'    => 'decimal:2',
        'total_cost'   => 'decimal:2',
        'balance_qty'  => 'decimal:4',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo   { return $this->belongsTo(Branch::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function unit(): BelongsTo     { return $this->belongsTo(Unit::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
}
