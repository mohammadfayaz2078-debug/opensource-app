<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountDeposit;
use App\Models\AccountTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountDepositController extends Controller
{
    public function index()
    {
        return AccountDeposit::with('account')
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

        DB::transaction(function () use ($validated, &$deposit) {

            $account = Account::findOrFail($validated['account_id']);
            
            // Get the current balance before deposit
            $balanceBefore = $account->balance;
            $amount = $validated['amount'];
            $balanceAfter = $balanceBefore + $amount;

            // Create deposit record
            $deposit = AccountDeposit::create([
                'account_id'  => $account->id,
                'amount'      => $amount,
                'description' => $validated['description'] ?? null,
                'created_by'  => auth()->id(),
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
                'created_by' => auth()->id(),
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