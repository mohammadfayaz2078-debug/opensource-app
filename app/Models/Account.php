<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;
use Exception;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'balance',
        'description',
        'is_active',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Deposit money into the account.
     */
    public function deposit(float $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Deposit amount must be greater than zero.');
        }

        $this->increment('balance', $amount);
    }

    /**
     * Withdraw money from the account.
     */
    public function withdraw(float $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Withdrawal amount must be greater than zero.');
        }

        if ($this->balance < $amount) {
            throw new Exception('Insufficient balance.');
        }

        $this->decrement('balance', $amount);
    }

    /**
     * Check whether the account has sufficient balance.
     */
    public function hasEnoughBalance(float $amount): bool
    {
        return $this->balance >= $amount;
    }


    public function deposits()
    {
        return $this->hasMany(AccountDeposit::class);
    }

    public function withdrawals()
    {
        return $this->hasMany(AccountWithdrawal::class);
    }

    public function transactions()
    {
        return $this->hasMany(AccountTransaction::class)->latest();
    }
}