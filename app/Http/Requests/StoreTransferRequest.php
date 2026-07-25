<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sender_account_id' => 'required|integer|exists:accounts,id',
            'recipient_wallet_number' => 'required|string|max:20',
            'amount' => 'required|numeric|min:0.01|max:999999999999.99',
            'note' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'sender_account_id.required' => 'Please select a source wallet.',
            'sender_account_id.exists' => 'Selected wallet does not exist.',
            'recipient_wallet_number.required' => 'Please enter the recipient wallet/card number.',
            'recipient_wallet_number.max' => 'Wallet number must not exceed 20 characters.',
            'amount.required' => 'Please enter the transfer amount.',
            'amount.numeric' => 'Amount must be a valid number.',
            'amount.min' => 'Transfer amount must be at least 0.01.',
            'note.max' => 'Note must not exceed 500 characters.',
        ];
    }
}
