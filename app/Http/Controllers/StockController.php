<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\StockBalance;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
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

    public function balances(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = StockBalance::with('product')
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('quantity', '>', 0);

        if ($request->filled('search')) {
            $query->whereHas('product', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }

        $perPage = min((int) $request->get('per_page', 50), 200);
        $balances = $query->orderBy('updated_at', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $balances->items(),
            'total'        => $balances->total(),
            'per_page'     => $balances->perPage(),
            'current_page' => $balances->currentPage(),
            'last_page'    => $balances->lastPage(),
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $query = StockTransaction::with(['product', 'creator', 'unit'])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->movement_type);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $query->orderBy('created_at', 'desc');
        $perPage = min((int) $request->get('per_page', 20), 100);
        $transactions = $query->paginate($perPage);

        return response()->json([
            'data'         => $transactions->items(),
            'total'        => $transactions->total(),
            'per_page'     => $transactions->perPage(),
            'current_page' => $transactions->currentPage(),
            'last_page'    => $transactions->lastPage(),
        ]);
    }

    public function productStock(Request $request, int $id): JsonResponse
    {
        $branchId  = $this->resolveBranchId($request);
        $companyId = $this->resolveCompanyId($request);

        $balance = StockBalance::where([
            'company_id' => $companyId,
            'branch_id'  => $branchId,
            'product_id' => $id,
        ])->first();

        $transactions = StockTransaction::where([
            'company_id' => $companyId,
            'branch_id'  => $branchId,
            'product_id' => $id,
        ])->orderBy('created_at', 'desc')
          ->limit(50)
          ->get();

        return response()->json([
            'balance'      => $balance,
            'transactions' => $transactions,
        ]);
    }
}
