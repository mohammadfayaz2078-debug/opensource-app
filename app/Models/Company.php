<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash;

class Company extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'companies';

    protected $fillable = [
        'company_name',
        'company_address',
        'company_phone',
        'company_email',
        'city',
        'logo',
        'is_active',
        'manager_name',
        'manager_phone',
        'email',
        'manager_password',
        'language',
        'base_currency_id',
        'created_by',
    ];

    protected $hidden = [
        'manager_password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'language' => 'string',
        'base_currency_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Hash manager password when setting it
     */
    public function setManagerPasswordAttribute($value)
    {
        $this->attributes['manager_password'] = Hash::make($value);
    }

    /**
     * Get the super admin who created this company
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(SuperAdmin::class, 'created_by');
    }

    /**
     * Get the base (home) currency for this company
     */
    public function baseCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'base_currency_id');
    }

    /**
     * Get all currencies for this company
     */
    public function currencies(): HasMany
    {
        return $this->hasMany(Currency::class);
    }

    /**
     * Get the branches for the company
     */
    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Get the users for the company
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scope for active companies only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Check if company is active
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Verify manager password
     */
    public function verifyManagerPassword($password): bool
    {
        return Hash::check($password, $this->manager_password);
    }

    /**
     * Get the password for the user.
     */
    public function getAuthPassword(): string
    {
        return $this->manager_password;
    }

    /**
     * Get the column name for the password.
     */
    public function getAuthPasswordName(): string
    {
        return 'manager_password';
    }
}