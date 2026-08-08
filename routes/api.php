

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
use App\Http\Controllers\AccountController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\CommentOrderController;
use App\Http\Controllers\AccountDepositController;
use App\Http\Controllers\AccountWithdrawalController;
use App\Http\Controllers\AccountTransferController;
use App\Http\Controllers\SaleReportController;
use App\Http\Controllers\PurchaseReportController;
use App\Http\Controllers\ProfitLossReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CompanyDashboardController;
use Illuminate\Http\Request;

// Replace login route
// Login is rate-limited to slow down brute-force attempts.
Route::post('/login', [SuperAdminAuthController::class, 'login'])->middleware('throttle:5,1');

// Public storefront endpoints (guests allowed)
Route::get('/publications/public', [PublicationController::class, 'publicProducts']);
Route::get('/publications/public/{id}', [PublicationController::class, 'publicShow']);

// Guest-accessible interactions on public products (likes, comments, orders)
// These are rate-limited to prevent spam and abuse. Comment DELETION is NOT
// guest-accessible — it requires authentication (see the auth group below)
// so anonymous visitors cannot remove other users' content.
Route::middleware('throttle:30,1')->group(function () {
    Route::post('/products/{id}/comments', [CommentOrderController::class, 'addComment']);
    Route::get('/products/{id}/comments', [CommentOrderController::class, 'getComments']);
    Route::post('/products/{id}/likes', [CommentOrderController::class, 'toggleLike']);
    Route::get('/products/{id}/likes', [CommentOrderController::class, 'getLikes']);
    Route::get('/products/{id}/likes/check', [CommentOrderController::class, 'checkLiked']);
});

// Guests may place orders, but listing / viewing orders requires authentication
// and is scoped to the caller's own company (see CommentOrderController).
Route::post('/orders', [CommentOrderController::class, 'createOrder'])->middleware('throttle:10,1');

// Check if customer email exists (for order form)
// Rate-limited and returns only minimal, non-sensitive fields.
Route::get('/customers/check-email', [CommentOrderController::class, 'checkEmail'])->middleware('throttle:10,1');


// Order status update requires authentication (admin action)
Route::middleware('auth:sanctum')->put('/orders/{id}/status', [CommentOrderController::class, 'updateStatus']);



// Sanctum protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [SuperAdminAuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/language', [LanguageController::class, 'update'])->name('user.language');
    Route::get('/profile', [AuthController::class, 'getProfile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/user-me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // These reference the authenticated user's own tenant, so they must never
    // be guest-accessible.
    Route::get('roles/modules', [RoleController::class, 'getModules']);
    Route::get('/register/options', [AuthController::class, 'getBranchesAndRoles']);

    // Authenticated moderation: deleting a comment on a public product.
    Route::delete('/products/{id}/comments/{index}', [CommentOrderController::class, 'deleteComment']);

    // Authenticated, tenant-scoped order listing / detail (storefront analytics + admin)
    Route::prefix('orders')->group(function () {
        Route::get('/',     [CommentOrderController::class, 'index']);
        Route::get('/{id}', [CommentOrderController::class, 'show']);
    });
    Route::get('/user/{id}', [AuthController::class, 'getUser']);
    Route::put('/user/{id}', [AuthController::class, 'updateUser']);
    Route::delete('/user/{id}', [AuthController::class, 'deleteUser']);
    Route::post('/register', [AuthController::class, 'register']);

    // Database backup is restricted to platform Super Admins only (see BackupController)
    Route::get('/backup/download', [BackupController::class, 'download'])->name('api.backup.download');

    
   Route::prefix('branches')->group(function () {
        Route::get('/', [BranchController::class, 'index']);
        Route::post('/', [BranchController::class, 'store']);
        Route::get('/provinces', [BranchController::class, 'getProvinces']);
        Route::get('/{branch}', [BranchController::class, 'show']);
        Route::put('/{branch}', [BranchController::class, 'update']);
        Route::patch('/{branch}/toggle-status', [BranchController::class, 'toggleStatus']);
        Route::delete('/{branch}', [BranchController::class, 'destroy']);
    });
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
        
        Route::get('/{id}/payments',       [SupplierController::class, 'payments']);
        // Optional: Advanced supplier features (uncomment when needed)
        // Route::get('/{id}/transactions',   [SupplierController::class, 'transactions']);
        // Route::get('/{id}/balance',        [SupplierController::class, 'balance']);
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



    // In routes/api.php
    Route::prefix('other-incomes')->group(function () {
        Route::get('/', [OtherIncomeController::class, 'index']);
        Route::post('/', [OtherIncomeController::class, 'store']);
        // Specific routes MUST come BEFORE the wildcard {id} route
        Route::get('/report', [OtherIncomeController::class, 'report']);
        Route::get('/export', [OtherIncomeController::class, 'export']);
        Route::get('/stats', [OtherIncomeController::class, 'stats']);
        Route::get('/account-summary', [OtherIncomeController::class, 'accountSummary']);
        Route::get('/category-summary', [OtherIncomeController::class, 'categorySummary']);
        Route::get('/{id}', [OtherIncomeController::class, 'show']);
        Route::put('/{id}', [OtherIncomeController::class, 'update']);
        Route::delete('/{id}', [OtherIncomeController::class, 'destroy']);
        Route::post('/{id}/duplicate', [OtherIncomeController::class, 'duplicate']);
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
    Route::get('/units/category/{categoryId}/units', [UnitController::class, 'getCategoryUnits']);


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
        Route::post('/{id}/convert-to-customer', [CustomerController::class, 'convertToCustomer']);
    });

    // ── Accounts Module ──────────────────────────────────────────────────────

    Route::prefix('accounts')->group(function () {
        Route::get('/',              [AccountController::class, 'index']);
        Route::get('/list/options',  [AccountController::class, 'listOptions']);
        Route::get('/assignable-users', [AccountController::class, 'assignableUsers']);
        Route::post('/',             [AccountController::class, 'store']);
        Route::get('/{id}',          [AccountController::class, 'show']);
        Route::put('/{id}',          [AccountController::class, 'update']);
        Route::delete('/{id}',       [AccountController::class, 'destroy']);
    });

    // ── Publication Module ───────────────────────────────────────────────────

    Route::prefix('publications')->group(function () {
        Route::get('/',              [PublicationController::class, 'index']);
        Route::post('/{id}/toggle',  [PublicationController::class, 'toggle']);
    });

    // ── Comments & Likes / Orders are public; see top of file ───────────────

    // ── Purchase Module ──────────────────────────────────────────────────────

    Route::prefix('purchases')->group(function () {
        Route::get('/',                    [PurchaseController::class, 'index']);
        Route::post('/',                   [PurchaseController::class, 'store']);
        Route::get('/list/options',        [PurchaseController::class, 'getPurchaseList']);
        Route::get('/export/data',         [PurchaseController::class, 'export']);
        Route::get('/{id}',                [PurchaseController::class, 'show']);
        Route::put('/{id}',                [PurchaseController::class, 'update']);
        Route::delete('/{id}',             [PurchaseController::class, 'destroy']);
        Route::post('/{id}/pay',           [PurchaseController::class, 'pay']);
        Route::post('/{id}/cancel',        [PurchaseController::class, 'cancel']);
    });

    Route::get('/payment-receipt/{transactionId}', [PurchaseController::class, 'paymentReceipt']);
    Route::get('/sale-payment-receipt/{transactionId}', [SaleController::class, 'paymentReceipt']);

    // Purchase Returns
    Route::prefix('purchase-returns')->group(function () {
        Route::get('/',                    [PurchaseReturnController::class, 'index']);
        Route::post('/',                   [PurchaseReturnController::class, 'store']);
        Route::get('/{id}',                [PurchaseReturnController::class, 'show']);
        Route::put('/{id}',                [PurchaseReturnController::class, 'update']);
        Route::patch('/{id}',              [PurchaseReturnController::class, 'update']);
        Route::delete('/{id}',             [PurchaseReturnController::class, 'destroy']);
        Route::get('/refundable/{purchaseId}', [PurchaseReturnController::class, 'getRefundableItems']);
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
        Route::post('/{id}/pay',           [SaleController::class, 'pay']);
        Route::post('/{id}/deliver',       [SaleController::class, 'deliver']);
        Route::post('/{id}/cancel',        [SaleController::class, 'cancel']);
    });

    // Sale Returns
    Route::prefix('sale-returns')->group(function () {
        Route::get('/',                    [SaleReturnController::class, 'index']);
        Route::post('/',                   [SaleReturnController::class, 'store']);
        Route::get('/{id}',                [SaleReturnController::class, 'show']);
        Route::put('/{id}',                [SaleReturnController::class, 'update']);  // Add this for update
        Route::patch('/{id}',              [SaleReturnController::class, 'update']); // Optional: for partial updates
        Route::delete('/{id}',             [SaleReturnController::class, 'destroy']);

        Route::get('/refundable/{saleId}', [SaleReturnController::class, 'getRefundableItems']);
    });

    

    // ── Stock Module ─────────────────────────────────────────────────────────

    Route::prefix('stock')->group(function () {
        Route::get('/balances',            [StockController::class, 'balances']);
        Route::get('/transactions',        [StockController::class, 'transactions']);
        Route::get('/product/{id}',        [StockController::class, 'productStock']);
    });

    Route::get('account-deposits',             [AccountDepositController::class, 'index']);
    Route::post('account-deposits',            [AccountDepositController::class, 'store']);
    Route::get('account-deposits/{accountDeposit}', [AccountDepositController::class, 'show']);

    Route::get('account-withdrawals',              [AccountWithdrawalController::class, 'index']);
    Route::post('account-withdrawals',             [AccountWithdrawalController::class, 'store']);
    Route::get('account-withdrawals/{accountWithdrawal}', [AccountWithdrawalController::class, 'show']);

    // ── Account Transfers Module ──────────────────────────────────────────────
    Route::prefix('account-transfers')->group(function () {
        Route::get('/',                            [AccountTransferController::class, 'index']);
        Route::post('/',                           [AccountTransferController::class, 'store']);
        Route::get('/my-wallets',                  [AccountTransferController::class, 'myWallets']);
        Route::post('/verify-recipient',           [AccountTransferController::class, 'verifyRecipient']);
        Route::get('/{id}',                        [AccountTransferController::class, 'show']);
        Route::post('/{id}/reverse',               [AccountTransferController::class, 'reverse']);
    });

    Route::get('/account-transactions', [AccountController::class, 'allTransactions']);
    Route::get('/accounts/{account}/transactions', [AccountController::class, 'transactions']);



    // In routes/api.php
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // In routes/api.php
    Route::prefix('sales-report')->group(function () {
        Route::get('/', [SaleReportController::class, 'index']);
        Route::get('/filters', [SaleReportController::class, 'filterOptions']);
        Route::get('/export', [SaleReportController::class, 'export']);
    });


    // In routes/api.php
    Route::prefix('purchase-report')->group(function () {
        Route::get('/', [PurchaseReportController::class, 'index']);
        Route::get('/filters', [PurchaseReportController::class, 'filterOptions']);
        Route::get('/export', [PurchaseReportController::class, 'export']);
    });

    // In routes/api.php
    Route::prefix('profit-loss-report')->group(function () {
        Route::get('/', [ProfitLossReportController::class, 'index']);
        Route::get('/filters', [ProfitLossReportController::class, 'filterOptions']);
        Route::get('/export', [ProfitLossReportController::class, 'export']);
    });


});


Route::prefix('company-admin')
    ->middleware(['auth:sanctum'])
    ->group(function () {

        Route::get('/dashboard', [CompanyDashboardController::class, 'index']);
        Route::get('/dashboard/branch-options', [CompanyDashboardController::class, 'branchOptions']);

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


// ─── Super Admin (platform owner) routes ──────────────────────────────────
// These wire up the platform-management UI (companies, super admins, profile).
// Every handler validates that the authenticated user is a SuperAdmin.
Route::prefix('super-admin')
    ->middleware(['auth:sanctum'])
    ->group(function () {

        Route::prefix('companies')->group(function () {
            Route::get('/', [\App\Http\Controllers\CompanyController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\CompanyController::class, 'store']);
            Route::get('/list', [\App\Http\Controllers\CompanyController::class, 'getCompaniesList']);
            Route::get('/statistics', [\App\Http\Controllers\CompanyController::class, 'statistics']);
            Route::get('/export', [\App\Http\Controllers\CompanyController::class, 'export']);
            Route::get('/{id}', [\App\Http\Controllers\CompanyController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\CompanyController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\CompanyController::class, 'destroy']);
            Route::post('/{id}/toggle-status', [\App\Http\Controllers\CompanyController::class, 'toggleStatus']);
            Route::post('/{id}/impersonate', [\App\Http\Controllers\CompanyController::class, 'impersonate']);
        });

        Route::prefix('super-admins')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdminController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\SuperAdminController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdminController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdminController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdminController::class, 'destroy']);
            Route::post('/{id}/toggle-status', [\App\Http\Controllers\SuperAdminController::class, 'toggleStatus']);
        });

        Route::get('/profile', [\App\Http\Controllers\SuperAdminController::class, 'profile']);
        Route::put('/profile', [\App\Http\Controllers\SuperAdminController::class, 'updateProfile']);
        Route::post('/language', [\App\Http\Controllers\SuperAdminController::class, 'updateLanguage']);
        Route::post('/logout', [\App\Http\Controllers\SuperAdminController::class, 'logout']);
    });

