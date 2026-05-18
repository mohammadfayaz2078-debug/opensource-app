<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasFactory;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'account_type_id',
        'account_group_id',
        'parent_id',
        'currency_id',
        'allow_reconciliation',
        'deprecated',
        'is_active',
        'description',
        'tag',
        'opening_debit',
        'opening_credit',
        'current_balance',
        'nature',
        'level',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'account_type_id' => 'integer',
        'account_group_id' => 'integer',
        'parent_id' => 'integer',
        'currency_id' => 'integer',
        'allow_reconciliation' => 'boolean',
        'deprecated' => 'boolean',
        'is_active' => 'boolean',
        'opening_debit' => 'decimal:2',
        'opening_credit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'level' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ─── Relationships ───────────────────────────────────────────

    /**
     * Get the branch that owns this account
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the account type
     */
    public function accountType(): BelongsTo
    {
        return $this->belongsTo(AccountType::class, 'account_type_id');
    }

    /**
     * Get the account group
     */
    public function accountGroup(): BelongsTo
    {
        return $this->belongsTo(AccountGroup::class, 'account_group_id');
    }

    /**
     * Get the parent account
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get the currency for this account
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get child accounts
     */
    public function children(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get all children recursively (for tree building)
     */
    public function childrenRecursive(): HasMany
    {
        return $this->children()->with(['childrenRecursive', 'accountType', 'accountGroup']);
    }

    // ─── Scopes ──────────────────────────────────────────────────

    /**
     * Scope: filter by company
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope: only root accounts (no parent)
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope: only active accounts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: only non-deprecated
     */
    public function scopeNotDeprecated($query)
    {
        return $query->where('deprecated', false);
    }

    /**
     * Scope: filter by account type
     */
    public function scopeOfType($query, $accountTypeId)
    {
        return $query->where('account_type_id', $accountTypeId);
    }

    /**
     * Scope: filter by internal group type (asset, liability, etc.)
     */
    public function scopeOfInternalType($query, string $type)
    {
        return $query->whereHas('accountType', function ($q) use ($type) {
            $q->where('type', $type);
        });
    }

    /**
     * Scope: reconcilable accounts only
     */
    public function scopeReconcilable($query)
    {
        return $query->where('allow_reconciliation', true);
    }

    /**
     * Scope: search by code or name
     */
    public function scopeSearch($query, $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('code', 'like', "%{$term}%")
              ->orWhere('name', 'like', "%{$term}%");
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /**
     * Get the display name: "code - name"
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->code . ' - ' . $this->name;
    }

    /**
     * Check if account has children
     */
    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    /**
     * Calculate the current balance based on nature
     */
    public function getNetBalanceAttribute(): float
    {
        if ($this->nature === 'debit') {
            return $this->opening_debit - $this->opening_credit + $this->current_balance;
        }
        return $this->opening_credit - $this->opening_debit + $this->current_balance;
    }

    /**
     * Determine hierarchy level based on parent chain
     */
    public function calculateLevel(): int
    {
        $level = 0;
        $parent = $this->parent;
        while ($parent) {
            $level++;
            $parent = $parent->parent;
        }
        return $level;
    }

    /**
     * Auto-assign nature based on account type
     */
    public function assignNatureFromType(): void
    {
        if ($this->accountType) {
            $this->nature = $this->accountType->isDebitNature() ? 'debit' : 'credit';
            $this->save();
        }
    }

    /**
     * Check if this account can be deleted (no children, no journal entries)
     */
    public function canDelete(): bool
    {
        return !$this->hasChildren();
    }

    /**
     * Get all ancestor accounts up to root
     */
    public function getAncestors(): array
    {
        $ancestors = [];
        $current = $this->parent;
        while ($current) {
            array_unshift($ancestors, $current);
            $current = $current->parent;
        }
        return $ancestors;
    }
}
