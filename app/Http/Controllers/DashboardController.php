<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\OtherIncome;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Branch;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\SaleItem;
use App\Models\PurchaseItem;
use App\Models\StockBalance; // Add this if the model exists
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    private function resolveBranchId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        return AuthHelper::getBranchId();
    }

    private function resolveCompanyId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        $branchId = AuthHelper::getBranchId();
        return $branchId ? Branch::find($branchId)?->company_id : null;
    }

    /**
     * GET /api/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $branchId = $this->resolveBranchId($request);
            $companyId = $this->resolveCompanyId($request);

            // Summary Cards
            $summary = $this->getSummary($companyId, $branchId);

            // Sales Overview
            $salesOverview = $this->getSalesOverview($companyId, $branchId);

            // Purchase Overview
            $purchaseOverview = $this->getPurchaseOverview($companyId, $branchId);

            // Revenue vs Expenses Chart
            $revenueExpenses = $this->getRevenueExpensesChart($companyId, $branchId);

            // Top Products
            $topProducts = $this->getTopProducts($companyId, $branchId);

            // Top Customers
            $topCustomers = $this->getTopCustomers($companyId, $branchId);

            // Recent Activity
            $recentActivity = $this->getRecentActivity($companyId, $branchId);

            // Quick Stats
            $quickStats = $this->getQuickStats($companyId, $branchId);

            // Monthly Trend
            $monthlyTrend = $this->getMonthlyTrend($companyId, $branchId);

            // Inventory Status - Fixed
            $inventoryStatus = $this->getInventoryStatus($companyId, $branchId);

            return response()->json([
                'summary' => $summary,
                'sales_overview' => $salesOverview,
                'purchase_overview' => $purchaseOverview,
                'revenue_expenses' => $revenueExpenses,
                'top_products' => $topProducts,
                'top_customers' => $topCustomers,
                'recent_activity' => $recentActivity,
                'quick_stats' => $quickStats,
                'monthly_trend' => $monthlyTrend,
                'inventory_status' => $inventoryStatus,
                'period' => [
                    'today' => Carbon::now()->toDateString(),
                    'this_month' => Carbon::now()->format('F Y'),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'message' => 'An error occurred while loading the dashboard'
            ], 500);
        }
    }

    private function getSummary($companyId, $branchId): array
    {
        $today = Carbon::now()->toDateString();
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
        $startOfWeek = Carbon::now()->startOfWeek()->toDateString();

        // Today's Sales
        $todaySales = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', $today)
            ->sum('total_amount');

        $todaySalesCount = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', $today)
            ->count();

        // Today's Purchases
        $todayPurchases = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('purchase_date', $today)
            ->sum('total_amount');

        // Today's Expenses
        $todayExpenses = Expense::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('date', $today)
            ->sum('amount');

        // Month to Date Sales
        $monthSales = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', '>=', $startOfMonth)
            ->sum('total_amount');

        // Month to Date Purchases
        $monthPurchases = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('purchase_date', '>=', $startOfMonth)
            ->sum('total_amount');

        // Month to Date Expenses
        $monthExpenses = Expense::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('date', '>=', $startOfMonth)
            ->sum('amount');

        // Net Profit (Month)
        $monthProfit = $monthSales - ($monthPurchases + $monthExpenses);

        // Total Customers
        $totalCustomers = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->count();

        // Total Suppliers
        $totalSuppliers = Supplier::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->count();

        // Total Products
        $totalProducts = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->count();

        // Pending Invoices (Unpaid)
        $pendingInvoices = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->where('payment_status', '!=', 'paid')
            ->count();

        // Pending Bills (Unpaid Purchases)
        $pendingBills = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('payment_status', '!=', 'paid')
            ->count();

        return [
            'today' => [
                'sales' => round($todaySales, 2),
                'sales_count' => $todaySalesCount,
                'purchases' => round($todayPurchases, 2),
                'expenses' => round($todayExpenses, 2),
                'profit' => round($todaySales - ($todayPurchases + $todayExpenses), 2),
            ],
            'this_month' => [
                'sales' => round($monthSales, 2),
                'purchases' => round($monthPurchases, 2),
                'expenses' => round($monthExpenses, 2),
                'profit' => round($monthProfit, 2),
            ],
            'counts' => [
                'customers' => $totalCustomers,
                'suppliers' => $totalSuppliers,
                'products' => $totalProducts,
                'pending_invoices' => $pendingInvoices,
                'pending_bills' => $pendingBills,
            ],
        ];
    }

    private function getSalesOverview($companyId, $branchId): array
    {
        $today = Carbon::now()->toDateString();
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();

        // Today's sales count
        $todaySalesCount = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', $today)
            ->count();

        // Month sales count
        $monthSalesCount = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', '>=', $startOfMonth)
            ->count();

        // Average order value
        $avgOrderValue = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->whereDate('document_date', '>=', $startOfMonth)
            ->avg('total_amount') ?? 0;

        // Payment status breakdown
        $paymentBreakdown = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed')
            ->select('payment_status', DB::raw('count(*) as count'), DB::raw('sum(total_amount) as total'))
            ->groupBy('payment_status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->payment_status,
                    'count' => $item->count,
                    'total' => round($item->total, 2),
                ];
            })
            ->toArray();

        // Sales by status
        $statusBreakdown = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->select('status', DB::raw('count(*) as count'), DB::raw('sum(total_amount) as total'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'count' => $item->count,
                    'total' => round($item->total, 2),
                ];
            })
            ->toArray();

        return [
            'today_count' => $todaySalesCount,
            'month_count' => $monthSalesCount,
            'avg_order_value' => round($avgOrderValue, 2),
            'payment_breakdown' => $paymentBreakdown,
            'status_breakdown' => $statusBreakdown,
        ];
    }

    private function getPurchaseOverview($companyId, $branchId): array
    {
        $today = Carbon::now()->toDateString();
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();

        // Today's purchases count
        $todayPurchasesCount = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('purchase_date', $today)
            ->count();

        // Month purchases count
        $monthPurchasesCount = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('purchase_date', '>=', $startOfMonth)
            ->count();

        // Average purchase value
        $avgPurchaseValue = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->whereDate('purchase_date', '>=', $startOfMonth)
            ->avg('total_amount') ?? 0;

        // Payment status breakdown
        $paymentBreakdown = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->select('payment_status', DB::raw('count(*) as count'), DB::raw('sum(total_amount) as total'))
            ->groupBy('payment_status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->payment_status,
                    'count' => $item->count,
                    'total' => round($item->total, 2),
                ];
            })
            ->toArray();

        return [
            'today_count' => $todayPurchasesCount,
            'month_count' => $monthPurchasesCount,
            'avg_order_value' => round($avgPurchaseValue, 2),
            'payment_breakdown' => $paymentBreakdown,
        ];
    }

    private function getRevenueExpensesChart($companyId, $branchId): array
    {
        $labels = [];
        $revenue = [];
        $expenses = [];
        $profit = [];

        // Last 12 months
        for ($i = 11; $i >= 0; $i--) {
            $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
            $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();

            $monthRevenue = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'confirmed')
                ->whereBetween('document_date', [$monthStart, $monthEnd])
                ->sum('total_amount');

            $monthExpenses = Expense::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereBetween('date', [$monthStart, $monthEnd])
                ->sum('amount');

            $monthOtherIncome = OtherIncome::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereBetween('income_date', [$monthStart, $monthEnd])
                ->sum('amount');

            $totalRevenue = $monthRevenue + $monthOtherIncome;
            $totalExpenses = $monthExpenses;

            $labels[] = $monthStart->format('M Y');
            $revenue[] = round($totalRevenue, 2);
            $expenses[] = round($totalExpenses, 2);
            $profit[] = round($totalRevenue - $totalExpenses, 2);
        }

        return [
            'labels' => $labels,
            'revenue' => $revenue,
            'expenses' => $expenses,
            'profit' => $profit,
        ];
    }

    private function getTopProducts($companyId, $branchId): array
    {
        try {
            $startOfMonth = Carbon::now()->startOfMonth()->toDateString();

            $products = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->where('sales.company_id', $companyId)
                ->where('sales.branch_id', $branchId)
                ->where('sales.status', 'confirmed')
                ->whereDate('sales.document_date', '>=', $startOfMonth)
                ->select(
                    'products.id',
                    'products.name',
                    DB::raw('SUM(sale_items.quantity) as total_quantity'),
                    DB::raw('SUM(sale_items.total) as total_revenue')
                )
                ->groupBy('products.id', 'products.name')
                ->orderBy('total_revenue', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'quantity' => (float) $item->total_quantity,
                        'revenue' => round($item->total_revenue, 2),
                    ];
                })
                ->toArray();

            return $products;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getTopCustomers($companyId, $branchId): array
    {
        try {
            $startOfMonth = Carbon::now()->startOfMonth()->toDateString();

            $customers = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'confirmed')
                ->whereDate('document_date', '>=', $startOfMonth)
                ->whereNotNull('customer_id')
                ->select('customer_id', DB::raw('count(*) as order_count'), DB::raw('sum(total_amount) as total_spent'))
                ->with('customer')
                ->groupBy('customer_id')
                ->orderBy('total_spent', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->customer_id,
                        'name' => $item->customer?->full_name ?? 'Unknown',
                        'order_count' => $item->order_count,
                        'total_spent' => round($item->total_spent, 2),
                    ];
                })
                ->toArray();

            return $customers;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getRecentActivity($companyId, $branchId): array
    {
        $activities = [];

        try {
            // Recent Sales
            $recentSales = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'confirmed')
                ->with('customer')
                ->orderBy('document_date', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($sale) {
                    return [
                        'type' => 'sale',
                        'reference' => $sale->reference_no,
                        'customer' => $sale->customer?->full_name ?? 'Walk-in',
                        'amount' => $sale->total_amount,
                        'date' => $sale->document_date,
                        'time_ago' => Carbon::parse($sale->created_at)->diffForHumans(),
                    ];
                })
                ->toArray();

            // Recent Purchases
            $recentPurchases = Purchase::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->with('supplier')
                ->orderBy('purchase_date', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($purchase) {
                    return [
                        'type' => 'purchase',
                        'reference' => $purchase->reference_no,
                        'supplier' => $purchase->supplier?->full_name ?? 'Unknown',
                        'amount' => $purchase->total_amount,
                        'date' => $purchase->purchase_date,
                        'time_ago' => Carbon::parse($purchase->created_at)->diffForHumans(),
                    ];
                })
                ->toArray();

            // Recent Customers
            $recentCustomers = Customer::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->orderBy('created_at', 'desc')
                ->limit(3)
                ->get()
                ->map(function ($customer) {
                    return [
                        'type' => 'customer',
                        'name' => $customer->full_name,
                        'code' => $customer->user_code,
                        'date' => $customer->created_at,
                        'time_ago' => Carbon::parse($customer->created_at)->diffForHumans(),
                    ];
                })
                ->toArray();

            // Merge and sort by date
            $activities = array_merge($recentSales, $recentPurchases, $recentCustomers);
            usort($activities, function ($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });
        } catch (\Exception $e) {
            $activities = [];
        }

        return array_slice($activities, 0, 10);
    }

    private function getQuickStats($companyId, $branchId): array
    {
        try {
            // Today's New Customers
            $today = Carbon::now()->toDateString();
            $newCustomersToday = Customer::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('created_at', $today)
                ->count();

            // This Month's New Customers
            $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
            $newCustomersMonth = Customer::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('created_at', '>=', $startOfMonth)
                ->count();

            // Total Invoices
            $totalInvoices = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            // This Month's Invoices
            $monthInvoices = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('document_date', '>=', $startOfMonth)
                ->count();

            // Total Bills
            $totalBills = Purchase::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            // This Month's Bills
            $monthBills = Purchase::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('purchase_date', '>=', $startOfMonth)
                ->count();

            // Return Rates
            $totalConfirmedSales = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'confirmed')
                ->count();

            $totalReturnedSales = Sale::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'returned')
                ->count();

            $returnRate = $totalConfirmedSales > 0 
                ? ($totalReturnedSales / ($totalConfirmedSales + $totalReturnedSales)) * 100 
                : 0;

            // Total Customers
            $totalCustomers = Customer::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            return [
                'customers' => [
                    'today' => $newCustomersToday,
                    'this_month' => $newCustomersMonth,
                    'total' => $totalCustomers,
                ],
                'invoices' => [
                    'this_month' => $monthInvoices,
                    'total' => $totalInvoices,
                ],
                'bills' => [
                    'this_month' => $monthBills,
                    'total' => $totalBills,
                ],
                'return_rate' => round($returnRate, 2),
            ];
        } catch (\Exception $e) {
            return [
                'customers' => ['today' => 0, 'this_month' => 0, 'total' => 0],
                'invoices' => ['this_month' => 0, 'total' => 0],
                'bills' => ['this_month' => 0, 'total' => 0],
                'return_rate' => 0,
            ];
        }
    }

    private function getMonthlyTrend($companyId, $branchId): array
    {
        try {
            $trend = [];

            for ($i = 11; $i >= 0; $i--) {
                $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
                $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();

                $sales = Sale::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->where('status', 'confirmed')
                    ->whereBetween('document_date', [$monthStart, $monthEnd])
                    ->count();

                $purchases = Purchase::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->whereBetween('purchase_date', [$monthStart, $monthEnd])
                    ->count();

                $newCustomers = Customer::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->count();

                $trend[] = [
                    'month' => $monthStart->format('M Y'),
                    'sales' => $sales,
                    'purchases' => $purchases,
                    'new_customers' => $newCustomers,
                ];
            }

            return $trend;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getInventoryStatus($companyId, $branchId): array
    {
        try {
            // Total products
            $totalProducts = Product::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            // Try to get stock balances if the table exists
            $lowStock = 0;
            $outOfStock = 0;
            $inStock = 0;

            // Check if StockBalance model exists and table has data
            if (class_exists(StockBalance::class)) {
                try {
                    // Get products with stock balances
                    $stockData = StockBalance::where('company_id', $companyId)
                        ->where('branch_id', $branchId)
                        ->select('product_id', 'quantity')
                        ->get()
                        ->keyBy('product_id');

                    $lowStockThreshold = 10;

                    foreach ($stockData as $productId => $stock) {
                        $qty = (float) $stock->quantity;
                        if ($qty <= 0) {
                            $outOfStock++;
                        } elseif ($qty <= $lowStockThreshold) {
                            $lowStock++;
                        } else {
                            $inStock++;
                        }
                    }

                    // Products without stock records are considered out of stock
                    $productsWithStock = $stockData->keys()->toArray();
                    $productsWithoutStock = Product::where('company_id', $companyId)
                        ->where('branch_id', $branchId)
                        ->whereNotIn('id', $productsWithStock)
                        ->count();

                    $outOfStock += $productsWithoutStock;

                } catch (\Exception $e) {
                    // If stock table doesn't exist or has issues, use fallback
                    $inStock = $totalProducts;
                    $lowStock = 0;
                    $outOfStock = 0;
                }
            } else {
                // If StockBalance model doesn't exist
                $inStock = $totalProducts;
                $lowStock = 0;
                $outOfStock = 0;
            }

            return [
                'total_products' => $totalProducts,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'in_stock' => $inStock,
            ];
        } catch (\Exception $e) {
            // Fallback: return basic stats without inventory details
            $totalProducts = Product::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            return [
                'total_products' => $totalProducts,
                'low_stock' => 0,
                'out_of_stock' => 0,
                'in_stock' => $totalProducts,
            ];
        }
    }
}