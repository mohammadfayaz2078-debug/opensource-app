<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReverseTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transfer_id' => 'required|integer|exists:account_transfers,id',
        ];
    }

    public function messages(): array
    {
        return [
            'transfer_id.required' => 'Transfer ID is required.',
            'transfer_id.exists' => 'Transfer not found.',
        ];
    }
}
