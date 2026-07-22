<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PurchaseController extends Controller
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

        $query = Purchase::with(['supplier', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->filled('payment_status')) {
            $query->byPaymentStatus($request->payment_status);
        }
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        $query->orderBy('purchase_date', 'desc');
        $perPage = min((int) $request->get('per_page', 20), 100);
        $purchases = $query->paginate($perPage);

        return response()->json([
            'data'         => $purchases->items(),
            'total'        => $purchases->total(),
            'per_page'     => $purchases->perPage(),
            'current_page' => $purchases->currentPage(),
            'last_page'    => $purchases->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'supplier_id'        => 'nullable|exists:suppliers,id',
            'purchase_date'      => 'required|date',
            'due_date'           => 'nullable|date',
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

        $validated['company_id']   = $companyId;
        $validated['branch_id']    = $branchId;
        $validated['created_by']   = Auth::id();
        $validated['reference_no'] = Purchase::generateReferenceNo($branchId);
        $validated['payment_status'] = Purchase::PAYMENT_STATUS_UNPAID;

        $purchase = DB::transaction(function () use ($validated) {
            $items = $validated['items'];
            unset($validated['items']);

            $subtotal = 0;
            foreach ($items as &$item) {
                $item['total'] = round($item['quantity'] * $item['unit_price'] - ($item['discount'] ?? 0), 2);
                $subtotal += $item['total'];
            }
            unset($item);

            $discountAmount = ($validated['discount_type'] ?? 'fixed') === Purchase::DISCOUNT_TYPE_PERCENT
                ? round($subtotal * ($validated['discount_value'] ?? 0) / 100, 2)
                : ($validated['discount_value'] ?? 0);

            $validated['subtotal']     = $subtotal;
            $validated['total_amount'] = round($subtotal - $discountAmount + ($validated['shipping_cost'] ?? 0), 2);
            $validated['due_amount']   = $validated['total_amount'] - ($validated['paid_amount'] ?? 0);

            $purchase = Purchase::create($validated);

            foreach ($items as $item) {
                $purchase->items()->create($item);
            }

            return $purchase;
        });

        $purchase->load(['supplier', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $purchase,
            'message' => 'Purchase created successfully.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $purchase = Purchase::where('branch_id', $branchId)
            ->with(['supplier', 'items.product', 'items.unit', 'creator', 'returns'])
            ->findOrFail($id);

        return response()->json(['data' => $purchase]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $purchase = Purchase::where('branch_id', $branchId)->findOrFail($id);

        if (!$purchase->canBeEdited()) {
            return response()->json(['message' => 'Cannot edit a paid or received purchase.'], 422);
        }

        $validated = $request->validate([
            'supplier_id'        => 'nullable|exists:suppliers,id',
            'purchase_date'      => 'sometimes|date',
            'due_date'           => 'nullable|date',
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

        DB::transaction(function () use ($purchase, $validated, $request) {
            if (isset($validated['items'])) {
                $existingIds = collect($validated['items'])->pluck('id')->filter()->toArray();
                $purchase->items()->whereNotIn('id', $existingIds)->delete();

                foreach ($validated['items'] as $itemData) {
                    $itemData['total'] = round($itemData['quantity'] * $itemData['unit_price'] - ($itemData['discount'] ?? 0), 2);
                    if (!empty($itemData['id'])) {
                        $purchase->items()->where('id', $itemData['id'])->update($itemData);
                    } else {
                        $purchase->items()->create($itemData);
                    }
                }
                unset($validated['items']);
            }

            $purchase->update($validated);
            $purchase->recalculate();
        });

        $purchase->load(['supplier', 'items.product', 'items.unit', 'creator']);

        return response()->json([
            'data'    => $purchase,
            'message' => 'Purchase updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $purchase = Purchase::where('branch_id', $branchId)->findOrFail($id);

        if (!$purchase->canBeCancelled()) {
            return response()->json(['message' => 'Cannot cancel a paid purchase.'], 422);
        }

        DB::transaction(function () use ($purchase) {
            if ($purchase->items()->where('received_qty', '>', 0)->exists()) {
                StockService::reverse('Purchase', $purchase->id);
            }
            $purchase->delete();
        });

        return response()->json(['message' => 'Purchase deleted successfully.']);
    }

    public function receive(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $purchase  = Purchase::where('branch_id', $branchId)->with('items')->findOrFail($id);

        $validated = $request->validate([
            'items'              => 'required|array|min:1',
            'items.*.id'         => 'required|integer',
            'items.*.quantity'   => 'required|numeric|min:0.01',
        ]);

        DB::transaction(function () use ($purchase, $validated, $companyId, $branchId) {
            foreach ($validated['items'] as $itemData) {
                $item = $purchase->items()->where('id', $itemData['id'])->firstOrFail();

                $remaining = $item->quantity - $item->received_qty;
                if ($itemData['quantity'] > $remaining + 1e-4) {
                    throw new \RuntimeException("Cannot receive more than ordered for item #{$item->id}.");
                }

                $item->increment('received_qty', $itemData['quantity']);

                if ($item->product_id) {
                    StockService::record(
                        companyId: $companyId,
                        branchId: $branchId,
                        productId: $item->product_id,
                        movementType: 'in',
                        quantity: $itemData['quantity'],
                        unitCost: (float) $item->unit_price,
                        referenceType: 'Purchase',
                        referenceId: $purchase->id,
                        notes: "Received for {$purchase->reference_no}",
                        unitId: $item->unit_id,
                    );
                }
            }
        });

        $purchase->refresh()->load(['items.product', 'items.unit']);

        return response()->json([
            'data'    => $purchase,
            'message' => 'Items received successfully. Stock updated.',
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $purchase = Purchase::where('branch_id', $branchId)->findOrFail($id);

        DB::transaction(function () use ($purchase) {
            $hasReceived = $purchase->items()->where('received_qty', '>', 0)->exists();
            if ($hasReceived) {
                StockService::reverse('Purchase', $purchase->id);
            }
            $purchase->update(['payment_status' => Purchase::PAYMENT_STATUS_UNPAID]);
        });

        return response()->json([
            'data'    => $purchase,
            'message' => 'Purchase cancelled.',
        ]);
    }

    public function getPurchaseList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $purchases = Purchase::where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get(['id', 'reference_no', 'supplier_id', 'total_amount', 'payment_status']);

        return response()->json(['data' => $purchases]);
    }

    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $purchases = Purchase::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('supplier')
            ->orderBy('purchase_date', 'desc')
            ->get();

        $exportData = $purchases->map(fn($p) => [
            'Reference'   => $p->reference_no,
            'Date'        => $p->purchase_date->format('Y-m-d'),
            'Supplier'    => $p->supplier?->full_name ?? '—',
            'Total'       => $p->total_amount,
            'Paid'        => $p->paid_amount,
            'Due'         => $p->due_amount,
            'Status'      => ucfirst($p->payment_status),
        ]);

        return response()->json(['data' => $exportData, 'count' => $exportData->count()]);
    }
}
