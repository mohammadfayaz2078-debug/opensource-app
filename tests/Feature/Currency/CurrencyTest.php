<?php

namespace Tests\Feature\Currency;

use Tests\TestCase;
use App\Models\Currency;
use App\Models\CurrencyRate;
use App\Services\CurrencyService;

class CurrencyTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_currencies(): void
    {
        $response = $this->getJson('/api/currencies');
        $response->assertOk();
    }

    public function test_can_create_currency(): void
    {
        $response = $this->postJson('/api/currencies', [
            'code' => 'EUR',
            'name' => 'Euro',
            'symbol' => "\u20ac",
            'is_active' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('currencies', [
            'code' => 'EUR',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_base_currency(): void
    {
        $response = $this->getJson('/api/currencies/base');
        $response->assertOk();
        $response->assertJsonPath('data.id', $this->currency->id);
    }

    public function test_set_base_currency(): void
    {
        $eur = Currency::create([
            'company_id' => $this->company->id,
            'code' => 'EUR',
            'name' => 'Euro',
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/currencies/{$eur->id}/set-base");
        $response->assertOk();

        $this->company->refresh();
        $this->assertEquals($eur->id, $this->company->base_currency_id);
    }

    public function test_exchange_rate_conversion(): void
    {
        $rate = CurrencyRate::create([
            'currency_id' => $this->currency->id,
            'branch_id' => $this->branch->id,
            'rate' => 72.00,
            'inverse_rate' => round(1 / 72, 6),
            'date' => '2026-01-15',
        ]);

        $resolvedRate = CurrencyService::getExchangeRate(
            $this->currency->id,
            '2026-01-15',
            $this->branch->id
        );

        $this->assertNotNull($resolvedRate);
    }

    public function test_to_base_conversion(): void
    {
        $result = CurrencyService::toBase(
            100.00,
            null, // same as base currency
            '2026-01-15',
            $this->branch->id
        );

        $this->assertEquals(1.0, $result['exchange_rate']);
        $this->assertEquals(100.00, $result['amount_base']);
    }

    public function test_same_currency_conversion(): void
    {
        $result = CurrencyService::convertBetween(
            100.00,
            $this->currency->id,
            $this->currency->id,
            '2026-01-15',
            $this->branch->id
        );

        $this->assertEquals(100.00, $result);
    }

    public function test_active_list(): void
    {
        Currency::create([
            'company_id' => $this->company->id,
            'code' => 'EUR',
            'name' => 'Euro',
            'is_active' => true,
        ]);

        Currency::create([
            'company_id' => $this->company->id,
            'code' => 'GBP',
            'name' => 'British Pound',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/currencies/active-list');
        $response->assertOk();
        // Should only include active currencies
    }

    public function test_toggle_currency_active(): void
    {
        $response = $this->postJson("/api/currencies/{$this->currency->id}/toggle-active");
        $response->assertOk();

        $this->currency->refresh();
        $this->assertFalse($this->currency->is_active);
    }

    public function test_store_exchange_rate(): void
    {
        $response = $this->postJson("/api/currencies/{$this->currency->id}/rates", [
            'rate' => 72.00,
            'date' => '2026-01-15',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('currency_rates', [
            'currency_id' => $this->currency->id,
            'rate' => 72.00,
        ]);
    }
}
