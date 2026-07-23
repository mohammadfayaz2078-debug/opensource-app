<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Company;
use App\Models\Branch;
use App\Models\User;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\OtherIncome;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\PurchaseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CompanyDashboardController extends Controller
{
    private function resolveCompanyId(Request $request): ?int
    {
        // Check if company_id is provided in request
        if ($request->filled('company_id')) {
            return (int) $request->company_id;
        }
        
        // Get from authenticated user
        $user = auth()->user();
        if ($user && $user->company_id) {
            return $user->company_id;
        }
        
        // Get from AuthHelper
        if (AuthHelper::isCompanyAdmin()) {
            return AuthHelper::getCompanyId();
        }
        
        return null;
    }

    private function resolveBranchId(Request $request): ?int
    {
        if ($request->filled('branch_id')) {
            return (int) $request->branch_id;
        }
        return AuthHelper::getBranchId();
    }

    /**
     * GET /api/company-admin/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $companyId = $this->resolveCompanyId($request);
            $branchId = $this->resolveBranchId($request);
            
            // If no company ID, return error with empty data
            if (!$companyId) {
                return response()->json([
                    'company' => null,
                    'branches' => [],
                    'selected_branch' => null,
                    'filters' => [],
                    'summary' => $this->getEmptySummary(),
                    'branch_stats' => [],
                    'sales_data' => [],
                    'purchase_data' => [],
                    'financial_chart' => ['labels' => [], 'revenue' => [], 'expenses' => [], 'profit' => []],
                    'top_products' => [],
                    'top_branches' => [],
                    'recent_activity' => [],
                    'user_stats' => ['total' => 0, 'active' => 0, 'inactive' => 0, 'by_role' => []],
                    'inventory_stats' => ['total' => 0, 'by_category' => []],
                    'period' => ['from' => 'All Time', 'to' => 'All Time'],
                    'error' => 'Company ID not found'
                ], 200);
            }

            $fromDate = $request->get('from_date');
            $toDate = $request->get('to_date');
            $periodType = $request->get('period_type', 'monthly');

            // Get company info
            $company = Company::with(['branches'])->find($companyId);

            // Get branches for filter
            $branches = Branch::where('company_id', $companyId)
                ->select('id', 'branch_name', 'branch_province', 'branch_district', 'is_active')
                ->get();

            Log::info('Company Dashboard Branches', [
                'company_id' => $companyId,
                'branch_count' => $branches->count(),
                'branches' => $branches->toArray()
            ]);

            // Get selected branch name
            $selectedBranch = null;
            if ($branchId) {
                $selectedBranch = $branches->firstWhere('id', (int) $branchId);
            }

            // Build filters
            $filters = [
                'branch_id' => $branchId,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'period_type' => $periodType,
            ];

            // Get all dashboard data - only for tables that have company_id and branch_id
            $summary = $this->getSummary($companyId, $branchId, $fromDate, $toDate);
            $branchStats = $this->getBranchStats($companyId, $branchId, $fromDate, $toDate);
            $salesData = $this->getSalesData($companyId, $branchId, $fromDate, $toDate);
            $purchaseData = $this->getPurchaseData($companyId, $branchId, $fromDate, $toDate);
            $financialChart = $this->getFinancialChart($companyId, $branchId, $fromDate, $toDate, $periodType);
            $topProducts = $this->getTopProducts($companyId, $branchId, $fromDate, $toDate);
            $topBranches = $this->getTopBranches($companyId, $fromDate, $toDate);
            $recentActivity = $this->getRecentActivity($companyId, $branchId);
            $userStats = $this->getUserStats($companyId, $branchId);
            $inventoryStats = $this->getInventoryStats($companyId, $branchId);

            return response()->json([
                'company' => $company,
                'branches' => $branches,
                'selected_branch' => $selectedBranch,
                'filters' => $filters,
                'summary' => $summary,
                'branch_stats' => $branchStats,
                'sales_data' => $salesData,
                'purchase_data' => $purchaseData,
                'financial_chart' => $financialChart,
                'top_products' => $topProducts,
                'top_branches' => $topBranches,
                'recent_activity' => $recentActivity,
                'user_stats' => $userStats,
                'inventory_stats' => $inventoryStats,
                'period' => [
                    'from' => $fromDate ?? 'All Time',
                    'to' => $toDate ?? 'All Time',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Company Dashboard Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'error' => $e->getMessage(),
                'message' => 'An error occurred while loading the dashboard',
                'branches' => [],
            ], 500);
        }
    }

    private function getEmptySummary(): array
    {
        return [
            'sales' => ['total' => 0, 'count' => 0],
            'purchases' => ['total' => 0, 'count' => 0],
            'expenses' => ['total' => 0, 'count' => 0],
            'other_income' => 0,
            'net_profit' => 0,
            'customers' => 0,
            'suppliers' => 0,
            'products' => 0,
        ];
    }

    private function getSummary($companyId, $branchId, $fromDate, $toDate): array
    {
        // Sales
        $salesQuery = Sale::where('company_id', $companyId)->where('status', 'confirmed');
        if ($branchId) $salesQuery->where('branch_id', $branchId);
        if ($fromDate) $salesQuery->whereDate('document_date', '>=', $fromDate);
        if ($toDate) $salesQuery->whereDate('document_date', '<=', $toDate);

        $totalSales = (float) $salesQuery->sum('total_amount');
        $salesCount = $salesQuery->count();

        // Purchases
        $purchaseQuery = Purchase::where('company_id', $companyId);
        if ($branchId) $purchaseQuery->where('branch_id', $branchId);
        if ($fromDate) $purchaseQuery->whereDate('purchase_date', '>=', $fromDate);
        if ($toDate) $purchaseQuery->whereDate('purchase_date', '<=', $toDate);

        $totalPurchases = (float) $purchaseQuery->sum('total_amount');
        $purchaseCount = $purchaseQuery->count();

        // Expenses
        $expenseQuery = Expense::where('company_id', $companyId);
        if ($branchId) $expenseQuery->where('branch_id', $branchId);
        if ($fromDate) $expenseQuery->whereDate('date', '>=', $fromDate);
        if ($toDate) $expenseQuery->whereDate('date', '<=', $toDate);

        $totalExpenses = (float) $expenseQuery->sum('amount');
        $expenseCount = $expenseQuery->count();

        // Other Income
        $incomeQuery = OtherIncome::where('company_id', $companyId);
        if ($branchId) $incomeQuery->where('branch_id', $branchId);
        if ($fromDate) $incomeQuery->whereDate('income_date', '>=', $fromDate);
        if ($toDate) $incomeQuery->whereDate('income_date', '<=', $toDate);

        $totalOtherIncome = (float) $incomeQuery->sum('amount');

        // Customers
        $customerQuery = Customer::where('company_id', $companyId)->where('is_active', true);
        if ($branchId) $customerQuery->where('branch_id', $branchId);
        $totalCustomers = $customerQuery->count();

        // Suppliers
        $supplierQuery = Supplier::where('company_id', $companyId)->where('is_active', true);
        if ($branchId) $supplierQuery->where('branch_id', $branchId);
        $totalSuppliers = $supplierQuery->count();

        // Products
        $productQuery = Product::where('company_id', $companyId);
        if ($branchId) $productQuery->where('branch_id', $branchId);
        $totalProducts = $productQuery->count();

        $netProfit = $totalSales + $totalOtherIncome - $totalPurchases - $totalExpenses;

        return [
            'sales' => [
                'total' => round($totalSales, 2),
                'count' => $salesCount,
            ],
            'purchases' => [
                'total' => round($totalPurchases, 2),
                'count' => $purchaseCount,
            ],
            'expenses' => [
                'total' => round($totalExpenses, 2),
                'count' => $expenseCount,
            ],
            'other_income' => round($totalOtherIncome, 2),
            'net_profit' => round($netProfit, 2),
            'customers' => $totalCustomers,
            'suppliers' => $totalSuppliers,
            'products' => $totalProducts,
        ];
    }

    private function getBranchStats($companyId, $branchId, $fromDate, $toDate): array
    {
        $query = Branch::where('company_id', $companyId)->where('is_active', true);
        
        if ($branchId) {
            $query->where('id', $branchId);
        }

        $branches = $query->get();
        $stats = [];

        foreach ($branches as $branch) {
            // Sales for this branch
            $salesQuery = Sale::where('company_id', $companyId)
                ->where('branch_id', $branch->id)
                ->where('status', 'confirmed');
            if ($fromDate) $salesQuery->whereDate('document_date', '>=', $fromDate);
            if ($toDate) $salesQuery->whereDate('document_date', '<=', $toDate);

            // Purchases for this branch
            $purchaseQuery = Purchase::where('company_id', $companyId)
                ->where('branch_id', $branch->id);
            if ($fromDate) $purchaseQuery->whereDate('purchase_date', '>=', $fromDate);
            if ($toDate) $purchaseQuery->whereDate('purchase_date', '<=', $toDate);

            // Expenses for this branch
            $expenseQuery = Expense::where('company_id', $companyId)
                ->where('branch_id', $branch->id);
            if ($fromDate) $expenseQuery->whereDate('date', '>=', $fromDate);
            if ($toDate) $expenseQuery->whereDate('date', '<=', $toDate);

            // Customers for this branch
            $customerCount = Customer::where('company_id', $companyId)
                ->where('branch_id', $branch->id)
                ->where('is_active', true)
                ->count();

            $stats[] = [
                'id' => $branch->id,
                'name' => $branch->branch_name,
                'location' => $branch->branch_province,
                'sales' => round((float) $salesQuery->sum('total_amount'), 2),
                'sales_count' => $salesQuery->count(),
                'purchases' => round((float) $purchaseQuery->sum('total_amount'), 2),
                'expenses' => round((float) $expenseQuery->sum('amount'), 2),
                'customers' => $customerCount,
                'profit' => round(
                    (float) $salesQuery->sum('total_amount') - 
                    (float) $purchaseQuery->sum('total_amount') - 
                    (float) $expenseQuery->sum('amount'), 
                    2
                ),
            ];
        }

        return $stats;
    }

    private function getSalesData($companyId, $branchId, $fromDate, $toDate): array
    {
        $query = Sale::where('company_id', $companyId)->where('status', 'confirmed');
        if ($branchId) $query->where('branch_id', $branchId);
        if ($fromDate) $query->whereDate('document_date', '>=', $fromDate);
        if ($toDate) $query->whereDate('document_date', '<=', $toDate);

        $totalRevenue = (float) $query->sum('total_amount');
        $totalPaid = (float) $query->sum('paid_amount');
        $totalDue = (float) $query->sum('due_amount');
        $orderCount = $query->count();

        // Payment status breakdown
        $paymentBreakdown = Sale::where('company_id', $companyId)
            ->where('status', 'confirmed');
        if ($branchId) $paymentBreakdown->where('branch_id', $branchId);
        if ($fromDate) $paymentBreakdown->whereDate('document_date', '>=', $fromDate);
        if ($toDate) $paymentBreakdown->whereDate('document_date', '<=', $toDate);
        
        $paymentBreakdown = $paymentBreakdown->select('payment_status', DB::raw('count(*) as count'))
            ->groupBy('payment_status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->payment_status,
                    'count' => $item->count,
                ];
            })
            ->toArray();

        // Status breakdown
        $statusBreakdown = Sale::where('company_id', $companyId);
        if ($branchId) $statusBreakdown->where('branch_id', $branchId);
        if ($fromDate) $statusBreakdown->whereDate('document_date', '>=', $fromDate);
        if ($toDate) $statusBreakdown->whereDate('document_date', '<=', $toDate);
        
        $statusBreakdown = $statusBreakdown->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'count' => $item->count,
                ];
            })
            ->toArray();

        return [
            'total_revenue' => round($totalRevenue, 2),
            'total_paid' => round($totalPaid, 2),
            'total_due' => round($totalDue, 2),
            'order_count' => $orderCount,
            'payment_breakdown' => $paymentBreakdown,
            'status_breakdown' => $statusBreakdown,
        ];
    }

    private function getPurchaseData($companyId, $branchId, $fromDate, $toDate): array
    {
        $query = Purchase::where('company_id', $companyId);
        if ($branchId) $query->where('branch_id', $branchId);
        if ($fromDate) $query->whereDate('purchase_date', '>=', $fromDate);
        if ($toDate) $query->whereDate('purchase_date', '<=', $toDate);

        $totalSpent = (float) $query->sum('total_amount');
        $totalPaid = (float) $query->sum('paid_amount');
        $totalDue = (float) $query->sum('due_amount');
        $orderCount = $query->count();

        return [
            'total_spent' => round($totalSpent, 2),
            'total_paid' => round($totalPaid, 2),
            'total_due' => round($totalDue, 2),
            'order_count' => $orderCount,
        ];
    }

    private function getFinancialChart($companyId, $branchId, $fromDate, $toDate, $periodType): array
    {
        $labels = [];
        $revenue = [];
        $expenses = [];
        $profit = [];

        // Determine grouping
        $groupBy = 'month';
        
        if ($periodType === 'daily') {
            $groupBy = 'day';
        } elseif ($periodType === 'weekly') {
            $groupBy = 'week';
        } elseif ($periodType === 'yearly') {
            $groupBy = 'year';
        }

        // Get sales by period
        $salesQuery = Sale::where('company_id', $companyId)->where('status', 'confirmed');
        if ($branchId) $salesQuery->where('branch_id', $branchId);
        if ($fromDate) $salesQuery->whereDate('document_date', '>=', $fromDate);
        if ($toDate) $salesQuery->whereDate('document_date', '<=', $toDate);

        $salesData = $salesQuery->get()->groupBy(function ($item) use ($groupBy) {
            $date = Carbon::parse($item->document_date);
            return $date->format($groupBy === 'year' ? 'Y' : ($groupBy === 'month' ? 'Y-m' : ($groupBy === 'week' ? 'Y-W' : 'Y-m-d')));
        });

        // Get expenses by period
        $expenseQuery = Expense::where('company_id', $companyId);
        if ($branchId) $expenseQuery->where('branch_id', $branchId);
        if ($fromDate) $expenseQuery->whereDate('date', '>=', $fromDate);
        if ($toDate) $expenseQuery->whereDate('date', '<=', $toDate);

        $expenseData = $expenseQuery->get()->groupBy(function ($item) use ($groupBy) {
            $date = Carbon::parse($item->date);
            return $date->format($groupBy === 'year' ? 'Y' : ($groupBy === 'month' ? 'Y-m' : ($groupBy === 'week' ? 'Y-W' : 'Y-m-d')));
        });

        // Merge periods
        $allPeriods = array_unique(array_merge(
            array_keys($salesData->toArray()),
            array_keys($expenseData->toArray())
        ));
        sort($allPeriods);

        foreach ($allPeriods as $period) {
            $periodRevenue = 0;
            $periodExpenses = 0;

            if (isset($salesData[$period])) {
                $periodRevenue = $salesData[$period]->sum('total_amount');
            }

            if (isset($expenseData[$period])) {
                $periodExpenses = $expenseData[$period]->sum('amount');
            }

            // Format label
            $label = $period;
            if ($groupBy === 'month') {
                $date = Carbon::createFromFormat('Y-m', $period);
                $label = $date->format('M Y');
            } elseif ($groupBy === 'week') {
                $parts = explode('-W', $period);
                $label = "W{$parts[1]}, {$parts[0]}";
            } elseif ($groupBy === 'year') {
                $label = $period;
            }

            $labels[] = $label;
            $revenue[] = round($periodRevenue, 2);
            $expenses[] = round($periodExpenses, 2);
            $profit[] = round($periodRevenue - $periodExpenses, 2);
        }

        return [
            'labels' => $labels,
            'revenue' => $revenue,
            'expenses' => $expenses,
            'profit' => $profit,
        ];
    }

    private function getTopProducts($companyId, $branchId, $fromDate, $toDate): array
    {
        try {
            $query = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', 'confirmed');

            if ($branchId) $query->where('sales.branch_id', $branchId);
            if ($fromDate) $query->whereDate('sales.document_date', '>=', $fromDate);
            if ($toDate) $query->whereDate('sales.document_date', '<=', $toDate);

            $products = $query->select(
                    'products.id',
                    'products.name',
                    DB::raw('SUM(sale_items.quantity) as total_quantity'),
                    DB::raw('SUM(sale_items.total) as total_revenue')
                )
                ->groupBy('products.id', 'products.name')
                ->orderBy('total_revenue', 'desc')
                ->limit(10)
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

    private function getTopBranches($companyId, $fromDate, $toDate): array
    {
        try {
            $query = Sale::where('company_id', $companyId)->where('status', 'confirmed');
            if ($fromDate) $query->whereDate('document_date', '>=', $fromDate);
            if ($toDate) $query->whereDate('document_date', '<=', $toDate);

            $branches = $query->select(
                    'branch_id',
                    DB::raw('count(*) as order_count'),
                    DB::raw('sum(total_amount) as total_revenue')
                )
                ->with('branch')
                ->groupBy('branch_id')
                ->orderBy('total_revenue', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->branch_id,
                        'name' => $item->branch?->branch_name ?? 'Unknown',
                        'order_count' => $item->order_count,
                        'revenue' => round($item->total_revenue, 2),
                    ];
                })
                ->toArray();

            return $branches;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getRecentActivity($companyId, $branchId): array
    {
        $activities = [];

        try {
            // Recent Sales
            $recentSales = Sale::where('company_id', $companyId)->where('status', 'confirmed');
            if ($branchId) $recentSales->where('branch_id', $branchId);
            
            $recentSales = $recentSales->with(['customer', 'branch'])
                ->orderBy('document_date', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($sale) {
                    return [
                        'type' => 'sale',
                        'reference' => $sale->reference_no,
                        'customer' => $sale->customer?->full_name ?? 'Walk-in',
                        'branch' => $sale->branch?->branch_name ?? 'N/A',
                        'amount' => $sale->total_amount,
                        'date' => $sale->document_date,
                        'time_ago' => Carbon::parse($sale->created_at)->diffForHumans(),
                    ];
                })
                ->toArray();

            // Recent Purchases
            $recentPurchases = Purchase::where('company_id', $companyId);
            if ($branchId) $recentPurchases->where('branch_id', $branchId);
            
            $recentPurchases = $recentPurchases->with(['supplier', 'branch'])
                ->orderBy('purchase_date', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($purchase) {
                    return [
                        'type' => 'purchase',
                        'reference' => $purchase->reference_no,
                        'supplier' => $purchase->supplier?->full_name ?? 'Unknown',
                        'branch' => $purchase->branch?->branch_name ?? 'N/A',
                        'amount' => $purchase->total_amount,
                        'date' => $purchase->purchase_date,
                        'time_ago' => Carbon::parse($purchase->created_at)->diffForHumans(),
                    ];
                })
                ->toArray();

            // Recent Customers
            $recentCustomers = Customer::where('company_id', $companyId);
            if ($branchId) $recentCustomers->where('branch_id', $branchId);
            
            $recentCustomers = $recentCustomers->orderBy('created_at', 'desc')
                ->limit(3)
                ->get()
                ->map(function ($customer) {
                    return [
                        'type' => 'customer',
                        'name' => $customer->full_name,
                        'code' => $customer->user_code,
                        'branch' => $customer->branch?->branch_name ?? 'N/A',
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

    private function getUserStats($companyId, $branchId): array
    {
        try {
            $userQuery = User::where('company_id', $companyId);
            if ($branchId) $userQuery->where('branch_id', $branchId);

            $totalUsers = $userQuery->count();
            $activeUsers = (clone $userQuery)->where('status', true)->count();
            $inactiveUsers = (clone $userQuery)->where('status', false)->count();

            // Users by role
            $usersByRole = User::where('company_id', $companyId);
            if ($branchId) $usersByRole->where('branch_id', $branchId);
            
            $usersByRole = $usersByRole->select('role_id', DB::raw('count(*) as count'))
                ->with('role')
                ->groupBy('role_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'role' => $item->role?->role_name ?? 'No Role',
                        'count' => $item->count,
                    ];
                })
                ->toArray();

            return [
                'total' => $totalUsers,
                'active' => $activeUsers,
                'inactive' => $inactiveUsers,
                'by_role' => $usersByRole,
            ];
        } catch (\Exception $e) {
            return [
                'total' => 0,
                'active' => 0,
                'inactive' => 0,
                'by_role' => [],
            ];
        }
    }

    private function getInventoryStats($companyId, $branchId): array
    {
        try {
            $productQuery = Product::where('company_id', $companyId);
            if ($branchId) $productQuery->where('branch_id', $branchId);

            $totalProducts = $productQuery->count();

            // Count products by category
            $productsByCategory = [];
            try {
                $productsByCategory = Product::where('company_id', $companyId);
                if ($branchId) $productsByCategory->where('branch_id', $branchId);
                
                $productsByCategory = $productsByCategory->select('category_id', DB::raw('count(*) as count'))
                    ->with('category')
                    ->groupBy('category_id')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'category' => $item->category?->name ?? 'Uncategorized',
                            'count' => $item->count,
                        ];
                    })
                    ->toArray();
            } catch (\Exception $e) {
                $productsByCategory = [];
            }

            return [
                'total' => $totalProducts,
                'by_category' => $productsByCategory,
            ];
        } catch (\Exception $e) {
            return [
                'total' => 0,
                'by_category' => [],
            ];
        }
    }

    /**
     * GET /api/company-admin/dashboard/branch-options
     */
    public function branchOptions(Request $request): JsonResponse
    {
        try {
            $companyId = $this->resolveCompanyId($request);
            
            if (!$companyId) {
                return response()->json([
                    'branches' => [],
                    'message' => 'No company found'
                ], 200);
            }

            $branches = Branch::where('company_id', $companyId)
                ->where('is_active', true)
                ->select('id', 'branch_name', 'branch_province', 'branch_district')
                ->orderBy('branch_name')
                ->get();

            return response()->json([
                'branches' => $branches,
            ]);
        } catch (\Exception $e) {
            Log::error('Branch Options Error: ' . $e->getMessage());
            return response()->json([
                'branches' => [],
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}