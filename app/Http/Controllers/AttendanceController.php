<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
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

    /**
     * GET /api/attendance
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $query = Attendance::forBranch($branchId)
            ->with('employee:id,employee_code,first_name,last_name');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 50), 200);
        $records = $query->orderBy('date', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $records->items(),
            'total'        => $records->total(),
            'per_page'     => $records->perPage(),
            'current_page' => $records->currentPage(),
        ]);
    }

    /**
     * POST /api/attendance/check-in
     */
    public function checkIn(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date'        => 'required|date',
            'check_in'    => 'required|date_format:H:i',
            'notes'       => 'nullable|string|max:500',
        ]);

        // Verify employee belongs to branch
        $employee = Employee::forBranch($branchId)->findOrFail($validated['employee_id']);

        $record = Attendance::updateOrCreate(
            [
                'employee_id' => $validated['employee_id'],
                'date'        => $validated['date'],
            ],
            [
                'company_id' => $employee->company_id,
                'branch_id'  => $branchId,
                'check_in'   => $validated['check_in'],
                'status'     => 'present',
                'notes'      => $validated['notes'] ?? null,
            ]
        );

        return response()->json([
            'data'    => $record->load('employee'),
            'message' => 'Check-in recorded.',
        ], 201);
    }

    /**
     * POST /api/attendance/check-out
     */
    public function checkOut(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date'        => 'required|date',
            'check_out'   => 'required|date_format:H:i',
            'notes'       => 'nullable|string|max:500',
        ]);

        $employee = Employee::forBranch($branchId)->findOrFail($validated['employee_id']);

        $record = Attendance::where('employee_id', $validated['employee_id'])
            ->where('date', $validated['date'])
            ->first();

        if (! $record) {
            return response()->json(['message' => 'No check-in record found for this date.'], 404);
        }

        $record->update([
            'check_out' => $validated['check_out'],
            'notes'     => $validated['notes'] ?? $record->notes,
        ]);

        return response()->json([
            'data'    => $record->load('employee'),
            'message' => 'Check-out recorded.',
        ]);
    }

    /**
     * PUT /api/attendance/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $record   = Attendance::forBranch($branchId)->findOrFail($id);

        $validated = $request->validate([
            'check_in'  => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'status'    => 'nullable|in:present,absent,late,half_day,leave,holiday',
            'notes'     => 'nullable|string|max:500',
        ]);

        $record->update($validated);

        return response()->json([
            'data'    => $record->load('employee'),
            'message' => 'Attendance updated.',
        ]);
    }

    /**
     * DELETE /api/attendance/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $record   = Attendance::forBranch($branchId)->findOrFail($id);

        $record->delete();

        return response()->json(['message' => 'Attendance record deleted.']);
    }

    /**
     * GET /api/attendance/summary
     */
    public function summary(Request $request): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $from     = $request->get('date_from', now()->startOfMonth()->toDateString());
        $to       = $request->get('date_to', now()->toDateString());

        $summary = Attendance::forBranch($branchId)
            ->whereBetween('date', [$from, $to])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'date_from' => $from,
            'date_to'   => $to,
            'summary'   => $summary,
        ]);
    }
}
