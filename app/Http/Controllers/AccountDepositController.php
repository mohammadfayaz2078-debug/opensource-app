<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountDeposit;
use App\Models\AccountTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AccountDepositController extends Controller
{
    public function index()
    {
        $deposits = AccountDeposit::with('account')
            ->whereHas('account', fn ($accounts) => $accounts->accessibleTo(auth()->user()))
            ->latest()
            ->get();

        return response()->json(['data' => $deposits]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_id'  => 'required|exists:accounts,id',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, &$deposit) {

            $account = Account::accessibleTo(auth()->user())->lockForUpdate()->findOrFail($validated['account_id']);
            
            // Get the current balance before deposit
            $balanceBefore = $account->balance;
            $amount = $validated['amount'];
            $balanceAfter = $balanceBefore + $amount;

            // Create deposit record
            $deposit = AccountDeposit::create([
                'account_id'  => $account->id,
                'amount'      => $amount,
                'description' => $validated['description'] ?? null,
                'created_by'  => auth()->user() instanceof User ? auth()->id() : null,
            ]);

            // Create transaction log
            AccountTransaction::create([
                'account_id' => $account->id,
                'type' => 'deposit',
                'amount' => $amount,
                'balance_after' => $balanceAfter,
                'description' => $validated['description'] ?? 'Deposit made',
                'reference_id' => $deposit->id,
                'reference_type' => AccountDeposit::class,
                'created_by' => auth()->user() instanceof User ? auth()->id() : null,
            ]);

            // Update account balance
            $account->deposit($amount);
        });

        return response()->json([
            'message' => 'Deposit completed successfully.',
            'data' => $deposit,
        ], 201);
    }

    public function show(AccountDeposit $accountDeposit)
    {
        abort_unless(
            Account::accessibleTo(auth()->user())->whereKey($accountDeposit->account_id)->exists(),
            404
        );
        return $accountDeposit->load('account');
    }

    public function update(Request $request, AccountDeposit $accountDeposit)
    {
        return response()->json([
            'message' => 'Updating deposits is not allowed.'
        ], 405);
    }

    public function destroy(AccountDeposit $accountDeposit)
    {
        return response()->json([
            'message' => 'Deleting deposits is not allowed.'
        ], 405);
    }
}
