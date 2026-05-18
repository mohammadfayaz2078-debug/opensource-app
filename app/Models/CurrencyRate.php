<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurrencyRate extends Model
{
    use HasFactory;

    protected $table = 'currency_rates';

    protected $fillable = [
        'currency_id',
        'branch_id',
        'rate',
        'inverse_rate',
        'date',
    ];

    protected $casts = [
        'currency_id' => 'integer',
        'branch_id' => 'integer',
        'rate' => 'decimal:10',
        'inverse_rate' => 'decimal:10',
        'date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ─── Relationships ───────────────────────────────────────────

    /**
     * Get the currency this rate belongs to
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get the branch this rate belongs to
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    // ─── Scopes ──────────────────────────────────────────────────

    /**
     * Scope: filter by branch
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope: filter by currency
     */
    public function scopeForCurrency($query, $currencyId)
    {
        return $query->where('currency_id', $currencyId);
    }

    /**
     * Scope: filter by date range
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    /**
     * Scope: latest rate first
     */
    public function scopeLatestFirst($query)
    {
        return $query->orderByDesc('date');
    }
}
