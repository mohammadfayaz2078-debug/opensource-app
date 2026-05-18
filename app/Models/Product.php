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

        'expense_account_id',
        'income_account_id',

        'low_stock_warning_count',

        'inventory_asset_account_id',

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
    | Accounting Accounts
    |--------------------------------------------------------------------------
    */

    public function expenseAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'expense_account_id'
        );
    }

    public function incomeAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'income_account_id'
        );
    }

    public function inventoryAssetAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'inventory_asset_account_id'
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