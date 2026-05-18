<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

// ═════════════════════════════════════════════════════════════════════════════
// Journal Model
// ═════════════════════════════════════════════════════════════════════════════

class Journal extends Model
{
    use HasFactory, SoftDeletes;

    const TYPE_GENERAL  = 'general';
    const TYPE_EXPENSE  = 'expense';
    const TYPE_BANK     = 'bank';
    const TYPE_CASH     = 'cash';
    const TYPE_SALE     = 'sale';
    const TYPE_PURCHASE = 'purchase';

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'type',
        'currency',
        'default_account_id',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
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

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function totalPostedDebit(): float
    {
        return $this->entries()->where('status', JournalEntry::STATUS_POSTED)->sum('total_debit');
    }

    public function totalPostedCredit(): float
    {
        return $this->entries()->where('status', JournalEntry::STATUS_POSTED)->sum('total_credit');
    }
}