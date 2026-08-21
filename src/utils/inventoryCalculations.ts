import {
  MaterialItem,
  ConsumptionRecord,
  CalculatedMaterial,
  InventorySummary,
  ABCClass,
  XYZClass,
  HealthStatus,
  SimulationParams,
} from "../types";

/**
 * Standard Normal Distribution Z-Score mapping for common Service Levels
 */
export function getZScore(serviceLevel: number): number {
  if (serviceLevel >= 0.999) return 3.09;
  if (serviceLevel >= 0.99) return 2.33;
  if (serviceLevel >= 0.98) return 2.05;
  if (serviceLevel >= 0.95) return 1.645;
  if (serviceLevel >= 0.90) return 1.282;
  if (serviceLevel >= 0.85) return 1.036;
  if (serviceLevel >= 0.80) return 0.842;
  if (serviceLevel >= 0.75) return 0.674;
  return 1.282; // Default ~90%
}

/**
 * Calculates consumption statistics for a given material SKU
 */
export function calculateDemandStats(
  sku: string,
  consumptions: ConsumptionRecord[],
  defaultDays: number = 90
) {
  const itemConsumptions = consumptions.filter((c) => c.sku === sku);

  if (itemConsumptions.length === 0) {
    return {
      totalHistoricalDemand: 0,
      periodDays: defaultDays,
      avgDailyDemand: 0,
      monthlyDemand: 0,
      demandStdDev: 0,
      coefVariation: 0,
    };
  }

  // Group quantities or calculate daily averages
  const quantities = itemConsumptions.map((c) => Math.max(0, c.quantity));
  const total = quantities.reduce((acc, q) => acc + q, 0);

  // Period length (number of records or span of days)
  const periodDays = Math.max(quantities.length, defaultDays);
  const avgDaily = total / periodDays;
  const monthlyDemand = avgDaily * 30;

  // Standard deviation of daily consumption
  const variance =
    quantities.reduce((acc, q) => acc + Math.pow(q - avgDaily, 2), 0) /
    Math.max(1, quantities.length);
  const demandStdDev = Math.sqrt(variance);

  // Coefficient of Variation (CV = sigma / mu)
  const coefVariation = avgDaily > 0 ? demandStdDev / avgDaily : 0;

  return {
    totalHistoricalDemand: total,
    periodDays,
    avgDailyDemand: Number(avgDaily.toFixed(3)),
    monthlyDemand: Number(monthlyDemand.toFixed(2)),
    demandStdDev: Number(demandStdDev.toFixed(3)),
    coefVariation: Number(coefVariation.toFixed(3)),
  };
}

/**
 * Main Inventory Calculation Engine
 */
export function calculateInventoryMetrics(
  materials: MaterialItem[],
  consumptions: ConsumptionRecord[],
  simulation?: SimulationParams
): {
  calculatedMaterials: CalculatedMaterial[];
  summary: InventorySummary;
} {
  const effectiveLeadTimeMult = simulation?.leadTimeMultiplier ?? 1.0;
  const effectiveDemandMult = simulation?.demandMultiplier ?? 1.0;
  const globalServiceLevel = simulation?.serviceLevelTarget;
  const globalOrderCost = simulation?.orderCostOverride;
  const globalHoldingRate = simulation?.holdingCostRateOverride;

  // 1. Initial Pass: Calculate demand and basic variables per item
  const intermediateList = materials.map((item) => {
    const stats = calculateDemandStats(item.sku, consumptions);
    const adjustedDailyDemand = stats.avgDailyDemand * effectiveDemandMult;
    const adjustedStdDev = stats.demandStdDev * Math.sqrt(effectiveDemandMult);
    const annualDemand = adjustedDailyDemand * 365;

    const leadTime = Math.max(1, Math.round(item.leadTimeDays * effectiveLeadTimeMult));
    const serviceLevel = globalServiceLevel ?? item.serviceLevelTarget ?? 0.95;
    const zScore = getZScore(serviceLevel);

    // Safety Stock: SS = Z * sigma_d * sqrt(LeadTime)
    const rawSafetyStock = zScore * adjustedStdDev * Math.sqrt(leadTime);
    // If no variance detected but has demand, use minimum buffer of 20% lead time demand
    const fallbackSafetyStock = adjustedDailyDemand > 0 ? adjustedDailyDemand * Math.max(2, leadTime * 0.2) : 0;
    const safetyStock = Math.ceil(Math.max(rawSafetyStock, fallbackSafetyStock));

    // Reorder Point: ROP = (d_bar * LeadTime) + SafetyStock
    const leadTimeDemand = adjustedDailyDemand * leadTime;
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

    // Economic Order Quantity (EOQ): sqrt( (2 * D * S) / H )
    const orderCost = globalOrderCost ?? item.orderCost ?? 45;
    const holdingRate = globalHoldingRate ?? item.holdingCostRate ?? 0.22;
    const holdingCostPerUnit = Math.max(0.01, item.unitCost * holdingRate);

    let rawEoq = 0;
    if (annualDemand > 0 && holdingCostPerUnit > 0) {
      rawEoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
    }
    // MOQ & EOQ alignment
    const eoq = Math.max(item.minLotSize || 1, Math.ceil(rawEoq));

    // Maximum Stock level: ROP + EOQ (or 2x ROP for high lead-time materials)
    const maxStock = Math.max(reorderPoint + eoq, Math.ceil(reorderPoint * 1.5));

    // Stock Disponibility & Days of Coverage
    const availableStock = Math.max(0, item.currentStock + item.inTransitStock - item.reservedStock);
    const daysOfCoverage =
      adjustedDailyDemand > 0
        ? Math.round(availableStock / adjustedDailyDemand)
        : item.currentStock > 0
        ? 999
        : 0;

    // XYZ Classification based on CV
    let xyzClass: XYZClass = "X";
    if (stats.coefVariation > 0.50) {
      xyzClass = "Z"; // High variability / erratic
    } else if (stats.coefVariation > 0.20) {
      xyzClass = "Y"; // Moderate variability
    } else {
      xyzClass = "X"; // Stable & predictable
    }

    // Health Status determination
    let healthStatus: HealthStatus = "OPTIMAL";
    if (stats.totalHistoricalDemand === 0 && item.currentStock > 0) {
      healthStatus = "DEAD_STOCK";
    } else if (availableStock <= 0 || (daysOfCoverage < Math.max(3, leadTime * 0.35) && availableStock < safetyStock)) {
      healthStatus = "STOCKOUT_CRITICAL";
    } else if (availableStock <= reorderPoint) {
      healthStatus = "REORDER_URGENT";
    } else if (availableStock > maxStock || (daysOfCoverage > 120 && item.currentStock > reorderPoint)) {
      healthStatus = "OVERSTOCK";
    } else {
      healthStatus = "OPTIMAL";
    }

    // Order Recommendation
    let stockDeficit = 0;
    let recommendedOrderQty = 0;
    if (availableStock <= reorderPoint) {
      stockDeficit = Math.max(0, reorderPoint - availableStock);
      // Order at least EOQ or MOQ to reach MaxStock
      const targetShortfall = Math.max(0, maxStock - availableStock);
      const minBatch = Math.max(item.minLotSize || 1, eoq);
      recommendedOrderQty = Math.ceil(Math.max(minBatch, targetShortfall));
      // Round to MOQ multiples if required
      if (item.minLotSize > 1) {
        recommendedOrderQty = Math.ceil(recommendedOrderQty / item.minLotSize) * item.minLotSize;
      }
    }

    const estimatedOrderCost = recommendedOrderQty * item.unitCost;

    // Overstock Capital Calculation
    let overstockUnits = 0;
    if (item.currentStock > maxStock) {
      overstockUnits = item.currentStock - maxStock;
    }
    const overstockValue = overstockUnits * item.unitCost;

    // Annual consumption value for ABC Pareto
    const annualConsumptionValue = annualDemand * item.unitCost;

    return {
      ...item,
      totalHistoricalDemand: stats.totalHistoricalDemand,
      periodDays: stats.periodDays,
      avgDailyDemand: adjustedDailyDemand,
      monthlyDemand: adjustedDailyDemand * 30,
      demandStdDev: adjustedStdDev,
      coefVariation: stats.coefVariation,
      zScore,
      safetyStock,
      reorderPoint,
      eoq,
      maxStock,
      daysOfCoverage,
      availableStock,
      stockDeficit,
      recommendedOrderQty,
      estimatedOrderCost,
      overstockUnits,
      overstockValue,
      annualConsumptionValue,
      xyzClass,
      healthStatus,
      abcClass: "C" as ABCClass, // Will be computed next
    };
  });

  // 2. ABC Classification via Pareto Analysis (80% / 15% / 5%)
  // Sort descending by annual consumption value (or total inventory value if consumption is 0)
  const sorted = [...intermediateList].sort(
    (a, b) => (b.annualConsumptionValue || b.currentStock * b.unitCost) - (a.annualConsumptionValue || a.currentStock * a.unitCost)
  );

  const totalValueSum = sorted.reduce(
    (acc, it) => acc + (it.annualConsumptionValue || it.currentStock * it.unitCost),
    0
  );

  let cumulativeVal = 0;
  const calculatedMaterials: CalculatedMaterial[] = sorted.map((item) => {
    const itemVal = item.annualConsumptionValue || item.currentStock * item.unitCost;
    cumulativeVal += itemVal;
    const cumPct = totalValueSum > 0 ? (cumulativeVal / totalValueSum) * 100 : 100;

    let abcClass: ABCClass = "C";
    if (cumPct <= 80) {
      abcClass = "A";
    } else if (cumPct <= 95) {
      abcClass = "B";
    } else {
      abcClass = "C";
    }

    return {
      ...item,
      abcClass,
    };
  });

  // 3. Inventory Summary Calculation
  const totalSKUs = calculatedMaterials.length;
  let totalInventoryValue = 0;
  let totalHistoricalConsumptionValue = 0;
  let coverageSum = 0;
  let validCoverageCount = 0;

  let criticalCount = 0;
  let criticalValueAtRisk = 0;

  let reorderCount = 0;
  let totalReorderCost = 0;

  let optimalCount = 0;
  let optimalValue = 0;

  let overstockCount = 0;
  let overstockValSum = 0;

  let deadStockCount = 0;
  let deadStockValSum = 0;

  const abcCounts = {
    A: { count: 0, value: 0, percentValue: 0 },
    B: { count: 0, value: 0, percentValue: 0 },
    C: { count: 0, value: 0, percentValue: 0 },
  };

  const xyzCounts = {
    X: { count: 0, items: 0 },
    Y: { count: 0, items: 0 },
    Z: { count: 0, items: 0 },
  };

  for (const m of calculatedMaterials) {
    const currentVal = m.currentStock * m.unitCost;
    totalInventoryValue += currentVal;
    totalHistoricalConsumptionValue += m.annualConsumptionValue;

    if (m.daysOfCoverage < 900) {
      coverageSum += m.daysOfCoverage;
      validCoverageCount++;
    }

    abcCounts[m.abcClass].count++;
    abcCounts[m.abcClass].value += currentVal;

    xyzCounts[m.xyzClass].items++;

    switch (m.healthStatus) {
      case "STOCKOUT_CRITICAL":
        criticalCount++;
        criticalValueAtRisk += m.monthlyDemand * m.unitCost; // Estimated lost output / risk
        break;
      case "REORDER_URGENT":
        reorderCount++;
        totalReorderCost += m.estimatedOrderCost;
        break;
      case "OPTIMAL":
        optimalCount++;
        optimalValue += currentVal;
        break;
      case "OVERSTOCK":
        overstockCount++;
        overstockValSum += m.overstockValue;
        break;
      case "DEAD_STOCK":
        deadStockCount++;
        deadStockValSum += currentVal;
        break;
    }
  }

  // Calculate ABC Percentages
  if (totalInventoryValue > 0) {
    abcCounts.A.percentValue = Number(((abcCounts.A.value / totalInventoryValue) * 100).toFixed(1));
    abcCounts.B.percentValue = Number(((abcCounts.B.value / totalInventoryValue) * 100).toFixed(1));
    abcCounts.C.percentValue = Number(((abcCounts.C.value / totalInventoryValue) * 100).toFixed(1));
  }

  const summary: InventorySummary = {
    totalSKUs,
    totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
    totalHistoricalConsumptionValue: Number(totalHistoricalConsumptionValue.toFixed(2)),
    avgCoverageDays: validCoverageCount > 0 ? Math.round(coverageSum / validCoverageCount) : 0,
    criticalCount,
    criticalValueAtRisk: Number(criticalValueAtRisk.toFixed(2)),
    reorderCount,
    totalReorderCost: Number(totalReorderCost.toFixed(2)),
    optimalCount,
    optimalValue: Number(optimalValue.toFixed(2)),
    overstockCount,
    overstockValue: Number(overstockValSum.toFixed(2)),
    deadStockCount,
    deadStockValue: Number(deadStockValSum.toFixed(2)),
    abcDistribution: abcCounts,
    xyzDistribution: xyzCounts,
  };

  return { calculatedMaterials, summary };
}
