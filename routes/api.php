

<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\API\BackupController;
use App\Http\Controllers\API\SuperAdminAuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\ChartOfAccountController;
use App\Http\Controllers\AccountGroupController;
use App\Http\Controllers\AccountTypeController;
use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\ExpenseTypeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\JournalController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\IncomeCategoryController;
use App\Http\Controllers\OtherIncomeController;
use App\Http\Controllers\WarehouseTowerController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitCategoryController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use Illuminate\Http\Request;


// Replace login route
Route::post('/login', [SuperAdminAuthController::class, 'login']);
Route::get('roles/modules', [RoleController::class, 'getModules']);
Route::get('/register/options', [AuthController::class, 'getBranchesAndPositions']);


// Sanctum protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [SuperAdminAuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/language', [LanguageController::class, 'update'])->name('user.language');
    Route::get('/profile', [AuthController::class, 'getProfile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/user-me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user/{id}', [AuthController::class, 'getUser']);
    Route::put('/user/{id}', [AuthController::class, 'updateUser']);
    Route::delete('/user/{id}', [AuthController::class, 'deleteUser']);
    Route::post('/register', [AuthController::class, 'register']);

    Route::get('/backup/download', [BackupController::class, 'download'])->name('api.backup.download');

    
    Route::apiResource('branches', BranchController::class);
    Route::patch('branches/{branch}/toggle-status', [BranchController::class, 'toggleStatus']);
    Route::apiResource('roles', RoleController::class);

    // ─── Chart of Accounts ───────────────────────────────────
    Route::get('chart-of-accounts/tree', [ChartOfAccountController::class, 'tree']);
    Route::get('chart-of-accounts/types', [ChartOfAccountController::class, 'getAccountTypes']);
    Route::get('chart-of-accounts/groups', [ChartOfAccountController::class, 'getAccountGroups']);
    Route::get('chart-of-accounts/parent-options', [ChartOfAccountController::class, 'getParentOptions']);
    Route::get('chart-of-accounts/summary', [ChartOfAccountController::class, 'summary']);
    Route::post('chart-of-accounts/import', [ChartOfAccountController::class, 'import']);
    Route::post('chart-of-accounts/{id}/toggle-deprecated', [ChartOfAccountController::class, 'toggleDeprecated']);
    Route::post('chart-of-accounts/{id}/toggle-active', [ChartOfAccountController::class, 'toggleActive']);
    Route::apiResource('chart-of-accounts', ChartOfAccountController::class);

    // ─── Account Types ────────────────────────────────────────
    Route::post('account-types/seed', [AccountTypeController::class, 'seed']);
    Route::apiResource('account-types', AccountTypeController::class);

    // ─── Account Groups ──────────────────────────────────────
    Route::get('account-groups/tree', [AccountGroupController::class, 'tree']);
    Route::apiResource('account-groups', AccountGroupController::class);

    // ─── Currencies (Multi-Currency) ─────────────────────────
    Route::get('currencies/active-list', [CurrencyController::class, 'activeList']);
    Route::post('currencies/convert', [CurrencyController::class, 'convert']);
    Route::post('currencies/{id}/set-base', [CurrencyController::class, 'setBase']);
    Route::post('currencies/{id}/toggle-active', [CurrencyController::class, 'toggleActive']);
    Route::get('currencies/{id}/rates', [CurrencyController::class, 'getRates']);
    Route::post('currencies/{id}/rates', [CurrencyController::class, 'storeRate']);
    Route::delete('currencies/{id}/rates/{rateId}', [CurrencyController::class, 'destroyRate']);
    Route::apiResource('currencies', CurrencyController::class);

    // ── Expense Module ──────────────────────────────────────────────────────

    // Expense Categories
    Route::prefix('expense-categories')->group(function () {
        Route::get('/',                    [ExpenseCategoryController::class, 'index']);
        Route::get('/tree',                [ExpenseCategoryController::class, 'tree']);
        Route::post('/',                   [ExpenseCategoryController::class, 'store']);
        Route::get('/{id}',                [ExpenseCategoryController::class, 'show']);
        Route::put('/{id}',                [ExpenseCategoryController::class, 'update']);
        Route::delete('/{id}',             [ExpenseCategoryController::class, 'destroy']);
        Route::post('/{id}/toggle-active', [ExpenseCategoryController::class, 'toggleActive']);
    });

    // Expense Types
    Route::prefix('expense-types')->group(function () {
        Route::get('/',                    [ExpenseTypeController::class, 'index']);
        Route::post('/',                   [ExpenseTypeController::class, 'store']);
        Route::get('/{id}',                [ExpenseTypeController::class, 'show']);
        Route::put('/{id}',                [ExpenseTypeController::class, 'update']);
        Route::delete('/{id}',             [ExpenseTypeController::class, 'destroy']);
        Route::post('/{id}/toggle-active', [ExpenseTypeController::class, 'toggleActive']);
    });

    // Expenses
    Route::prefix('expenses')->group(function () {
        Route::get('/',                 [ExpenseController::class, 'index']);
        Route::get('/summary',          [ExpenseController::class, 'summary']);
        Route::post('/',                [ExpenseController::class, 'store']);
        Route::get('/{id}',             [ExpenseController::class, 'show']);
        Route::put('/{id}',             [ExpenseController::class, 'update']);
        Route::delete('/{id}',          [ExpenseController::class, 'destroy']);
        Route::post('/{id}/submit',     [ExpenseController::class, 'submit']);
        Route::post('/{id}/pay',        [ExpenseController::class, 'pay']);
        Route::post('/{id}/cancel',     [ExpenseController::class, 'cancel']);
        Route::get('/{id}/journal-entries', [ExpenseController::class, 'journalEntries']);
    });

    // Journals
    Route::prefix('journals')->group(function () {
        Route::get('/',     [JournalController::class, 'index']);
        Route::post('/',    [JournalController::class, 'store']);
        Route::get('/{id}', [JournalController::class, 'show']);
        Route::put('/{id}', [JournalController::class, 'update']);
    });

    // Journal Entries
    Route::prefix('journal-entries')->group(function () {
        Route::get('/',              [JournalController::class, 'entries']);
        Route::post('/',             [JournalController::class, 'storeEntry']);
        Route::get('/report',        [JournalController::class, 'report']);
        Route::get('/{id}',          [JournalController::class, 'showEntry']);
        Route::post('/{id}/post',    [JournalController::class, 'postEntry']);
        Route::post('/{id}/reverse', [JournalController::class, 'reverseEntry']);
    });

    // ── Employee & Payroll Module ──────────────────────────────────────────

    // Employees
    Route::prefix('employees')->group(function () {
        Route::get('/',                    [EmployeeController::class, 'index']);
        Route::post('/',                   [EmployeeController::class, 'store']);
        Route::get('/{id}',                [EmployeeController::class, 'show']);
        Route::put('/{id}',                [EmployeeController::class, 'update']);
        Route::delete('/{id}',             [EmployeeController::class, 'destroy']);
        Route::get('/{id}/payroll',         [EmployeeController::class, 'payroll']);
        Route::post('/{id}/payslips',       [EmployeeController::class, 'generatePayslip']);

        // Employee Contracts
        Route::get('/{employeeId}/contracts',          [ContractController::class, 'index']);
        Route::post('/{employeeId}/contracts',         [ContractController::class, 'store']);
        Route::get('/{employeeId}/contracts/{contractId}',    [ContractController::class, 'show']);
        Route::put('/{employeeId}/contracts/{contractId}',  [ContractController::class, 'update']);
        Route::delete('/{employeeId}/contracts/{contractId}', [ContractController::class, 'destroy']);
    });



    Route::prefix('suppliers')->group(function () {
        Route::get('/',                    [SupplierController::class, 'index']);
        Route::post('/',                   [SupplierController::class, 'store']);
        Route::get('/list/options',        [SupplierController::class, 'getSupplierList']);
        Route::get('/export/data',         [SupplierController::class, 'export']);
        Route::delete('/bulk/delete',      [SupplierController::class, 'bulkDelete']);
        Route::get('/{id}',                [SupplierController::class, 'show']);
        Route::put('/{id}',                [SupplierController::class, 'update']);
        Route::delete('/{id}',             [SupplierController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [SupplierController::class, 'toggleStatus']);
        
        // Optional: Advanced supplier features (uncomment when needed)
        // Route::get('/{id}/transactions',   [SupplierController::class, 'transactions']);
        // Route::get('/{id}/balance',        [SupplierController::class, 'balance']);
        // Route::get('/{id}/payments',       [SupplierController::class, 'payments']);
    });



    // Income Categories
    Route::prefix('income-categories')->group(function () {
        Route::get('/',                    [IncomeCategoryController::class, 'index']);
        Route::post('/',                   [IncomeCategoryController::class, 'store']);
        Route::get('/list/options',        [IncomeCategoryController::class, 'getCategoryList']);
        Route::get('/export/data',         [IncomeCategoryController::class, 'export']);
        Route::get('/stats',               [IncomeCategoryController::class, 'stats']);
        Route::delete('/bulk/delete',      [IncomeCategoryController::class, 'bulkDelete']);
        Route::get('/{id}',                [IncomeCategoryController::class, 'show']);
        Route::put('/{id}',                [IncomeCategoryController::class, 'update']);
        Route::delete('/{id}',             [IncomeCategoryController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [IncomeCategoryController::class, 'toggleStatus']);
    });



    // Other Incomes
    Route::prefix('other-incomes')->group(function () {
        Route::get('/',                    [OtherIncomeController::class, 'index']);
        Route::post('/',                   [OtherIncomeController::class, 'store']);
        Route::get('/report',              [OtherIncomeController::class, 'report']);
        Route::get('/export/data',         [OtherIncomeController::class, 'export']);
        Route::get('/stats',               [OtherIncomeController::class, 'stats']);
        Route::get('/{id}',                [OtherIncomeController::class, 'show']);
        Route::put('/{id}',                [OtherIncomeController::class, 'update']);
        Route::delete('/{id}',             [OtherIncomeController::class, 'destroy']);
        Route::post('/{id}/duplicate',     [OtherIncomeController::class, 'duplicate']);
    });



    // ── Units Module ─────────────────────────────────────────────────────────

    // Units
    Route::prefix('units')->group(function () {
        Route::get('/',                    [UnitController::class, 'index']);
        Route::post('/',                   [UnitController::class, 'store']);
        Route::get('/list/options',        [UnitController::class, 'getUnitList']);
        Route::get('/convert',             [UnitController::class, 'convert']);
        Route::get('/export/data',         [UnitController::class, 'export']);
        Route::get('/statistics',          [UnitController::class, 'statistics']);
        Route::delete('/bulk/delete',      [UnitController::class, 'bulkDelete']);
        Route::get('/{id}',                [UnitController::class, 'show']);
        Route::put('/{id}',                [UnitController::class, 'update']);
        Route::delete('/{id}',             [UnitController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [UnitController::class, 'toggleStatus']);
    });

    // Unit reference by category
    Route::get('/units/category/{categoryId}/reference', [UnitController::class, 'getReferenceUnit']);


    // ── Unit Categories Module ───────────────────────────────────────────────

    // Unit Categories
    Route::prefix('unit-categories')->group(function () {
        Route::get('/',                    [UnitCategoryController::class, 'index']);
        Route::post('/',                   [UnitCategoryController::class, 'store']);
        Route::get('/list/options',        [UnitCategoryController::class, 'getCategoryList']);
        Route::get('/measure-types',       [UnitCategoryController::class, 'getMeasureTypes']);
        Route::get('/export/data',         [UnitCategoryController::class, 'export']);
        Route::get('/statistics',          [UnitCategoryController::class, 'statistics']);
        Route::post('/seed-default',       [UnitCategoryController::class, 'seedDefault']);
        Route::delete('/bulk/delete',      [UnitCategoryController::class, 'bulkDelete']);
        Route::get('/{id}',                [UnitCategoryController::class, 'show']);
        Route::put('/{id}',                [UnitCategoryController::class, 'update']);
        Route::delete('/{id}',             [UnitCategoryController::class, 'destroy']);
    });



    // ── Product Categories Module ────────────────────────────────────────────

    // Product Categories
    Route::prefix('product-categories')->group(function () {
        Route::get('/',                    [ProductCategoryController::class, 'index']);
        Route::post('/',                   [ProductCategoryController::class, 'store']);
        Route::get('/list/options',        [ProductCategoryController::class, 'getCategoryList']);
        Route::get('/export/data',         [ProductCategoryController::class, 'export']);
        Route::get('/statistics',          [ProductCategoryController::class, 'statistics']);
        Route::get('/tree',                [ProductCategoryController::class, 'tree']);
        Route::delete('/bulk/delete',      [ProductCategoryController::class, 'bulkDelete']);
        Route::get('/{id}',                [ProductCategoryController::class, 'show']);
        Route::put('/{id}',                [ProductCategoryController::class, 'update']);
        Route::delete('/{id}',             [ProductCategoryController::class, 'destroy']);
    });



    // ── Products Module ───────────────────────────────────────────────────────

    // Products
    Route::prefix('products')->group(function () {
        Route::get('/',                    [ProductController::class, 'index']);
        Route::post('/',                   [ProductController::class, 'store']);
        Route::get('/list/options',        [ProductController::class, 'getProductList']);
        Route::get('/export/data',         [ProductController::class, 'export']);
        Route::get('/statistics',          [ProductController::class, 'statistics']);
        Route::get('/barcode/{barcode}',   [ProductController::class, 'findByBarcode']);
        Route::get('/{id}',                [ProductController::class, 'show']);
        Route::put('/{id}',                [ProductController::class, 'update']);
        Route::delete('/{id}',             [ProductController::class, 'destroy']);
        
        // Attachment routes
        Route::get('/{productId}/attachments',        [ProductController::class, 'getAttachments']);
        Route::delete('/{productId}/attachments/{attachmentId}', [ProductController::class, 'deleteAttachment']);
    });

    // Warehouse Towers
    Route::prefix('warehouse-towers')->group(function () {
        Route::get('/',                    [WarehouseTowerController::class, 'index']);
        Route::post('/',                   [WarehouseTowerController::class, 'store']);
        Route::get('/list/options',        [WarehouseTowerController::class, 'getLocationList']);
        Route::get('/export/data',         [WarehouseTowerController::class, 'export']);
        Route::get('/statistics',          [WarehouseTowerController::class, 'statistics']);
        Route::get('/nearby',              [WarehouseTowerController::class, 'nearby']);
        Route::delete('/bulk/delete',      [WarehouseTowerController::class, 'bulkDelete']);
        Route::get('/{id}',                [WarehouseTowerController::class, 'show']);
        Route::put('/{id}',                [WarehouseTowerController::class, 'update']);
        Route::delete('/{id}',             [WarehouseTowerController::class, 'destroy']);
        Route::post('/{id}/change-type',   [WarehouseTowerController::class, 'changeType']);
    });


    // ── Customer Module ──────────────────────────────────────────────────────
    // Customers
    Route::prefix('customers')->group(function () {
        Route::get('/',                    [CustomerController::class, 'index']);
        Route::post('/',                   [CustomerController::class, 'store']);
        Route::get('/list/options',        [CustomerController::class, 'getCustomerList']);
        Route::get('/export/data',         [CustomerController::class, 'export']);
        Route::get('/locations',           [CustomerController::class, 'getLocations']);
        Route::delete('/bulk/delete',      [CustomerController::class, 'bulkDelete']);
        Route::get('/{id}',                [CustomerController::class, 'show']);
        Route::put('/{id}',                [CustomerController::class, 'update']);
        Route::delete('/{id}',             [CustomerController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [CustomerController::class, 'toggleStatus']);
    });

    // Attendance
    Route::prefix('attendance')->group(function () {
        Route::get('/',                [AttendanceController::class, 'index']);
        Route::get('/summary',         [AttendanceController::class, 'summary']);
        Route::post('/check-in',       [AttendanceController::class, 'checkIn']);
        Route::post('/check-out',      [AttendanceController::class, 'checkOut']);
        Route::put('/{id}',            [AttendanceController::class, 'update']);
        Route::delete('/{id}',         [AttendanceController::class, 'destroy']);
    });

    // Payslips (global scope)
    Route::prefix('payslips')->group(function () {
        Route::get('/',                [EmployeeController::class, 'payslips']);
        Route::post('/bulk-generate',  [EmployeeController::class, 'bulkGenerate']);
        Route::post('/{id}/pay',       [EmployeeController::class, 'payPayslip']);
    });
});


Route::prefix('super-admin')
    ->middleware(['auth:sanctum'])
    ->group(function () {
        Route::apiResource('super-admins', SuperAdminController::class);
        Route::apiResource('companies', CompanyController::class);
        Route::post('companies/{id}/toggle', [CompanyController::class, 'toggleStatus']);
        Route::post('companies/{id}/impersonate', [CompanyController::class, 'impersonate']);
        Route::get('branches', [BranchController::class, 'index']);
});

Route::prefix('company-admin')
    ->middleware(['auth:sanctum'])
    ->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\API\CompanyAdminController::class, 'dashboard']);
        Route::get('branches', [\App\Http\Controllers\API\CompanyAdminController::class, 'branches']);
        Route::post('branches/{id}/impersonate', [\App\Http\Controllers\API\CompanyAdminController::class, 'impersonateBranch']);
        Route::post('language', [\App\Http\Controllers\API\CompanyAdminController::class, 'updateLanguage']);
        Route::post('logout', [\App\Http\Controllers\API\CompanyAdminController::class, 'logout']);

        // ─── Impersonation (Login as Branch User) ──────────────
        Route::get('branches/{branchId}/users', [\App\Http\Controllers\API\ImpersonationController::class, 'branchUsers']);
        Route::post('impersonate/user/{userId}', [\App\Http\Controllers\API\ImpersonationController::class, 'startImpersonation']);
});

// ─── Impersonation status & stop (accessible by impersonated user token) ──
Route::middleware(['auth:sanctum', 'check.impersonation'])->group(function () {
    Route::get('impersonation/check', [\App\Http\Controllers\API\ImpersonationController::class, 'checkImpersonation']);
    Route::post('impersonation/stop', [\App\Http\Controllers\API\ImpersonationController::class, 'stopImpersonation']);
});


