<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_no', 'customer_id', 'company_id', 'branch_id',
        'customer_name', 'customer_last_name', 'customer_phone', 'customer_email',
        'customer_address', 'province', 'total_amount', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public static function generateOrderNo(): string
    {
        $prefix = 'ORD-';
        $lastId = (int) static::max('id');
        $seq = $lastId + 1;
        return $prefix . str_pad($seq, 6, '0', STR_PAD_LEFT);
    }
}