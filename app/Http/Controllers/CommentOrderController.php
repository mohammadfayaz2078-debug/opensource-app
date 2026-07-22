<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CommentOrderController extends Controller
{
    // ── Comments ──────────────────────────────────────────────────────

    public function addComment(Request $request, int $productId): JsonResponse
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'message' => 'required|string|max:1000',
        ]);

        $product = Product::findOrFail($productId);
        $comments = $product->comments ?? [];
        $comments[] = [
            'name'      => $request->name,
            'message'   => $request->message,
            'created_at' => now()->toDateTimeString(),
        ];
        $product->update(['comments' => $comments]);

        return response()->json([
            'data'    => $product->comments,
            'message' => 'Comment added.',
        ], 201);
    }

    public function getComments(int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);

        return response()->json(['data' => $product->comments ?? []]);
    }

    public function deleteComment(Request $request, int $productId, int $commentIndex): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $comments = $product->comments ?? [];

        if (!isset($comments[$commentIndex])) {
            return response()->json(['message' => 'Comment not found.'], 404);
        }

        array_splice($comments, $commentIndex, 1);
        $product->update(['comments' => $comments]);

        return response()->json(['message' => 'Comment deleted.']);
    }

    // ── Likes ─────────────────────────────────────────────────────────

    public function toggleLike(Request $request, int $productId): JsonResponse
    {
        $request->validate(['session_id' => 'required|string']);

        $existing = DB::table('product_likes')
            ->where('product_id', $productId)
            ->where('session_id', $request->session_id)
            ->first();

        if ($existing) {
            DB::table('product_likes')->where('id', $existing->id)->delete();
            return response()->json(['liked' => false, 'count' => $this->getLikeCount($productId)]);
        }

        DB::table('product_likes')->insert([
            'product_id'  => $productId,
            'session_id'  => $request->session_id,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json(['liked' => true, 'count' => $this->getLikeCount($productId)]);
    }

    public function getLikes(int $productId): JsonResponse
    {
        return response()->json([
            'count' => $this->getLikeCount($productId),
        ]);
    }

    private function getLikeCount(int $productId): int
    {
        return DB::table('product_likes')->where('product_id', $productId)->count();
    }

    // ── Orders ────────────────────────────────────────────────────────

    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email|max:255']);

        $customer = Customer::where('email', $request->email)->first();

        return response()->json([
            'exists'   => $customer ? true : false,
            'customer' => $customer ? [
                'id'          => $customer->id,
                'first_name'  => $customer->first_name,
                'last_name'   => $customer->last_name,
                'phone'       => $customer->phone,
                'email'       => $customer->email,
                'address'     => $customer->street_address,
                'province'    => $customer->province,
            ] : null,
        ]);
    }

    public function createOrder(Request $request): JsonResponse
    {
        // Convert empty strings to null for optional fields
        $request->merge([
            'customer_phone'   => $request->input('customer_phone') ?: null,
            'customer_email'   => $request->input('customer_email') ?: null,
            'customer_address' => $request->input('customer_address') ?: null,
            'customer_last_name' => $request->input('customer_last_name') ?: null,
            'province'         => $request->input('province') ?: null,
            'gps_lat'          => $request->input('gps_lat') ?: null,
            'gps_lng'          => $request->input('gps_lng') ?: null,
            'notes'            => $request->input('notes') ?: null,
        ]);

        $validated = $request->validate([
            'customer_name'    => 'required|string|max:255',
            'customer_last_name' => 'nullable|string|max:255',
            'customer_phone'   => 'required|string|max:30',
            'customer_email'   => 'nullable|string|max:255',
            'customer_address' => 'nullable|string',
            'province'         => 'nullable|string|max:255',
            'gps_lat'          => 'nullable|numeric|min:-90|max:90',
            'gps_lng'          => 'nullable|numeric|min:-180|max:180',
            'notes'            => 'nullable|string',
            'items'            => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:1',
        ]);

        $order = DB::transaction(function () use ($validated, $request) {
            // Resolve company and branch — for guests, get from the first product
            $companyId = null;
            $branchId = null;
            if (AuthHelper::isCompanyAdmin()) {
                $companyId = $request->filled('company_id') ? (int) $request->company_id : Auth::user()->company_id;
                $branchId = $request->filled('branch_id') ? (int) $request->branch_id : null;
            } elseif (AuthHelper::isBranchUser()) {
                $branchId = AuthHelper::getBranchId();
                $branchId = $branchId ? (int) $branchId : null;
                $companyId = $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
            } elseif (!empty($validated['items'])) {
                // Guest order — get company/branch from the first product
                $firstProduct = Product::find($validated['items'][0]['product_id']);
                if ($firstProduct) {
                    $companyId = (int) $firstProduct->company_id;
                    $branchId = (int) $firstProduct->branch_id;
                }
            }

            // Find or create customer by email (no company_id dependency)
            $email = $validated['customer_email'] ?? null;
            $customer = null;

            if ($email) {
                $customer = Customer::where('email', $email)->first();

                if (!$customer) {
                    $customer = Customer::create([
                        'company_id'      => $companyId,
                        'branch_id'       => $branchId,
                        'first_name'      => $validated['customer_name'],
                        'last_name'       => $validated['customer_last_name'] ?? null,
                        'phone'           => $validated['customer_phone'] ?? null,
                        'email'           => $email,
                        'street_address'  => $validated['customer_address'] ?? null,
                        'province'        => $validated['province'] ?? null,
                        'gps_lat'         => $validated['gps_lat'] ?? null,
                        'gps_lng'         => $validated['gps_lng'] ?? null,
                        'status'          => 'lead',
                        'is_active'       => true,
                        'created_by'      => Auth::id(),
                    ]);
                }
            }

            $orderNo = Order::generateOrderNo();

            $totalAmount = 0;
            $itemsData = [];

            foreach ($validated['items'] as $itemData) {
                $product = Product::find($itemData['product_id']);
                $unitPrice = (float) $product->sale_price;
                $quantity = (int) $itemData['quantity'];
                $total = $unitPrice * $quantity;
                $totalAmount += $total;

                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity'   => $quantity,
                    'unit_price' => $unitPrice,
                    'total'      => $total,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            $order = Order::create([
                'order_no'         => $orderNo,
                'customer_id'      => $customer?->id,
                'company_id'       => $companyId,
                'branch_id'        => $branchId,
                'customer_name'    => $validated['customer_name'],
                'customer_last_name' => $validated['customer_last_name'] ?? null,
                'customer_phone'   => $validated['customer_phone'] ?? null,
                'customer_email'   => $validated['customer_email'] ?? null,
                'customer_address' => $validated['customer_address'] ?? null,
                'province'         => $validated['province'] ?? null,
                'total_amount'     => $totalAmount,
                'notes'            => $validated['notes'] ?? null,
                'created_by'       => Auth::id(),
            ]);

            foreach ($itemsData as $item) {
                $order->items()->create($item);
            }

            return $order;
        });

        $order->load('items.product', 'customer');

        return response()->json([
            'data'    => $order,
            'message' => 'Order placed successfully.',
        ], 201);
    }

    public function index(): JsonResponse
    {
        $orders = Order::with('items.product', 'customer')->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'data'         => $orders->items(),
            'total'        => $orders->total(),
            'current_page' => $orders->currentPage(),
            'last_page'    => $orders->lastPage(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $order = Order::with('items.product', 'customer')->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate(['status' => 'required|in:pending,confirmed,delivered,cancelled']);

        $order = Order::with('items.product', 'customer')->findOrFail($id);
        $newStatus = $request->status;

        DB::transaction(function () use ($order, $newStatus) {
            // When delivered: create Sale invoice and upgrade customer
            if ($newStatus === 'delivered' && $order->status !== 'delivered') {
                $this->createSaleFromOrder($order);
            }

            $order->update(['status' => $newStatus]);
        });

        $order->refresh()->load('items.product', 'customer');

        return response()->json([
            'data'    => $order,
            'message' => 'Order status updated.',
        ]);
    }

    private function createSaleFromOrder(Order $order): void
    {
        // Fallback for old orders (placed before product-based company/branch resolution)
        $companyId = $order->company_id ?? AuthHelper::getCompanyId();
        $branchId = $order->branch_id ?? AuthHelper::getBranchId();

        // Find the customer linked to the order (created at order time as 'lead')
        $customer = $order->customer_id ? Customer::find($order->customer_id) : null;

        // Upgrade customer status from lead to customer
        if ($customer && $customer->status === 'lead') {
            $customer->update(['status' => 'customer']);
        }

        // Create Sale (invoice)
        $sale = Sale::create([
            'company_id'     => $companyId,
            'branch_id'      => $branchId,
            'customer_id'    => $customer?->id,
            'created_by'     => Auth::id(),
            'reference_no'   => Sale::generateReferenceNo($branchId),
            'document_date'  => now()->toDateString(),
            'subtotal'       => $order->total_amount,
            'total_amount'   => $order->total_amount,
            'paid_amount'    => 0,
            'due_amount'     => $order->total_amount,
            'status'         => Sale::STATUS_CONFIRMED,
            'payment_status' => Sale::PAYMENT_STATUS_UNPAID,
            'notes'          => "Created from Order #{$order->order_no}",
        ]);

        // Create sale items and record stock
        foreach ($order->items as $orderItem) {
            $saleItem = $sale->items()->create([
                'product_id' => $orderItem->product_id,
                'quantity'   => $orderItem->quantity,
                'unit_price' => $orderItem->unit_price,
                'total'      => $orderItem->total,
            ]);

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
                    notes: "Sale {$sale->reference_no} from Order #{$order->order_no}",
                );
            }
        }
    }
}
