<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarehouseTower extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'name',

        'street_address',
        'village',
        'district',
        'province',
        'country',

        'type',

        'gps_lat',
        'gps_lng',

        'created_by',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [

        'gps_lat' => 'decimal:7',
        'gps_lng' => 'decimal:7',
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
}