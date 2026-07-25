<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountTransfer;
use App\Models\AccountTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountTransferService
{
    /**
     * Verify a recipient wallet by wallet number.
     */
    public static function verifyRecipient(string $walletNumber): ?Account
    {
        return Account::where('wallet_number', $walletNumber)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Generate a unique reference number for transfers.
     * Format: TRF-YYYYMMDD-XXXXXX
     */
    public static function generateReferenceNumber(): string
    {
        $date = now()->format('Ymd');
        $prefix = "TRF-{$date}-";

        $lastTransfer = AccountTransfer::where('reference_number', 'like', "{$prefix}%")
            ->orderByDesc('reference_number')
            ->first();

        if ($lastTransfer) {
            $lastSequence = (int) substr($lastTransfer->reference_number, -6);
            $nextSequence = $lastSequence + 1;
        } else {
            $nextSequence = 1;
        }

        return $prefix . str_pad($nextSequence, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Execute a wallet-to-wallet transfer.
     */
    public static function transfer(
        int $senderAccountId,
        string $recipientWalletNumber,
        float $amount,
        ?string $note = null,
        ?int $createdBy = null
    ): AccountTransfer {
        // Validate amount
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Transfer amount must be greater than zero.',
            ]);
        }

        // Find sender account
        $sender = Account::lockForUpdate()->find($senderAccountId);
        if (!$sender) {
            throw ValidationException::withMessages([
                'sender_account_id' => 'Sender wallet not found.',
            ]);
        }

        if (!$sender->is_active) {
            throw ValidationException::withMessages([
                'sender_account_id' => 'Sender wallet is inactive.',
            ]);
        }

        // Find recipient account
        $recipient = Account::lockForUpdate()
            ->where('wallet_number', $recipientWalletNumber)
            ->first();

        if (!$recipient) {
            throw ValidationException::withMessages([
                'recipient_wallet_number' => 'Recipient wallet not found.',
            ]);
        }

        if (!$recipient->is_active) {
            throw ValidationException::withMessages([
                'recipient_wallet_number' => 'Recipient wallet is inactive.',
            ]);
        }

        // Same wallet check
        if ($sender->id === $recipient->id) {
            throw ValidationException::withMessages([
                'recipient_wallet_number' => 'Cannot transfer to the same wallet.',
            ]);
        }

        // Sufficient balance check
        if (!$sender->hasEnoughBalance($amount)) {
            throw ValidationException::withMessages([
                'amount' => 'Insufficient balance. Available: ' . number_format($sender->balance, 2),
            ]);
        }

        return DB::transaction(function () use ($sender, $recipient, $amount, $note, $createdBy) {
            // Re-lock both rows inside the transaction
            $sender = Account::lockForUpdate()->find($sender->id);
            $recipient = Account::lockForUpdate()->find($recipient->id);

            // Double-check after lock
            if (!$sender->hasEnoughBalance($amount)) {
                throw ValidationException::withMessages([
                    'amount' => 'Insufficient balance. Available: ' . number_format($sender->balance, 2),
                ]);
            }

            $senderBalanceBefore = (float) $sender->balance;
            $recipientBalanceBefore = (float) $recipient->balance;
            $senderBalanceAfter = $senderBalanceBefore - $amount;
            $recipientBalanceAfter = $recipientBalanceBefore + $amount;

            // Create transfer record
            $transfer = AccountTransfer::create([
                'reference_number' => self::generateReferenceNumber(),
                'sender_account_id' => $sender->id,
                'receiver_account_id' => $recipient->id,
                'amount' => $amount,
                'note' => $note,
                'status' => AccountTransfer::STATUS_COMPLETED,
                'created_by' => $createdBy,
            ]);

            // Create sender transaction (debit)
            AccountTransaction::create([
                'account_id' => $sender->id,
                'type' => 'transfer',
                'amount' => $amount,
                'balance_after' => $senderBalanceAfter,
                'description' => "Transfer to {$recipient->wallet_number} ({$recipient->name})",
                'reference_id' => $transfer->id,
                'reference_type' => AccountTransfer::class,
                'created_by' => $createdBy,
            ]);

            // Create recipient transaction (credit)
            AccountTransaction::create([
                'account_id' => $recipient->id,
                'type' => 'transfer',
                'amount' => $amount,
                'balance_after' => $recipientBalanceAfter,
                'description' => "Transfer from {$sender->wallet_number} ({$sender->name})",
                'reference_id' => $transfer->id,
                'reference_type' => AccountTransfer::class,
                'created_by' => $createdBy,
            ]);

            // Update balances
            $sender->withdraw($amount);
            $recipient->deposit($amount);

            return $transfer->load(['senderAccount', 'receiverAccount', 'createdBy']);
        });
    }

    /**
     * Reverse a completed transfer.
     */
    public static function reverse(
        int $transferId,
        ?int $reversedBy = null
    ): AccountTransfer {
        $original = AccountTransfer::with(['senderAccount', 'receiverAccount'])
            ->findOrFail($transferId);

        if (!$original->canBeReversed()) {
            throw ValidationException::withMessages([
                'transfer' => 'This transfer cannot be reversed.',
            ]);
        }

        return DB::transaction(function () use ($original, $reversedBy) {
            // Lock both accounts
            $sender = Account::lockForUpdate()->find($original->sender_account_id);
            $recipient = Account::lockForUpdate()->find($original->receiver_account_id);

            // Check recipient has enough balance to reverse
            if (!$recipient->hasEnoughBalance((float) $original->amount)) {
                throw ValidationException::withMessages([
                    'transfer' => 'Recipient wallet has insufficient balance to reverse this transfer.',
                ]);
            }

            $senderBalanceBefore = (float) $sender->balance;
            $recipientBalanceBefore = (float) $recipient->balance;
            $senderBalanceAfter = $senderBalanceBefore + (float) $original->amount;
            $recipientBalanceAfter = $recipientBalanceBefore - (float) $original->amount;

            // Create reverse transfer record
            $reverseTransfer = AccountTransfer::create([
                'reference_number' => self::generateReferenceNumber(),
                'sender_account_id' => $original->receiver_account_id,
                'receiver_account_id' => $original->sender_account_id,
                'amount' => $original->amount,
                'note' => "Reversal of {$original->reference_number}",
                'status' => AccountTransfer::STATUS_COMPLETED,
                'created_by' => $reversedBy,
                'original_transfer_id' => $original->id,
            ]);

            // Create sender transaction (credit - money comes back)
            AccountTransaction::create([
                'account_id' => $sender->id,
                'type' => 'transfer',
                'amount' => (float) $original->amount,
                'balance_after' => $senderBalanceAfter,
                'description' => "Reversal of transfer {$original->reference_number}",
                'reference_id' => $reverseTransfer->id,
                'reference_type' => AccountTransfer::class,
                'created_by' => $reversedBy,
            ]);

            // Create recipient transaction (debit - money goes back)
            AccountTransaction::create([
                'account_id' => $recipient->id,
                'type' => 'transfer',
                'amount' => (float) $original->amount,
                'balance_after' => $recipientBalanceAfter,
                'description' => "Reversal of transfer {$original->reference_number}",
                'reference_id' => $reverseTransfer->id,
                'reference_type' => AccountTransfer::class,
                'created_by' => $reversedBy,
            ]);

            // Update balances
            $recipient->withdraw((float) $original->amount);
            $sender->deposit((float) $original->amount);

            // Mark original as reversed
            $original->update([
                'status' => AccountTransfer::STATUS_REVERSED,
                'reversed_by' => $reversedBy,
                'reversed_at' => now(),
            ]);

            return $reverseTransfer->load(['senderAccount', 'receiverAccount', 'createdBy', 'originalTransfer']);
        });
    }
}
