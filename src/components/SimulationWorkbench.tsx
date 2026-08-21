import React, { useState, useMemo } from "react";
import {
  Sliders,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";
import { MaterialItem, ConsumptionRecord, SimulationParams } from "../types";
import { calculateInventoryMetrics } from "../utils/inventoryCalculations";

interface SimulationWorkbenchProps {
  materials: MaterialItem[];
  consumptions: ConsumptionRecord[];
  selectedStorageLoc?: string;
}

export const SimulationWorkbench: React.FC<SimulationWorkbenchProps> = ({
  materials,
  consumptions,
  selectedStorageLoc = "L001",
}) => {
  // Baseline (normal)
  const baseline = useMemo(() => {
    return calculateInventoryMetrics(materials, consumptions);
  }, [materials, consumptions]);

  // Simulation controls
  const [leadTimeMult, setLeadTimeMult] = useState<number>(1.0);
  const [serviceLevelTarget, setServiceLevelTarget] = useState<number>(0.95);
  const [demandMult, setDemandMult] = useState<number>(1.0);

  // Simulated metrics
  const simulationParams: SimulationParams = useMemo(() => ({
    leadTimeMultiplier: leadTimeMult,
    serviceLevelTarget,
    demandMultiplier: demandMult,
  }), [leadTimeMult, serviceLevelTarget, demandMult]);

  const simulated = useMemo(() => {
    return calculateInventoryMetrics(materials, consumptions, simulationParams);
  }, [materials, consumptions, simulationParams]);

  // Comparative metrics
  const reorderCostDiff = simulated.summary.totalReorderCost - baseline.summary.totalReorderCost;
  const criticalCountDiff = simulated.summary.criticalCount - baseline.summary.criticalCount;
  const overstockValDiff = simulated.summary.overstockValue - baseline.summary.overstockValue;

  const handleReset = () => {
    setLeadTimeMult(1.0);
    setServiceLevelTarget(0.95);
    setDemandMult(1.0);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              Simulador de Escenarios What-If (Sensibilidad MRP)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evalúa el impacto financiero de retrasos en proveedores, picos de demanda o ajustes de nivel de servicio.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer Parámetros</span>
        </button>
      </div>

      {/* Simulator Controls & Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Slider 1: Lead Time Multiplier */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tiempo de Entrega (Lead Time)
            </span>
            <span className="font-mono font-bold text-sm text-blue-400">
              {leadTimeMult > 1 ? `+${Math.round((leadTimeMult - 1) * 100)}%` : leadTimeMult < 1 ? `-${Math.round((1 - leadTimeMult) * 100)}%` : "Normal (1.0x)"}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={leadTimeMult}
            onChange={(e) => setLeadTimeMult(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-50% (Express)</span>
            <span>Normal</span>
            <span>+100% (Crisis Logística)</span>
          </div>
          <p className="text-xs text-slate-400">
            Simula retrasos portuarios, huelgas o escasez global de materias primas.
          </p>
        </div>

        {/* Slider 2: Nivel de Servicio Target */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Nivel de Servicio Deseado
            </span>
            <span className="font-mono font-bold text-sm text-indigo-400">
              {(serviceLevelTarget * 100).toFixed(1)}% (Z = {serviceLevelTarget >= 0.99 ? "2.33" : serviceLevelTarget >= 0.95 ? "1.65" : "1.28"})
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[0.90, 0.95, 0.98, 0.99].map((sl) => (
              <button
                key={sl}
                onClick={() => setServiceLevelTarget(sl)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  serviceLevelTarget === sl
                    ? "bg-indigo-600 border-indigo-500 text-white shadow"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {Math.round(sl * 100)}%
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Mayor nivel de servicio incrementa el Stock de Seguridad exponencialmente.
          </p>
        </div>

        {/* Slider 3: Demanda / Consumo Multiplier */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fluctuación de Demanda
            </span>
            <span className="font-mono font-bold text-sm text-amber-400">
              {demandMult > 1 ? `+${Math.round((demandMult - 1) * 100)}%` : demandMult < 1 ? `-${Math.round((1 - demandMult) * 100)}%` : "Normal (1.0x)"}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.1"
            value={demandMult}
            onChange={(e) => setDemandMult(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-50% (Recesión)</span>
            <span>Normal</span>
            <span>+80% (Pico / Temporada)</span>
          </div>
          <p className="text-xs text-slate-400">
            Simula aumentos en órdenes de producción o caídas en ventas.
          </p>
        </div>

      </div>

      {/* Comparative Results Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Reorder Cost Impact */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Presupuesto de Compras Requerido
          </span>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-white">
              ${simulated.summary.totalReorderCost.toLocaleString("es-ES")}
            </div>
            {reorderCostDiff !== 0 && (
              <span className={`text-xs font-bold ${reorderCostDiff > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {reorderCostDiff > 0 ? `+$${reorderCostDiff.toLocaleString("es-ES")}` : `-$${Math.abs(reorderCostDiff).toLocaleString("es-ES")}`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Base actual: ${baseline.summary.totalReorderCost.toLocaleString("es-ES")}
          </p>
        </div>

        {/* Card 2: Stockout Count Impact */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Materiales en Quiebre Crítico
          </span>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-rose-400">
              {simulated.summary.criticalCount} SKUs
            </div>
            {criticalCountDiff !== 0 && (
              <span className={`text-xs font-bold ${criticalCountDiff > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {criticalCountDiff > 0 ? `+${criticalCountDiff}` : `${criticalCountDiff}`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Base actual: {baseline.summary.criticalCount} SKUs
          </p>
        </div>

        {/* Card 3: Overstock Capital Impact */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Capital en Sobre-Inventario
          </span>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-purple-400">
              ${simulated.summary.overstockValue.toLocaleString("es-ES")}
            </div>
            {overstockValDiff !== 0 && (
              <span className={`text-xs font-bold ${overstockValDiff > 0 ? "text-purple-400" : "text-emerald-400"}`}>
                {overstockValDiff > 0 ? `+$${overstockValDiff.toLocaleString("es-ES")}` : `-$${Math.abs(overstockValDiff).toLocaleString("es-ES")}`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Base actual: ${baseline.summary.overstockValue.toLocaleString("es-ES")}
          </p>
        </div>

      </div>

      {/* Simulator Strategic Takeaways */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Conclusión Operativa de la Simulación
        </h4>
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          {leadTimeMult > 1.2 && (
            <p className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              ⚠️ Un retraso de proveedores del {Math.round((leadTimeMult - 1) * 100)}% dispara el ROP y genera <strong>{simulated.summary.criticalCount} quiebres inminentes</strong>. Se recomienda emitir órdenes de compra inmediatas con entrega fraccionada.
            </p>
          )}
          {serviceLevelTarget >= 0.98 && (
            <p className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300">
              💡 Para asegurar un nivel de servicio del {(serviceLevelTarget * 100).toFixed(0)}%, tu inversión en compras requeridas sube a <strong>${simulated.summary.totalReorderCost.toLocaleString("es-ES")}</strong>. Aplica este nivel solo a materiales Clase A-Z para optimizar liquidez.
            </p>
          )}
          {demandMult > 1.2 && (
            <p className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
              📈 Un aumento del {Math.round((demandMult - 1) * 100)}% en demanda reduce la cobertura media de {baseline.summary.avgCoverageDays} a <strong>{simulated.summary.avgCoverageDays} días</strong>. Revisa los Lotes Mínimos de Compra (MOQ).
            </p>
          )}
          {leadTimeMult === 1.0 && serviceLevelTarget === 0.95 && demandMult === 1.0 && (
            <p className="text-slate-400">
              Mueve los deslizadores arriba para observar en tiempo real cómo cambia la necesidad de capital y los puntos de reorden según diferentes escenarios operacionales.
            </p>
          )}
        </div>
      </div>

    </div>
  );
};
