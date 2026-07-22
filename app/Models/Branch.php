<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    protected $table = 'branches';

    protected $fillable = [
        'company_id',
        'branch_name',
        'branch_slogan',
        'branch_logo_url',
        'branch_street_address',
        'branch_village',
        'branch_district',
        'branch_province',
        'branch_country',
        'branch_phone',
        'branch_email',
        'branch_website',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the company that owns the branch
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the users for the branch
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scope for active branches only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for inactive branches only
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope for branches by province
     */
    public function scopeByProvince($query, $province)
    {
        return $query->where('branch_province', $province);
    }

    /**
     * Scope for branches by district
     */
    public function scopeByDistrict($query, $district)
    {
        return $query->where('branch_district', $district);
    }

    /**
     * Check if branch is active
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Activate the branch
     */
    public function activate(): void
    {
        $this->update(['is_active' => true]);
    }

    /**
     * Deactivate the branch
     */
    public function deactivate(): void
    {
        $this->update(['is_active' => false]);
    }

    /**
     * Get full address as string
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->branch_street_address,
            $this->branch_village,
            $this->branch_district,
            $this->branch_province,
            $this->branch_country,
        ]);
        
        return implode(', ', $parts);
    }

    /**
     * Get full address with line breaks
     */
    public function getFullAddressMultilineAttribute(): string
    {
        $parts = array_filter([
            $this->branch_street_address,
            $this->branch_village,
            $this->branch_district,
            $this->branch_province,
            $this->branch_country,
        ]);
        
        return implode("\n", $parts);
    }
}