<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountWithdrawal;
use App\Models\AccountTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountWithdrawalController extends Controller
{
    public function index()
    {
        return AccountWithdrawal::with('account')
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, &$withdrawal) {

            $account = Account::findOrFail($validated['account_id']);
            
            // Get the current balance before withdrawal
            $balanceBefore = $account->balance;
            $amount = $validated['amount'];
            $balanceAfter = $balanceBefore - $amount;

            if (!$account->hasEnoughBalance($amount)) {
                abort(422, 'Insufficient balance.');
            }

            // Create withdrawal record
            $withdrawal = AccountWithdrawal::create([
                'account_id'  => $account->id,
                'amount'      => $amount,
                'description' => $validated['description'] ?? null,
                'created_by'  => auth()->id(),
            ]);

            // Create transaction log
            AccountTransaction::create([
                'account_id' => $account->id,
                'type' => 'withdrawal',
                'amount' => $amount,
                'balance_after' => $balanceAfter,
                'description' => $validated['description'] ?? 'Withdrawal made',
                'reference_id' => $withdrawal->id,
                'reference_type' => AccountWithdrawal::class,
                'created_by' => auth()->id(),
            ]);

            // Update account balance
            $account->withdraw($amount);
        });

        return response()->json([
            'message' => 'Withdrawal completed successfully.',
            'data' => $withdrawal,
        ], 201);
    }

    public function show(AccountWithdrawal $accountWithdrawal)
    {
        return $accountWithdrawal->load('account');
    }

    public function update(Request $request, AccountWithdrawal $accountWithdrawal)
    {
        return response()->json([
            'message' => 'Updating withdrawals is not allowed.'
        ], 405);
    }

    public function destroy(AccountWithdrawal $accountWithdrawal)
    {
        return response()->json([
            'message' => 'Deleting withdrawals is not allowed.'
        ], 405);
    }
}