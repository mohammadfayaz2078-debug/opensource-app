<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountGroup extends Model
{
    use HasFactory;

    protected $table = 'account_groups';

    protected $fillable = [
        'branch_id',
        'parent_id',
        'name',
        'code_prefix_start',
        'code_prefix_end',
        'account_type_id',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'parent_id' => 'integer',
        'account_type_id' => 'integer',
    ];

    /**
     * Get the branch that owns this group
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the parent group
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(AccountGroup::class, 'parent_id');
    }

    /**
     * Get child groups
     */
    public function children(): HasMany
    {
        return $this->hasMany(AccountGroup::class, 'parent_id');
    }

    /**
     * Get all children recursively
     */
    public function childrenRecursive(): HasMany
    {
        return $this->children()->with('childrenRecursive');
    }

    /**
     * Get the account type
     */
    public function accountType(): BelongsTo
    {
        return $this->belongsTo(AccountType::class, 'account_type_id');
    }

    /**
     * Get accounts in this group
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'account_group_id');
    }

    /**
     * Scope: filter by company
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope: root groups only (no parent)
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Get the full prefix range display
     */
    public function getPrefixRangeAttribute(): string
    {
        if ($this->code_prefix_end) {
            return $this->code_prefix_start . ' - ' . $this->code_prefix_end;
        }
        return $this->code_prefix_start;
    }
}
