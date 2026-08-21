export type HealthStatus =
  | "STOCKOUT_CRITICAL"   // Stock disponible = 0 o días de cobertura críticos (<3 días o < 30% lead time)
  | "REORDER_URGENT"      // Stock disponible <= ROP
  | "OPTIMAL"             // ROP < Stock <= MaxStock
  | "OVERSTOCK"           // Stock > MaxStock o cobertura excesiva (> 90 días)
  | "DEAD_STOCK";         // Stock > 0 pero sin consumo en el periodo histórico

export type ABCClass = "A" | "B" | "C";
export type XYZClass = "X" | "Y" | "Z";

export interface ConsumptionRecord {
  sku: string;
  date: string;       // YYYY-MM-DD or period name
  quantity: number;
}

export interface MaterialItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  supplier: string;
  currentStock: number;
  reservedStock: number;
  inTransitStock: number;
  minLotSize: number;       // MOQ
  serviceLevelTarget: number; // e.g. 0.95 (95%)
  holdingCostRate?: number;   // e.g. 0.20 (20% anual)
  orderCost?: number;         // e.g. $50 por emisión de orden

  // SAP specific parameters (optional comparison)
  sapMrpType?: string;        // DISMM: VB, VM, PD, ND, etc.
  sapSafetyStock?: number;    // EISBE: Stock seguridad actual configurado en SAP
  sapReorderPoint?: number;   // MINBE: Punto de pedido configurado en SAP
  sapLotSizeKey?: string;     // DISLS: EX, FX, HB, etc.
  sapPlant?: string;          // WERKS: Centro
  sapStorageLoc?: string;     // LGORT: Almacén
}

export interface CalculatedMaterial extends MaterialItem {
  // Demand metrics
  totalHistoricalDemand: number;
  periodDays: number;
  avgDailyDemand: number;
  monthlyDemand: number;
  demandStdDev: number;
  coefVariation: number;   // StdDev / Mean (CV)

  // Statistical & MRP Parameters
  zScore: number;
  safetyStock: number;
  reorderPoint: number;
  eoq: number;
  maxStock: number;
  daysOfCoverage: number;

  // Classifications
  annualConsumptionValue: number;
  abcClass: ABCClass;
  xyzClass: XYZClass;
  healthStatus: HealthStatus;

  // Procurement recommendations
  availableStock: number; // currentStock + inTransit - reserved
  stockDeficit: number;   // max(0, ROP - availableStock)
  recommendedOrderQty: number;
  estimatedOrderCost: number;
  overstockUnits: number;
  overstockValue: number;
}

export interface InventorySummary {
  totalSKUs: number;
  totalInventoryValue: number;
  totalHistoricalConsumptionValue: number;
  avgCoverageDays: number;
  
  criticalCount: number;
  criticalValueAtRisk: number;
  
  reorderCount: number;
  totalReorderCost: number;
  
  optimalCount: number;
  optimalValue: number;
  
  overstockCount: number;
  overstockValue: number;
  
  deadStockCount: number;
  deadStockValue: number;

  abcDistribution: {
    A: { count: number; value: number; percentValue: number };
    B: { count: number; value: number; percentValue: number };
    C: { count: number; value: number; percentValue: number };
  };

  xyzDistribution: {
    X: { count: number; items: number };
    Y: { count: number; items: number };
    Z: { count: number; items: number };
  };
}

export interface AiAuditReport {
  executiveSummary: string;
  healthScore: number;
  criticalRisks: Array<{
    title: string;
    description: string;
    severity: "ALTA" | "MEDIA" | "BAJA";
    impact: string;
  }>;
  immediateActions: Array<{
    step: number;
    action: string;
    department: string;
    targetSKUs: string[];
    expectedBenefit: string;
  }>;
  overstockReleaseStrategy: string;
  mrpParameterRecommendations: string;
  financialImpact: {
    potentialSavingsUSD: number;
    preventedLossesUSD: number;
    turnoverImprovement: string;
  };
}

export interface AiMaterialRecommendation {
  diagnostic: string;
  stockoutRiskLevel: "CRÍTICO" | "MODERADO" | "BAJO" | "NULO";
  overstockRiskLevel: "ALTO" | "MODERADO" | "BAJO" | "NULO";
  recommendedAction: "COMPRAR_URGENTE" | "COMPRAR_PROGRAMADO" | "MANTENER" | "DETENER_PEDIDOS" | "REDUCIR_LOTE";
  suggestedOrderQty: number;
  suggestedSafetyStock: number;
  suggestedReorderPoint: number;
  supplierNegotiationTip: string;
  rootCause: string;
  justification: string;
}

export interface SupplierPurchaseGroup {
  supplier: string;
  itemsCount: number;
  subtotalUSD: number;
  items: Array<{
    sku: string;
    name: string;
    orderQty: number;
    unit: string;
    unitCost: number;
    subtotal: number;
    priority: "CRÍTICA_QUIEBRE" | "ALTA" | "MEDIA";
    daysOfCoverage: number;
  }>;
}

export interface SimulationParams {
  leadTimeMultiplier: number;  // 1.0 = normal, 1.2 = +20%
  serviceLevelTarget: number;  // 0.90, 0.95, 0.98, 0.99
  demandMultiplier: number;    // 1.0 = normal, 1.3 = +30%
  orderCostOverride?: number;
  holdingCostRateOverride?: number;
}
