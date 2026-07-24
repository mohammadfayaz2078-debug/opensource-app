<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Account;
use App\Models\AccountTransfer;
use App\Services\AccountTransferService;
use App\Http\Requests\StoreTransferRequest;
use App\Http\Requests\VerifyRecipientRequest;
use App\Http\Requests\ReverseTransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AccountTransferController extends Controller
{
    private function resolveCompanyId(Request $request): ?int
    {
        $user = auth()->user();
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }
        return AuthHelper::getCompanyId();
    }

    private function resolveBranchId(Request $request): ?int
    {
        $user = auth()->user();
        if ($user instanceof \App\Models\SuperAdmin) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('branch_id') ? (int) $request->branch_id : null;
        }
        return AuthHelper::getBranchId();
    }

    /**
     * List all transfers with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        if (!$companyId) {
            return response()->json(['data' => [], 'total' => 0, 'current_page' => 1, 'last_page' => 1]);
        }

        $query = AccountTransfer::with(['senderAccount', 'receiverAccount', 'createdBy'])
            ->whereHas('senderAccount', function ($q) use ($companyId, $branchId) {
                $q->where('company_id', $companyId);
                if ($branchId) {
                    $q->where('branch_id', $branchId);
                }
            })
            ->orderBy('created_at', 'desc');

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('reference_number')) {
            $query->where('reference_number', 'like', "%{$request->reference_number}%");
        }

        if ($request->filled('sender_wallet_number')) {
            $query->whereHas('senderAccount', function ($q) use ($request) {
                $q->where('wallet_number', 'like', "%{$request->sender_wallet_number}%");
            });
        }

        if ($request->filled('receiver_wallet_number')) {
            $query->whereHas('receiverAccount', function ($q) use ($request) {
                $q->where('wallet_number', 'like', "%{$request->receiver_wallet_number}%");
            });
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->filled('min_amount')) {
            $query->where('amount', '>=', $request->min_amount);
        }

        if ($request->filled('max_amount')) {
            $query->where('amount', '<=', $request->max_amount);
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                  ->orWhere('note', 'like', "%{$search}%")
                  ->orWhereHas('senderAccount', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('wallet_number', 'like', "%{$search}%");
                  })
                  ->orWhereHas('receiverAccount', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('wallet_number', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->get('per_page', 20);
        $transfers = $query->paginate($perPage);

        return response()->json($transfers);
    }

    /**
     * Show a single transfer.
     */
    public function show(int $id): JsonResponse
    {
        $transfer = AccountTransfer::with([
            'senderAccount',
            'receiverAccount',
            'createdBy',
            'originalTransfer',
        ])->findOrFail($id);

        // Load related transactions
        $transactions = \App\Models\AccountTransaction::where('reference_type', AccountTransfer::class)
            ->where('reference_id', $transfer->id)
            ->with('account')
            ->get();

        return response()->json([
            'data' => $transfer,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Verify a recipient wallet by number.
     */
    public function verifyRecipient(VerifyRecipientRequest $request): JsonResponse
    {
        $walletNumber = strtoupper(trim($request->wallet_number));

        $account = AccountTransferService::verifyRecipient($walletNumber);

        if (!$account) {
            return response()->json([
                'message' => 'Wallet not found or inactive.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'message' => 'Recipient verified successfully.',
            'data' => [
                'id' => $account->id,
                'name' => $account->name,
                'wallet_number' => $account->wallet_number,
                'type' => $account->type,
                'is_active' => $account->is_active,
            ],
        ]);
    }

    /**
     * Create a new transfer.
     */
    public function store(StoreTransferRequest $request): JsonResponse
    {
        try {
            $transfer = AccountTransferService::transfer(
                senderAccountId: (int) $request->sender_account_id,
                recipientWalletNumber: strtoupper(trim($request->recipient_wallet_number)),
                amount: (float) $request->amount,
                note: $request->note,
                createdBy: auth()->id()
            );

            return response()->json([
                'message' => 'Transfer completed successfully.',
                'data' => $transfer,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Reverse a completed transfer.
     */
    public function reverse(ReverseTransferRequest $request): JsonResponse
    {
        try {
            $transfer = AccountTransferService::reverse(
                transferId: (int) $request->transfer_id,
                reversedBy: auth()->id()
            );

            return response()->json([
                'message' => 'Transfer reversed successfully.',
                'data' => $transfer,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Get user's own wallets for dropdown.
     */
    public function myWallets(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        if (!$companyId) {
            return response()->json(['data' => []]);
        }

        $accounts = Account::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'wallet_number', 'type', 'balance']);

        return response()->json(['data' => $accounts]);
    }
}
