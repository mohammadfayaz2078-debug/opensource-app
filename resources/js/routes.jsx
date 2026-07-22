// routes.js
import { Navigate } from 'react-router-dom';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Branch Pages
import BranchIndex from './pages/Branch/Index';
import BranchCreate from './pages/Branch/Create';
import BranchEdit from './pages/Branch/Edit';
import BranchShow from './pages/Branch/Show';

// Company Pages (used in regular user routes)
import CompanyShow from './pages/Company/Show';
import CompanyEdit from './pages/Company/Edit';

// Expense Pages
import ExpenseIndex from './pages/Expense/Index';
import ExpenseCategoryIndex from './pages/ExpenseCategory/Index';
import ExpenseTypeIndex from './pages/ExpenseType/Index';

import SupplierIndex from './pages/Supplier/Index';
import SupplierCreate from './pages/Supplier/Create';
import SupplierEdit from './pages/Supplier/Edit';
import SupplierShow from './pages/Supplier/Show';

import IncomeCategoryIndex from './pages/IncomeCategory/Index';
import IncomeCategoryCreate from './pages/IncomeCategory/Create';
import IncomeCategoryEdit from './pages/IncomeCategory/Edit';
import IncomeCategoryShow from './pages/IncomeCategory/Show';

import OtherIncomeIndex from './pages/OtherIncome/Index';
import OtherIncomeCreate from './pages/OtherIncome/Create';
import OtherIncomeEdit from './pages/OtherIncome/Edit';
import OtherIncomeShow from './pages/OtherIncome/Show';

import CustomerIndex from './pages/Customer/Index';
import CustomerCreate from './pages/Customer/Create';
import CustomerEdit from './pages/Customer/Edit';
import CustomerShow from './pages/Customer/Show';


import UnitCategoryIndex from './pages/UnitCategory/Index';
import UnitCategoryCreate from './pages/UnitCategory/Create';
import UnitCategoryEdit from './pages/UnitCategory/Edit';
import UnitCategoryShow from './pages/UnitCategory/Show';

import UnitIndex from './pages/Unit/Index';
import UnitCreate from './pages/Unit/Create';
import UnitEdit from './pages/Unit/Edit';
import UnitShow from './pages/Unit/Show';

import ProductCategoryIndex from './pages/ProductCategory/Index';
import ProductCategoryCreate from './pages/ProductCategory/Create';
import ProductCategoryEdit from './pages/ProductCategory/Edit';
import ProductCategoryShow from './pages/ProductCategory/Show';


import ProductIndex from './pages/Product/Index';
import ProductCreate from './pages/Product/Create';
import ProductEdit from './pages/Product/Edit';
import ProductShow from './pages/Product/Show';

// Dashboard Pages
import DashboardIndex from './pages/Dashboard/Index';

// Error Pages
import NotFound from './pages/Error/NotFound';

// Role Pages
import RoleIndex from './pages/Role/Index';
import RoleCreate from './pages/Role/Create';
import RoleEdit from './pages/Role/Edit';


import AccountIndex from './pages/Account/Index';
import AccountShow from './pages/Account/Show';


// Company Admin Pages
import CompanyAdminDashboard from './pages/CompanyAdmin/Dashboard';
import CompanyAdminProfile from './pages/CompanyAdmin/Profile';

// User Pages
import UserIndex from './pages/User/Index';
import UserCreate from './pages/User/Create';
import UserEdit from './pages/User/Edit';
import UserProfile from './pages/User/Profile';
import UserSettings from './pages/User/Settings';

// Layouts
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import CompanyAdminLayout from './layouts/CompanyAdminLayout';

// Protected Route Wrapper
const PrivateRoute = ({ children, requiredRole = null }) => {
  const token = localStorage.getItem('api_token');
  const userType = localStorage.getItem('user_type');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'company_admin' && userType !== 'company_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'user' && userType !== 'user') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === null && userType === 'company_admin') {
    const isImpersonatingBranch = localStorage.getItem('impersonating_branch') === 'true';
    if (!isImpersonatingBranch) {
      return <Navigate to="/company-admin/dashboard" replace />;
    }
  }

  return children;
};

// Guest Route Wrapper (redirects to dashboard if already logged in)
const GuestRoute = ({ children }) => {
  const token = localStorage.getItem('api_token');

  if (token) {
    const userType = localStorage.getItem('user_type');
    if (userType === 'company_admin') {
      return <Navigate to="/company-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Routes configuration
const routes = [
  // Public routes (guest only)
  {
    path: '/login',
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    )
  },
  
  // Company Admin Routes
  {
    path: '/company-admin',
    element: (
      <PrivateRoute requiredRole="company_admin">
        <CompanyAdminLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/company-admin/dashboard" replace /> },
      { path: 'dashboard', element: <CompanyAdminDashboard /> },
      { path: 'profile', element: <CompanyAdminProfile /> },
      
      // Branch management within company admin
      { path: 'branches', element: <BranchIndex /> },
      { path: 'branches/create', element: <BranchCreate /> },
      { path: 'branches/:id/edit', element: <BranchEdit /> },
      { path: 'branches/:id/show', element: <BranchShow /> },
      
      // User & Role management within company admin
      { path: 'users', element: <UserIndex /> },
      { path: 'users/create', element: <UserCreate /> },
      { path: 'users/:id/edit', element: <UserEdit /> },
      { path: 'roles', element: <RoleIndex /> },
      { path: 'roles/create', element: <RoleCreate /> },
      { path: 'roles/:id/edit', element: <RoleEdit /> },
    ]
  },
  
  // Authenticated User Routes (regular branch users)
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AuthenticatedLayout />
      </PrivateRoute>
    ),
    children: [
      // Dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardIndex /> },
      
      // Profile (both company admin and regular users)
      { path: 'profile', element: <UserProfile /> },
      { path: 'settings', element: <UserSettings /> },
      { path: 'users/create', element: <UserCreate /> },
      { path: 'users/register', element: <Register /> },
      
      // ===== COMPANY ADMIN ONLY ROUTES =====
      // Company admin manages their own company's branches
      { path: 'branches', element: <BranchIndex /> },
      { path: 'branches/create', element: <BranchCreate /> },
      { path: 'branches/:id/edit', element: <BranchEdit /> },
      { path: 'branches/:id/show', element: <BranchShow /> }, // Fixed: removed duplicate branches path
      
      // Company admin manages their company's users
      { path: 'users', element: <UserIndex /> },
      { path: 'users/:id/edit', element: <UserEdit /> },
      
      // Company admin manages their company's roles
      { path: 'roles', element: <RoleIndex /> },
      { path: 'roles/create', element: <RoleCreate /> },
      { path: 'roles/:id/edit', element: <RoleEdit /> },


      { path: 'accounts', element: <AccountIndex /> },
      { path: 'accounts/:id', element: <AccountShow /> },
      
      // Company admin can view their own company details
      { path: 'company', element: <CompanyShow /> },
      { path: 'company/edit', element: <CompanyEdit /> },
      
      // ===== REGULAR USER ROUTES (based on permissions) =====
      // These will be filtered by permission system in components
      { path: 'my-branch', element: <div>My Branch Details</div> },
      { path: 'my-team', element: <div>My Team</div> },
      
      // Expenses
      { path: 'expenses', element: <ExpenseIndex /> },
      { path: 'expense-categories', element: <ExpenseCategoryIndex /> },
      { path: 'expense-types', element: <ExpenseTypeIndex /> },


      { path: 'suppliers', element: <SupplierIndex /> },
      { path: 'suppliers/create', element: <SupplierCreate /> },
      { path: 'suppliers/:id', element: <SupplierShow /> },
      { path: 'suppliers/:id/edit', element: <SupplierEdit /> },

      { path: 'income-categories', element: <IncomeCategoryIndex /> },
      { path: 'income-categories/create', element: <IncomeCategoryCreate /> },
      { path: 'income-categories/:id', element: <IncomeCategoryShow /> },
      { path: 'income-categories/:id/edit', element: <IncomeCategoryEdit /> },

      { path: 'other-incomes', element: <OtherIncomeIndex /> },
      { path: 'other-incomes/create', element: <OtherIncomeCreate /> },
      { path: 'other-incomes/:id', element: <OtherIncomeShow /> },
      { path: 'other-incomes/:id/edit', element: <OtherIncomeEdit /> },

      { path: 'customers', element: <CustomerIndex /> },
      { path: 'customers/create', element: <CustomerCreate /> },
      { path: 'customers/:id', element: <CustomerShow /> },
      { path: 'customers/:id/edit', element: <CustomerEdit /> },

      { path: 'unit-categories', element: <UnitCategoryIndex /> },
      { path: 'unit-categories/create', element: <UnitCategoryCreate /> },
      { path: 'unit-categories/:id', element: <UnitCategoryShow /> },
      { path: 'unit-categories/:id/edit', element: <UnitCategoryEdit /> },

      { path: 'units', element: <UnitIndex /> },
      { path: 'units/create', element: <UnitCreate /> },
      { path: 'units/:id', element: <UnitShow /> },
      { path: 'units/:id/edit', element: <UnitEdit /> },

      { path: 'product-categories', element: <ProductCategoryIndex /> },
      { path: 'product-categories/create', element: <ProductCategoryCreate /> },
      { path: 'product-categories/:id', element: <ProductCategoryShow /> },
      { path: 'product-categories/:id/edit', element: <ProductCategoryEdit /> },

      { path: 'products', element: <ProductIndex /> },
      { path: 'products/create', element: <ProductCreate /> },
      { path: 'products/:id', element: <ProductShow /> },
      { path: 'products/:id/edit', element: <ProductEdit /> },
    ]
  },
  
  // 404 Not Found - MUST BE LAST
  {
    path: '*',
    element: <NotFound />
  }
];

// Helper to get route path by name (similar to Vue Router's named routes)
export const routeNames = {
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Profile
  PROFILE: '/profile',
  
  // User routes
  USER_INDEX: '/users',
  USER_CREATE: '/users/create',
  USER_EDIT: (id) => `/users/edit/${id}`,
  
  // Role routes
  ROLE_INDEX: '/roles',
  ROLE_CREATE: '/roles/create',
  ROLE_EDIT: (id) => `/roles/edit/${id}`,

  ACCOUNT_INDEX: '/accounts',
  ACCOUNT_SHOW: (id) => `/accounts/${id}/show`,
  
  // Branch routes
  BRANCHES_INDEX: '/branches',
  BRANCHES_CREATE: '/branches/create',
  BRANCHES_EDIT: (id) => `/branches/edit/${id}`,
  BRANCHES_SHOW: (id) => `/branches/${id}/show`,
  
  // Company routes (for company admin)
  COMPANY_SHOW: '/company',
  COMPANY_EDIT: '/company/edit',
  

  SUPPLIER_INDEX: '/suppliers',
  SUPPLIER_CREATE: '/suppliers/create',
  SUPPLIER_SHOW: (id) => `/suppliers/${id}`,
  SUPPLIER_EDIT: (id) => `/suppliers/${id}/edit`,


  INCOME_CATEGORIES_INDEX: '/income-categories',
  INCOME_CATEGORIES_CREATE: '/income-categories/create',
  INCOME_CATEGORIES_SHOW: (id) => `/income-categories/${id}`,
  INCOME_CATEGORIES_EDIT: (id) => `/income-categories/${id}/edit`,

  OTHER_INCOMES_INDEX: '/other-incomes',
  OTHER_INCOMES_CREATE: '/other-incomes/create',
  OTHER_INCOMES_SHOW: (id) => `/other-incomes/${id}`,
  OTHER_INCOMES_EDIT: (id) => `/other-incomes/${id}/edit`,

  CUSTOMER_INDEX: '/customers',
  CUSTOMER_CREATE: '/customers/create',
  CUSTOMER_SHOW: (id) => `/customers/${id}`,
  CUSTOMER_EDIT: (id) => `/customers/${id}/edit`,

  UNIT_CATEGORIES_INDEX: '/unit-categories',
  UNIT_CATEGORIES_CREATE: '/unit-categories/create',
  UNIT_CATEGORIES_SHOW: (id) => `/unit-categories/${id}`,
  UNIT_CATEGORIES_EDIT: (id) => `/unit-categories/${id}/edit`,


  UNITS_INDEX: '/units',
  UNITS_CREATE: '/units/create',
  UNITS_SHOW: (id) => `/units/${id}`,
  UNITS_EDIT: (id) => `/units/${id}/edit`,


  PRODUCT_CATEGORIES_INDEX: '/product-categories',
  PRODUCT_CATEGORIES_CREATE: '/product-categories/create',
  PRODUCT_CATEGORIES_SHOW: (id) => `/product-categories/${id}`,
  PRODUCT_CATEGORIES_EDIT: (id) => `/product-categories/${id}/edit`,


  PRODUCT_INDEX: '/products',
  PRODUCT_CREATE: '/products/create',
  PRODUCT_SHOW: (id) => `/products/${id}`,
  PRODUCT_EDIT: (id) => `/products/${id}/edit`,

  // Company Admin routes
  COMPANY_ADMIN_DASHBOARD: '/company-admin/dashboard',
  COMPANY_ADMIN_PROFILE: '/company-admin/profile',
  COMPANY_ADMIN_BRANCHES: '/company-admin/branches',
  COMPANY_ADMIN_BRANCHES_CREATE: '/company-admin/branches/create',
  COMPANY_ADMIN_BRANCHES_EDIT: (id) => `/company-admin/branches/${id}/edit`,
  COMPANY_ADMIN_BRANCHES_SHOW: (id) => `/company-admin/branches/${id}/show`,
  COMPANY_ADMIN_USERS: '/company-admin/users',
  COMPANY_ADMIN_ROLES: '/company-admin/roles',
};

export const getUserSpecificRoutes = (userType) => {
  if (userType === 'company_admin') {
    return {
      dashboard: '/company-admin/dashboard',
      profile: '/company-admin/profile',
      branches: '/company-admin/branches',
      users: '/company-admin/users',
      roles: '/company-admin/roles',
    };
  } else {
    return {
      dashboard: '/dashboard',
      profile: '/profile',
      myBranch: '/my-branch',
      myTeam: '/my-team',
    };
  }
};

export const canAccessRoute = (path, userType) => {
  return true;
};

export default routes;