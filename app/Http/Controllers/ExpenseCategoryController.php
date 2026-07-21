<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Helpers\AuthHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    /**
     * GET /api/expense-categories
     * List all categories for the current branch (with hierarchy).
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = ExpenseCategory::forBranch($branchId)
            ->with(['parent', 'children', 'expenseTypes' => fn($q) => $q->active()->ordered()])
            ->withCount(['expenseTypes']);

        // Filters
        if ($request->filled('search')) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('description', 'like', "%{$request->search}%")
            );
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        if ($request->filled('parent_id')) {
            if ($request->parent_id === 'root') {
                $query->roots();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        $categories = $query->ordered()->get();

        return response()->json([
            'data'    => $categories,
            'total'   => $categories->count(),
            'message' => 'Categories retrieved successfully.',
        ]);
    }

    /**
     * GET /api/expense-categories/tree
     * Return full category tree (root with nested children).
     */
    public function tree(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $categories = ExpenseCategory::forBranch($branchId)
            ->roots()
            ->active()
            ->with(['allChildren'])
            ->ordered()
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    /**
     * POST /api/expense-categories
     */
    public function store(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $validated = $request->validate([
            'parent_id'   => ['nullable', 'integer', Rule::exists('expense_categories', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
            })],
            'name'        => ['required', 'string', 'max:100', Rule::unique('expense_categories')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->whereNull('deleted_at');
            })],
            'description' => 'nullable|string|max:500',
            'is_active'   => 'boolean',
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order'  => 'integer|min:0',
        ]);
        $validated['branch_id'] = $branchId;

        $category = ExpenseCategory::create($validated);
        $category->load('parent');

        return response()->json([
            'data'    => $category,
            'message' => 'Category created successfully.',
        ], 201);
    }

    /**
     * GET /api/expense-categories/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = $this->findOrFail($id, $branchId);

        $category->load([
            'parent',
            'children',
            'expenseTypes' => fn($q) => $q->ordered()->withCount('expenses'),
        ]);

        return response()->json(['data' => $category]);
    }

    /**
     * PUT /api/expense-categories/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId   = $this->resolveBranchId($request);
        $categoryId = $request->route('id');
        $category = $this->findOrFail($id, $branchId);

        $validated = $request->validate([
            'parent_id'   => ['nullable', 'integer', Rule::exists('expense_categories', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
            })],
            'name'        => ['sometimes', 'string', 'max:100', Rule::unique('expense_categories')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->whereNull('deleted_at');
            })->ignore($categoryId)],
            'description' => 'nullable|string|max:500',
            'is_active'   => 'boolean',
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order'  => 'integer|min:0',
        ]);

        $category->update($validated);
        $category->refresh()->load('parent');

        return response()->json([
            'data'    => $category,
            'message' => 'Category updated successfully.',
        ]);
    }

    /**
     * DELETE /api/expense-categories/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = $this->findOrFail($id, $branchId);

        // Safety: prevent deletion if it has active types with expenses
        if ($category->expenseTypes()->whereHas('expenses')->exists()) {
            return response()->json([
                'message' => 'Cannot delete category. It has expense types with existing expenses.',
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully.']);
    }

    /**
     * POST /api/expense-categories/{id}/toggle-active
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $category = $this->findOrFail($id, $branchId);

        $category->update(['is_active' => ! $category->is_active]);

        return response()->json([
            'data'    => $category,
            'message' => "Category " . ($category->is_active ? 'activated' : 'deactivated') . '.',
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function findOrFail(int $id, ?int $branchId): ExpenseCategory
    {
        return ExpenseCategory::forBranch($branchId)->findOrFail($id);
    }

    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();

        // Super Admin / Company Admin can pass explicit branch_id
        if (AuthHelper::isCompanyAdmin() && $request->filled('branch_id')) {
            return (int) $request->branch_id;
        }

        return $user->branch_id ? (int) $user->branch_id : null;
    }
}