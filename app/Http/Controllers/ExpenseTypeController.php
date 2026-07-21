<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class ExpenseTypeController extends Controller
{
    /**
     * GET /api/expense-types
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = ExpenseType::forBranch($branchId)
            ->with(['category'])
            ->withCount('expenses');

        if ($request->filled('category_id')) {
            $query->forCategory((int) $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('description', 'like', "%{$request->search}%")
            );
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        $types = $query->with(['category', 'expenseAccount:id,name,code', 'defaultPaymentAccount:id,name,code'])->ordered()->get();

        return response()->json([
            'data'  => $types,
            'total' => $types->count(),
        ]);
    }

    /**
     * POST /api/expense-types
     */
    public function store(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $validated = $request->validate([
            'expense_category_id' => ['required', 'integer', $this->existsWithBranch('expense_categories', 'id', $branchId)->whereNull('deleted_at')],
            'expense_account_id'  => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true);
            })],
            'name'                => ['required', 'string', 'max:100', Rule::unique('expense_types')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->whereNull('deleted_at');
            })],
            'description'         => 'nullable|string|max:500',
            'is_active'           => 'boolean',
            'default_payment_account_id' => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true);
            })],
            'sort_order'          => 'integer|min:0',
        ]);
        $validated['branch_id'] = $branchId;

        $type = ExpenseType::create($validated);
        $type->load(['category', 'expenseAccount:id,name,code', 'defaultPaymentAccount:id,name,code']);

        return response()->json([
            'data'    => $type,
            'message' => 'Expense type created successfully.',
        ], 201);
    }

    /**
     * GET /api/expense-types/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $type = ExpenseType::forBranch($branchId)->with(['category', 'expenseAccount:id,name,code', 'defaultPaymentAccount:id,name,code'])->findOrFail($id);

        return response()->json(['data' => $type]);
    }

    /**
     * PUT /api/expense-types/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $typeId   = $request->route('id');
        $type = ExpenseType::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'expense_category_id' => ['sometimes', 'integer', $this->existsWithBranch('expense_categories', 'id', $branchId)->whereNull('deleted_at')],
            'expense_account_id'  => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true);
            })],
            'name'                => ['sometimes', 'string', 'max:100', Rule::unique('expense_types')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->whereNull('deleted_at');
            })->ignore($typeId)],
            'description'         => 'nullable|string|max:500',
            'is_active'           => 'boolean',
            'default_payment_account_id' => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true);
            })],
            'sort_order'          => 'integer|min:0',
        ]);

        $type->update($validated);
        $type->refresh()->load(['category', 'expenseAccount:id,name,code', 'defaultPaymentAccount:id,name,code']);

        return response()->json([
            'data'    => $type,
            'message' => 'Expense type updated successfully.',
        ]);
    }

    /**
     * DELETE /api/expense-types/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $type = ExpenseType::forBranch($branchId)->findOrFail($id);

        if ($type->expenses()->exists()) {
            return response()->json([
                'message' => 'Cannot delete: this type has existing expenses.',
            ], 422);
        }

        $type->delete();

        return response()->json(['message' => 'Expense type deleted successfully.']);
    }

    /**
     * POST /api/expense-types/{id}/toggle-active
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $type = ExpenseType::forBranch($branchId)->findOrFail($id);
        $type->update(['is_active' => ! $type->is_active]);

        return response()->json([
            'data'    => $type,
            'message' => "Expense type " . ($type->is_active ? 'activated' : 'deactivated') . '.',
        ]);
    }

    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();
        if (in_array($user->role, ['super_admin', 'company_admin']) && $request->filled('branch_id')) {
            return (int) $request->branch_id;
        }
        return $user->branch_id ? (int) $user->branch_id : null;
    }

    /**
     * Build an exists rule with optional branch scoping.
     */
    private function existsWithBranch(string $table, string $column, ?int $branchId): Exists
    {
        $rule = Rule::exists($table, $column);
        if ($branchId !== null) {
            $rule->where('branch_id', $branchId);
        }
        return $rule;
    }
}