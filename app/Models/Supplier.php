<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'supplier_code',

        'first_name',
        'last_name',
        'contact_person',

        'phone',
        'email',
        'address',
        'city',
        'country',

        'payable_account_id',

        'opening_balance',
        'opening_balance_type',

        'note',

        'is_active',

        'created_by',
    ];

    /**
     * Casts
     */
    protected $casts = [

        'opening_balance' => 'decimal:2',

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

    public function payableAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'payable_account_id'
        );
    }

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getFullNameAttribute(): string
    {
        return trim(
            $this->first_name . ' ' . $this->last_name
        );
    }
}