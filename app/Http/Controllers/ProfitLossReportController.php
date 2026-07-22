<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Expense;
use App\Models\OtherIncome;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\SaleItem;
use App\Models\PurchaseItem;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ProfitLossReportController extends Controller
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
     * GET /api/profit-loss-report
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $branchId = $this->resolveBranchId($request);
            $companyId = $this->resolveCompanyId($request);

            $filters = $this->buildFilters($request);
            $period = $this->getPeriod($filters);

            // Get all financial data
            $salesData = $this->getSalesData($companyId, $branchId, $filters);
            $purchaseData = $this->getPurchaseData($companyId, $branchId, $filters);
            $expenseData = $this->getExpenseData($companyId, $branchId, $filters);
            $incomeData = $this->getOtherIncomeData($companyId, $branchId, $filters);
            
            // Account data - skip if table doesn't have required columns
            $accountData = $this->getAccountData($companyId, $branchId, $filters);

            // Calculate profit/loss
            $summary = $this->calculateSummary($salesData, $purchaseData, $expenseData, $incomeData);
            
            // Get chart data
            $chartData = $this->getChartData($companyId, $branchId, $filters);
            
            // Get monthly trend
            $monthlyTrend = $this->getMonthlyTrend($companyId, $branchId, $filters);
            
            // Get category breakdown
            $categoryBreakdown = $this->getCategoryBreakdown($companyId, $branchId, $filters);
            
            // Get top products by profit
            $topProducts = $this->getTopProfitProducts($companyId, $branchId, $filters);

            return response()->json([
                'summary' => $summary,
                'chart_data' => $chartData,
                'monthly_trend' => $monthlyTrend,
                'category_breakdown' => $categoryBreakdown,
                'top_products' => $topProducts,
                'period' => $period,
                'filters_applied' => $filters,
            ]);
        } catch (\Exception $e) {
            Log::error('ProfitLossReport Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'error' => $e->getMessage(),
                'message' => 'An error occurred while generating the report'
            ], 500);
        }
    }

    private function buildFilters(Request $request): array
    {
        return [
            'from_date' => $request->get('from_date'),
            'to_date' => $request->get('to_date'),
            'period_type' => $request->get('period_type', 'yearly'),
        ];
    }

    private function getPeriod(array $filters): array
    {
        $from = $filters['from_date'] ?? null;
        $to = $filters['to_date'] ?? null;
        
        return [
            'from' => $from,
            'to' => $to,
        ];
    }

    private function getSalesData($companyId, $branchId, array $filters): array
    {
        $query = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed');

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $totalRevenue = (float) $query->sum('total_amount');
        $totalCost = (float) $this->getSalesCost($companyId, $branchId, $filters);
        
        $saleIds = $query->pluck('id');
        $totalItems = 0;
        if ($saleIds->isNotEmpty()) {
            $totalItems = (int) SaleItem::whereIn('sale_id', $saleIds)->sum('quantity');
        }

        return [
            'total_revenue' => $totalRevenue,
            'total_cost' => $totalCost,
            'total_items' => $totalItems,
            'order_count' => $query->count(),
            'profit' => $totalRevenue - $totalCost,
        ];
    }

    private function getSalesCost($companyId, $branchId, array $filters): float
    {
        $query = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.branch_id', $branchId)
            ->where('sales.status', 'confirmed');

        if (!empty($filters['from_date'])) {
            $query->whereDate('sales.document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('sales.document_date', '<=', $filters['to_date']);
        }

        return (float) $query->sum(DB::raw('sale_items.quantity * products.purchase_price'));
    }

private function getExpenseData($companyId, $branchId, array $filters): array
{
    $query = Expense::where('company_id', $companyId)
        ->where('branch_id', $branchId);

    if (!empty($filters['from_date'])) {
        $query->whereDate('date', '>=', $filters['from_date']);
    }
    if (!empty($filters['to_date'])) {
        $query->whereDate('date', '<=', $filters['to_date']);
    }

    return [
        'total_expenses' => (float) $query->sum('amount'),
        'expense_count' => $query->count(),
        'by_type' => [], // Return empty array instead of collection
    ];
}

private function getOtherIncomeData($companyId, $branchId, array $filters): array
{
    $query = OtherIncome::where('company_id', $companyId)
        ->where('branch_id', $branchId);

    if (!empty($filters['from_date'])) {
        $query->whereDate('income_date', '>=', $filters['from_date']);
    }
    if (!empty($filters['to_date'])) {
        $query->whereDate('income_date', '<=', $filters['to_date']);
    }

    return [
        'total_income' => (float) $query->sum('amount'),
        'income_count' => $query->count(),
        'by_category' => [], // Return empty array instead of collection
    ];
}

private function getPurchaseData($companyId, $branchId, array $filters): array
{
    $query = Purchase::where('company_id', $companyId)
        ->where('branch_id', $branchId);

    if (!empty($filters['from_date'])) {
        $query->whereDate('purchase_date', '>=', $filters['from_date']);
    }
    if (!empty($filters['to_date'])) {
        $query->whereDate('purchase_date', '<=', $filters['to_date']);
    }

    $purchaseIds = $query->pluck('id');
    $itemsPurchased = 0;
    if ($purchaseIds->isNotEmpty()) {
        $itemsPurchased = (int) PurchaseItem::whereIn('purchase_id', $purchaseIds)->sum('quantity');
    }

    return [
        'total_spent' => (float) $query->sum('total_amount'),
        'order_count' => $query->count(),
        'items_purchased' => $itemsPurchased,
    ];
}




    private function getAccountData($companyId, $branchId, array $filters): array
    {
        // Account transactions table might not have company_id and branch_id
        // Return default values to prevent errors
        return [
            'total_deposits' => 0,
            'total_withdrawals' => 0,
            'total_expenses' => 0,
            'total_income' => 0,
            'net_cash_flow' => 0,
        ];
    }

    private function calculateSummary($salesData, $purchaseData, $expenseData, $incomeData): array
    {
        $grossRevenue = $salesData['total_revenue'] + $incomeData['total_income'];
        $totalCosts = $purchaseData['total_spent'] + $expenseData['total_expenses'];
        
        $grossProfit = $salesData['total_revenue'] - $salesData['total_cost'];
        $operatingProfit = $grossProfit - $expenseData['total_expenses'];
        $netProfit = $grossRevenue - $totalCosts;

        $profitMargin = $grossRevenue > 0 ? ($netProfit / $grossRevenue) * 100 : 0;

        return [
            'gross_revenue' => $grossRevenue,
            'gross_profit' => $grossProfit,
            'gross_profit_margin' => $salesData['total_revenue'] > 0 
                ? ($grossProfit / $salesData['total_revenue']) * 100 
                : 0,
            
            'total_expenses' => $expenseData['total_expenses'],
            'operating_profit' => $operatingProfit,
            'operating_margin' => $grossRevenue > 0 ? ($operatingProfit / $grossRevenue) * 100 : 0,
            
            'net_profit' => $netProfit,
            'net_profit_margin' => $profitMargin,
            
            'total_sales' => $salesData['order_count'],
            'total_items_sold' => $salesData['total_items'],
            'total_purchases' => $purchaseData['order_count'],
            'total_items_purchased' => $purchaseData['items_purchased'],
            'total_other_income' => $incomeData['total_income'],
            
            'sales_revenue' => $salesData['total_revenue'],
            'cogs' => $salesData['total_cost'],
            
            'profit_per_order' => $salesData['order_count'] > 0 
                ? $salesData['profit'] / $salesData['order_count'] 
                : 0,
        ];
    }

    private function getChartData($companyId, $branchId, array $filters): array
    {
        $periodType = $filters['period_type'] ?? 'daily';
        
        $labels = [];
        $revenue = [];
        $profit = [];
        $expenses = [];

        // Get sales data grouped by period
        $salesQuery = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'confirmed');

        if (!empty($filters['from_date'])) {
            $salesQuery->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $salesQuery->whereDate('document_date', '<=', $filters['to_date']);
        }

        $salesData = $salesQuery->get()->groupBy(function($item) use ($periodType) {
            $date = Carbon::parse($item->document_date);
            
            switch ($periodType) {
                case 'daily':
                    return $date->format('Y-m-d');
                case 'weekly':
                    return $date->format('Y') . '-W' . $date->format('W');
                case 'monthly':
                    return $date->format('Y-m');
                case 'yearly':
                    return $date->format('Y');
                default:
                    return $date->format('Y-m-d');
            }
        });

        // Get expenses data grouped by period
        $expenseQuery = Expense::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $expenseQuery->whereDate('date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $expenseQuery->whereDate('date', '<=', $filters['to_date']);
        }

        $expenseData = $expenseQuery->get()->groupBy(function($item) use ($periodType) {
            $date = Carbon::parse($item->date);
            
            switch ($periodType) {
                case 'daily':
                    return $date->format('Y-m-d');
                case 'weekly':
                    return $date->format('Y') . '-W' . $date->format('W');
                case 'monthly':
                    return $date->format('Y-m');
                case 'yearly':
                    return $date->format('Y');
                default:
                    return $date->format('Y-m-d');
            }
        });

        // Merge data
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

            $labels[] = $period;
            $revenue[] = round($periodRevenue, 2);
            $expenses[] = round($periodExpenses, 2);
            $profit[] = round($periodRevenue - $periodExpenses, 2);
        }

        return [
            'labels' => $labels,
            'revenue' => $revenue,
            'profit' => $profit,
            'expenses' => $expenses,
        ];
    }

    private function getMonthlyTrend($companyId, $branchId, array $filters): array
    {
        $trend = [];

        $fromDate = !empty($filters['from_date']) ? Carbon::parse($filters['from_date']) : null;
        $toDate = !empty($filters['to_date']) ? Carbon::parse($filters['to_date']) : null;

        if (!$fromDate && !$toDate) {
            $fromDate = Carbon::now()->subMonths(11)->startOfMonth();
            $toDate = Carbon::now()->endOfMonth();
        }

        if ($fromDate && !$toDate) {
            $toDate = $fromDate->copy()->addMonths(11)->endOfMonth();
        }

        if (!$fromDate && $toDate) {
            $fromDate = $toDate->copy()->subMonths(11)->startOfMonth();
        }

        if ($fromDate && $toDate) {
            $current = $fromDate->copy()->startOfMonth();
            
            while ($current <= $toDate) {
                $monthStart = $current->copy()->startOfMonth();
                $monthEnd = $current->copy()->endOfMonth();

                $revenue = Sale::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->where('status', 'confirmed')
                    ->whereBetween('document_date', [$monthStart, $monthEnd])
                    ->sum('total_amount');

                $expenses = Expense::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->whereBetween('date', [$monthStart, $monthEnd])
                    ->sum('amount');

                $otherIncome = OtherIncome::where('company_id', $companyId)
                    ->where('branch_id', $branchId)
                    ->whereBetween('income_date', [$monthStart, $monthEnd])
                    ->sum('amount');

                $trend[] = [
                    'month' => $current->format('M Y'),
                    'revenue' => (float) $revenue,
                    'expenses' => (float) $expenses,
                    'other_income' => (float) $otherIncome,
                    'profit' => (float) ($revenue + $otherIncome - $expenses),
                ];

                $current->addMonth();
            }
        }

        return $trend;
    }

private function getCategoryBreakdown($companyId, $branchId, array $filters): array
{
    $expenseCategories = [];
    try {
        $expenseQuery = Expense::where('expenses.company_id', $companyId)
            ->where('expenses.branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $expenseQuery->whereDate('expenses.date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $expenseQuery->whereDate('expenses.date', '<=', $filters['to_date']);
        }

        if (DB::table('expense_types')->exists()) {
            $expenseCategories = $expenseQuery->join('expense_types', 'expenses.expense_type_id', '=', 'expense_types.id')
                ->select('expense_types.name', DB::raw('SUM(expenses.amount) as total'))
                ->groupBy('expense_types.id', 'expense_types.name')
                ->orderBy('total', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->name,
                        'total' => $item->total,
                    ];
                })
                ->toArray();
        }
    } catch (\Exception $e) {
        $expenseCategories = [];
    }

    $incomeCategories = [];
    try {
        $incomeQuery = OtherIncome::where('other_incomes.company_id', $companyId)
            ->where('other_incomes.branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $incomeQuery->whereDate('other_incomes.income_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $incomeQuery->whereDate('other_incomes.income_date', '<=', $filters['to_date']);
        }

        if (DB::table('income_categories')->exists()) {
            $incomeCategories = $incomeQuery->join('income_categories', 'other_incomes.income_category_id', '=', 'income_categories.id')
                ->select('income_categories.name', DB::raw('SUM(other_incomes.amount) as total'))
                ->groupBy('income_categories.id', 'income_categories.name')
                ->orderBy('total', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->name,
                        'total' => $item->total,
                    ];
                })
                ->toArray();
        }
    } catch (\Exception $e) {
        $incomeCategories = [];
    }

    return [
        'expense_categories' => $expenseCategories,
        'income_categories' => $incomeCategories,
    ];
}

private function getTopProfitProducts($companyId, $branchId, array $filters): array
{
    try {
        $query = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.branch_id', $branchId)
            ->where('sales.status', 'confirmed');

        if (!empty($filters['from_date'])) {
            $query->whereDate('sales.document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('sales.document_date', '<=', $filters['to_date']);
        }

        $results = $query->select(
                'products.id',
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.total) as total_revenue'),
                DB::raw('SUM(sale_items.quantity * products.purchase_price) as total_cost'),
                DB::raw('SUM(sale_items.total) - SUM(sale_items.quantity * products.purchase_price) as total_profit')
            )
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_profit', 'desc')
            ->limit(10)
            ->get();

        return $results->map(function ($item) {
            $profit = (float) $item->total_profit;
            $revenue = (float) $item->total_revenue;
            return [
                'id' => $item->id,
                'name' => $item->name,
                'total_quantity' => (float) $item->total_quantity,
                'total_revenue' => round($revenue, 2),
                'total_cost' => round((float) $item->total_cost, 2),
                'total_profit' => round($profit, 2),
                'profit_margin' => $revenue > 0 
                    ? round(($profit / $revenue) * 100, 2) 
                    : 0,
            ];
        })->toArray();
    } catch (\Exception $e) {
        return [];
    }
}



    /**
     * GET /api/profit-loss-report/filters
     */
    public function filterOptions(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        return response()->json([
            'period_types' => [
                ['value' => 'daily', 'label' => 'Daily'],
                ['value' => 'weekly', 'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
                ['value' => 'yearly', 'label' => 'Yearly'],
            ],
            'date_range_presets' => [
                ['value' => 'today', 'label' => 'Today'],
                ['value' => 'yesterday', 'label' => 'Yesterday'],
                ['value' => 'this_week', 'label' => 'This Week'],
                ['value' => 'last_week', 'label' => 'Last Week'],
                ['value' => 'this_month', 'label' => 'This Month'],
                ['value' => 'last_month', 'label' => 'Last Month'],
                ['value' => 'this_quarter', 'label' => 'This Quarter'],
                ['value' => 'this_year', 'label' => 'This Year'],
            ],
        ]);
    }

    /**
     * GET /api/profit-loss-report/export
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $filters = $this->buildFilters($request);

        $salesData = $this->getSalesData($companyId, $branchId, $filters);
        $purchaseData = $this->getPurchaseData($companyId, $branchId, $filters);
        $expenseData = $this->getExpenseData($companyId, $branchId, $filters);
        $incomeData = $this->getOtherIncomeData($companyId, $branchId, $filters);
        $summary = $this->calculateSummary($salesData, $purchaseData, $expenseData, $incomeData);

        return response()->json([
            'summary' => $summary,
            'sales' => $salesData,
            'purchases' => $purchaseData,
            'expenses' => $expenseData,
            'other_income' => $incomeData,
            'period' => $filters,
        ]);
    }
}