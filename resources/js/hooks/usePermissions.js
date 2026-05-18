import { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  can as checkPermission, 
  canAny as checkAny, 
  canAll as checkAll,
  getUserType,
  isSuperAdmin as checkSuperAdmin,
  isCompanyAdmin as checkCompanyAdmin,
  isRegularUser as checkRegularUser,
  getPermissions,
  initPermissions
} from '../services/permissions';

export const usePermissions = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Refresh on mount to ensure latest data
  useEffect(() => {
    initPermissions();
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Direct permission check
  const can = useCallback((key) => {
    return checkPermission(key);
  }, [refreshKey]);
  
  const canView = useCallback((resource) => {
    return checkPermission(`${resource}.view`);
  }, [refreshKey]);
  
  const canCreate = useCallback((resource) => {
    return checkPermission(`${resource}.create`);
  }, [refreshKey]);
  
  const canEdit = useCallback((resource) => {
    return checkPermission(`${resource}.edit`);
  }, [refreshKey]);
  
  const canDelete = useCallback((resource) => {
    return checkPermission(`${resource}.delete`);
  }, [refreshKey]);
  
  const canAny = useCallback((keys) => {
    if (!Array.isArray(keys)) return checkPermission(keys);
    return checkAny(keys);
  }, [refreshKey]);
  
  const canAll = useCallback((keys) => {
    if (!Array.isArray(keys)) return checkPermission(keys);
    return checkAll(keys);
  }, [refreshKey]);
  
  // User type helpers
  const userType = useMemo(() => getUserType(), [refreshKey]);
  const isSuperAdmin = useMemo(() => checkSuperAdmin(), [refreshKey]);
  const isCompanyAdmin = useMemo(() => checkCompanyAdmin(), [refreshKey]);
  const isRegularUser = useMemo(() => checkRegularUser(), [refreshKey]);
  
  // Get all permissions
  const permissions = useMemo(() => getPermissions(), [refreshKey]);
  
  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'permissions' || e.key === 'user_type') {
        initPermissions();
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Custom event for same-tab updates
  useEffect(() => {
    const handleCustomUpdate = () => {
      initPermissions();
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('permissions-updated', handleCustomUpdate);
    return () => window.removeEventListener('permissions-updated', handleCustomUpdate);
  }, []);
  
  return {
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAny,
    canAll,
    permissions,
    userType,
    isSuperAdmin,
    isCompanyAdmin,
    isRegularUser,
    refresh: () => {
      initPermissions();
      setRefreshKey(prev => prev + 1);
    }
  };
};