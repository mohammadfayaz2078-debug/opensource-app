<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
<<<<<<< HEAD
use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;
use Exception;
=======
use Illuminate\Database\Eloquent\Relations\BelongsTo;
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
use Illuminate\Database\Eloquent\Builder;

class Account extends Model
{
    protected $fillable = [
<<<<<<< HEAD
        'company_id',
        'branch_id',
        'name',
        'balance',
        'description',
        'is_active',
=======
        'company_id', 'branch_id', 'name', 'type',
        'description', 'balance', 'is_active',
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
    ];

    protected $casts = [
        'balance'   => 'decimal:2',
        'is_active' => 'boolean',
        'company_id' => 'integer',
        'branch_id' => 'integer',
    ];

<<<<<<< HEAD
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
=======
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo  { return $this->belongsTo(Branch::class); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

<<<<<<< HEAD
    // ── Methods ───────────────────────────────────────────────────────────────

    /**
     * Deposit money into the account.
     */
=======
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
    public function deposit(float $amount): void
    {
        $this->increment('balance', $amount);
    }

    public function withdraw(float $amount): void
    {
        $this->decrement('balance', $amount);
    }

    public function hasEnoughBalance(float $amount): bool
    {
        return (float) $this->balance >= $amount;
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
