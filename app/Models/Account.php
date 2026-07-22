<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;
use Exception;
use Illuminate\Database\Eloquent\Builder;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id',
        'branch_id',
        'name',
        'balance',
        'description',
        'is_active',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
        'company_id' => 'integer',
        'branch_id' => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
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

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeForCompany(Builder $query, ?int $companyId): Builder
    {
        return $companyId === null
            ? $query
            : $query->where('company_id', $companyId);
    }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null
            ? $query
            : $query->where('branch_id', $branchId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    // ── Methods ───────────────────────────────────────────────────────────────

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
}