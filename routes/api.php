

<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\API\BackupController;
use App\Http\Controllers\API\SuperAdminAuthController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\ExpenseTypeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\IncomeCategoryController;
use App\Http\Controllers\OtherIncomeController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitCategoryController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\StockController;
use Illuminate\Http\Request;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountDepositController;
use App\Http\Controllers\AccountWithdrawalController;

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
        // Special routes first (before {id} parameter)
        Route::get('/tree',                [ExpenseTypeController::class, 'tree']);
        Route::get('/list',                [ExpenseTypeController::class, 'list']);
        
        // Then the CRUD routes
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

    // ── Purchase Module ──────────────────────────────────────────────────────

    Route::prefix('purchases')->group(function () {
        Route::get('/',                    [PurchaseController::class, 'index']);
        Route::post('/',                   [PurchaseController::class, 'store']);
        Route::get('/list/options',        [PurchaseController::class, 'getPurchaseList']);
        Route::get('/export/data',         [PurchaseController::class, 'export']);
        Route::get('/{id}',                [PurchaseController::class, 'show']);
        Route::put('/{id}',                [PurchaseController::class, 'update']);
        Route::delete('/{id}',             [PurchaseController::class, 'destroy']);
        Route::post('/{id}/receive',       [PurchaseController::class, 'receive']);
        Route::post('/{id}/cancel',        [PurchaseController::class, 'cancel']);
    });

    // Purchase Returns
    Route::prefix('purchase-returns')->group(function () {
        Route::get('/',                    [PurchaseReturnController::class, 'index']);
        Route::post('/',                   [PurchaseReturnController::class, 'store']);
        Route::get('/{id}',                [PurchaseReturnController::class, 'show']);
        Route::delete('/{id}',             [PurchaseReturnController::class, 'destroy']);
    });

    // ── Sales Module ─────────────────────────────────────────────────────────

    Route::prefix('sales')->group(function () {
        Route::get('/',                    [SaleController::class, 'index']);
        Route::post('/',                   [SaleController::class, 'store']);
        Route::get('/list/options',        [SaleController::class, 'getSaleList']);
        Route::get('/export/data',         [SaleController::class, 'export']);
        Route::get('/{id}',                [SaleController::class, 'show']);
        Route::put('/{id}',                [SaleController::class, 'update']);
        Route::delete('/{id}',             [SaleController::class, 'destroy']);
        Route::post('/{id}/confirm',       [SaleController::class, 'confirm']);
        Route::post('/{id}/deliver',       [SaleController::class, 'deliver']);
        Route::post('/{id}/cancel',        [SaleController::class, 'cancel']);
    });

    // Sale Returns
    Route::prefix('sale-returns')->group(function () {
        Route::get('/',                    [SaleReturnController::class, 'index']);
        Route::post('/',                   [SaleReturnController::class, 'store']);
        Route::get('/{id}',                [SaleReturnController::class, 'show']);
        Route::delete('/{id}',             [SaleReturnController::class, 'destroy']);
    });

    // ── Stock Module ─────────────────────────────────────────────────────────

    Route::prefix('stock')->group(function () {
        Route::get('/balances',            [StockController::class, 'balances']);
        Route::get('/transactions',        [StockController::class, 'transactions']);
        Route::get('/product/{id}',        [StockController::class, 'productStock']);
    });

    Route::apiResource('accounts', AccountController::class);

    Route::get('account-deposits', [AccountDepositController::class, 'index']);
    Route::post('account-deposits', [AccountDepositController::class, 'store']);
    Route::get('account-deposits/{accountDeposit}', [AccountDepositController::class, 'show']);

    Route::get('account-withdrawals', [AccountWithdrawalController::class, 'index']);
    Route::post('account-withdrawals', [AccountWithdrawalController::class, 'store']);
    Route::get('account-withdrawals/{accountWithdrawal}', [AccountWithdrawalController::class, 'show']);

    Route::get('/accounts/{account}/transactions', [AccountController::class, 'transactions']);
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

        Route::prefix('seeder')->group(function () {
            Route::post('/run', [\App\Http\Controllers\CompanyAdmin\SeederController::class, 'runSeeder']);
            Route::get('/status', [\App\Http\Controllers\CompanyAdmin\SeederController::class, 'checkStatus']);
            Route::post('/reset', [\App\Http\Controllers\CompanyAdmin\SeederController::class, 'resetAndSeed']);
        });
});


// ─── Impersonation status & stop (accessible by impersonated user token) ──
Route::middleware(['auth:sanctum', 'check.impersonation'])->group(function () {
    Route::get('impersonation/check', [\App\Http\Controllers\API\ImpersonationController::class, 'checkImpersonation']);
    Route::post('impersonation/stop', [\App\Http\Controllers\API\ImpersonationController::class, 'stopImpersonation']);
});


