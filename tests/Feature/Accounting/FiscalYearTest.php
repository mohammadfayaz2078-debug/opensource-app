<?php

namespace Tests\Feature\Accounting;

use Tests\TestCase;

class FiscalYearTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_fiscal_years(): void
    {
        $response = $this->getJson('/api/fiscal-years');
        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_can_create_fiscal_year(): void
    {
        $response = $this->postJson('/api/fiscal-years', [
            'name' => 'FY 2027',
            'start_date' => '2027-01-01',
            'end_date' => '2027-12-31',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('fiscal_years', [
            'name' => 'FY 2027',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_get_current_fiscal_year(): void
    {
        $response = $this->getJson('/api/fiscal-years/current');
        $response->assertOk();
    }

    public function test_can_close_fiscal_year(): void
    {
        $response = $this->postJson("/api/fiscal-years/{$this->fiscalYear->id}/close");
        $response->assertOk();

        $this->fiscalYear->refresh();
        $this->assertTrue($this->fiscalYear->is_closed);
    }

    public function test_can_open_fiscal_year(): void
    {
        $this->fiscalYear->update(['is_closed' => true]);

        $response = $this->postJson("/api/fiscal-years/{$this->fiscalYear->id}/open");
        $response->assertOk();

        $this->fiscalYear->refresh();
        $this->assertFalse($this->fiscalYear->is_closed);
    }
}
