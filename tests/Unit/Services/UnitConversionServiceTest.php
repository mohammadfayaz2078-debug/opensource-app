<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\UnitConversionService;
use App\Models\UnitCategory;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UnitConversionServiceTest extends TestCase
{
    use RefreshDatabase;

    private UnitConversionService $service;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new UnitConversionService();
        $this->company = Company::factory()->create();
    }

    public function test_same_unit_returns_1_factor(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);

        $result = $this->service->getConversionFactor($unit->id, $unit->id, $this->company->id);

        $this->assertEquals(1.0, $result);
    }

    public function test_convert_same_unit_returns_same_quantity(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);

        $result = $this->service->convert(100, $unit->id, $unit->id, $this->company->id);

        $this->assertEquals(100, $result);
    }

    public function test_explicit_conversion_carton_to_piece(): void
    {
        $category = UnitCategory::factory()->create(['company_id' => $this->company->id]);
        $carton = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Carton', 'factor' => 24]);
        $piece = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Piece', 'factor' => 1]);

        UnitConversion::create([
            'company_id' => $this->company->id,
            'from_unit_id' => $carton->id,
            'to_unit_id' => $piece->id,
            'factor' => 24,
            'is_active' => true,
        ]);

        $result = $this->service->convert(5, $carton->id, $piece->id, $this->company->id);

        $this->assertEquals(120, $result);
    }

    public function test_reverse_conversion_piece_to_carton(): void
    {
        $category = UnitCategory::factory()->create(['company_id' => $this->company->id]);
        $carton = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Carton', 'factor' => 24]);
        $piece = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Piece', 'factor' => 1]);

        UnitConversion::create([
            'company_id' => $this->company->id,
            'from_unit_id' => $carton->id,
            'to_unit_id' => $piece->id,
            'factor' => 24,
            'is_active' => true,
        ]);

        $result = $this->service->convert(120, $piece->id, $carton->id, $this->company->id);

        $this->assertEquals(5, $result);
    }

    public function test_factor_ratio_within_same_category(): void
    {
        $category = UnitCategory::factory()->create(['company_id' => $this->company->id, 'measure_type' => 'weight']);
        $kg = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Kilogram', 'factor' => 1]);
        $gram = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'name' => 'Gram', 'factor' => 0.001]);

        // No explicit conversion — should fall back to factor ratio
        $result = $this->service->convert(2, $kg->id, $gram->id, $this->company->id);

        $this->assertEquals(2000, $result);
    }

    public function test_different_category_throws_exception(): void
    {
        $weightCat = UnitCategory::factory()->create(['company_id' => $this->company->id, 'measure_type' => 'weight']);
        $lengthCat = UnitCategory::factory()->create(['company_id' => $this->company->id, 'measure_type' => 'length']);
        $kg = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $weightCat->id, 'factor' => 1]);
        $meter = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $lengthCat->id, 'factor' => 1]);

        $this->expectException(\App\Exceptions\InvalidUnitConversionException::class);

        $this->service->convert(10, $kg->id, $meter->id, $this->company->id);
    }

    public function test_validate_conversion_returns_true_for_valid(): void
    {
        $category = UnitCategory::factory()->create(['company_id' => $this->company->id]);
        $carton = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'factor' => 24]);
        $piece = Unit::factory()->create(['company_id' => $this->company->id, 'category_id' => $category->id, 'factor' => 1]);

        $result = $this->service->validateConversion($carton->id, $piece->id, $this->company->id);

        $this->assertTrue($result);
    }
}
