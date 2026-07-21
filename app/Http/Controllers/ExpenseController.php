<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    /**
     * GET /api/expenses
     * List with full filtering, pagination, search.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = Expense::forBranch($branchId)
            ->with([
                'expenseType.category',
                'paymentAccount:id,name,code',
                'createdBy:id,first_name,last_name',
                'paidBy:id,first_name,last_name',
            ]);

        // ── Filters ───────────────────────────────────────────────────────────
        if ($request->filled('status')) {
            $statuses = is_array($request->status)
                ? $request->status
                : explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        if ($request->filled('expense_type_id')) {
            $query->byType((int) $request->expense_type_id);
        }

        if ($request->filled('category_id')) {
            $query->byCategory((int) $request->category_id);
        }

        if ($request->filled('currency')) {
            $query->byCurrency($request->currency);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        } elseif ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // ── Sort ──────────────────────────────────────────────────────────────
        $sortBy  = $request->get('sort_by', 'date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['date', 'amount', 'total_amount', 'status', 'created_at', 'reference_no'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        // ── Pagination ────────────────────────────────────────────────────────
        $perPage = min((int) $request->get('per_page', 20), 100);

        if ($request->boolean('all')) {
            $expenses = $query->get();
            return response()->json([
                'data'    => $expenses,
                'total'   => $expenses->count(),
            ]);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
        ]);
    }

    /**
     * POST /api/expenses
     */
    public function store(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'expense_type_id'    => ['required', 'integer', Rule::exists('expense_types', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true)->whereNull('deleted_at');
            })],

            'amount'             => 'required|numeric|min:0.01|max:999999999',
            'currency'           => [
                'required',
                'string',
                Rule::exists('currencies', 'name')->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                }),
            ],
            'description'        => 'required|string|max:500',
            'paid_to'            => 'nullable|string|max:150',
            'date'               => 'required|date|before_or_equal:today',
            'notes'              => 'nullable|string|max:1000',
            'file'               => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,pdf,webp,heic,doc,docx,xls,xlsx'],
        ]);

        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();
        $validated['status']     = Expense::STATUS_SUBMITTED;

        // Handle file upload (legacy `file` column)
        if ($request->hasFile('file')) {
            $validated['file'] = $this->uploadFile($request, $branchId);
        }

        DB::beginTransaction();
        try {
            $expense = Expense::create($validated);
            $expense->load('expenseType.category', 'paymentAccount:id,name,code', 'createdBy:id,first_name,last_name');
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create expense: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data'    => $expense,
            'message' => 'Expense created successfully.',
        ], 201);
    }

    /**
     * GET /api/expenses/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        $expense->load([
            'expenseType.category',
            'expenseType.expenseAccount:id,name,code',
            'paymentAccount:id,name,code',
            'createdBy:id,first_name,last_name,email',
            'submittedBy:id,first_name,last_name',
            'paidBy:id,first_name,last_name',
            'cancelledBy:id,first_name,last_name',
        ]);

        return response()->json(['data' => $expense]);
    }

    /**
     * PUT /api/expenses/{id}
     * Only editable in draft or rejected status.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        if (! $expense->canBeEdited()) {
            return response()->json([
                'message' => "Expense in '{$expense->status}' status cannot be edited.",
            ], 422);
        }

        $validated = $request->validate([
            'expense_type_id'    => ['sometimes', 'integer', Rule::exists('expense_types', 'id')->where(function ($q) use ($branchId) {
                if ($branchId !== null) {
                    $q->where('branch_id', $branchId);
                }
                $q->where('is_active', true)->whereNull('deleted_at');
            })],
            'amount'             => 'sometimes|numeric|min:0.01|max:999999999',
            'currency'           => [
                'sometimes',
                'string',
                Rule::exists('currencies', 'name')->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                }),
            ],
            'description'        => 'sometimes|string|max:500',
            'paid_to'            => 'nullable|string|max:150',
            'date'               => 'sometimes|date|before_or_equal:today',
            'notes'              => 'nullable|string|max:1000',
            'file'               => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,pdf,webp,heic,doc,docx,xls,xlsx'],
        ]);

        if ($request->hasFile('file')) {
            // Remove old file
            if ($expense->file) {
                Storage::delete($expense->file);
            }
            $validated['file'] = $this->uploadFile($request, $branchId);
        }

        $expense->update($validated);
        $expense->refresh()->load('expenseType.category', 'paymentAccount:id,name,code');

        return response()->json([
            'data'    => $expense,
            'message' => 'Expense updated successfully.',
        ]);
    }

    /**
     * DELETE /api/expenses/{id}
     * Only soft-deletes if draft or cancelled.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        if (! in_array($expense->status, [Expense::STATUS_DRAFT, Expense::STATUS_CANCELLED])) {
            return response()->json([
                'message' => 'Only draft or cancelled expenses can be deleted.',
            ], 422);
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully.']);
    }

    // ── Workflow Actions ──────────────────────────────────────────────────────

    /**
     * POST /api/expenses/{id}/submit
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        if (! $expense->submit($request->comment)) {
            return response()->json([
                'message' => "Expense cannot be submitted (current status: {$expense->status}).",
            ], 422);
        }

        return response()->json([
            'data'    => $expense->fresh()->load('submittedBy:id,first_name,last_name'),
            'message' => 'Expense submitted for approval.',
        ]);
    }

    /**
     * POST /api/expenses/{id}/pay
     */
    public function pay(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        $validated = $request->validate([
            'payment_method'    => ['required', Rule::in(Expense::PAYMENT_METHODS)],
            'payment_reference' => 'nullable|string|max:100',
            'comment'           => 'nullable|string|max:500',
        ]);

        // Save payment account to expense if not already set
        if (! $expense->payment_account_id) {
            $expense->payment_account_id = $validated['payment_account_id'];
            $expense->save();
        }

        DB::beginTransaction();
        try {
            if (! $expense->markPaid(
                $request->payment_method,
                $request->payment_reference,
                $request->comment,
                true  // create journal entry
            )) {
                DB::rollBack();
                return response()->json([
                    'message' => "Expense cannot be paid (current status: {$expense->status}).",
                ], 422);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data'    => $expense->fresh()->load('paidBy:id,first_name,last_name'),
            'message' => 'Expense marked as paid. Journal entry created.',
        ]);
    }

    /**
     * POST /api/expenses/{id}/cancel
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reason'  => 'required|string|min:5|max:500',
            'comment' => 'nullable|string|max:500',
        ]);

        $branchId = $this->resolveBranchId($request);
        $expense  = $this->findOrFail($id, $branchId);

        $reason = $request->reason ?? $request->comment ?? 'Cancelled.';

        if (! $expense->cancel($reason)) {
            return response()->json([
                'message' => "Expense cannot be cancelled (current status: {$expense->status}).",
            ], 422);
        }

        return response()->json([
            'data'    => $expense->fresh(),
            'message' => 'Expense cancelled.',
        ]);
    }

    /**
     * GET /api/expenses/summary
     * Dashboard summary totals by status.
     */
    public function summary(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $summary = Expense::forBranch($branchId)
            ->selectRaw('status, COUNT(*) as count, SUM(total_amount) as total, currency')
            ->groupBy('status', 'currency')
            ->get();

        $totals = Expense::forBranch($branchId)
            ->selectRaw('currency, SUM(total_amount) as total, COUNT(*) as count')
            ->where('status', Expense::STATUS_PAID)
            ->groupBy('currency')
            ->get();

        $byCategory = Expense::forBranch($branchId)
            ->where('status', Expense::STATUS_PAID)
            ->with('expenseType.category')
            ->selectRaw('expense_type_id, SUM(total_amount) as total')
            ->groupBy('expense_type_id')
            ->get()
            ->groupBy(fn($e) => $e->expenseType?->category?->name ?? 'Uncategorized');

        return response()->json([
            'by_status'      => $summary,
            'paid_totals'    => $totals,
            'by_category'    => $byCategory,
        ]);
    }

    // ── File Upload ───────────────────────────────────────────────────────────

    private function uploadFile(Request $request, int $branchId): string
    {
        $file = $request->file('file');
        $path = $file->store("expenses/{$branchId}", 'public');
        return $path;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function findOrFail(int $id, ?int $branchId): Expense
    {
        return Expense::forBranch($branchId)->findOrFail($id);
    }

    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();

        if (isset($user->branch_id) && $user->branch_id !== null) {
            return (int) $user->branch_id;
        }

        if ($request->filled('branch_id')) {
            return (int) $request->branch_id;
        }

        return null;
    }

}