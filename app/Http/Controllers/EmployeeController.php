<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\Employee;
use App\Models\Payslip;
use App\Services\JournalEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    // ── Helpers ─────────────────────────────────────────────────────────────

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

    private function resolveCompanyId(Request $request): ?int
    {
        $user = Auth::user();
        if ($user instanceof \App\Models\SuperAdmin || AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    // ── Employees CRUD ─────────────────────────────────────────────────────

    /**
     * GET /api/employees
     */
    public function index(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = Employee::with(['branch', 'contracts.currency'])
            ->forCompany($companyId)
            ->forBranch($branchId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn($q) => $q
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('employee_code', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
            );
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $employees = $query->orderBy('first_name')->paginate($perPage);

        return response()->json([
            'data'         => $employees->items(),
            'total'        => $employees->total(),
            'per_page'     => $employees->perPage(),
            'current_page' => $employees->currentPage(),
            'last_page'    => $employees->lastPage(),
        ]);
    }

    /**
     * POST /api/employees
     */
    public function store(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'employee_code'               => ['required', 'string', 'max:20', Rule::unique('employees')->where(fn($q) => $q->where('branch_id', $branchId))],
            'first_name'                => 'required|string|max:100',
            'last_name'                 => 'required|string|max:100',
            'father_name'               => 'nullable|string|max:100',
            'email'                     => ['nullable', 'email', 'max:150', Rule::unique('employees')->where(fn($q) => $q->where('company_id', $companyId))],
            'phone'                     => 'nullable|string|max:20',
            'date_of_birth'             => 'nullable|date',
            'gender'                    => 'nullable|in:male,female,other',
            'street_address'            => 'nullable|string|max:255',
            'village'                   => 'nullable|string|max:100',
            'district'                  => 'nullable|string|max:100',
            'province'                  => 'nullable|string|max:100',
            'country'                   => 'nullable|string|max:100',
            'hire_date'                 => 'required|date',
            'status'                    => 'nullable|in:active,inactive,terminated',
            'qualifications'            => 'nullable|string',
            'salary_expense_account_id' => 'nullable|exists:chart_of_accounts,id',
            'payment_account_id'        => 'nullable|exists:chart_of_accounts,id',
        ]);

        $validated['company_id'] = $companyId;
        $validated['branch_id']  = $branchId;
        $validated['created_by'] = Auth::id();

        $employee = Employee::create($validated);
        $employee->load('branch');

        return response()->json([
            'data'    => $employee,
            'message' => 'Employee created successfully.',
        ], 201);
    }

    /**
     * GET /api/employees/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $employee = Employee::forBranch($branchId)
            ->with(['contracts.currency', 'salaryExpenseAccount', 'paymentAccount', 'createdBy'])
            ->findOrFail($id);

        return response()->json(['data' => $employee]);
    }

    /**
     * PUT /api/employees/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);
        $employee  = Employee::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'employee_code'               => ['sometimes', 'string', 'max:20', Rule::unique('employees')->where(fn($q) => $q->where('branch_id', $branchId))->ignore($employee->id)],
            'first_name'                => 'sometimes|string|max:100',
            'last_name'                 => 'sometimes|string|max:100',
            'father_name'               => 'nullable|string|max:100',
            'email'                     => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('employees')->where(fn($q) => $q->where('company_id', $companyId))->ignore($employee->id)],
            'phone'                     => 'nullable|string|max:20',
            'date_of_birth'             => 'nullable|date',
            'gender'                    => 'nullable|in:male,female,other',
            'street_address'            => 'nullable|string|max:255',
            'village'                   => 'nullable|string|max:100',
            'district'                  => 'nullable|string|max:100',
            'province'                  => 'nullable|string|max:100',
            'country'                   => 'nullable|string|max:100',
            'hire_date'                 => 'sometimes|date',
            'status'                    => 'nullable|in:active,inactive,terminated',
            'qualifications'            => 'nullable|string',
            'salary_expense_account_id' => 'nullable|exists:chart_of_accounts,id',
            'payment_account_id'        => 'nullable|exists:chart_of_accounts,id',
        ]);

        $employee->update($validated);
        $employee->load('branch', 'activeContract');

        return response()->json([
            'data'    => $employee,
            'message' => 'Employee updated.',
        ]);
    }

    /**
     * DELETE /api/employees/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $employee = Employee::forBranch($branchId)->findOrFail($id);

        $employee->delete();

        return response()->json(['message' => 'Employee deleted.']);
    }

    // ── Payroll Dashboard ──────────────────────────────────────────────────

    /**
     * GET /api/employees/{id}/payroll
     * 12-month salary cards for the employee.
     */
    public function payroll(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $year     = (int) $request->get('year', 2026);

        $employee = Employee::forBranch($branchId)->findOrFail($id);
        $payslips = Payslip::forEmployee($id)->forYear($year)->get()->keyBy('month');

        $months = [];
        $currentMonth = now()->month; // May 2026 = 5

        for ($m = 1; $m <= 12; $m++) {
            $payslip = $payslips->get($m);

            if ($payslip?->payment_date) {
                $state = 'paid';
            } elseif ($m <= $currentMonth) {
                $state = 'unpaid';
            } else {
                $state = 'future';
            }

            $months[] = [
                'month'       => $m,
                'month_name'  => date('F', mktime(0, 0, 0, $m, 1)),
                'state'       => $state,
                'payslip_id'  => $payslip?->id,
                'base_salary' => $payslip?->base_salary ?? $employee->activeContract?->monthly_salary,
                'amount_base' => $payslip?->amount_base,
                'payment_date'=> $payslip?->payment_date?->toDateString(),
            ];
        }

        $paidCount   = collect($months)->where('state', 'paid')->count();
        $unpaidCount = collect($months)->where('state', 'unpaid')->count();
        $totalMonths = $currentMonth;

        return response()->json([
            'employee' => [
                'id'          => $employee->id,
                'code'        => $employee->employee_code,
                'name'        => $employee->full_name,
                'currency'    => $employee->activeContract?->currency?->code,
            ],
            'year'      => $year,
            'months'    => $months,
            'progress'  => [
                'paid'        => $paidCount,
                'unpaid'      => $unpaidCount,
                'future'      => 12 - $paidCount - $unpaidCount,
                'total'       => 12,
                'label'       => "{$paidCount} of {$totalMonths} months paid",
            ],
        ]);
    }

    // ── Payslip Actions ────────────────────────────────────────────────────

    /**
     * POST /api/employees/{id}/payslips
     * Generate a payslip for a month.
     */
    public function generatePayslip(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $employee = Employee::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year'  => 'required|integer|min:2000|max:2100',
        ]);

        $payslip = DB::transaction(function () use ($employee, $validated) {
            $contract = $employee->activeContract();
            if (! $contract) {
                throw new \RuntimeException('Employee has no active contract.');
            }

            $exists = Payslip::where('employee_id', $employee->id)
                ->where('month', $validated['month'])
                ->where('year', $validated['year'])
                ->exists();

            if ($exists) {
                throw new \RuntimeException("Payslip already exists for {$validated['month']}/{$validated['year']}.");
            }

            $exchangeRate = $this->resolveExchangeRate($employee->branch_id, $contract->currency_id);
            $amountBase   = round((float) $contract->monthly_salary * $exchangeRate, 2);

            return Payslip::create([
                'company_id'    => $employee->company_id,
                'branch_id'     => $employee->branch_id,
                'employee_id'   => $employee->id,
                'contract_id'   => $contract->id,
                'month'         => $validated['month'],
                'year'          => $validated['year'],
                'base_salary'   => $contract->monthly_salary,
                'currency_id'   => $contract->currency_id,
                'exchange_rate' => $exchangeRate,
                'amount_base'   => $amountBase,
                'created_by'    => Auth::id(),
            ]);
        });

        return response()->json([
            'data'    => $payslip->load('contract.currency'),
            'message' => 'Payslip generated.',
        ], 201);
    }

    /**
     * POST /api/payslips/{id}/pay
     * Pay a specific payslip (supports partial payment).
     */
    public function payPayslip(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $payslip  = Payslip::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'payment_method' => 'required|in:cash,bank_transfer,check',
            'payment_date'   => 'nullable|date',
            'amount'         => 'required|numeric|min:0.01',
        ]);

        $employee = $payslip->employee;
        if (! $employee->salary_expense_account_id || ! $employee->payment_account_id) {
            return response()->json(['message' => 'Employee is missing salary or payment account.'], 422);
        }

        $remaining = (float) $payslip->base_salary - (float) $payslip->amount_paid;
        $payAmount = round((float) $validated['amount'], 2);

        if ($payAmount > $remaining) {
            return response()->json([
                'message' => "Payment amount exceeds remaining balance ({$remaining}).",
            ], 422);
        }

        $date = $validated['payment_date'] ?? now()->toDateString();
        $newAmountPaid = round((float) $payslip->amount_paid + $payAmount, 2);
        $isFullyPaid   = $newAmountPaid >= (float) $payslip->base_salary;

        DB::transaction(function () use ($payslip, $employee, $validated, $date, $payAmount, $newAmountPaid, $isFullyPaid) {
            $entry = JournalEntryService::postSimple(
                [
                    'branch_id'      => $payslip->branch_id,
                    'journal_type'   => 'payroll',
                    'reference_type' => 'payslip',
                    'reference_id'   => $payslip->id,
                    'entry_date'     => $date,
                    'description'    => "Salary: {$employee->full_name} for {$payslip->month}/{$payslip->year}",
                    'currency'       => $payslip->currency?->code ?? 'USD',
                    'exchange_rate'  => $payslip->exchange_rate,
                ],
                [
                    'account_id'  => $employee->salary_expense_account_id,
                    'amount'      => $payAmount,
                    'description' => 'Salary expense',
                ],
                [
                    'account_id'  => $employee->payment_account_id,
                    'amount'      => $payAmount,
                    'description' => 'Cash/Bank payment',
                ]
            );

            $updateData = [
                'amount_paid'      => $newAmountPaid,
                'payment_method'   => $validated['payment_method'],
                'journal_entry_id' => $entry->id,
                'reference_no'     => $entry->entry_number,
            ];

            if ($isFullyPaid) {
                $updateData['payment_date'] = $date;
            }

            $payslip->update($updateData);
        });

        return response()->json([
            'data'    => $payslip->fresh()->load('journalEntry'),
            'message' => $isFullyPaid
                ? 'Payslip fully paid and journal entry posted.'
                : 'Partial payment recorded and journal entry posted.',
        ]);
    }

    /**
     * GET /api/payslips
     */
    public function payslips(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = Payslip::forBranch($branchId)
            ->with(['employee', 'contract.currency', 'journalEntry']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }
        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }
        if ($request->filled('status')) {
            $request->status === 'paid'
                ? $query->paid()
                : $query->unpaid();
        }

        $perPage  = min((int) $request->get('per_page', 20), 100);
        $payslips = $query->orderBy('year', 'desc')->orderBy('month', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $payslips->items(),
            'total'        => $payslips->total(),
            'per_page'     => $payslips->perPage(),
            'current_page' => $payslips->currentPage(),
            'last_page'    => $payslips->lastPage(),
        ]);
    }

    /**
     * POST /api/payslips/bulk-generate
     */
    public function bulkGenerate(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year'  => 'required|integer|min:2000|max:2100',
        ]);

        $employees = Employee::forBranch($branchId)->active()->get();
        $generated = [];
        $errors    = [];

        foreach ($employees as $employee) {
            try {
                $contract = $employee->activeContract();
                if (! $contract) {
                    throw new \RuntimeException('No active contract.');
                }

                $exists = Payslip::where('employee_id', $employee->id)
                    ->where('month', $validated['month'])
                    ->where('year', $validated['year'])
                    ->exists();

                if ($exists) {
                    throw new \RuntimeException('Payslip already exists.');
                }

                $exchangeRate = $this->resolveExchangeRate($employee->branch_id, $contract->currency_id);
                $amountBase   = round((float) $contract->monthly_salary * $exchangeRate, 2);

                $generated[] = Payslip::create([
                    'company_id'    => $employee->company_id,
                    'branch_id'     => $employee->branch_id,
                    'employee_id'   => $employee->id,
                    'contract_id'   => $contract->id,
                    'month'         => $validated['month'],
                    'year'          => $validated['year'],
                    'base_salary'   => $contract->monthly_salary,
                    'currency_id'   => $contract->currency_id,
                    'exchange_rate' => $exchangeRate,
                    'amount_base'   => $amountBase,
                    'created_by'    => Auth::id(),
                ]);
            } catch (\Throwable $e) {
                $errors[] = [
                    'employee_id' => $employee->id,
                    'name'        => $employee->full_name,
                    'error'       => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'generated' => count($generated),
            'errors'    => $errors,
            'message'   => count($generated) . ' payslips generated.',
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────────────────

    private function resolveExchangeRate(int $branchId, int $currencyId): float
    {
        $branch       = Branch::find($branchId);
        $baseCurrency = $branch?->baseCurrency;

        if (! $baseCurrency || $baseCurrency->id === $currencyId) {
            return 1.0;
        }

        $currency = Currency::find($currencyId);
        if ($currency?->latestRate) {
            return (float) $currency->latestRate->inverse_rate;
        }

        return 1.0;
    }
}
