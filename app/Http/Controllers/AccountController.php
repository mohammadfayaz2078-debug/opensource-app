<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Account::latest()->get());
    }

    /**
     * Store a newly created account.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:accounts,name'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $account = Account::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Account created successfully.',
            'data' => $account,
        ], 201);
    }

    /**
     * Display the specified account.
     */
    public function show(Account $account)
    {
        return response()->json($account);
    }

    /**
     * Update the specified account.
     */
    public function update(Request $request, Account $account)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('accounts', 'name')->ignore($account->id),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $account->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Account updated successfully.',
            'data' => $account,
        ]);
    }

    /**
     * Remove the specified account.
     */
    public function destroy(Account $account)
    {
        $account->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ]);
    }

    /**
     * Get account transactions.
     */
    public function transactions(Account $account)
    {
        $transactions = $account->transactions()
            ->with('reference')
            ->paginate(20);

        return response()->json($transactions);
    }
}