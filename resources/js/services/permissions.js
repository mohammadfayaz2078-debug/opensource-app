// Use a simple object to store permissions (non-reactive)
let permissionsData = {};
let userTypeData = null;

// Helper function to read permissions from localStorage
function readPermissionsFromStorage() {
  if (typeof window === 'undefined') return {};
  try {
    const perms = localStorage.getItem('permissions');
    return perms ? JSON.parse(perms) : {};
  } catch {
    return {};
  }
}

// Helper function to read user type from localStorage
function readUserTypeFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('user_type');
  } catch {
    return null;
  }
}

// Helper function to normalize permissions
function normalizePermissions(perms) {
  if (!perms) return {};
  if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof perms === 'object' ? perms : {};
}

// Get current permissions
export function getPermissions() {
  return permissionsData || {};
}

// Get current user type
export function getUserType() {
  return userTypeData;
}

// Set permissions
export function setPermissions(perms) {
  const normalized = normalizePermissions(perms);
  permissionsData = normalized;
  if (typeof window !== 'undefined') {
    localStorage.setItem('permissions', JSON.stringify(normalized));
  }
}

// Set user type
export function setUserType(type) {
  userTypeData = type;
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_type', type);
  }
}

// Clear permissions
export function clearPermissions() {
  permissionsData = {};
  userTypeData = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('permissions');
    localStorage.removeItem('user_type');
  }
}

// Check if user has a specific permission (e.g., "branches.can_view")
export function can(key) {
  if (userTypeData === 'company_admin') {
    return true;
  }

  if (!key || typeof key !== 'string') return false;

  const [module, action] = key.split('.');
  const hasPermission = !!permissionsData?.[module]?.[action];

  return hasPermission;
}

// Check multiple permissions (any of them)
export function canAny(keys) {
  if (userTypeData === 'company_admin') {
    return true;
  }

  if (!Array.isArray(keys)) return can(keys);
  return keys.some(key => can(key));
}

// Check multiple permissions (all of them)
export function canAll(keys) {
  if (userTypeData === 'company_admin') {
    return true;
  }

  if (!Array.isArray(keys)) return can(keys);
  return keys.every(key => can(key));
}

// Check if user is super admin
export function isCompanyAdmin() {
  return userTypeData === 'company_admin';
}

// Check if user is regular user
export function isRegularUser() {
  return userTypeData === 'user';
}

// Initialize permissions from localStorage on app start
export function initPermissions() {
  permissionsData = readPermissionsFromStorage();
  userTypeData = readUserTypeFromStorage();
}

// React Hook for using permissions in components
export function usePermissions() {
  const [permissions, setPermissionsState] = React.useState(getPermissions());
  const [userType, setUserTypeState] = React.useState(getUserType());
  
  const updatePermissions = (newPermissions) => {
    setPermissions(newPermissions);
    setPermissionsState(getPermissions());
  };
  
  const updateUserType = (newUserType) => {
    setUserType(newUserType);
    setUserTypeState(getUserType());
  };
  
  // Refresh function to reload from localStorage
  const refresh = () => {
    setPermissionsState(getPermissions());
    setUserTypeState(getUserType());
  };
  
  return {
    permissions,
    userType,
    isCompanyAdmin: userType === 'company_admin',
    isRegularUser: userType === 'user',
    can: (key) => can(key),
    canAny: (keys) => canAny(keys),
    canAll: (keys) => canAll(keys),
    setPermissions: updatePermissions,
    setUserType: updateUserType,
    clearPermissions: () => {
      clearPermissions();
      setPermissionsState({});
      setUserTypeState(null);
    },
    refresh
  };
}

// Initialize on import
initPermissions();