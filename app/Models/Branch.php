<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'branch_role');
    }

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
        'allowed_user_count',
        'allowed_product_publish_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'allowed_user_count' => 'integer',
        'allowed_product_publish_count' => 'integer',
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
     * Get the products for the branch
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }


    /**
     * Get the count of public products
     */
    public function getPublicProductsCountAttribute(): int
    {
        return $this->publicProducts()->count();
    }

    /**
     * Get the count of all products
     */
    public function getProductsCountAttribute(): int
    {
        return $this->products()->count();
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

    /**
     * Check if user limit has been reached
     */
    public function isUserLimitReached(): bool
    {
        $userCount = $this->users()->count();
        return $userCount >= $this->allowed_user_count;
    }

    /**
     * Get remaining user slots
     */
    public function getRemainingUserSlotsAttribute(): int
    {
        $userCount = $this->users()->count();
        return max(0, $this->allowed_user_count - $userCount);
    }

    /**
     * Check if branch has reached its user limit
     */
    public function hasReachedUserLimit(): bool
    {
        return $this->isUserLimitReached();
    }

    /**
     * Get remaining product publish slots (only for public products)
     */
    public function getRemainingProductSlotsAttribute(): int
    {
        $publicProductCount = $this->publicProducts()->count();
        return max(0, $this->allowed_product_publish_count - $publicProductCount);
    }

    /**
     * Check if product publish limit has been reached (only for public products)
     */
    public function isProductLimitReached(): bool
    {
        $publicProductCount = $this->publicProducts()->count();
        return $publicProductCount >= $this->allowed_product_publish_count;
    }

    /**
     * Get total product count (all products)
     */
    public function getTotalProductsCountAttribute(): int
    {
        return $this->products()->count();
    }

    /**
     * Get public product count
     */
    public function getPublicProductCountAttribute(): int
    {
        return $this->publicProducts()->count();
    }

    /**
     * Get private product count
     */
    public function getPrivateProductCountAttribute(): int
    {
        return $this->products()->where('is_public', false)->count();
    }


        /**
     * Get public products for the branch (where is_public = true)
     */
    public function publicProducts(): HasMany
    {
        return $this->hasMany(Product::class)->where('is_public', true);
    }

    /**
     * Get private products for the branch (where is_public = false)
     */
    public function privateProducts(): HasMany
    {
        return $this->hasMany(Product::class)->where('is_public', false);
    }
}
