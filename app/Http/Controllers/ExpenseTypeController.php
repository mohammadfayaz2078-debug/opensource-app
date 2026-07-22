<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseType;
use App\Helpers\AuthHelper;
use App\Models\SuperAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ExpenseTypeController extends Controller
{
    /**
     * Resolve company ID based on authenticated user
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();

        if ($user instanceof SuperAdmin) {
            return $request->input('company_id') ? (int) $request->input('company_id') : null;
        }

        if (AuthHelper::isCompanyAdmin()) {
            return AuthHelper::getCompanyId();
        }

        return AuthHelper::getCompanyId();
    }

    /**
     * GET /api/expense-types
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'data' => [],
                'total' => 0,
            ]);
        }

        $query = ExpenseType::forCompany($companyId)->withCount('expenses');

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        $types = $query->ordered()->get();

        return response()->json([
            'data'  => $types,
            'total' => $types->count(),
        ]);
    }

    /**
     * GET /api/expense-types/tree
     * Get expense types as a hierarchical tree
     */
    public function tree(Request $request): JsonResponse
    {
        try {
            $companyId = $this->resolveCompanyId($request);

            if (!$companyId) {
                return response()->json([
                    'data' => [],
                ]);
            }

            // Get all types for this company
            $types = ExpenseType::forCompany($companyId)
                ->ordered()
                ->get();

            // Build tree structure using recursive method
            $tree = $this->buildTreeRecursive($types);

            return response()->json([
                'data' => $tree,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'data' => [],
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build hierarchical tree from flat collection (Recursive version)
     */
    private function buildTreeRecursive($types, $parentId = null)
    {
        $result = [];
        
        foreach ($types as $type) {
            // If this type's parent matches the current parent ID
            if ($type->parent_id === $parentId) {
                // Convert to array
                $typeData = $type->toArray();
                
                // Recursively get children
                $typeData['children_recursive'] = $this->buildTreeRecursive($types, $type->id);
                
                $result[] = $typeData;
            }
        }
        
        // Sort the results by name
        usort($result, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        
        return $result;
    }

    /**
     * POST /api/expense-types
     */
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 422);
        }

        $validated = $request->validate([
            'parent_id' => ['nullable', 'integer', function ($attribute, $value, $fail) use ($companyId) {
                if ($value) {
                    $exists = ExpenseType::where('id', $value)->where('company_id', $companyId)->exists();
                    if (!$exists) {
                        $fail('The selected parent type does not exist in this company.');
                    }
                }
            }],
            'name' => ['required', 'string', 'max:100', Rule::unique('expense_types')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })],
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $validated['company_id'] = $companyId;

        $type = ExpenseType::create($validated);
        $type->load('parent');

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
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        }

        $type = ExpenseType::forCompany($companyId)
            ->with(['parent', 'children'])
            ->findOrFail($id);

        return response()->json(['data' => $type]);
    }

    /**
     * PUT /api/expense-types/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 422);
        }

        $type = ExpenseType::forCompany($companyId)->findOrFail($id);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'integer', function ($attribute, $value, $fail) use ($companyId, $type) {
                if ($value) {
                    if ($value == $type->id) {
                        $fail('A type cannot be its own parent.');
                    }
                    $exists = ExpenseType::where('id', $value)->where('company_id', $companyId)->exists();
                    if (!$exists) {
                        $fail('The selected parent type does not exist in this company.');
                    }
                }
            }],
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('expense_types')->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })->ignore($type->id)],
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $type->update($validated);
        $type->refresh()->load('parent');

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
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        }

        $type = ExpenseType::forCompany($companyId)->findOrFail($id);

        // Check for child types
        if ($type->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete: this type has child types. Delete children first.',
            ], 422);
        }

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
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        }

        $type = ExpenseType::forCompany($companyId)->findOrFail($id);
        $type->update(['is_active' => !$type->is_active]);

        return response()->json([
            'data'    => $type,
            'message' => "Expense type " . ($type->is_active ? 'activated' : 'deactivated') . '.',
        ]);
    }

    /**
     * GET /api/expense-types/list
     * Get expense types as a flat list for dropdowns
     */
    public function list(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json([
                'data' => [],
            ]);
        }

        $query = ExpenseType::forCompany($companyId)->active()->ordered();

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        $types = $query->get(['id', 'name', 'parent_id']);

        return response()->json([
            'data' => $types,
        ]);
    }
}