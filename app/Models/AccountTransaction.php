<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountTransaction extends Model
{
    protected $fillable = [
        'account_id',
        'type', // Now accepts any string
        'amount',
        'balance_after',
        'description',
        'reference_id',
        'reference_type',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    // Constants for transaction types
    const TYPE_DEPOSIT = 'deposit';
    const TYPE_WITHDRAWAL = 'withdrawal';
    const TYPE_TRANSFER = 'transfer';
    const TYPE_EXPENSE = 'expense';
    const TYPE_INCOME = 'income';
    const TYPE_ADJUSTMENT = 'adjustment';

    // All available types
    const TYPES = [
        self::TYPE_DEPOSIT,
        self::TYPE_WITHDRAWAL,
        self::TYPE_TRANSFER,
        self::TYPE_EXPENSE,
        self::TYPE_INCOME,
        self::TYPE_ADJUSTMENT,
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Helper methods
    public function isDeposit(): bool
    {
        return $this->type === self::TYPE_DEPOSIT;
    }

    public function isWithdrawal(): bool
    {
        return $this->type === self::TYPE_WITHDRAWAL;
    }

    public function isTransfer(): bool
    {
        return $this->type === self::TYPE_TRANSFER;
    }

    public function isExpense(): bool
    {
        return $this->type === self::TYPE_EXPENSE;
    }

    public function isIncome(): bool
    {
        return $this->type === self::TYPE_INCOME;
    }

    public function isAdjustment(): bool
    {
        return $this->type === self::TYPE_ADJUSTMENT;
    }

    // Scopes
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeDeposits($query)
    {
        return $query->where('type', self::TYPE_DEPOSIT);
    }

    public function scopeWithdrawals($query)
    {
        return $query->where('type', self::TYPE_WITHDRAWAL);
    }

    public function scopeTransfers($query)
    {
        return $query->where('type', self::TYPE_TRANSFER);
    }

    public function scopeExpenses($query)
    {
        return $query->where('type', self::TYPE_EXPENSE);
    }

    public function scopeIncomes($query)
    {
        return $query->where('type', self::TYPE_INCOME);
    }

    // Get type label
    public function getTypeLabelAttribute(): string
    {
        return ucfirst($this->type);
    }

    // Get type color for UI
    public function getTypeColorAttribute(): string
    {
        return match($this->type) {
            self::TYPE_DEPOSIT => 'green',
            self::TYPE_WITHDRAWAL => 'red',
            self::TYPE_TRANSFER => 'blue',
            self::TYPE_EXPENSE => 'orange',
            self::TYPE_INCOME => 'emerald',
            self::TYPE_ADJUSTMENT => 'purple',
            default => 'gray',
        };
    }

    // Get icon for type
    public function getTypeIconAttribute(): string
    {
        return match($this->type) {
            self::TYPE_DEPOSIT => 'arrow-up',
            self::TYPE_WITHDRAWAL => 'arrow-down',
            self::TYPE_TRANSFER => 'arrow-right-left',
            self::TYPE_EXPENSE => 'shopping-cart',
            self::TYPE_INCOME => 'banknote',
            self::TYPE_ADJUSTMENT => 'adjustments',
            default => 'circle',
        };
    }
}