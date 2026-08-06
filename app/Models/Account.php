<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use Exception;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'owner_user_id', 'owner_type', 'owner_id', 'name', 'wallet_number', 'type',
        'description', 'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'company_id' => 'integer',
        'branch_id'  => 'integer',
        'owner_user_id' => 'integer',
        'owner_id' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'account_user');
    }

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    public function isOwnedBy($actor): bool
    {
        return $actor
            && $this->owner_type === $actor::class
            && (int) $this->owner_id === (int) $actor->id;
    }

    public function scopeAccessibleTo(Builder $query, $actor): Builder
    {
        return $query->where(function (Builder $accounts) use ($actor) {
            $accounts->where(function (Builder $owner) use ($actor) {
                $owner->where('owner_type', $actor::class)->where('owner_id', $actor->id);
            });

            if ($actor instanceof User) {
                $accounts->orWhereHas('users', fn (Builder $users) => $users->whereKey($actor->id));
            }
        });
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

    public function sentTransfers(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'sender_account_id')->latest();
    }

    public function receivedTransfers(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'receiver_account_id')->latest();
    }

    public static function generateWalletNumber(): string
    {
        $lastAccount = static::orderByDesc('id')->first();
        $nextNumber = 1;
        if ($lastAccount && $lastAccount->wallet_number) {
            $numericPart = (int) str_replace('WLT-', '', $lastAccount->wallet_number);
            $nextNumber = $numericPart + 1;
        }
        return 'WLT-' . str_pad($nextNumber, 12, '0', STR_PAD_LEFT);
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
