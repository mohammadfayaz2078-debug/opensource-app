<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncomeCategory extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'name',
        'description',

        'is_active',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

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

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function otherIncomes()
    {
        return $this->hasMany(OtherIncome::class);
    }
}