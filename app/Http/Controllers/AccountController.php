<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
<<<<<<< HEAD
use App\Helpers\AuthHelper;
=======
use App\Models\AccountTransaction;
use Illuminate\Http\JsonResponse;
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;


class AccountController extends Controller
{
<<<<<<< HEAD
    /**
     * Resolve company ID based on authenticated user
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();
        
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        
        if (AuthHelper::isCompanyAdmin()) {
            return AuthHelper::getCompanyId();
        }
        
        return AuthHelper::getCompanyId();
    }

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
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        if (!$companyId) {
            return response()->json([]);
        }

        $query = Account::forCompany($companyId)
            ->forBranch($branchId)
            ->latest();

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $accounts = $query->get();

        return response()->json($accounts);
    }

    /**
     * Store a newly created account.
     */
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('accounts', 'name')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $account = Account::create([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);
=======
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

        $query = Account::where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $accounts = $query->orderBy('name')->get();

        return response()->json(['data' => $accounts]);
    }

    public function listOptions(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $accounts = Account::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'balance']);

        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'nullable|in:cash,bank,other',
            'description' => 'nullable|string',
            'balance'     => 'nullable|numeric|min:0',
            'is_active'   => 'nullable|boolean',
        ]);

        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['balance']    = $validated['balance'] ?? 0;
        $validated['is_active']  = $validated['is_active'] ?? true;

        $account = Account::create($validated);
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e

        return response()->json([
            'data'    => $account,
            'message' => 'Account created successfully.',
        ], 201);
    }

<<<<<<< HEAD
    /**
     * Display the specified account.
     */
    public function show(Request $request, Account $account): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        // Ensure account belongs to the company/branch
        if ($account->company_id !== $companyId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        if ($branchId && $account->branch_id !== $branchId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        return response()->json($account);
    }

    /**
     * Update the specified account.
     */
    public function update(Request $request, Account $account): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        // Ensure account belongs to the company/branch
        if ($account->company_id !== $companyId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        if ($branchId && $account->branch_id !== $branchId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('accounts', 'name')
                    ->where('company_id', $companyId)
                    ->ignore($account->id),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
=======
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $account  = Account::where('branch_id', $branchId)->findOrFail($id);

        return response()->json(['data' => $account]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $account  = Account::where('branch_id', $branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'type'        => 'nullable|in:cash,bank,other',
            'description' => 'nullable|string',
            'balance'     => 'nullable|numeric|min:0',
            'is_active'   => 'nullable|boolean',
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e
        ]);

        $account->update($validated);

        return response()->json([
            'data'    => $account,
            'message' => 'Account updated successfully.',
        ]);
    }

<<<<<<< HEAD
    /**
     * Remove the specified account.
     */
    public function destroy(Request $request, Account $account): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        // Ensure account belongs to the company/branch
        if ($account->company_id !== $companyId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        if ($branchId && $account->branch_id !== $branchId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        // Check if account has transactions
        if ($account->transactions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete account with existing transactions.',
            ], 422);
        }

        $account->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ]);
    }

    /**
     * Get account transactions.
     */
    public function transactions(Request $request, Account $account): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        // Ensure account belongs to the company/branch
        if ($account->company_id !== $companyId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        if ($branchId && $account->branch_id !== $branchId) {
            return response()->json([
                'message' => 'Account not found.',
            ], 404);
        }

        $transactions = $account->transactions()
            ->with('reference')
            ->paginate($request->get('per_page', 20));
=======
    public function transactions(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        Account::where('branch_id', $branchId)->findOrFail($id);

        $transactions = AccountTransaction::where('account_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->get('per_page', 20), 100));
>>>>>>> 7ca923c948be21731b981d5589e9f0a51853437e

        return response()->json($transactions);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $account  = Account::where('branch_id', $branchId)->findOrFail($id);

        $account->delete();

        return response()->json(['message' => 'Account deleted successfully.']);
    }
}
