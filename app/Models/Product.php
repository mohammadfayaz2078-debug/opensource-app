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
        'description',

        'category_id',

        'purchase_price',
        'sale_price',

        'low_stock_warning_count',
        'is_public',
        'comments',

        'reorder_point',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'comments' => 'array',
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
