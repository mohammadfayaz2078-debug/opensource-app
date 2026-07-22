<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
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
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Sale::with(['customer', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        $query->orderBy('document_date', 'desc');
        $perPage = min((int) $request->get('per_page', 20), 100);
        $sales = $query->paginate($perPage);

        return response()->json([
            'data'         => $sales->items(),
            'total'        => $sales->total(),
            'per_page'     => $sales->perPage(),
            'current_page' => $sales->currentPage(),
            'last_page'    => $sales->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'customer_id'        => 'nullable|exists:customers,id',
            'account_id'         => 'required|exists:accounts,id',
            'document_date'      => 'required|date',
            'discount_type'      => 'nullable|in:percent,fixed',
            'discount_value'     => 'nullable|numeric|min:0',
            'shipping_cost'      => 'nullable|numeric|min:0',
            'paid_amount'        => 'nullable|numeric|min:0',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.unit_id'    => 'nullable|exists:units,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount'   => 'nullable|numeric|min:0',
            'items.*.notes'      => 'nullable|string',
        ]);

        $validated['company_id']    = $companyId;
        $validated['branch_id']     = $branchId;
        $validated['created_by']    = Auth::id();
        $validated['reference_no']  = Sale::generateReferenceNo($branchId);
        $validated['status']        = Sale::STATUS_CONFIRMED;
        $validated['payment_status']= Sale::PAYMENT_STATUS_UNPAID;

        $sale = DB::transaction(function () use ($validated, $companyId, $branchId) {
            $items = $validated['items'];
            unset($validated['items']);

            $subtotal = 0;
            foreach ($items as &$item) {
                $item['total'] = round($item['quantity'] * $item['unit_price'] - ($item['discount'] ?? 0), 2);
                $subtotal += $item['total'];
            }
            unset($item);

            $discountAmount = ($validated['discount_type'] ?? 'fixed') === Sale::DISCOUNT_TYPE_PERCENT
                ? round($subtotal * ($validated['discount_value'] ?? 0) / 100, 2)
                : ($validated['discount_value'] ?? 0);

            $validated['subtotal']     = $subtotal;
            $validated['total_amount'] = round($subtotal - $discountAmount + ($validated['shipping_cost'] ?? 0), 2);
            $validated['due_amount']   = $validated['total_amount'] - ($validated['paid_amount'] ?? 0);

            $sale = Sale::create($validated);

            foreach ($items as $item) {
                $saleItem = $sale->items()->create($item);

                if ($saleItem->product_id) {
                    StockService::record(
                        companyId: $companyId,
                        branchId: $branchId,
                        productId: $saleItem->product_id,
                        movementType: 'out',
                        quantity: (float) $saleItem->quantity,
                        unitCost: (float) $saleItem->unit_price,
                        referenceType: 'Sale',
                        referenceId: $sale->id,
                        notes: "Sale {$sale->reference_no}",
                        unitId: $saleItem->unit_id,
                    );
                }
            }

            return $sale;
        });

        $sale->load(['customer', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $sale,
            'message' => 'Invoice created successfully.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sale = Sale::where('branch_id', $branchId)
            ->with(['customer', 'account', 'items.product', 'items.unit', 'creator', 'returns'])
            ->findOrFail($id);

        return response()->json(['data' => $sale]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sale = Sale::where('branch_id', $branchId)->findOrFail($id);

        if (!$sale->canBeEdited()) {
            return response()->json(['message' => 'Cannot edit a cancelled invoice.'], 422);
        }

        $validated = $request->validate([
            'customer_id'        => 'nullable|exists:customers,id',
            'document_date'      => 'sometimes|date',
            'discount_type'      => 'nullable|in:percent,fixed',
            'discount_value'     => 'nullable|numeric|min:0',
            'shipping_cost'      => 'nullable|numeric|min:0',
            'paid_amount'        => 'nullable|numeric|min:0',
            'notes'              => 'nullable|string',
            'items'              => 'sometimes|array|min:1',
            'items.*.id'         => 'nullable|integer',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.unit_id'    => 'nullable|exists:units,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount'   => 'nullable|numeric|min:0',
            'items.*.notes'      => 'nullable|string',
        ]);

        DB::transaction(function () use ($sale, $validated) {
            if (isset($validated['items'])) {
                $existingIds = collect($validated['items'])->pluck('id')->filter()->toArray();
                $sale->items()->whereNotIn('id', $existingIds)->delete();

                foreach ($validated['items'] as $itemData) {
                    $itemData['total'] = round($itemData['quantity'] * $itemData['unit_price'] - ($itemData['discount'] ?? 0), 2);
                    if (!empty($itemData['id'])) {
                        $sale->items()->where('id', $itemData['id'])->update($itemData);
                    } else {
                        $sale->items()->create($itemData);
                    }
                }
                unset($validated['items']);
            }

            $sale->update($validated);
            $sale->recalculate();
        });

        $sale->load(['customer', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $sale,
            'message' => 'Invoice updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sale = Sale::where('branch_id', $branchId)->findOrFail($id);

        if ($sale->status === Sale::STATUS_CONFIRMED) {
            StockService::reverse('Sale', $sale->id);
        }

        $sale->delete();

        return response()->json(['message' => 'Invoice deleted successfully.']);
    }

    public function pay(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sale = Sale::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        $newPaid = (float) $sale->paid_amount + (float) $validated['amount'];
        $totalAmount = (float) $sale->total_amount;
        $dueAmount = max(0, $totalAmount - $newPaid);

        $paymentStatus = match (true) {
            $dueAmount <= 0   => Sale::PAYMENT_STATUS_PAID,
            $newPaid > 0      => Sale::PAYMENT_STATUS_PARTIAL,
            default           => Sale::PAYMENT_STATUS_UNPAID,
        };

        $sale->update([
            'paid_amount'    => $newPaid,
            'due_amount'     => $dueAmount,
            'payment_status' => $paymentStatus,
        ]);

        // Update account balance - money comes in for sales
        if ($sale->account_id) {
            $account = Account::find($sale->account_id);
            if ($account) {
                $account->increment('balance', (float) $validated['amount']);
            }
        }

        $sale->load(['customer', 'account', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $sale,
            'message' => 'Payment recorded successfully.',
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sale = Sale::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($sale) {
            StockService::reverse('Sale', $sale->id);
            $sale->update(['status' => Sale::STATUS_CANCELLED]);
        });

        return response()->json([
            'data'    => $sale,
            'message' => 'Invoice cancelled.',
        ]);
    }

    public function getSaleList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $sales = Sale::where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get(['id', 'reference_no', 'customer_id', 'total_amount', 'payment_status', 'status']);

        return response()->json(['data' => $sales]);
    }

    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $sales = Sale::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('customer')
            ->orderBy('document_date', 'desc')
            ->get();

        $exportData = $sales->map(fn($s) => [
            'Reference'  => $s->reference_no,
            'Date'       => $s->document_date->format('Y-m-d'),
            'Customer'   => $s->customer?->full_name ?? '—',
            'Total'      => $s->total_amount,
            'Paid'       => $s->paid_amount,
            'Due'        => $s->due_amount,
            'Status'     => ucfirst($s->status),
            'Payment'    => ucfirst($s->payment_status),
        ]);

        return response()->json(['data' => $exportData, 'count' => $exportData->count()]);
    }
}
