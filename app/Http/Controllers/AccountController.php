<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\AccountTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
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

        return response()->json([
            'data'    => $account,
            'message' => 'Account created successfully.',
        ], 201);
    }

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
        ]);

        $account->update($validated);

        return response()->json([
            'data'    => $account,
            'message' => 'Account updated successfully.',
        ]);
    }

    public function transactions(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        Account::where('branch_id', $branchId)->findOrFail($id);

        $transactions = AccountTransaction::where('account_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->get('per_page', 20), 100));

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
