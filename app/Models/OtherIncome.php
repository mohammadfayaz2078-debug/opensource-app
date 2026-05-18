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
        'currency_id',
        'exchange_rate',
        'amount_base',

        'payment_account_id',
        'income_account_id',

        'note',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'income_date' => 'date',

        'amount' => 'decimal:2',

        'exchange_rate' => 'decimal:6',

        'amount_base' => 'decimal:2',
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

    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }

    public function paymentAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'payment_account_id'
        );
    }

    public function incomeAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'income_account_id'
        );
    }

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}