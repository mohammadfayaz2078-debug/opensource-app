<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
class ExpenseType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'expense_category_id',
        'expense_account_id',
        'name',
        'description',
        'is_active',
        'default_payment_account_id',
        'sort_order',
    ];

    protected $casts = [
        'is_active'                  => 'boolean',
        'sort_order'                 => 'integer',
        'default_payment_account_id' => 'integer',
        'expense_account_id'         => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'expense_account_id');
    }

    public function defaultPaymentAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'default_payment_account_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'expense_type_id');
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

    public function scopeForCategory(Builder $query, int $categoryId): Builder
    {
        return $query->where('expense_category_id', $categoryId);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    // ── Helpers ───────────────────────────────────────────────────────────────
}