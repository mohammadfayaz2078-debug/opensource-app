<?php

namespace Tests\Feature\Expense;

use Tests\TestCase;
use App\Models\ExpenseType;

class ExpenseTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_can_list_expenses(): void
    {
        $response = $this->getJson('/api/expenses');
        $response->assertOk();
    }

    public function test_can_create_expense(): void
    {
        $expenseType = ExpenseType::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'name' => 'Office Supplies',
        ]);

        $response = $this->postJson('/api/expenses', [
            'expense_type_id' => $expenseType->id,
            'description' => 'Office supplies',
            'amount' => 50.00,
            'date' => '2026-01-15',
            'payment_method' => 'cash',
        ]);

        $response->assertCreated();
    }

    public function test_expense_summary(): void
    {
        $response = $this->getJson('/api/expenses/summary');
        $response->assertOk();
    }
}
