<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Helpers\AuthHelper;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;


class AccountController extends Controller
{
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

        return response()->json([
            'message' => 'Account created successfully.',
            'data' => $account,
        ], 201);
    }

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
        ]);

        $account->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Account updated successfully.',
            'data' => $account,
        ]);
    }

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

        return response()->json($transactions);
    }
}