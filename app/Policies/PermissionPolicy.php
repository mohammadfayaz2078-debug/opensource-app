<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use App\Models\SuperAdmin;
use App\Models\Company;

class PermissionPolicy
{
    /**
     * Check if a user has permission for a specific module and action
     * 
     * @param User|SuperAdmin|Company $user
     * @param string $module
     * @param string $action
     * @return bool
     */
    public function check($user, string $module, string $action): bool
    {
        // Case 1: Super Admin (from super_admins table)
        if ($user instanceof SuperAdmin) {
            return true;
        }

        // Case 2: Company Admin (from companies table)
        if ($user instanceof Company) {
            return true;
        }

        // Case 3: Regular User (from users table)
        if ($user instanceof User) {
            return $this->checkUserPermission($user, $module, $action);
        }

        // Unknown user type - no access
        return false;
    }

    /**
     * Check permissions for regular users
     * 
     * @param User $user
     * @param string $module
     * @param string $action
     * @return bool
     */
    private function checkUserPermission(User $user, string $module, string $action): bool
    {
        // If user has no role, deny access
        if (!$user->role_id) {
            return false;
        }

        // Load role with permissions if not already loaded
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        $role = $user->role;

        // If role doesn't exist or has no permissions
        if (!$role || !$role->permissions) {
            return false;
        }

        // Check specific permission
        return $role->hasPermission($module, $action);
    }

    /**
     * Check if user has any permission for a module
     * 
     * @param User|SuperAdmin|Company $user
     * @param string $module
     * @return bool
     */
    public function hasAnyModulePermission($user, string $module): bool
    {
        // Super Admin or Company Admin always have full access
        if ($user instanceof SuperAdmin || $user instanceof Company) {
            return true;
        }

        // Regular user - check role permissions
        if ($user instanceof User && $user->role && $user->role->permissions) {
            return $user->role->hasModulePermissions($module);
        }

        return false;
    }

    /**
     * Get all permissions for a user
     * 
     * @param User|SuperAdmin|Company $user
     * @return array
     */
    public function getAllPermissions($user): array
    {
        // Super Admin or Company Admin - return all permissions as true
        if ($user instanceof SuperAdmin || $user instanceof Company) {
            $defaultPermissions = config('permissions', []);
            $allPermissions = [];
            
            foreach ($defaultPermissions as $module => $actions) {
                $allPermissions[$module] = [];
                foreach ($actions as $action => $value) {
                    $allPermissions[$module][$action] = true;
                }
            }
            
            return $allPermissions;
        }

        // Regular user - return role permissions
        if ($user instanceof User && $user->role && $user->role->permissions) {
            return $user->role->permissions;
        }

        return [];
    }

    /**
     * Check if user can perform multiple actions on a module
     * 
     * @param User|SuperAdmin|Company $user
     * @param string $module
     * @param array $actions
     * @return bool
     */
    public function checkAll($user, string $module, array $actions): bool
    {
        foreach ($actions as $action) {
            if (!$this->check($user, $module, $action)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if user can perform any of the actions on a module
     * 
     * @param User|SuperAdmin|Company $user
     * @param string $module
     * @param array $actions
     * @return bool
     */
    public function checkAny($user, string $module, array $actions): bool
    {
        foreach ($actions as $action) {
            if ($this->check($user, $module, $action)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get user's role name
     * 
     * @param User|SuperAdmin|Company $user
     * @return string|null
     */
    public function getUserRole($user): ?string
    {
        if ($user instanceof SuperAdmin) {
            return 'super_admin';
        }
        
        if ($user instanceof Company) {
            return 'company_admin';
        }
        
        if ($user instanceof User && $user->role) {
            return $user->role->role_name;
        }
        
        return null;
    }

    /**
     * Check if user is a super admin
     * 
     * @param mixed $user
     * @return bool
     */
    public function isSuperAdmin($user): bool
    {
        return $user instanceof SuperAdmin;
    }

    /**
     * Check if user is a company admin
     * 
     * @param mixed $user
     * @return bool
     */
    public function isCompanyAdmin($user): bool
    {
        return $user instanceof Company;
    }

    /**
     * Check if user is a regular user
     * 
     * @param mixed $user
     * @return bool
     */
    public function isRegularUser($user): bool
    {
        return $user instanceof User;
    }
}