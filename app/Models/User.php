<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'company_id',
        'branch_id',
        'role_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'status',
        'language',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'boolean',
            'language' => 'string',
        ];
    }

    /**
     * Get the company that the user belongs to
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the branch that the user belongs to
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the role that the user has
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the user's full name
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Set the user's language
     */
    public function setLanguage(string $locale, bool $save = true): bool
    {
        $this->language = $locale;
        return $save ? $this->save() : true;
    }

    /**
     * Get the user's locale
     */
    public function getLocaleAttribute()
    {
        return $this->language ?? config('app.locale');
    }

    /**
     * Activate the user
     */
    public function activate(): void
    {
        $this->update(['status' => true]);
    }

    /**
     * Deactivate the user
     */
    public function deactivate(): void
    {
        $this->update(['status' => false]);
    }

    /**
     * Check if user is active
     */
    public function isActive(): bool
    {
        return $this->status;
    }

    /**
     * Scope for active users only
     */
    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope for inactive users only
     */
    public function scopeInactive($query)
    {
        return $query->where('status', false);
    }

    /**
     * Scope to filter users by company
     */
    public function scopeByCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope to filter users by branch
     */
    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope to filter users by role
     */
    public function scopeByRole($query, $roleId)
    {
        return $query->where('role_id', $roleId);
    }

    /**
     * Search users by name or email
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('phone', 'like', "%{$search}%")
              ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
        });
    }

    /**
     * Check if user has permission
     */
    public function hasPermission($module, $action): bool
    {
        // If user has no role, return false
        if (!$this->role) {
            return false;
        }

        return $this->role->hasPermission($module, $action);
    }

    /**
     * Get user permissions
     */
    public function getPermissions(): array
    {
        if (!$this->role || !$this->role->permissions) {
            return [];
        }

        return $this->role->permissions;
    }
}