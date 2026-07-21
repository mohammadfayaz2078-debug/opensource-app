<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Auth;

class AuthHelper
{
    /**
     * Get the authenticated user regardless of which table they came from
     */
    public static function getAuthenticatedUser()
    {
        return Auth::user();
    }

    /**
     * Check if authenticated user is a company admin (from companies table)
     * Company admins don't have branch_id or role_id
     */
    public static function isCompanyAdmin()
    {
        $user = Auth::user();
        
        // Check if user is from companies table (has company_name and manager_password)
        if ($user && method_exists($user, 'getTable') && $user->getTable() === 'companies') {
            return true;
        }
        
        // Alternative check: company admin doesn't have branch_id or role_id
        if ($user && !isset($user->branch_id) && !isset($user->role_id)) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if authenticated user is a branch user (from users table)
     * Branch users have branch_id
     */
    public static function isBranchUser()
    {
        $user = Auth::user();
        
        // Check if user is from users table
        if ($user && method_exists($user, 'getTable') && $user->getTable() === 'users') {
            return true;
        }
        
        // Alternative check: branch user has branch_id
        if ($user && isset($user->branch_id) && $user->branch_id !== null) {
            return true;
        }
        
        return false;
    }

    /**
     * Get the company ID for the authenticated user
     */
    public static function getCompanyId()
    {
        $user = Auth::user();
        
        if (self::isCompanyAdmin()) {
            // Company admin's ID is the company_id
            return $user->id;
        }
        
        if (self::isBranchUser() && isset($user->company_id)) {
            // Branch user belongs to a company
            return $user->company_id;
        }
        
        return null;
    }

    /**
     * Get the branch ID for the authenticated user (if they are a branch user)
     */
    public static function getBranchId()
    {
        $user = Auth::user();
        
        if (self::isBranchUser() && isset($user->branch_id)) {
            return $user->branch_id;
        }
        
        return null;
    }

    /**
     * Get the user type as string
     */
    public static function getUserType()
    {
        if (self::isCompanyAdmin()) {
            return 'company_admin';
        }
        
        if (self::isBranchUser()) {
            return 'branch_user';
        }
        
        return 'unknown';
    }
}