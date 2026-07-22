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

        'note',

        'is_active',

        'status',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $appends = ['full_name'];

    protected $casts = [

        'gps_lat' => 'decimal:7',
        'gps_lng' => 'decimal:7',

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