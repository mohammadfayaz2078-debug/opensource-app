<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'name',
        'barcode',

        'category_id',

        'purchase_unit_id',
        'sale_unit_id',
        'stock_unit_id',

        'purchase_price',
        'sale_price',

        'low_stock_warning_count',

        'reorder_point',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function category()
    {
        return $this->belongsTo(
            ProductCategory::class,
            'category_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Units
    |--------------------------------------------------------------------------
    */

    public function purchaseUnit()
    {
        return $this->belongsTo(
            Unit::class,
            'purchase_unit_id'
        );
    }

    public function saleUnit()
    {
        return $this->belongsTo(
            Unit::class,
            'sale_unit_id'
        );
    }

    public function stockUnit()
    {
        return $this->belongsTo(
            Unit::class,
            'stock_unit_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Attachments
    |--------------------------------------------------------------------------
    */

    public function attachments()
    {
        return $this->hasMany(
            ProductAttachment::class,
            'product_id'
        );
    }
}