<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'user_code',

        'first_name',
        'last_name',

        'phone',
        'email',

        'street_address',
        'district',
        'province',

        'gps_lat',
        'gps_lng',

        'country',

        'receivable_account_id',

        'opening_balance',
        'opening_balance_type',

        'note',

        'is_active',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'gps_lat' => 'decimal:7',
        'gps_lng' => 'decimal:7',

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

    public function receivableAccount()
    {
        return $this->belongsTo(
            ChartOfAccount::class,
            'receivable_account_id'
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