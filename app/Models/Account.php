<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use Exception;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'name', 'type',
        'description', 'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'company_id' => 'integer',
        'branch_id'  => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function deposits(): HasMany
    {
        return $this->hasMany(AccountDeposit::class);
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(AccountWithdrawal::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AccountTransaction::class)->latest();
    }

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
}
