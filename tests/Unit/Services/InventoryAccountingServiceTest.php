<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryAccountingService;
use App\Models\AccountConfiguration;
use App\Models\AccountConfigurationItem;
use App\Models\PurchaseReceive;
use App\Models\PurchaseReceiveItem;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryAccountingServiceTest extends TestCase
{
    use RefreshDatabase;

    private InventoryAccountingService $service;
    private Company $company;
    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new InventoryAccountingService();
        $this->company = Company::factory()->create();
        $this->branch = Branch::factory()->create(['company_id' => $this->company->id]);
    }

    private function setupAccounts(): void
    {
        $inventoryAsset = ChartOfAccount::factory()->create(['company_id' => $this->company->id, 'code' => '1200']);
        $accountsPayable = ChartOfAccount::factory()->create(['company_id' => $this->company->id, 'code' => '2100']);
        $cogs = ChartOfAccount::factory()->create(['company_id' => $this->company->id, 'code' => '5010']);
        $adjustment = ChartOfAccount::factory()->create(['company_id' => $this->company->id, 'code' => '5030']);

        $config = AccountConfiguration::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);

        AccountConfigurationItem::insert([
            ['configuration_id' => $config->id, 'key' => 'inventory_asset_account_id', 'account_id' => $inventoryAsset->id, 'label' => 'Inventory Asset'],
            ['configuration_id' => $config->id, 'key' => 'accounts_payable_account_id', 'account_id' => $accountsPayable->id, 'label' => 'Accounts Payable'],
            ['configuration_id' => $config->id, 'key' => 'cogs_account_id', 'account_id' => $cogs->id, 'label' => 'COGS'],
            ['configuration_id' => $config->id, 'key' => 'inventory_adjustment_account_id', 'account_id' => $adjustment->id, 'label' => 'Adjustment'],
        ]);
    }

    public function test_purchase_received_creates_journal_entry(): void
    {
        $this->setupAccounts();

        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'document_no' => 'PUR-TEST-001',
            'document_type' => 'bill',
            'document_status' => 'received',
        ]);

        $receive = PurchaseReceive::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'receive_no' => 'RCV-TEST-001',
            'purchase_id' => $purchase->id,
            'status' => 'received',
        ]);

        PurchaseReceiveItem::create([
            'purchase_receive_id' => $receive->id,
            'product_id' => $product->id,
            'quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        $journalEntry = $this->service->purchaseReceived($receive);

        $this->assertNotNull($journalEntry);
        $this->assertEquals(1000.00, (float) $journalEntry->total_debit);
        $this->assertEquals(1000.00, (float) $journalEntry->total_credit);
    }

    public function test_returns_null_without_account_configuration(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);

        $receive = PurchaseReceive::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'receive_no' => 'RCV-TEST-002',
            'status' => 'received',
        ]);

        PurchaseReceiveItem::create([
            'purchase_receive_id' => $receive->id,
            'product_id' => $product->id,
            'quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        $result = $this->service->purchaseReceived($receive);

        $this->assertNull($result);
    }
}
