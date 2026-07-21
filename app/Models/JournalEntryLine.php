<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntryLine extends Model
{
    protected $fillable = [
        'journal_entry_id',
        'branch_id',
        'account_id',
        'account_code',
        'account_name',
        'type',
        'amount',
        'amount_base',
        'description',
        'partner_name',
        'line_order',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'amount_base' => 'decimal:2',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function isDebit(): bool  { return $this->type === 'debit'; }
    public function isCredit(): bool { return $this->type === 'credit'; }
}
