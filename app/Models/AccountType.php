<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountType extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'type',
        'internal_group',
        'include_initial_balance',
        'description',
        'sequence',
    ];

    protected $casts = [
        'include_initial_balance' => 'boolean',
        'sequence' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
