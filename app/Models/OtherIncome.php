<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtherIncome extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'income_category_id',

        'income_number',

        'income_date',

        'description',

        'amount',

        'note',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'income_date' => 'date',

        'amount' => 'decimal:2',
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

    public function incomeCategory()
    {
        return $this->belongsTo(IncomeCategory::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}