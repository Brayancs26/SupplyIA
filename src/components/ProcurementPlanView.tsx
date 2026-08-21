import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  Sparkles,
  Building2,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ChevronRight,
  Filter,
} from "lucide-react";
import { CalculatedMaterial, SupplierPurchaseGroup } from "../types";
import { exportToExcel } from "../utils/fileParser";

interface ProcurementPlanViewProps {
  materials: CalculatedMaterial[];
  selectedStorageLoc?: string;
  onOpenMaterialDetail: (material: CalculatedMaterial) => void;
}

export const ProcurementPlanView: React.FC<ProcurementPlanViewProps> = ({
  materials,
  selectedStorageLoc = "L001",
  onOpenMaterialDetail,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [budgetLimit, setBudgetLimit] = useState<number>(0);
  const [useBudgetLimit, setUseBudgetLimit] = useState<boolean>(false);
  const [isOptimizingAi, setIsOptimizingAi] = useState<boolean>(false);
  const [aiOptimizedPlan, setAiOptimizedPlan] = useState<any | null>(null);

  // Filter items that need purchase (reorder point reached or stockout)
  const itemsNeedingOrder = useMemo(() => {
    return materials
      .filter((m) => m.healthStatus === "STOCKOUT_CRITICAL" || m.healthStatus === "REORDER_URGENT")
      .map((m) => {
        let priority: "CRÍTICA_QUIEBRE" | "ALTA" | "MEDIA" = "MEDIA";
        if (m.healthStatus === "STOCKOUT_CRITICAL" || m.daysOfCoverage <= 3) {
          priority = "CRÍTICA_QUIEBRE";
        } else if (m.abcClass === "A") {
          priority = "ALTA";
        }

        return {
          ...m,
          orderPriority: priority,
        };
      })
      .sort((a, b) => {
        const pOrder = { CRÍTICA_QUIEBRE: 0, ALTA: 1, MEDIA: 2 };
        return pOrder[a.orderPriority] - pOrder[b.orderPriority];
      });
  }, [materials]);

  // Group by supplier
  const supplierGroups = useMemo(() => {
    type OrderItem = (typeof itemsNeedingOrder)[number];
    const map = new Map<string, OrderItem[]>();

    itemsNeedingOrder.forEach((item) => {
      if (priorityFilter !== "ALL" && item.orderPriority !== priorityFilter) return;

      const group = map.get(item.supplier) || [];
      group.push(item);
      map.set(item.supplier, group);
    });

    const groups: SupplierPurchaseGroup[] = [];
    map.forEach((items, supplier) => {
      const subtotal = items.reduce((acc, it) => acc + it.estimatedOrderCost, 0);
      groups.push({
        supplier,
        itemsCount: items.length,
        subtotalUSD: subtotal,
        items: items.map((it) => ({
          sku: it.sku,
          name: it.name,
          orderQty: it.recommendedOrderQty,
          unit: it.unit,
          unitCost: it.unitCost,
          subtotal: it.estimatedOrderCost,
          priority: it.orderPriority as any,
          daysOfCoverage: it.daysOfCoverage,
        })),
      });
    });

    return groups.sort((a, b) => b.subtotalUSD - a.subtotalUSD);
  }, [itemsNeedingOrder, priorityFilter]);

  const grandTotal = supplierGroups.reduce((acc, g) => acc + g.subtotalUSD, 0);

  const handleExportOrders = () => {
    const flatRows: any[] = [];
    supplierGroups.forEach((g) => {
      g.items.forEach((it) => {
        flatRows.push({
          Proveedor: g.supplier,
          SKU: it.sku,
          Material: it.name,
          CantidadSugerida: it.orderQty,
          Unidad: it.unit,
          CostoUnitarioUSD: it.unitCost,
          SubtotalUSD: it.subtotal,
          Prioridad: it.priority,
          DiasCoberturaActual: it.daysOfCoverage,
        });
      });
    });
    exportToExcel(flatRows, "ordenes_compra_sugeridas");
  };

  const handleOptimizeWithAi = async () => {
    setIsOptimizingAi(true);
    try {
      const payload = {
        itemsToOrder: itemsNeedingOrder.map((it) => ({
          sku: it.sku,
          name: it.name,
          supplier: it.supplier,
          orderQty: it.recommendedOrderQty,
          unit: it.unit,
          unitCost: it.unitCost,
          subtotal: it.estimatedOrderCost,
          priority: it.orderPriority,
          coverageDays: it.daysOfCoverage,
          leadTime: it.leadTimeDays,
        })),
        budgetLimit: useBudgetLimit && budgetLimit > 0 ? budgetLimit : undefined,
      };

      const res = await fetch("/api/gemini/procurement-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiOptimizedPlan(data.data);
      }
    } catch (err) {
      console.error("Error optimizing orders with AI", err);
    } finally {
      setIsOptimizingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">
              Plan de Órdenes de Compra Sugeridas (MRP)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recomendaciones calculadas según ROP, EOQ, MOQ y stocks de seguridad para evitar quiebres.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportOrders}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Órdenes</span>
          </button>

          <button
            onClick={handleOptimizeWithAi}
            disabled={isOptimizingAi || itemsNeedingOrder.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isOptimizingAi ? "Optimizando con IA..." : "Optimizar Lotes con IA"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total a Invertir</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            ${grandTotal.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Para reponer el stock al nivel óptimo</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Materiales a Comprar</span>
          <div className="text-2xl font-black text-white mt-1">
            {itemsNeedingOrder.length} SKUs
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Distribuidos en {supplierGroups.length} proveedores</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtro por Criticidad</span>
          <div className="mt-1">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Prioridades ({itemsNeedingOrder.length})</option>
              <option value="CRÍTICA_QUIEBRE">🔴 Solo Quiebre Crítico</option>
              <option value="ALTA">🟠 Prioridad Alta (Clase A)</option>
              <option value="MEDIA">🟡 Prioridad Media / Rutinaria</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Optimized Plan Advice Banner */}
      {aiOptimizedPlan && (
        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Recomendación Estratégica del Asistente de Compras</h3>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {aiOptimizedPlan.budgetAllocationAdvice}
          </p>
          {aiOptimizedPlan.riskMitigationNotes && (
            <p className="text-xs text-indigo-300">
              💡 <strong>Mitigación de Riesgos:</strong> {aiOptimizedPlan.riskMitigationNotes}
            </p>
          )}
        </div>
      )}

      {/* Orders Grouped by Supplier */}
      <div className="space-y-4">
        {supplierGroups.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-base">Almacén en Nivel Óptimo</h4>
            <p className="text-xs">No hay materiales en punto de reorden en este momento.</p>
          </div>
        ) : (
          supplierGroups.map((group) => (
            <div
              key={group.supplier}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Supplier Group Header */}
              <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm text-white">{group.supplier}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {group.itemsCount} ítems
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 mr-2">Subtotal estimado:</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    ${group.subtotalUSD.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Items in Supplier Order */}
              <div className="divide-y divide-slate-800/60">
                {group.items.map((item) => (
                  <div
                    key={item.sku}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition"
                  >
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-400">{item.sku}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.priority === "CRÍTICA_QUIEBRE"
                              ? "bg-rose-500/20 text-rose-300"
                              : item.priority === "ALTA"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {item.priority === "CRÍTICA_QUIEBRE" ? "🔴 Quiebre" : item.priority}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.daysOfCoverage}d cobertura
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200">{item.name}</p>
                    </div>

                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Cantidad a Pedir</span>
                        <span className="font-bold text-sm text-amber-400 font-mono">
                          +{item.orderQty} {item.unit}
                        </span>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-[10px] text-slate-400 block">Subtotal</span>
                        <span className="font-mono font-bold text-xs text-slate-200">
                          ${item.subtotal.toLocaleString("es-ES")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
