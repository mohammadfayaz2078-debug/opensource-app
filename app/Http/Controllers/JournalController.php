<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Journal;
use App\Models\JournalEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class JournalController extends Controller
{
    // ── Journals ──────────────────────────────────────────────────────────────

    /**
     * GET /api/journals
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $journals = Journal::forBranch($branchId)
            ->with([])
            ->withCount('entries')
            ->when($request->filled('type'), fn($q) => $q->ofType($request->type))
            ->when($request->boolean('active_only'), fn($q) => $q->active())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $journals]);
    }

    /**
     * POST /api/journals
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'name'               => 'required|string|max:100',
            'code'               => [
                'required', 'string', 'max:20',
                Rule::unique('journals')->where(fn($q) => $q->where('branch_id', $branchId)),
            ],
            'type'               => ['required', Rule::in(['general','expense','bank','cash','sale','purchase'])],
            'currency'           => 'required|string|size:3',
            'default_account_id' => 'nullable|integer',
            'description'        => 'nullable|string',
            'is_active'          => 'boolean',
            'sort_order'         => 'integer|min:0',
        ]);

        $validated['branch_id'] = $branchId;
        $journal = Journal::create($validated);

        return response()->json([
            'data'    => $journal,
            'message' => 'Journal created successfully.',
        ], 201);
    }

    /**
     * GET /api/journals/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $journal  = Journal::forBranch($branchId)->findOrFail($id);
        $journal->loadCount('entries');

        return response()->json(['data' => $journal]);
    }

    /**
     * PUT /api/journals/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $branchId = $this->resolveBranchId($request);
        $journal  = Journal::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:100',
            'type'               => ['sometimes', Rule::in(['general','expense','bank','cash','sale','purchase'])],
            'currency'           => 'sometimes|string|size:3',
            'default_account_id' => 'nullable|integer',
            'description'        => 'nullable|string',
            'is_active'          => 'boolean',
            'sort_order'         => 'integer|min:0',
        ]);

        $journal->update($validated);

        return response()->json([
            'data'    => $journal,
            'message' => 'Journal updated.',
        ]);
    }

    // ── Journal Entries ───────────────────────────────────────────────────────

    /**
     * GET /api/journal-entries
     */
    public function entries(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = JournalEntry::forBranch($branchId)
            ->with([
                'journal:id,name,code',
                'expense:id,reference_no,description',
                'lines',
                'postedBy:id,first_name,last_name',
                'createdBy:id,first_name,last_name',
            ]);

        if ($request->filled('journal_id')) {
            $query->where('journal_id', $request->journal_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('expense_id')) {
            $query->where('expense_id', $request->expense_id);
        }
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }
        if ($request->filled('search')) {
            $query->where(fn($q) => $q
                ->where('entry_number', 'like', "%{$request->search}%")
                ->orWhere('description', 'like', "%{$request->search}%")
            );
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $entries = $query->orderBy('entry_date', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $entries->items(),
            'total'        => $entries->total(),
            'per_page'     => $entries->perPage(),
            'current_page' => $entries->currentPage(),
            'last_page'    => $entries->lastPage(),
        ]);
    }

    /**
     * GET /api/journal-entries/{id}
     */
    public function showEntry(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $entry = JournalEntry::forBranch($branchId)
            ->with(['journal', 'expense', 'lines', 'postedBy:id,first_name,last_name', 'createdBy:id,first_name,last_name', 'reversalOf'])
            ->findOrFail($id);

        return response()->json(['data' => $entry]);
    }

    /**
     * POST /api/journal-entries
     * Create a manual journal entry (multi-currency supported).
     */
    public function storeEntry(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'entry_date'     => 'required|date',
            'description'    => 'required|string|max:500',
            'currency'       => 'required|string|size:3',
            'exchange_rate'  => 'nullable|numeric|gt:0',
            'lines'          => 'required|array|min:2',
            'lines.*.account_id'   => 'required|exists:chart_of_accounts,id',
            'lines.*.type'         => 'required|in:debit,credit',
            'lines.*.amount'       => 'required|numeric|min:0',
            'lines.*.description'  => 'nullable|string|max:500',
        ]);

        // Resolve exchange rate if not provided
        $exchangeRate = (float) ($validated['exchange_rate'] ?? 1);
        if ($exchangeRate === 1.0) {
            $branch = \App\Models\Branch::find($branchId);
            $baseCurrency = $branch?->baseCurrency;
            if ($baseCurrency && $baseCurrency->code !== $validated['currency']) {
                $currency = \App\Models\Currency::where('branch_id', $branchId)
                    ->where('code', $validated['currency'])
                    ->first();
                if ($currency?->latestRate) {
                    $exchangeRate = (float) $currency->latestRate->inverse_rate;
                }
            }
        }

        $lines = collect($validated['lines'])->map(function ($line, $idx) {
            $account = \App\Models\ChartOfAccount::find($line['account_id']);
            return [
                'account_id'   => $line['account_id'],
                'account_code' => $account?->code ?? '0000',
                'account_name' => $account?->name ?? 'Account',
                'type'         => $line['type'],
                'amount'       => (float) $line['amount'],
                'description'  => $line['description'] ?? '',
                'line_order'   => $idx + 1,
            ];
        })->all();

        $entry = \App\Services\JournalEntryService::post([
            'branch_id'     => $branchId,
            'journal_type'  => 'general',
            'entry_date'    => $validated['entry_date'],
            'description'   => $validated['description'],
            'currency'      => $validated['currency'],
            'exchange_rate' => $exchangeRate,
        ], $lines);

        return response()->json([
            'data'    => $entry->load('lines'),
            'message' => 'Journal entry created and posted.',
        ], 201);
    }

    /**
     * POST /api/journal-entries/{id}/post
     */
    public function postEntry(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $branchId = $this->resolveBranchId($request);
        $entry    = JournalEntry::forBranch($branchId)->findOrFail($id);

        try {
            $entry->post();
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data'    => $entry->fresh()->load('postedBy:id,first_name,last_name'),
            'message' => 'Journal entry posted.',
        ]);
    }

    /**
     * POST /api/journal-entries/{id}/reverse
     */
    public function reverseEntry(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $branchId = $this->resolveBranchId($request);
        $entry    = JournalEntry::forBranch($branchId)->with('lines')->findOrFail($id);

        $request->validate(['reason' => 'required|string|max:500']);

        DB::beginTransaction();
        try {
            $reversal = $entry->reverse($request->reason);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Reversal failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data'    => $reversal->load('lines'),
            'message' => 'Journal entry reversed.',
        ]);
    }

    /**
     * GET /api/journal-entries/report
     * Trial balance / general ledger report.
     */
    public function report(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->get('date_to', now()->toDateString());

        $totals = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.id', '=', 'jel.journal_entry_id')
            ->where('je.branch_id', $branchId)
            ->where('je.status', JournalEntry::STATUS_POSTED)
            ->whereBetween('je.entry_date', [$dateFrom, $dateTo])
            ->selectRaw('
                jel.account_code,
                jel.account_name,
                SUM(CASE WHEN jel.type = "debit"  THEN jel.amount_base ELSE 0 END) as total_debit_base,
                SUM(CASE WHEN jel.type = "credit" THEN jel.amount_base ELSE 0 END) as total_credit_base,
                SUM(CASE WHEN jel.type = "debit"  THEN jel.amount ELSE 0 END) as total_debit,
                SUM(CASE WHEN jel.type = "credit" THEN jel.amount ELSE 0 END) as total_credit,
                COUNT(DISTINCT je.id) as entry_count
            ')
            ->groupBy('jel.account_code', 'jel.account_name')
            ->orderBy('jel.account_code')
            ->get();

        $summary = [
            'date_from'         => $dateFrom,
            'date_to'           => $dateTo,
            'total_debit_base'  => $totals->sum('total_debit_base'),
            'total_credit_base' => $totals->sum('total_credit_base'),
            'is_balanced'       => abs($totals->sum('total_debit_base') - $totals->sum('total_credit_base')) < 0.01,
        ];

        return response()->json([
            'data'    => $totals,
            'summary' => $summary,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveBranchId(Request $request): ?int
    {
        $user = Auth::user();

        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }

        if (\App\Helpers\AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }

        return \App\Helpers\AuthHelper::getBranchId();
    }

    private function authorizeAdmin(): void
    {
        // All authenticated users (super_admin, company_admin, branch_manager, branch_user)
        // can post and reverse journal entries for their accessible branches.
        if (! Auth::check()) {
            abort(401, 'Authentication required.');
        }
    }
}