<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Resolve branch ID based on authenticated user
     */
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

    /**
     * Generate unique customer code if not provided
     */
    private function generateCustomerCode(int $branchId): string
    {
        $lastCustomer = Customer::where('branch_id', $branchId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastCustomer || !$lastCustomer->user_code) {
            $nextNumber = 1;
        } else {
            $lastNumber = (int) preg_replace('/[^0-9]/', '', $lastCustomer->user_code);
            $nextNumber = $lastNumber + 1;
        }

        return 'CUST-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }

    // ── Customers CRUD ─────────────────────────────────────────────────────

    /**
     * GET /api/customers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Customer::with(['branch', 'creator'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        // Filter by active status
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('user_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('district', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%");
            });
        }

        // Filter by status (lead/customer)
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by province
        if ($request->filled('province')) {
            $query->where('province', 'like', "%{$request->province}%");
        }

        // Filter by district
        if ($request->filled('district')) {
            $query->where('district', 'like', "%{$request->district}%");
        }

        // Sorting
        $sortField = $request->get('sort_by', 'first_name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['first_name', 'last_name', 'user_code', 'email', 'phone', 'province', 'district', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('first_name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $customers = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_customers' => $query->count(),
            'active_customers' => Customer::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->count(),
        ];

        return response()->json([
            'data'         => $customers->items(),
            'total'        => $customers->total(),
            'per_page'     => $customers->perPage(),
            'current_page' => $customers->currentPage(),
            'last_page'    => $customers->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/customers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'user_code'              => ['nullable', 'string', 'max:30', Rule::unique('customers')->where(fn($q) => $q->where('branch_id', $branchId))],
            'first_name'             => 'required|string|max:255',
            'last_name'              => 'nullable|string|max:255',
            'phone'                  => 'nullable|string|max:30',
            'email'                  => ['nullable', 'email', 'max:255', Rule::unique('customers')->where(fn($q) => $q->where('company_id', $companyId))],
            'street_address'         => 'nullable|string',
            'district'               => 'nullable|string|max:255',
            'province'               => 'nullable|string|max:255',
            'gps_lat'                => 'nullable|numeric|min:-90|max:90',
            'gps_lng'                => 'nullable|numeric|min:-180|max:180',
            'country'                => 'nullable|string|max:255',
            'note'                   => 'nullable|string',
            'is_active'              => 'nullable|boolean',
        ]);

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();
        $validated['status']     = $validated['status'] ?? 'customer';
        
        // Generate customer code if not provided
        if (empty($validated['user_code'])) {
            $validated['user_code'] = $this->generateCustomerCode($branchId);
        }
        
        // Set default active status
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $customer = DB::transaction(function () use ($validated) {
            $customer = Customer::create($validated);
            return $customer;
        });

        $customer->load(['branch', 'creator']);

        return response()->json([
            'data'    => $customer,
            'message' => 'Customer created successfully.',
        ], 201);
    }

    /**
     * GET /api/customers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $customer = Customer::where('branch_id', $branchId)
            ->with(['branch', 'creator', 'company'])
            ->findOrFail($id);

        return response()->json(['data' => $customer]);
    }

    /**
     * PUT /api/customers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $customer  = Customer::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'user_code'              => ['sometimes', 'string', 'max:30', Rule::unique('customers')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($customer->id)],
            'first_name'             => 'sometimes|string|max:255',
            'last_name'              => 'nullable|string|max:255',
            'phone'                  => 'nullable|string|max:30',
            'email'                  => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('customers')->where(fn($q) => $q->where('company_id', $companyId))->ignore($customer->id)],
            'street_address'         => 'nullable|string',
            'district'               => 'nullable|string|max:255',
            'province'               => 'nullable|string|max:255',
            'gps_lat'                => 'nullable|numeric|min:-90|max:90',
            'gps_lng'                => 'nullable|numeric|min:-180|max:180',
            'country'                => 'nullable|string|max:255',
            'note'                   => 'nullable|string',
            'is_active'              => 'nullable|boolean',
        ]);

        $customer->update($validated);

        $customer->load(['branch', 'creator']);

        return response()->json([
            'data'    => $customer,
            'message' => 'Customer updated successfully.',
        ]);
    }

    /**
     * DELETE /api/customers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $customer = Customer::where('branch_id', $branchId)->findOrFail($id);

        // Check if customer has any transactions/invoices
        // You may need to add invoice relationships to check this
        // if ($customer->invoices()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete customer with existing invoice records.'
        //     ], 422);
        // }

        return response()->json(['message' => 'Customer deleted successfully.']);
    }

    /**
     * POST /api/customers/{id}/toggle-status
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $customer = Customer::where('branch_id', $branchId)->findOrFail($id);
        
        $customer->is_active = !$customer->is_active;
        $customer->save();
        
        return response()->json([
            'data'    => $customer,
            'message' => $customer->is_active ? 'Customer activated.' : 'Customer deactivated.',
        ]);
    }

    /**
     * GET /api/customers/list
     * Get list of customers with basic info for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getCustomerList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true);
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('user_code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        
        $customers = $query->orderBy('first_name')
            ->limit(50)
            ->get(['id', 'first_name', 'last_name', 'user_code', 'phone', 'email', 'province', 'district']);
        
        return response()->json([
            'data' => $customers->map(fn($customer) => [
                'id' => $customer->id,
                'name' => $customer->full_name,
                'code' => $customer->user_code,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'location' => trim(($customer->district ? $customer->district . ', ' : '') . $customer->province),
            ])
        ]);
    }

    /**
     * GET /api/customers/export
     * Export customers to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $customers = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->orderBy('first_name')
            ->get();
        
        $exportData = $customers->map(fn($customer) => [
            'Customer Code' => $customer->user_code,
            'Name' => $customer->full_name,
            'Phone' => $customer->phone,
            'Email' => $customer->email,
            'Address' => $customer->street_address,
            'District' => $customer->district,
            'Province' => $customer->province,
            'Country' => $customer->country,
            'GPS Coordinates' => $customer->gps_lat && $customer->gps_lng ? "{$customer->gps_lat}, {$customer->gps_lng}" : '',
            'Status' => $customer->is_active ? 'Active' : 'Inactive',
            'Created At' => $customer->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/customers/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'customer_ids' => 'required|array',
            'customer_ids.*' => 'integer|exists:customers,id',
        ]);
        
        $customers = Customer::where('branch_id', $branchId)
            ->whereIn('id', $validated['customer_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($customers as $customer) {
            try {
                DB::transaction(function () use ($customer) {
                    $customer->delete();
                });
                $deleted++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return response()->json([
            'deleted' => $deleted,
            'errors' => $errors,
            'message' => "{$deleted} customer(s) deleted successfully.",
        ]);
    }

    /**
     * GET /api/customers/locations
     * Get customer locations grouped by province/district
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getLocations(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $provinces = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->whereNotNull('province')
            ->select('province')
            ->selectRaw('count(*) as customer_count')
            ->groupBy('province')
            ->orderBy('province')
            ->get();
        
        $districts = Customer::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->whereNotNull('district')
            ->select('province', 'district')
            ->selectRaw('count(*) as customer_count')
            ->groupBy('province', 'district')
            ->orderBy('province')
            ->orderBy('district')
            ->get();
        
        return response()->json([
            'provinces' => $provinces,
            'districts' => $districts,
        ]);
    }

    // ── Lead → Customer Conversion ───────────────────────────────────────────

    /**
     * POST /api/customers/{id}/convert-to-customer
     * 
     * Convert a lead to customer and create sale invoices for all pending orders.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function convertToCustomer(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $customer = Customer::where('branch_id', $branchId)->findOrFail($id);

        if ($customer->status !== 'lead') {
            return response()->json(['message' => 'This customer is already a customer, not a lead.'], 422);
        }

        try {
            DB::transaction(function () use ($customer, $companyId, $branchId) {
                // 1. Find all pending/confirmed orders for this customer
                $orders = Order::where('customer_id', $customer->id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->with('items.product')
                    ->get();

                $convertedCount = 0;

                foreach ($orders as $order) {
                    // Create Sale invoice for this order
                    $orderCompanyId = $order->company_id ?? $companyId;
                    $orderBranchId  = $order->branch_id ?? $branchId;

                    $sale = Sale::create([
                        'company_id'     => $orderCompanyId,
                        'branch_id'      => $orderBranchId,
                        'customer_id'    => $customer->id,
                        'created_by'     => Auth::id(),
                        'reference_no'   => Sale::generateReferenceNo($orderBranchId),
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
                                companyId: $orderCompanyId,
                                branchId: $orderBranchId,
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

                    // Update order status to delivered
                    $order->update(['status' => 'delivered']);
                    $convertedCount++;
                }

                // 2. Upgrade customer from lead to customer
                $customer->update(['status' => 'customer']);
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to convert lead to customer: ' . $e->getMessage(),
            ], 500);
        }

        $customer->refresh()->load(['branch', 'creator', 'company']);

        $orderCount = Order::where('customer_id', $customer->id)
            ->where('status', 'delivered')
            ->count();

        return response()->json([
            'data'    => $customer,
            'message' => "Lead converted to customer successfully. {$orderCount} order(s) converted to invoices.",
        ]);
    }

    // ── Journal Entry Helpers (Disabled for now - implement later) ─────────

    /**
     * Create journal entry for opening balance
     * For customers: Debit = Customer owes us, Credit = We owe customer
     */
    
    /**
     * Update opening balance journal entry
     */
    private function updateOpeningBalanceEntry(Customer $customer, float $oldBalance, ?int $oldAccountId): void
    {
        // TODO: Implement journal entry update
        return;
    }
    
    /**
     * Delete opening balance journal entry
     */
    private function deleteOpeningBalanceEntry(Customer $customer, ?float $balance = null, ?int $accountId = null): void
    {
        // TODO: Implement journal entry deletion
        return;
    }
}