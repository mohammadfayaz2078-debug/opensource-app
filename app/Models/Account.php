<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Account extends Model
{
    protected $fillable = [
        'company_id', 'branch_id', 'name', 'type',
        'description', 'balance', 'is_active',
    ];

    protected $casts = [
        'balance'   => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo  { return $this->belongsTo(Branch::class); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
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
