<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountWithdrawal;
use App\Models\AccountTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AccountWithdrawalController extends Controller
{
    public function index()
    {
        $withdrawals = AccountWithdrawal::with('account')
            ->whereHas('account', fn ($accounts) => $accounts->accessibleTo(auth()->user()))
            ->latest()
            ->get();

        return response()->json(['data' => $withdrawals]);
    }

    public function store(Request $request)
    {
        $actor = auth()->user();
        $validated = $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $actor, &$withdrawal) {

            $account = Account::accessibleTo($actor)
                ->lockForUpdate()
                ->findOrFail($validated['account_id']);
            
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
                'created_by'  => $actor instanceof User ? $actor->id : null,
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
                'created_by' => $actor instanceof User ? $actor->id : null,
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
        abort_unless(
            Account::accessibleTo(auth()->user())->whereKey($accountWithdrawal->account_id)->exists(),
            404
        );
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
