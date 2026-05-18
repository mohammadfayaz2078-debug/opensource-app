<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';

    protected $fillable = [
        'branch_id',
        'role_name',
        'permissions',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'permissions' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the branch that owns the role
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the users with this role
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role_id');
    }

    /**
     * Scope to filter roles based on user's branch
     */
    public function scopeForUser($query, $user)
    {
        // If user is super admin or admin with null branch, show all roles
        if ($user->branch_id === null) {
            return $query;
        }

        // For branch users, show only roles from their branch
        return $query->where('branch_id', $user->branch_id);
    }

    /**
     * Scope for global roles (no branch)
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('branch_id');
    }

    /**
     * Scope for branch-specific roles
     */
    public function scopeBranchSpecific($query, $branchId = null)
    {
        if ($branchId) {
            return $query->where('branch_id', $branchId);
        }
        return $query->whereNotNull('branch_id');
    }

    /**
     * Check if role has a specific permission
     */
    public function hasPermission($module, $action): bool
    {
        if (!$this->permissions || !isset($this->permissions[$module])) {
            return false;
        }

        return $this->permissions[$module][$action] ?? false;
    }

    /**
     * Check if role has any permission for a module
     */
    public function hasModulePermissions($module): bool
    {
        if (!$this->permissions || !isset($this->permissions[$module])) {
            return false;
        }

        return in_array(true, $this->permissions[$module], true);
    }

    /**
     * Set permissions for the role
     */
    public function setPermissions(array $permissions): void
    {
        $this->update(['permissions' => $permissions]);
    }

    /**
     * Update permissions for a specific module
     */
    public function updateModulePermissions($module, array $actions): void
    {
        $permissions = $this->permissions ?? [];
        $permissions[$module] = $actions;
        $this->update(['permissions' => $permissions]);
    }

    /**
     * Get all permissions as flattened array
     */
    public function getFlattenedPermissions(): array
    {
        $flattened = [];
        
        if (!$this->permissions) {
            return $flattened;
        }

        foreach ($this->permissions as $module => $actions) {
            foreach ($actions as $action => $value) {
                if ($value) {
                    $flattened[] = "{$module}.{$action}";
                }
            }
        }

        return $flattened;
    }

    /**
     * Check if this is the admin role
     */
    public function isAdmin(): bool
    {
        return $this->role_name === 'admin';
    }

    /**
     * Check if role is global
     */
    public function isGlobal(): bool
    {
        return $this->branch_id === null;
    }
}