<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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

        $query = Account::accessibleTo(Auth::user())
            ->forCompany($companyId)
            ->latest();

        if ($branchId && !AuthHelper::isBranchUser()) {
            $query->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)
                    ->orWhereHas('users', fn ($users) => $users->where('users.branch_id', $branchId));
            });
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('wallet_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $accounts = $query->with('users:id,first_name,last_name,email,branch_id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($accounts);
    }

    public function listOptions(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $accounts = Account::accessibleTo(Auth::user())
            ->where('company_id', $companyId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'wallet_number', 'type', 'balance']);

        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = Auth::user();
        if ($request->filled('user_ids')) {
            return response()->json(['message' => 'Other users can only be assigned after the wallet is created.'], 422);
        }

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

        $branchId = $actor instanceof User ? $actor->branch_id : null;

        $account = Account::create([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'owner_user_id' => $actor instanceof User ? $actor->id : null,
            'owner_type' => $actor::class,
            'owner_id' => $actor->id,
            'name' => $validated['name'],
            'wallet_number' => Account::generateWalletNumber(),
            'type' => $validated['type'] ?? 'cash',
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data'    => $account->load('users:id,first_name,last_name,email,branch_id'),
            'message' => 'Account created successfully.',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::accessibleTo(Auth::user())->forCompany($companyId)->findOrFail($id);

        if (!$account->isOwnedBy(Auth::user())) {
            return response()->json(['message' => 'Only the wallet owner can update it or assign users.'], 403);
        }

        return response()->json(['data' => $account->load('users:id,first_name,last_name,email,branch_id')]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::accessibleTo(Auth::user())->forCompany($companyId)->findOrFail($id);

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
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        $userIds = null;
        if ($request->has('user_ids')) {
            $userIds = $this->resolveAssignedUserIds($request, $companyId);
            if ($userIds === null) {
                return response()->json(['message' => 'One or more selected users are unauthorized.'], 403);
            }
        }

        DB::transaction(function () use ($account, $validated, $userIds) {
            $account->update(collect($validated)->except('user_ids')->all());
            if ($userIds !== null) {
                $ownerUserId = $account->owner_type === User::class ? $account->owner_id : null;
                $account->users()->sync(array_values(array_diff($userIds, [$ownerUserId])));
            }
        });

        return response()->json([
            'data'    => $account->load('users:id,first_name,last_name,email,branch_id'),
            'message' => 'Account updated successfully.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $account = Account::accessibleTo(Auth::user())->forCompany($companyId)->findOrFail($id);

        if (!$account->isOwnedBy(Auth::user())) {
            return response()->json(['message' => 'Only the wallet owner can delete it.'], 403);
        }

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

        $account = Account::accessibleTo(Auth::user())->forCompany($companyId)->findOrFail($id);

        $transactions = $account->transactions()
            ->with('reference')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }

    public function allTransactions(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        if (!$companyId) {
            return response()->json(['data' => [], 'total' => 0, 'current_page' => 1, 'last_page' => 1]);
        }

        $query = AccountTransaction::with(['account', 'reference'])
            ->whereHas('account', fn ($q) => $q->accessibleTo(Auth::user())->where('company_id', $companyId))
            ->orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->filled('reference_type')) {
            $query->where('reference_type', $request->reference_type);
        }

        if ($request->filled('reference_id')) {
            $query->where('reference_id', $request->reference_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhereHas('account', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->get('per_page', 20);
        $transactions = $query->paginate($perPage);

        return response()->json($transactions);
    }

    public function assignableUsers(): JsonResponse
    {
        $query = User::with('branch:id,branch_name')->where('status', true)->orderBy('first_name');
        $query->where('company_id', AuthHelper::getCompanyId());
        if (Auth::user() instanceof User) {
            $query->where('branch_id', AuthHelper::getBranchId());
        }

        return response()->json(['data' => $query->get(['id', 'company_id', 'branch_id', 'first_name', 'last_name', 'email'])]);
    }

    private function resolveAssignedUserIds(Request $request, int $companyId): ?array
    {
        $userIds = array_values(array_unique(array_map('intval', $request->input('user_ids', []))));
        $query = User::whereIn('id', $userIds)
            ->where('company_id', $companyId);
        if (Auth::user() instanceof User) {
            $query->where('branch_id', AuthHelper::getBranchId());
        }

        return $query->count() === count($userIds) ? $userIds : null;
    }
}
