<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Builder;
class ExpenseCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'parent_id',
        'name',
        'description',
        'is_active',
        'color',
        'sort_order',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'parent_id'  => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id')
                    ->orderBy('sort_order')
                    ->orderBy('name');
    }

    /** Recursive children for building full tree */
    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    public function expenseTypes(): HasMany
    {
        return $this->hasMany(ExpenseType::class, 'expense_category_id')
                    ->orderBy('sort_order')
                    ->orderBy('name');
    }

    public function expenses(): HasManyThrough
    {
        return $this->hasManyThrough(Expense::class, ExpenseType::class, 'expense_category_id', 'expense_type_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

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

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    // ── Accessors & Mutators ──────────────────────────────────────────────────

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        if ($this->parent) {
            return $this->parent->name . ' / ' . $this->name;
        }
        return $this->name;
    }

    public function totalExpensesAmount(): float
    {
        return Expense::whereHas('expenseType', function ($q) {
            $q->where('expense_category_id', $this->id);
        })->where('branch_id', $this->branch_id)->sum('total_amount');
    }
}