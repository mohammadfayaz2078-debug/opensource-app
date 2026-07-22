<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountTransaction extends Model
{
    protected $fillable = [
        'account_id',
        'type', // 'deposit' or 'withdrawal'
        'amount',
        'balance_after',
        'description',
        'reference_id', // ID of the deposit or withdrawal record
        'reference_type', // 'App\Models\AccountDeposit' or 'App\Models\AccountWithdrawal'
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }
}