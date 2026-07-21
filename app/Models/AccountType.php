<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Branch;

class AccountType extends Model
{
    use HasFactory;

    protected $table = 'account_types';

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
        'branch_id' => 'integer',
        'include_initial_balance' => 'boolean',
        'sequence' => 'integer',
    ];

    /**
     * Get the branch that owns this type
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get all accounts of this type
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'account_type_id');
    }

    /**
     * Get all account groups of this type
     */
    public function accountGroups(): HasMany
    {
        return $this->hasMany(AccountGroup::class, 'account_type_id');
    }

    /**
     * Scope: filter by internal group (balance_sheet, profit_loss)
     */
    public function scopeBalanceSheet($query)
    {
        return $query->where('internal_group', 'balance_sheet');
    }

    public function scopeProfitLoss($query)
    {
        return $query->where('internal_group', 'profit_loss');
    }

    /**
     * Scope: filter by type (asset, liability, equity, income, expense)
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Check if this type is debit-normal
     */
    public function isDebitNature(): bool
    {
        return in_array($this->type, ['asset', 'expense']);
    }

    /**
     * Check if this type is credit-normal
     */
    public function isCreditNature(): bool
    {
        return in_array($this->type, ['liability', 'equity', 'income']);
    }
}
