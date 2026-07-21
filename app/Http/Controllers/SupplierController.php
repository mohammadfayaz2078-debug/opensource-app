<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Resolve branch ID based on authenticated user
     */
    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        
        return AuthHelper::getBranchId();
    }

    /**
     * Resolve company ID based on authenticated user
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin || AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    /**
     * Generate unique supplier code if not provided
     */
    private function generateSupplierCode(int $branchId): string
    {
        $lastSupplier = Supplier::where('branch_id', $branchId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastSupplier || !$lastSupplier->supplier_code) {
            $nextNumber = 1;
        } else {
            $lastNumber = (int) preg_replace('/[^0-9]/', '', $lastSupplier->supplier_code);
            $nextNumber = $lastNumber + 1;
        }

        return 'SUP-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }

    // ── Suppliers CRUD ─────────────────────────────────────────────────────

    /**
     * GET /api/suppliers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Supplier::with(['branch', 'payableAccount', 'creator'])
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
                    ->orWhere('supplier_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%");
            });
        }

        // Filter by payable account
        if ($request->filled('payable_account_id')) {
            $query->where('payable_account_id', $request->payable_account_id);
        }

        // Filter by city
        if ($request->filled('city')) {
            $query->where('city', 'like', "%{$request->city}%");
        }

        // Filter by country
        if ($request->filled('country')) {
            $query->where('country', $request->country);
        }

        // Sorting
        $sortField = $request->get('sort_by', 'first_name');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSorts = ['first_name', 'last_name', 'supplier_code', 'email', 'phone', 'city', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('first_name', 'asc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $suppliers = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_suppliers' => $query->count(),
            'active_suppliers' => Supplier::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->count(),
            'total_opening_balance' => Supplier::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->sum('opening_balance'),
        ];

        return response()->json([
            'data'         => $suppliers->items(),
            'total'        => $suppliers->total(),
            'per_page'     => $suppliers->perPage(),
            'current_page' => $suppliers->currentPage(),
            'last_page'    => $suppliers->lastPage(),
            'summary'      => $summary,
        ]);
    }

    /**
     * POST /api/suppliers
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'supplier_code'          => ['nullable', 'string', 'max:30', Rule::unique('suppliers')->where(fn($q) => $q->where('branch_id', $branchId))],
            'first_name'             => 'required|string|max:255',
            'last_name'              => 'nullable|string|max:255',
            'contact_person'         => 'nullable|string|max:255',
            'phone'                  => 'nullable|string|max:30',
            'email'                  => ['nullable', 'email', 'max:255', Rule::unique('suppliers')->where(fn($q) => $q->where('company_id', $companyId))],
            'address'                => 'nullable|string',
            'city'                   => 'nullable|string|max:255',
            'country'                => 'nullable|string|max:255',
            'payable_account_id'     => 'nullable|exists:chart_of_accounts,id',
            'opening_balance'        => 'nullable|numeric|min:0|max:999999999999.99',
            'opening_balance_type'   => 'nullable|in:debit,credit',
            'note'                   => 'nullable|string',
            'is_active'              => 'nullable|boolean',
        ]);

        // Set defaults
        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();
        
        // Generate supplier code if not provided
        if (empty($validated['supplier_code'])) {
            $validated['supplier_code'] = $this->generateSupplierCode($branchId);
        }
        
        // Set default opening balance type if opening balance is provided
        if (($validated['opening_balance'] ?? 0) > 0 && empty($validated['opening_balance_type'])) {
            $validated['opening_balance_type'] = 'credit';
        }
        
        // Set default active status
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $supplier = DB::transaction(function () use ($validated) {
            $supplier = Supplier::create($validated);
            
            // Create journal entry for opening balance if exists
            if (($supplier->opening_balance ?? 0) > 0 && $supplier->payable_account_id) {
                $this->createOpeningBalanceEntry($supplier);
            }
            
            return $supplier;
        });

        $supplier->load(['branch', 'payableAccount', 'creator']);

        return response()->json([
            'data'    => $supplier,
            'message' => 'Supplier created successfully.',
        ], 201);
    }

    /**
     * GET /api/suppliers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $supplier = Supplier::where('branch_id', $branchId)
            ->with(['branch', 'payableAccount', 'creator', 'company'])
            ->findOrFail($id);

        return response()->json(['data' => $supplier]);
    }

    /**
     * PUT /api/suppliers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $supplier  = Supplier::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'supplier_code'          => ['sometimes', 'string', 'max:30', Rule::unique('suppliers')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($supplier->id)],
            'first_name'             => 'sometimes|string|max:255',
            'last_name'              => 'nullable|string|max:255',
            'contact_person'         => 'nullable|string|max:255',
            'phone'                  => 'nullable|string|max:30',
            'email'                  => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('suppliers')->where(fn($q) => $q->where('company_id', $companyId))->ignore($supplier->id)],
            'address'                => 'nullable|string',
            'city'                   => 'nullable|string|max:255',
            'country'                => 'nullable|string|max:255',
            'payable_account_id'     => 'nullable|exists:chart_of_accounts,id',
            'opening_balance'        => 'nullable|numeric|min:0|max:999999999999.99',
            'opening_balance_type'   => 'nullable|in:debit,credit',
            'note'                   => 'nullable|string',
            'is_active'              => 'nullable|boolean',
        ]);

        $oldPayableAccountId = $supplier->payable_account_id;
        $oldOpeningBalance = $supplier->opening_balance;
        
        $supplier->update($validated);
        
        // Handle opening balance changes
        if (($supplier->opening_balance != $oldOpeningBalance) || 
            ($supplier->payable_account_id != $oldPayableAccountId)) {
            DB::transaction(function () use ($supplier, $oldOpeningBalance, $oldPayableAccountId) {
                $this->updateOpeningBalanceEntry($supplier, $oldOpeningBalance, $oldPayableAccountId);
            });
        }

        $supplier->load(['branch', 'payableAccount', 'creator']);

        return response()->json([
            'data'    => $supplier,
            'message' => 'Supplier updated successfully.',
        ]);
    }

    /**
     * DELETE /api/suppliers/{id}
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $supplier = Supplier::where('branch_id', $branchId)->findOrFail($id);

        // Check if supplier has any transactions/purchases
        // You may need to add purchase relationships to check this
        // if ($supplier->purchases()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete supplier with existing purchase records.'
        //     ], 422);
        // }

        DB::transaction(function () use ($supplier) {
            // Remove opening balance journal entry if exists
            if (($supplier->opening_balance ?? 0) > 0 && $supplier->payable_account_id) {
                $this->deleteOpeningBalanceEntry($supplier);
            }
            
            $supplier->delete();
        });

        return response()->json(['message' => 'Supplier deleted successfully.']);
    }

    /**
     * POST /api/suppliers/{id}/toggle-status
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $supplier = Supplier::where('branch_id', $branchId)->findOrFail($id);
        
        $supplier->is_active = !$supplier->is_active;
        $supplier->save();
        
        return response()->json([
            'data'    => $supplier,
            'message' => $supplier->is_active ? 'Supplier activated.' : 'Supplier deactivated.',
        ]);
    }

    /**
     * GET /api/suppliers/accounts
     * Get list of suppliers with basic info for dropdowns
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getSupplierList(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $query = Supplier::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('is_active', true);
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('supplier_code', 'like', "%{$search}%");
            });
        }
        
        $suppliers = $query->orderBy('first_name')
            ->limit(50)
            ->get(['id', 'first_name', 'last_name', 'supplier_code', 'phone', 'email']);
        
        return response()->json([
            'data' => $suppliers->map(fn($supplier) => [
                'id' => $supplier->id,
                'name' => $supplier->full_name,
                'code' => $supplier->supplier_code,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
            ])
        ]);
    }

    /**
     * GET /api/suppliers/export
     * Export suppliers to CSV/Excel
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        
        $suppliers = Supplier::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->with('payableAccount')
            ->orderBy('first_name')
            ->get();
        
        $exportData = $suppliers->map(fn($supplier) => [
            'Supplier Code' => $supplier->supplier_code,
            'Name' => $supplier->full_name,
            'Contact Person' => $supplier->contact_person,
            'Phone' => $supplier->phone,
            'Email' => $supplier->email,
            'Address' => $supplier->address,
            'City' => $supplier->city,
            'Country' => $supplier->country,
            'Opening Balance' => $supplier->opening_balance,
            'Opening Balance Type' => ucfirst($supplier->opening_balance_type),
            'Payable Account' => $supplier->payableAccount?->account_name,
            'Status' => $supplier->is_active ? 'Active' : 'Inactive',
            'Created At' => $supplier->created_at->format('Y-m-d H:i:s'),
        ]);
        
        return response()->json([
            'data' => $exportData,
            'count' => $exportData->count(),
        ]);
    }

    /**
     * POST /api/suppliers/bulk-delete
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        
        $validated = $request->validate([
            'supplier_ids' => 'required|array',
            'supplier_ids.*' => 'integer|exists:suppliers,id',
        ]);
        
        $suppliers = Supplier::where('branch_id', $branchId)
            ->whereIn('id', $validated['supplier_ids'])
            ->get();
        
        $deleted = 0;
        $errors = [];
        
        foreach ($suppliers as $supplier) {
            try {
                DB::transaction(function () use ($supplier) {
                    if (($supplier->opening_balance ?? 0) > 0 && $supplier->payable_account_id) {
                        $this->deleteOpeningBalanceEntry($supplier);
                    }
                    $supplier->delete();
                });
                $deleted++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $supplier->id,
                    'name' => $supplier->full_name,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return response()->json([
            'deleted' => $deleted,
            'errors' => $errors,
            'message' => "{$deleted} supplier(s) deleted successfully.",
        ]);
    }
}