<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\AccountTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
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
            'type' => ['nullable', 'in:cash,bank,other'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $account = Account::create([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'cash',
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data'    => $account,
            'message' => 'Account created successfully.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::forCompany($companyId)->forBranch($branchId)->findOrFail($id);

        return response()->json(['data' => $account]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::forCompany($companyId)->forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('accounts', 'name')
                    ->where('company_id', $companyId)
                    ->ignore($account->id),
            ],
            'type' => ['nullable', 'in:cash,bank,other'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $account->update($validated);

        return response()->json([
            'data'    => $account,
            'message' => 'Account updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::forCompany($companyId)->forBranch($branchId)->findOrFail($id);

        if ($account->transactions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete account with existing transactions.',
            ], 422);
        }

        $account->delete();

        return response()->json(['message' => 'Account deleted successfully.']);
    }

    public function transactions(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::forCompany($companyId)->forBranch($branchId)->findOrFail($id);

        $transactions = $account->transactions()
            ->with('reference')
            ->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }
}
