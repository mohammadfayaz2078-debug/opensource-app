<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyRecipientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'wallet_number' => 'required|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'wallet_number.required' => 'Please enter the recipient wallet/card number.',
        ];
    }
}
