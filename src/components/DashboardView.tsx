import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShoppingCart,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
  DollarSign,
  AlertOctagon,
  Boxes,
} from "lucide-react";
import { CalculatedMaterial, InventorySummary } from "../types";

interface DashboardViewProps {
  summary: InventorySummary;
  materials: CalculatedMaterial[];
  selectedStorageLoc?: string;
  onOpenAiAudit: () => void;
  onNavigateToMaterials: (filterStatus?: string, filterAbc?: string, filterXyz?: string) => void;
  onSelectMaterial: (material: CalculatedMaterial) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  materials,
  selectedStorageLoc = "L001",
  onOpenAiAudit,
  onNavigateToMaterials,
  onSelectMaterial,
}) => {
  // Top 5 Critical stockout items
  const criticalItems = materials
    .filter((m) => m.healthStatus === "STOCKOUT_CRITICAL")
    .sort((a, b) => a.daysOfCoverage - b.daysOfCoverage)
    .slice(0, 5);

  // Top 5 Overstocked items by excess value
  const overstockedItems = materials
    .filter((m) => m.healthStatus === "OVERSTOCK")
    .sort((a, b) => b.overstockValue - a.overstockValue)
    .slice(0, 5);

  // 9-Box ABC-XYZ Grid Matrix items calculation
  const matrixGrid: Record<string, { count: number; value: number }> = {};
  ["A", "B", "C"].forEach((abc) => {
    ["X", "Y", "Z"].forEach((xyz) => {
      const key = `${abc}-${xyz}`;
      const matching = materials.filter((m) => m.abcClass === abc && m.xyzClass === xyz);
      const val = matching.reduce((sum, it) => sum + it.currentStock * it.unitCost, 0);
      matrixGrid[key] = { count: matching.length, value: val };
    });
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner: AI Overview & Quick Callout */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Motor Inteligente de Aprovisionamiento & MRP
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Control de Inventario y Prevención de Quiebres
            </h1>
            <p className="text-sm text-slate-300">
              Cálculo estocástico de Stock de Seguridad ($SS = Z \times \sigma_L$), Punto de Reorden ($ROP$), Lote Económico ($EOQ$) y Clasificación Multicriterio ABC-XYZ en tiempo real.
            </p>
          </div>

          <button
            id="btn-run-full-ai-audit"
            onClick={onOpenAiAudit}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ejecutar Auditoría IA Completa</span>
          </button>
        </div>

        {/* Subtle Background Glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Valor Total Almacén */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              Inventario Valorizado ({selectedStorageLoc})
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                USD ($)
              </span>
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              ${summary.totalInventoryValue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{summary.totalSKUs} SKUs en {selectedStorageLoc}</span>
              <span>•</span>
              <span>Cobertura media: {summary.avgCoverageDays}d</span>
            </div>
          </div>
        </div>

        {/* Card 2: Quiebres / Ruptura Inminente */}
        <div 
          onClick={() => onNavigateToMaterials("STOCKOUT_CRITICAL")}
          className="bg-slate-900/90 border border-rose-900/40 hover:border-rose-500/60 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              Quiebre Inminente
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 flex items-baseline gap-2">
              {summary.criticalCount} SKUs
              <span className="text-xs font-normal text-rose-300/80">
                (${summary.criticalValueAtRisk.toLocaleString("es-ES")} en riesgo)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Materiales con stock = 0 o cobertura inferior al 35% del Lead Time.
            </p>
          </div>
        </div>

        {/* Card 3: Sobre-Inventario Atrapado */}
        <div 
          onClick={() => onNavigateToMaterials("OVERSTOCK")}
          className="bg-slate-900/90 border border-purple-900/40 hover:border-purple-500/60 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Sobre-Inventario
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-400">
              ${summary.overstockValue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <span className="font-semibold text-purple-300">{summary.overstockCount} SKUs excedentes</span>
              <span>•</span>
              <span>Stock &gt; Stock Máximo</span>
            </div>
          </div>
        </div>

        {/* Card 4: En Punto de Reorden (Compras Requeridas) */}
        <div 
          onClick={() => onNavigateToMaterials("REORDER_URGENT")}
          className="bg-slate-900/90 border border-amber-900/40 hover:border-amber-500/60 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              En Punto de Reorden
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400">
              {summary.reorderCount} SKUs
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <span className="font-semibold text-amber-300">${summary.totalReorderCost.toLocaleString("es-ES")}</span>
              <span>estimado de compra</span>
            </div>
          </div>
        </div>

      </div>

      {/* Health Distribution Progress Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Estado de Salud del Almacén</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Quiebres ({summary.criticalCount})
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Reorden ({summary.reorderCount})
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Óptimo ({summary.optimalCount})
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Sobre-Stock ({summary.overstockCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              Sin Movimiento ({summary.deadStockCount})
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
          {summary.totalSKUs > 0 && (
            <>
              <div
                style={{ width: `${(summary.criticalCount / summary.totalSKUs) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Quiebres: ${summary.criticalCount}`}
              />
              <div
                style={{ width: `${(summary.reorderCount / summary.totalSKUs) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Reorden: ${summary.reorderCount}`}
              />
              <div
                style={{ width: `${(summary.optimalCount / summary.totalSKUs) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Óptimo: ${summary.optimalCount}`}
              />
              <div
                style={{ width: `${(summary.overstockCount / summary.totalSKUs) * 100}%` }}
                className="bg-purple-500 h-full transition-all"
                title={`Sobre-Stock: ${summary.overstockCount}`}
              />
              <div
                style={{ width: `${(summary.deadStockCount / summary.totalSKUs) * 100}%` }}
                className="bg-slate-600 h-full transition-all"
                title={`Sin Movimiento: ${summary.deadStockCount}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Main Dual Section: Top Critical / Overstock + ABC-XYZ Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Top Actionables (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Quiebres Inminentes */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Alertas de Quiebre Crítico</h3>
                  <p className="text-xs text-slate-400">Materiales que requieren compra urgente inmediata</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToMaterials("STOCKOUT_CRITICAL")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Ver todos ({summary.criticalCount})
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {criticalItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs">
                  ✓ No hay materiales en quiebre crítico en este momento.
                </div>
              ) : (
                criticalItems.map((item) => (
                  <div
                    key={item.sku}
                    onClick={() => onSelectMaterial(item)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-rose-950/50 hover:border-rose-500/40 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-400 font-mono">{item.sku}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-semibold">
                          {item.daysOfCoverage}d cobertura
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                          Clase {item.abcClass}-{item.xyzClass}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition">
                        {item.name}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-white">
                        Stock: {item.currentStock} / ROP: {item.reorderPoint}
                      </div>
                      <div className="text-[11px] text-amber-400 font-medium">
                        Pedir: +{item.recommendedOrderQty} {item.unit}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Sobre-Inventario Atrapado */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Mayor Sobre-Inventario (Capital Excedente)</h3>
                  <p className="text-xs text-slate-400">Materiales con stock por encima del límite máximo económico</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToMaterials("OVERSTOCK")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Ver todos ({summary.overstockCount})
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {overstockedItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs">
                  ✓ No se detecta sobre-inventario severo en el almacén.
                </div>
              ) : (
                overstockedItems.map((item) => (
                  <div
                    key={item.sku}
                    onClick={() => onSelectMaterial(item)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-purple-950/50 hover:border-purple-500/40 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-purple-400 font-mono">{item.sku}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-semibold">
                          {item.daysOfCoverage > 365 ? "+1 año" : `${item.daysOfCoverage}d`} cobertura
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition">
                        {item.name}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-purple-300">
                        +${item.overstockValue.toLocaleString("es-ES", { minimumFractionDigits: 0 })} excedente
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Stock: {item.currentStock} / Max: {item.maxStock}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: ABC-XYZ Matrix Grid (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Matriz Multicriterio ABC - XYZ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ABC = Valor de Consumo (Pareto) • XYZ = Predictibilidad / Variabilidad
                </p>
              </div>
            </div>

            {/* 9-Box Grid Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 p-3 space-y-2">
              
              <div className="grid grid-cols-4 text-center text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800">
                <span></span>
                <span title="X: Demanda muy estable (CV <= 0.20)">X (Estable)</span>
                <span title="Y: Demanda moderada (0.20 < CV <= 0.50)">Y (Media)</span>
                <span title="Z: Demanda errática / lumpy (CV > 0.50)">Z (Errática)</span>
              </div>

              {/* Row A */}
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <div className="text-xs font-black text-blue-400 flex flex-col items-center">
                  <span>Clase A</span>
                  <span className="text-[9px] font-normal text-slate-400">80% Valor</span>
                </div>
                {["X", "Y", "Z"].map((xyz) => {
                  const cell = matrixGrid[`A-${xyz}`] || { count: 0, value: 0 };
                  return (
                    <div
                      key={`A-${xyz}`}
                      onClick={() => onNavigateToMaterials(undefined, "A", xyz)}
                      className="p-2 rounded-lg bg-blue-950/30 hover:bg-blue-900/50 border border-blue-900/40 text-center cursor-pointer transition hover:scale-105"
                    >
                      <div className="font-extrabold text-sm text-blue-300">{cell.count}</div>
                      <div className="text-[10px] text-slate-400">${Math.round(cell.value / 1000)}k</div>
                    </div>
                  );
                })}
              </div>

              {/* Row B */}
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <div className="text-xs font-black text-indigo-400 flex flex-col items-center">
                  <span>Clase B</span>
                  <span className="text-[9px] font-normal text-slate-400">15% Valor</span>
                </div>
                {["X", "Y", "Z"].map((xyz) => {
                  const cell = matrixGrid[`B-${xyz}`] || { count: 0, value: 0 };
                  return (
                    <div
                      key={`B-${xyz}`}
                      onClick={() => onNavigateToMaterials(undefined, "B", xyz)}
                      className="p-2 rounded-lg bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-900/40 text-center cursor-pointer transition hover:scale-105"
                    >
                      <div className="font-extrabold text-sm text-indigo-300">{cell.count}</div>
                      <div className="text-[10px] text-slate-400">${Math.round(cell.value / 1000)}k</div>
                    </div>
                  );
                })}
              </div>

              {/* Row C */}
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <div className="text-xs font-black text-slate-300 flex flex-col items-center">
                  <span>Clase C</span>
                  <span className="text-[9px] font-normal text-slate-400">5% Valor</span>
                </div>
                {["X", "Y", "Z"].map((xyz) => {
                  const cell = matrixGrid[`C-${xyz}`] || { count: 0, value: 0 };
                  return (
                    <div
                      key={`C-${xyz}`}
                      onClick={() => onNavigateToMaterials(undefined, "C", xyz)}
                      className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-center cursor-pointer transition hover:scale-105"
                    >
                      <div className="font-extrabold text-sm text-slate-300">{cell.count}</div>
                      <div className="text-[10px] text-slate-400">${Math.round(cell.value / 1000)}k</div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Strategic Advice per Quadrant */}
            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
              <div className="font-bold text-slate-200 text-xs mb-1">Estrategias Clave por Cuadrante:</div>
              <p className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                <span><strong className="text-blue-300">AX / BX:</strong> Just-in-Time, entregas programadas automáticas y stocks de seguridad mínimos.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                <span><strong className="text-amber-300">AZ:</strong> Máximo riesgo financiero. Requieres stock de seguridad alto o contratos marco con entregas express.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 flex-shrink-0" />
                <span><strong className="text-slate-300">CZ:</strong> Pedidos por lote semestral/anual para no desperdiciar horas de gestión de compras.</span>
              </p>
            </div>

          </div>

          {/* Quick Action Box: Direct Purchase Plan */}
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-950/40 border border-blue-800/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Plan de Abastecimiento Preventivo
              </h4>
              <p className="text-xs text-slate-300">
                Se identificaron <strong className="text-amber-300">{summary.criticalCount + summary.reorderCount} materiales</strong> con necesidad de orden de compra para mantener continuidad operativa sin quiebres.
              </p>
            </div>

            <button
              onClick={() => onNavigateToMaterials("REORDER_URGENT")}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Ver Órdenes Sugeridas de Compra (${summary.totalReorderCost.toLocaleString("es-ES")})</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
