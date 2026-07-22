<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseReportController extends Controller
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
     * GET /api/purchase-report
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

        // Get top suppliers
        $topSuppliers = $this->getTopSuppliers($companyId, $branchId, $filters);

        // Get purchases by status
        $purchasesByStatus = $this->getPurchasesByStatus($companyId, $branchId, $filters);

        // Get payment status breakdown
        $paymentBreakdown = $this->getPaymentBreakdown($companyId, $branchId, $filters);

        // Get refund status breakdown
        $refundBreakdown = $this->getRefundBreakdown($companyId, $branchId, $filters);

        // Get purchases data for table
        $purchases = $this->getPurchasesData($query, $request);

        return response()->json([
            'summary' => $summary,
            'chart_data' => $chartData,
            'top_products' => $topProducts,
            'top_suppliers' => $topSuppliers,
            'purchases_by_status' => $purchasesByStatus,
            'payment_breakdown' => $paymentBreakdown,
            'refund_breakdown' => $refundBreakdown,
            'purchases' => $purchases['data'],
            'pagination' => $purchases['pagination'],
            'filters_applied' => $filters,
        ]);
    }

    private function buildFilters(Request $request): array
    {
        return [
            'from_date' => $request->get('from_date'),
            'to_date' => $request->get('to_date'),
            'supplier_id' => $request->get('supplier_id'),
            'product_id' => $request->get('product_id'),
            'payment_status' => $request->get('payment_status'),
            'refund_status' => $request->get('refund_status'),
            'min_amount' => $request->get('min_amount'),
            'max_amount' => $request->get('max_amount'),
            'search' => $request->get('search'),
        ];
    }

    private function buildBaseQuery($companyId, $branchId, array $filters)
    {
        $query = Purchase::with(['supplier', 'creator', 'items.product'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchase_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }
        if (!empty($filters['refund_status'])) {
            $query->where('refund_status', $filters['refund_status']);
        }
        if (!empty($filters['min_amount'])) {
            $query->where('total_amount', '>=', $filters['min_amount']);
        }
        if (!empty($filters['max_amount'])) {
            $query->where('total_amount', '<=', $filters['max_amount']);
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($sq) use ($search) {
                        $sq->where('full_name', 'like', "%{$search}%")
                            ->orWhere('supplier_code', 'like', "%{$search}%");
                    });
            });
        }

        if (!empty($filters['product_id'])) {
            $query->whereHas('items', function ($q) use ($filters) {
                $q->where('product_id', $filters['product_id']);
            });
        }

        return $query;
    }

    private function getSummary($query): array
    {
        $summaryQuery = clone $query;
        
        return [
            'total_purchases' => $summaryQuery->count(),
            'total_spent' => $summaryQuery->sum('total_amount'),
            'total_paid' => $summaryQuery->sum('paid_amount'),
            'total_due' => $summaryQuery->sum('due_amount'),
            'average_order_value' => $summaryQuery->avg('total_amount') ?? 0,
            'total_items_purchased' => $this->getTotalItemsPurchased($query),
            'unique_suppliers' => $summaryQuery->distinct('supplier_id')->count('supplier_id'),
        ];
    }

    private function getTotalItemsPurchased($query): int
    {
        $purchaseIds = $query->pluck('id');
        if ($purchaseIds->isEmpty()) {
            return 0;
        }
        return (int) PurchaseItem::whereIn('purchase_id', $purchaseIds)->sum('quantity');
    }

    private function getChartData($query, string $chartType): array
    {
        $chartQuery = clone $query;
        
        switch ($chartType) {
            case 'daily':
                $groupBy = 'DATE(purchase_date)';
                break;
            case 'weekly':
                $groupBy = 'YEARWEEK(purchase_date, 1)';
                break;
            case 'monthly':
                $groupBy = 'DATE_FORMAT(purchase_date, "%Y-%m")';
                break;
            case 'yearly':
                $groupBy = 'YEAR(purchase_date)';
                break;
            default:
                $groupBy = 'DATE(purchase_date)';
        }

        $data = $chartQuery->selectRaw("{$groupBy} as period, 
            SUM(total_amount) as total,
            COUNT(*) as count, 
            SUM(paid_amount) as paid,
            SUM(due_amount) as due")
            ->groupBy('period')
            ->orderBy('period', 'asc')
            ->get();

        $formattedData = [
            'labels' => [],
            'total' => [],
            'count' => [],
            'paid' => [],
            'due' => [],
        ];

        foreach ($data as $item) {
            $period = $item->period;
            if ($chartType === 'weekly') {
                $year = substr($period, 0, 4);
                $week = substr($period, 4);
                $period = "Week {$week}, {$year}";
            }
            $formattedData['labels'][] = $period;
            $formattedData['total'][] = round($item->total, 2);
            $formattedData['count'][] = (int) $item->count;
            $formattedData['paid'][] = round($item->paid, 2);
            $formattedData['due'][] = round($item->due, 2);
        }

        return $formattedData;
    }

    private function getTopProducts($companyId, $branchId, array $filters): array
    {
        $query = PurchaseItem::join('purchases', 'purchase_items.purchase_id', '=', 'purchases.id')
            ->join('products', 'purchase_items.product_id', '=', 'products.id')
            ->where('purchases.company_id', $companyId)
            ->where('purchases.branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchases.purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchases.purchase_date', '<=', $filters['to_date']);
        }

        return $query->select(
            'products.id',
            'products.name',
            DB::raw('SUM(purchase_items.quantity) as total_quantity'),
            DB::raw('SUM(purchase_items.total) as total_spent'),
            DB::raw('COUNT(DISTINCT purchases.id) as order_count')
        )
        ->groupBy('products.id', 'products.name')
        ->orderBy('total_spent', 'desc')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'total_quantity' => (float) $item->total_quantity,
                'total_spent' => round($item->total_spent, 2),
                'order_count' => (int) $item->order_count,
                'average_price' => $item->total_quantity > 0 
                    ? round($item->total_spent / $item->total_quantity, 2) 
                    : 0,
            ];
        })
        ->toArray();
    }

    private function getTopSuppliers($companyId, $branchId, array $filters): array
    {
        $query = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchase_date', '<=', $filters['to_date']);
        }

        return $query->select(
            'supplier_id',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(total_amount) as total_spent'),
            DB::raw('SUM(paid_amount) as total_paid'),
            DB::raw('SUM(due_amount) as total_due'),
            DB::raw('AVG(total_amount) as average_order_value')
        )
        ->with('supplier')
        ->whereNotNull('supplier_id')
        ->groupBy('supplier_id')
        ->orderBy('total_spent', 'desc')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'supplier_id' => $item->supplier_id,
                'supplier_name' => $item->supplier?->full_name ?? 'Unknown',
                'order_count' => (int) $item->order_count,
                'total_spent' => round($item->total_spent, 2),
                'total_paid' => round($item->total_paid, 2),
                'total_due' => round($item->total_due, 2),
                'average_order_value' => round($item->average_order_value, 2),
            ];
        })
        ->toArray();
    }

    private function getPurchasesByStatus($companyId, $branchId, array $filters): array
    {
        $query = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchase_date', '<=', $filters['to_date']);
        }

        $statuses = ['unpaid', 'partial', 'paid'];
        $result = [];

        foreach ($statuses as $status) {
            $count = (clone $query)->where('payment_status', $status)->count();
            $total = (clone $query)->where('payment_status', $status)->sum('total_amount');
            $result[] = [
                'status' => $status,
                'count' => $count,
                'total' => round($total, 2),
            ];
        }

        return $result;
    }

    private function getPaymentBreakdown($companyId, $branchId, array $filters): array
    {
        $query = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchase_date', '<=', $filters['to_date']);
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

    private function getRefundBreakdown($companyId, $branchId, array $filters): array
    {
        $query = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if (!empty($filters['from_date'])) {
            $query->whereDate('purchase_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('purchase_date', '<=', $filters['to_date']);
        }

        $statuses = ['none', 'partial', 'full'];
        $result = [];

        foreach ($statuses as $status) {
            $count = (clone $query)->where('refund_status', $status)->count();
            $total = (clone $query)->where('refund_status', $status)->sum('total_amount');
            $result[] = [
                'status' => $status,
                'count' => $count,
                'total' => round($total, 2),
            ];
        }

        return $result;
    }

    private function getPurchasesData($query, Request $request): array
    {
        $perPage = min((int) $request->get('per_page', 15), 100);
        $page = (int) $request->get('page', 1);

        $purchases = $query->orderBy('purchase_date', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => $purchases->items(),
            'pagination' => [
                'total' => $purchases->total(),
                'per_page' => $purchases->perPage(),
                'current_page' => $purchases->currentPage(),
                'last_page' => $purchases->lastPage(),
                'from' => $purchases->firstItem(),
                'to' => $purchases->lastItem(),
            ],
        ];
    }

    public function filterOptions(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $suppliers = Supplier::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->select('id', 'first_name', 'last_name')
            ->orderBy('first_name')
            ->get()
            ->map(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'name' => $supplier->full_name,
                ];
            });

        $products = Product::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return response()->json([
            'suppliers' => $suppliers,
            'products' => $products,
            'payment_statuses' => [
                ['value' => 'paid', 'label' => 'Paid'],
                ['value' => 'partial', 'label' => 'Partial'],
                ['value' => 'unpaid', 'label' => 'Unpaid'],
            ],
            'refund_statuses' => [
                ['value' => 'none', 'label' => 'None'],
                ['value' => 'partial', 'label' => 'Partial'],
                ['value' => 'full', 'label' => 'Full'],
            ],
            'chart_types' => [
                ['value' => 'daily', 'label' => 'Daily'],
                ['value' => 'weekly', 'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
                ['value' => 'yearly', 'label' => 'Yearly'],
            ],
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $filters = $this->buildFilters($request);

        $query = $this->buildBaseQuery($companyId, $branchId, $filters);
        $purchases = $query->with(['supplier', 'creator'])
            ->orderBy('purchase_date', 'desc')
            ->get();

        $exportData = $purchases->map(function ($purchase) {
            return [
                'Reference' => $purchase->reference_no,
                'Date' => $purchase->purchase_date->format('Y-m-d'),
                'Supplier' => $purchase->supplier?->full_name ?? 'N/A',
                'Payment Status' => ucfirst($purchase->payment_status),
                'Refund Status' => ucfirst($purchase->refund_status),
                'Subtotal' => $purchase->subtotal,
                'Discount' => $purchase->discount_value,
                'Shipping' => $purchase->shipping_cost,
                'Total' => $purchase->total_amount,
                'Paid' => $purchase->paid_amount,
                'Due' => $purchase->due_amount,
                'Items' => $purchase->items->count(),
                'Created By' => $purchase->creator?->name ?? 'N/A',
            ];
        });

        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }
}