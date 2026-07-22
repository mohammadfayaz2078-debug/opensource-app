<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleReportController extends Controller
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
     * GET /api/sales-report
     * Generate comprehensive sales report with filters
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $filters = $this->buildFilters($request);
        $query = $this->buildBaseQuery($companyId, $branchId, $filters);

        // Get summary statistics
        $summary = $this->getSummary($query);

        // Get chart data
        $chartData = $this->getChartData($query, $request->get('chart_type', 'daily'));

        // Get top products
        $topProducts = $this->getTopProducts($companyId, $branchId, $filters);

        // Get top customers
        $topCustomers = $this->getTopCustomers($companyId, $branchId, $filters);

        // Get sales by status
        $salesByStatus = $this->getSalesByStatus($companyId, $branchId, $filters);

        // Get daily sales data for table
        $sales = $this->getSalesData($query, $request);

        // Get payment status breakdown
        $paymentBreakdown = $this->getPaymentBreakdown($companyId, $branchId, $filters);

        return response()->json([
            'summary' => $summary,
            'chart_data' => $chartData,
            'top_products' => $topProducts,
            'top_customers' => $topCustomers,
            'sales_by_status' => $salesByStatus,
            'payment_breakdown' => $paymentBreakdown,
            'sales' => $sales['data'],
            'pagination' => $sales['pagination'],
            'filters_applied' => $filters,
        ]);
    }

    /**
     * Build filter array from request
     */
    private function buildFilters(Request $request): array
    {
        return [
            'from_date' => $request->get('from_date'),
            'to_date' => $request->get('to_date'),
            'customer_id' => $request->get('customer_id'),
            'product_id' => $request->get('product_id'),
            'status' => $request->get('status'),
            'payment_status' => $request->get('payment_status'),
            'min_amount' => $request->get('min_amount'),
            'max_amount' => $request->get('max_amount'),
            'salesperson_id' => $request->get('salesperson_id'),
            'search' => $request->get('search'),
        ];
    }

    /**
     * Build base query with filters
     */
    private function buildBaseQuery($companyId, $branchId, array $filters)
    {
        $query = Sale::with(['customer', 'creator', 'items.product'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', '!=', Sale::STATUS_DRAFT)
            ->where('status', '!=', Sale::STATUS_CANCELLED);

        // Apply filters
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }
        if (!empty($filters['min_amount'])) {
            $query->where('total_amount', '>=', $filters['min_amount']);
        }
        if (!empty($filters['max_amount'])) {
            $query->where('total_amount', '<=', $filters['max_amount']);
        }
        if (!empty($filters['salesperson_id'])) {
            $query->where('created_by', $filters['salesperson_id']);
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('full_name', 'like', "%{$search}%")
                            ->orWhere('user_code', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by product (requires joining items)
        if (!empty($filters['product_id'])) {
            $query->whereHas('items', function ($q) use ($filters) {
                $q->where('product_id', $filters['product_id']);
            });
        }

        return $query;
    }

    /**
     * Get summary statistics
     */
    private function getSummary($query): array
    {
        $summaryQuery = clone $query;
        
        return [
            'total_sales' => $summaryQuery->count(),
            'total_revenue' => $summaryQuery->sum('total_amount'),
            'total_paid' => $summaryQuery->sum('paid_amount'),
            'total_due' => $summaryQuery->sum('due_amount'),
            'average_order_value' => $summaryQuery->avg('total_amount') ?? 0,
            'total_items_sold' => $this->getTotalItemsSold($query),
            'unique_customers' => $summaryQuery->distinct('customer_id')->count('customer_id'),
        ];
    }

    /**
     * Get total items sold
     */
    private function getTotalItemsSold($query): int
    {
        $saleIds = $query->pluck('id');
        if ($saleIds->isEmpty()) {
            return 0;
        }
        return (int) SaleItem::whereIn('sale_id', $saleIds)->sum('quantity');
    }

    /**
     * Get chart data based on chart type
     */
    private function getChartData($query, string $chartType): array
    {
        $chartQuery = clone $query;
        
        switch ($chartType) {
            case 'daily':
                $groupBy = 'DATE(document_date)';
                $format = 'Y-m-d';
                break;
            case 'weekly':
                $groupBy = 'YEARWEEK(document_date, 1)';
                $format = 'Y-\WW';
                break;
            case 'monthly':
                $groupBy = 'DATE_FORMAT(document_date, "%Y-%m")';
                $format = 'Y-m';
                break;
            case 'yearly':
                $groupBy = 'YEAR(document_date)';
                $format = 'Y';
                break;
            default:
                $groupBy = 'DATE(document_date)';
                $format = 'Y-m-d';
        }

        $data = $chartQuery->selectRaw("{$groupBy} as period, 
            SUM(total_amount) as revenue, 
            COUNT(*) as count, 
            SUM(paid_amount) as paid,
            SUM(due_amount) as due")
            ->groupBy('period')
            ->orderBy('period', 'asc')
            ->get();

        // Format data for chart
        $formattedData = [
            'labels' => [],
            'revenue' => [],
            'count' => [],
            'paid' => [],
            'due' => [],
        ];

        foreach ($data as $item) {
            $period = $item->period;
            if ($chartType === 'weekly') {
                // Format week display
                $year = substr($period, 0, 4);
                $week = substr($period, 4);
                $period = "Week {$week}, {$year}";
            }
            $formattedData['labels'][] = $period;
            $formattedData['revenue'][] = round($item->revenue, 2);
            $formattedData['count'][] = (int) $item->count;
            $formattedData['paid'][] = round($item->paid, 2);
            $formattedData['due'][] = round($item->due, 2);
        }

        return $formattedData;
    }

    /**
     * Get top products
     */
    private function getTopProducts($companyId, $branchId, array $filters): array
    {
        $query = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.branch_id', $branchId)
            ->where('sales.status', '!=', Sale::STATUS_DRAFT)
            ->where('sales.status', '!=', Sale::STATUS_CANCELLED);

        // Apply date filters
        if (!empty($filters['from_date'])) {
            $query->whereDate('sales.document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('sales.document_date', '<=', $filters['to_date']);
        }

        return $query->select(
            'products.id',
            'products.name',
            DB::raw('SUM(sale_items.quantity) as total_quantity'),
            DB::raw('SUM(sale_items.total) as total_revenue'),
            DB::raw('COUNT(DISTINCT sales.id) as order_count')
        )
        ->groupBy('products.id', 'products.name')
        ->orderBy('total_revenue', 'desc')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'total_quantity' => (float) $item->total_quantity,
                'total_revenue' => round($item->total_revenue, 2),
                'order_count' => (int) $item->order_count,
                'average_price' => $item->total_quantity > 0 
                    ? round($item->total_revenue / $item->total_quantity, 2) 
                    : 0,
            ];
        })
        ->toArray();
    }

    /**
     * Get top customers
     */
    private function getTopCustomers($companyId, $branchId, array $filters): array
    {
        $query = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', '!=', Sale::STATUS_DRAFT)
            ->where('status', '!=', Sale::STATUS_CANCELLED);

        // Apply filters
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        return $query->select(
            'customer_id',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(total_amount) as total_spent'),
            DB::raw('SUM(paid_amount) as total_paid'),
            DB::raw('SUM(due_amount) as total_due'),
            DB::raw('AVG(total_amount) as average_order_value')
        )
        ->with('customer')
        ->whereNotNull('customer_id')
        ->groupBy('customer_id')
        ->orderBy('total_spent', 'desc')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'customer_id' => $item->customer_id,
                'customer_name' => $item->customer?->full_name ?? 'Unknown',
                'order_count' => (int) $item->order_count,
                'total_spent' => round($item->total_spent, 2),
                'total_paid' => round($item->total_paid, 2),
                'total_due' => round($item->total_due, 2),
                'average_order_value' => round($item->average_order_value, 2),
            ];
        })
        ->toArray();
    }

    /**
     * Get sales by status
     */
    private function getSalesByStatus($companyId, $branchId, array $filters): array
    {
        $query = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', '!=', Sale::STATUS_DRAFT);

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $statuses = ['confirmed', 'cancelled', 'returned'];
        $result = [];

        foreach ($statuses as $status) {
            $count = (clone $query)->where('status', $status)->count();
            $total = (clone $query)->where('status', $status)->sum('total_amount');
            $result[] = [
                'status' => $status,
                'count' => $count,
                'total' => round($total, 2),
            ];
        }

        return $result;
    }

    /**
     * Get payment status breakdown
     */
    private function getPaymentBreakdown($companyId, $branchId, array $filters): array
    {
        $query = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', '!=', Sale::STATUS_DRAFT)
            ->where('status', '!=', Sale::STATUS_CANCELLED);

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $statuses = ['paid', 'partial', 'unpaid'];
        $result = [];

        foreach ($statuses as $status) {
            $count = (clone $query)->where('payment_status', $status)->count();
            $total = (clone $query)->where('payment_status', $status)->sum('total_amount');
            $paid = (clone $query)->where('payment_status', $status)->sum('paid_amount');
            $due = (clone $query)->where('payment_status', $status)->sum('due_amount');
            
            $result[] = [
                'status' => $status,
                'count' => $count,
                'total' => round($total, 2),
                'paid' => round($paid, 2),
                'due' => round($due, 2),
            ];
        }

        return $result;
    }

    /**
     * Get paginated sales data
     */
    private function getSalesData($query, Request $request): array
    {
        $perPage = min((int) $request->get('per_page', 15), 100);
        $page = (int) $request->get('page', 1);

        $sales = $query->orderBy('document_date', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => $sales->items(),
            'pagination' => [
                'total' => $sales->total(),
                'per_page' => $sales->perPage(),
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
                'from' => $sales->firstItem(),
                'to' => $sales->lastItem(),
            ],
        ];
    }

    /**
     * GET /api/sales-report/filters
     * Get filter options for the report
     */
    public function filterOptions(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        // Customers
        $customers = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->select('id', 'full_name', 'user_code')
            ->orderBy('full_name')
            ->get();

        // Products
        $products = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Salespersons (users who created sales)
        $salespersons = User::whereHas('sales', function ($q) use ($companyId, $branchId) {
            $q->where('company_id', $companyId)
                ->where('branch_id', $branchId);
        })
        ->select('id', 'name')
        ->distinct()
        ->get();

        return response()->json([
            'customers' => $customers,
            'products' => $products,
            'salespersons' => $salespersons,
            'statuses' => [
                ['value' => 'confirmed', 'label' => 'Confirmed'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
                ['value' => 'returned', 'label' => 'Returned'],
            ],
            'payment_statuses' => [
                ['value' => 'paid', 'label' => 'Paid'],
                ['value' => 'partial', 'label' => 'Partial'],
                ['value' => 'unpaid', 'label' => 'Unpaid'],
            ],
            'chart_types' => [
                ['value' => 'daily', 'label' => 'Daily'],
                ['value' => 'weekly', 'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
                ['value' => 'yearly', 'label' => 'Yearly'],
            ],
        ]);
    }

    /**
     * GET /api/sales-report/export
     * Export sales report as CSV or Excel
     */
    public function export(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $filters = $this->buildFilters($request);

        $query = $this->buildBaseQuery($companyId, $branchId, $filters);
        $sales = $query->with(['customer', 'creator'])
            ->orderBy('document_date', 'desc')
            ->get();

        $exportData = $sales->map(function ($sale) {
            return [
                'Reference' => $sale->reference_no,
                'Date' => $sale->document_date->format('Y-m-d'),
                'Customer' => $sale->customer?->full_name ?? 'Walk-in',
                'Status' => ucfirst($sale->status),
                'Payment Status' => ucfirst($sale->payment_status),
                'Subtotal' => $sale->subtotal,
                'Discount' => $sale->discount_value,
                'Shipping' => $sale->shipping_cost,
                'Total' => $sale->total_amount,
                'Paid' => $sale->paid_amount,
                'Due' => $sale->due_amount,
                'Items' => $sale->items->count(),
                'Created By' => $sale->creator?->name ?? 'N/A',
            ];
        });

        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }
}