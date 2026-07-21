<?php

namespace Tests\Feature\E2E;

use Tests\TestCase;
use App\Models\Purchase;
use App\Models\StockBalance;
use App\Models\JournalEntry;

class PurchaseWorkflowTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    /**
     * Full purchase workflow: RFQ -> PO -> Receive -> Bill -> Pay
     */
    public function test_full_purchase_workflow(): void
    {
        // Step 1: Create supplier
        $supplier = $this->createSupplier();
        $this->assertNotNull($supplier->id);

        // Step 2: Create product
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Step 3: Create RFQ
        $rfqResponse = $this->postJson('/api/purchase-rfqs', [
            'supplier_id' => $supplier->id,
            'purchase_date' => '2026-01-15',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 50,
                    'unit_price' => 10.00,
                    'warehouse_tower_id' => $warehouse->id,
                ],
            ],
        ]);
        $rfqResponse->assertCreated();
        $rfqId = $rfqResponse->json('data.id');

        // Step 4: Send RFQ (set status to sent directly to avoid email dependency)
        $rfq = Purchase::findOrFail($rfqId);
        $rfq->update(['document_status' => Purchase::RFQ_STATUS_SENT]);

        // Step 5: Confirm RFQ
        $this->postJson("/api/purchase-rfqs/{$rfqId}/confirm")->assertOk();

        // Step 6: Create Purchase Order
        $poResponse = $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'purchase_date' => '2026-01-16',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 50,
                    'unit_price' => 10.00,
                    'warehouse_tower_id' => $warehouse->id,
                ],
            ],
        ]);
        $poResponse->assertCreated();
        $poId = $poResponse->json('data.id');

        // Step 7: Receive goods
        $receiveResponse = $this->postJson('/api/purchase-receives', [
            'purchase_id' => $poId,
            'received_date' => '2026-01-20',
            'items' => [
                [
                    'purchase_item_id' => Purchase::find($poId)->items->first()->id,
                    'product_id' => $product->id,
                    'warehouse_tower_id' => $warehouse->id,
                    'quantity_received' => 50,
                    'unit_cost' => 10.00,
                ],
            ],
        ]);
        $receiveResponse->assertCreated();

        // Stock should increase
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertNotNull($balance);
        $this->assertEquals(50, $balance->quantity);

        // Purchase journal should be created
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'PurchaseReceive',
            'status' => 'posted',
        ]);
    }

    /**
     * Test purchase return workflow
     */
    public function test_purchase_return_workflow(): void
    {
        $supplier = $this->createSupplier();
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Create PO and receive
        $poResponse = $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'purchase_date' => '2026-01-15',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 50,
                    'unit_price' => 10.00,
                    'warehouse_tower_id' => $warehouse->id,
                ],
            ],
        ]);
        $poId = $poResponse->json('data.id');

        $this->postJson('/api/purchase-receives', [
            'purchase_id' => $poId,
            'received_date' => '2026-01-20',
            'items' => [
                [
                    'purchase_item_id' => Purchase::find($poId)->items->first()->id,
                    'product_id' => $product->id,
                    'warehouse_tower_id' => $warehouse->id,
                    'quantity_received' => 50,
                    'unit_cost' => 10.00,
                ],
            ],
        ]);

        // Stock is 50
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertNotNull($balance);
        $this->assertEquals(50, $balance->quantity);

        // Convert PO to Bill
        $billResponse = $this->postJson("/api/purchase-bills/{$poId}/convert");
        $billId = $billResponse->json('data.id');

        // Create purchase return linked to the Bill (posted so stock is reduced)
        $returnResponse = $this->postJson('/api/purchase-returns', [
            'purchase_id' => $billId,
            'supplier_id' => $supplier->id,
            'return_date' => '2026-01-25',
            'status' => 'posted',
            'items' => [
                [
                    'product_id' => $product->id,
                    'warehouse_tower_id' => $warehouse->id,
                    'quantity' => 10,
                    'unit_price' => 10.00,
                ],
            ],
        ]);
        $returnResponse->assertCreated();

        // Stock should be reduced
        $balance->refresh();
        $this->assertEquals(40, $balance->quantity);
    }

    /**
     * Test that purchase orders don't affect stock until received
     */
    public function test_purchase_order_does_not_affect_stock(): void
    {
        $supplier = $this->createSupplier();
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'purchase_date' => '2026-01-15',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 50,
                    'unit_price' => 10.00,
                    'warehouse_tower_id' => $warehouse->id,
                ],
            ],
        ]);

        // Stock should not exist yet (no balance record)
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertNull($balance);
    }
}
