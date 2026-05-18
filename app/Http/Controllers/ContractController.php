<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ContractController extends Controller
{
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

    /**
     * GET /api/employees/{employeeId}/contracts
     */
    public function index(Request $request, int $employeeId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $employee = Employee::forBranch($branchId)->findOrFail($employeeId);

        $contracts = Contract::where('employee_id', $employeeId)
            ->with('currency')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json(['data' => $contracts]);
    }

    /**
     * POST /api/employees/{employeeId}/contracts
     */
    public function store(Request $request, int $employeeId): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $employee = Employee::forBranch($branchId)->findOrFail($employeeId);

        $validated = $request->validate([
            'contract_type'       => 'required|in:full_time,part_time,contract,internship',
            'start_date'          => 'required|date',
            'end_date'            => 'nullable|date|after_or_equal:start_date',
            'monthly_salary'      => 'required|numeric|min:0',
            'currency_id'         => 'required|exists:currencies,id',
            'probation_end_date'  => 'nullable|date',
            'status'              => 'nullable|in:active,expired,terminated',
            'notes'               => 'nullable|string',
        ]);

        // If creating an active contract, expire any existing active contract
        if (($validated['status'] ?? 'active') === 'active') {
            Contract::where('employee_id', $employeeId)
                ->where('status', 'active')
                ->update(['status' => 'expired']);
        }

        $contract = Contract::create([
            'company_id'    => $employee->company_id,
            'branch_id'     => $employee->branch_id,
            'employee_id'   => $employee->id,
            'contract_type' => $validated['contract_type'],
            'start_date'    => $validated['start_date'],
            'end_date'      => $validated['end_date'] ?? null,
            'monthly_salary'=> $validated['monthly_salary'],
            'currency_id'   => $validated['currency_id'],
            'probation_end_date' => $validated['probation_end_date'] ?? null,
            'status'        => $validated['status'] ?? 'active',
            'notes'         => $validated['notes'] ?? null,
        ]);

        $contract->load('currency');

        return response()->json([
            'data'    => $contract,
            'message' => 'Contract created successfully.',
        ], 201);
    }

    /**
     * GET /api/employees/{employeeId}/contracts/{id}
     */
    public function show(Request $request, int $employeeId, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        Employee::forBranch($branchId)->findOrFail($employeeId);

        $contract = Contract::where('employee_id', $employeeId)
            ->with('currency')
            ->findOrFail($id);

        return response()->json(['data' => $contract]);
    }

    /**
     * PUT /api/employees/{employeeId}/contracts/{id}
     */
    public function update(Request $request, int $employeeId, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        Employee::forBranch($branchId)->findOrFail($employeeId);

        $contract = Contract::where('employee_id', $employeeId)->findOrFail($id);

        $validated = $request->validate([
            'contract_type'       => 'sometimes|in:full_time,part_time,contract,internship',
            'start_date'          => 'sometimes|date',
            'end_date'            => 'nullable|date|after_or_equal:start_date',
            'monthly_salary'      => 'sometimes|numeric|min:0',
            'currency_id'         => 'sometimes|exists:currencies,id',
            'probation_end_date'  => 'nullable|date',
            'status'              => 'sometimes|in:active,expired,terminated',
            'notes'               => 'nullable|string',
        ]);

        // If activating this contract, expire others
        if (($validated['status'] ?? null) === 'active' && $contract->status !== 'active') {
            Contract::where('employee_id', $employeeId)
                ->where('id', '!=', $id)
                ->where('status', 'active')
                ->update(['status' => 'expired']);
        }

        $contract->update($validated);
        $contract->load('currency');

        return response()->json([
            'data'    => $contract,
            'message' => 'Contract updated successfully.',
        ]);
    }

    /**
     * DELETE /api/employees/{employeeId}/contracts/{id}
     */
    public function destroy(Request $request, int $employeeId, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        Employee::forBranch($branchId)->findOrFail($employeeId);

        $contract = Contract::where('employee_id', $employeeId)->findOrFail($id);
        $contract->delete();

        return response()->json(['message' => 'Contract deleted successfully.']);
    }
}
