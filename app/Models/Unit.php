<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'category_id',

        'name',

        'uom_type',

        'factor',
        'factor_inv',

        'rounding',

        'is_active',

        'created_by',
        'updated_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'factor' => 'decimal:10',
        'factor_inv' => 'decimal:10',
        'rounding' => 'decimal:10',

        'is_active' => 'boolean',
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
            UnitCategory::class,
            'category_id'
        );
    }

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updater()
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Unit Conversion Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Get the reference unit for this unit's category.
     */
    public function referenceUnit(): ?self
    {
        return self::where('category_id', $this->category_id)
            ->where('uom_type', 'reference')
            ->first();
    }

    /**
     * Convert a quantity from this unit to the category's reference unit.
     */
    public function convertToReference(float $quantity): float
    {
        return $quantity * (float) $this->factor_inv;
    }

    /**
     * Convert a quantity from the reference unit to this unit.
     */
    public function convertFromReference(float $quantity): float
    {
        return $quantity * (float) $this->factor;
    }
}