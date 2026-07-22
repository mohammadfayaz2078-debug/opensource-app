<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountWithdrawal extends Model
{
    protected $fillable = [
        'account_id',
        'amount',
        'description',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}