<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttachment extends Model
{
    /**
     * Mass assignable fields
     */
    protected $fillable = [

        'company_id',
        'branch_id',

        'product_id',

        'file_name',
        'file_path',
        'file_type',
        'mime_type',
        'file_size',

        'note',

        'created_by',
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

    public function product()
    {
        return $this->belongsTo(
            Product::class,
            'product_id'
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