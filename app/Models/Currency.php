<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Currency extends Model
{
    use HasFactory;

    protected $table = 'currencies';

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'symbol',
        'decimal_places',
        'position',
        'rounding',
        'is_active',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'decimal_places' => 'integer',
        'rounding' => 'decimal:6',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ─── Relationships ───────────────────────────────────────────

    /**
     * Get the branch that owns this currency
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get all exchange rates for this currency
     */
    public function rates(): HasMany
    {
        return $this->hasMany(CurrencyRate::class)->orderByDesc('date');
    }

    /**
     * Get the latest exchange rate
     */
    public function latestRate(): HasOne
    {
        return $this->hasOne(CurrencyRate::class)->latestOfMany('date');
    }

    /**
     * Get rate for a specific date (or closest before)
     */
    public function getRateForDate(?string $date = null): ?CurrencyRate
    {
        $date = $date ?? now()->toDateString();

        return $this->rates()
            ->where('date', '<=', $date)
            ->orderByDesc('date')
            ->first();
    }

    /**
     * Get the current exchange rate value
     */
    public function getCurrentRateAttribute(): ?float
    {
        $rate = $this->latestRate;
        return $rate ? (float) $rate->inverse_rate : null;
    }

    /**
     * Check if this is the base currency for its branch
     */
    public function getIsBaseAttribute(): bool
    {
        return $this->branch && $this->branch->base_currency_id === $this->id;
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
     * Scope: only active currencies
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: search by code or name
     */
    public function scopeSearch($query, $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('code', 'like', "%{$term}%")
              ->orWhere('name', 'like', "%{$term}%")
              ->orWhere('symbol', 'like', "%{$term}%");
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /**
     * Format an amount using this currency's settings
     */
    public function formatAmount(float $amount): string
    {
        $formatted = number_format($amount, $this->decimal_places);

        if ($this->symbol) {
            if ($this->position === 'before') {
                return $this->symbol . ' ' . $formatted;
            }
            return $formatted . ' ' . $this->symbol;
        }

        return $formatted . ' ' . $this->code;
    }

    /**
     * Round amount according to currency rounding factor
     */
    public function roundAmount(float $amount): float
    {
        if ($this->rounding <= 0) {
            return round($amount, $this->decimal_places);
        }
        return round($amount / $this->rounding) * $this->rounding;
    }

    /**
     * Convert amount from this currency to another.
     *
     *  rate         = how many of THIS currency per 1 base unit (market rate)
     *  inverse_rate = how many base units per 1 of THIS currency (conversion factor)
     *
     *  Example: base=USD, this=AFN, 1 USD = 63 AFN → rate=63, inverse_rate=0.016
     */
    public function convertTo(float $amount, Currency $targetCurrency, ?string $date = null): ?float
    {
        // Same currency — no conversion needed
        if ($this->id === $targetCurrency->id) {
            return $amount;
        }

        $sourceRate = $this->getRateForDate($date);
        $targetRate = $targetCurrency->getRateForDate($date);

        if (!$sourceRate || !$targetRate) {
            return null;
        }

        // Step 1: Convert source to base currency
        // amount_base = amount * source.inverse_rate  (or amount / source.rate)
        $amountInBase = $amount * (float) $sourceRate->inverse_rate;

        // Step 2: Convert base to target currency
        // amount_target = amount_base * target.rate  (or amount_base / target.inverse_rate)
        return round($amountInBase * (float) $targetRate->rate, 2);
    }

    /**
     * Display name: "USD - US Dollar"
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->code . ' - ' . $this->name;
    }
}
