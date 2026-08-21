import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Clock,
  DollarSign,
  Package,
  Building2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import { CalculatedMaterial, ConsumptionRecord, AiMaterialRecommendation } from "../types";

interface MaterialDetailModalProps {
  material: CalculatedMaterial | null;
  consumptions: ConsumptionRecord[];
  onClose: () => void;
  onUpdateMaterialParams?: (sku: string, updatedParams: Partial<CalculatedMaterial>) => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  material,
  consumptions,
  onClose,
  onUpdateMaterialParams,
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<AiMaterialRecommendation | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Edit parameters state
  const [leadTimeInput, setLeadTimeInput] = useState<number>(15);
  const [serviceLevelInput, setServiceLevelInput] = useState<number>(0.95);
  const [moqInput, setMoqInput] = useState<number>(1);
  const [isEditingParams, setIsEditingParams] = useState(false);

  useEffect(() => {
    if (material) {
      setLeadTimeInput(material.leadTimeDays);
      setServiceLevelInput(material.serviceLevelTarget || 0.95);
      setMoqInput(material.minLotSize || 1);
      setAiAnalysis(null);
      setAiError(null);
    }
  }, [material]);

  if (!material) return null;

  // Filter consumption history for this SKU
  const itemHistory = consumptions
    .filter((c) => c.sku === material.sku)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 points

  // Chart data
  const chartData = itemHistory.map((item) => ({
    date: item.date.length > 10 ? item.date.slice(5) : item.date,
    consumo: item.quantity,
    promedio: material.avgDailyDemand,
  }));

  // Fetch AI Recommendation
  const handleFetchAiRecommendation = async () => {
    setIsLoadingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/gemini/material-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiAnalysis(data.data);
      } else {
        throw new Error(data.error || "No se pudo obtener el análisis");
      }
    } catch (err: any) {
      setAiError(err.message || "Error al conectar con la IA de Aprovisionamiento");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSaveParams = () => {
    if (onUpdateMaterialParams && material) {
      onUpdateMaterialParams(material.sku, {
        leadTimeDays: Math.max(1, leadTimeInput),
        serviceLevelTarget: serviceLevelInput,
        minLotSize: Math.max(1, moqInput),
      });
      setIsEditingParams(false);
    }
  };

  // Stock gauge calculations
  const maxBarValue = Math.max(material.maxStock * 1.2, material.currentStock * 1.2, 10);
  const currentStockPct = Math.min(100, (material.currentStock / maxBarValue) * 100);
  const ssPct = Math.min(100, (material.safetyStock / maxBarValue) * 100);
  const ropPct = Math.min(100, (material.reorderPoint / maxBarValue) * 100);
  const maxStockPct = Math.min(100, (material.maxStock / maxBarValue) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-400">{material.sku}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {material.category}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  Clase {material.abcClass}-{material.xyzClass}
                </span>
              </div>
              <h3 className="font-bold text-base text-white truncate">{material.name}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Quick Status & Action Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Actual Físico</span>
              <div className="text-xl font-black text-white mt-1">
                {material.currentStock} <span className="text-xs font-normal text-slate-400">{material.unit}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Disponible: {material.availableStock} {material.unit}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cobertura de Stock</span>
              <div className="text-xl font-black text-amber-400 mt-1">
                {material.daysOfCoverage > 900 ? "+1 año" : `${material.daysOfCoverage} días`}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Lead Time: {material.leadTimeDays} días
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punto de Reorden (ROP)</span>
              <div className="text-xl font-black text-indigo-400 mt-1">
                {material.reorderPoint} <span className="text-xs font-normal text-slate-400">{material.unit}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Stock Seg. (SS): {material.safetyStock}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Costo Unitario / Valor</span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                ${material.unitCost.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Total: ${(material.currentStock * material.unitCost).toLocaleString("es-ES")}
              </div>
            </div>
          </div>

          {/* Visual Stock Level Gauge */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-400" />
                Medidor de Posición de Inventario (Gauge de Control)
              </h4>
              <span className="text-xs font-semibold text-slate-400">
                Estado: <strong className="text-white">{material.healthStatus}</strong>
              </span>
            </div>

            {/* Gauge Bar */}
            <div className="relative pt-6 pb-2">
              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative">
                {/* Current Stock Bar */}
                <div
                  style={{ width: `${currentStockPct}%` }}
                  className={`h-full rounded-full transition-all ${
                    material.currentStock <= material.safetyStock
                      ? "bg-rose-500 shadow-rose-500/50 shadow-md"
                      : material.currentStock <= material.reorderPoint
                      ? "bg-amber-500 shadow-amber-500/50 shadow-md"
                      : material.currentStock > material.maxStock
                      ? "bg-purple-500 shadow-purple-500/50 shadow-md"
                      : "bg-emerald-500 shadow-emerald-500/50 shadow-md"
                  }`}
                />
              </div>

              {/* Marker 1: Safety Stock (SS) */}
              <div
                style={{ left: `${ssPct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              >
                <span className="text-[10px] font-bold text-indigo-300 bg-slate-900 px-1 rounded border border-indigo-500/30">
                  SS: {material.safetyStock}
                </span>
                <div className="w-0.5 h-6 bg-indigo-400 mt-0.5" />
              </div>

              {/* Marker 2: Reorder Point (ROP) */}
              <div
                style={{ left: `${ropPct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              >
                <span className="text-[10px] font-bold text-amber-300 bg-slate-900 px-1 rounded border border-amber-500/30">
                  ROP: {material.reorderPoint}
                </span>
                <div className="w-0.5 h-6 bg-amber-400 mt-0.5" />
              </div>

              {/* Marker 3: Max Stock */}
              <div
                style={{ left: `${maxStockPct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              >
                <span className="text-[10px] font-bold text-purple-300 bg-slate-900 px-1 rounded border border-purple-500/30">
                  Max: {material.maxStock}
                </span>
                <div className="w-0.5 h-6 bg-purple-400 mt-0.5" />
              </div>
            </div>

            <div className="grid grid-cols-3 text-center text-xs text-slate-400 pt-1">
              <div>🔴 Zona Quiebre (&lt; {material.safetyStock})</div>
              <div>🟠 Zona Reorden ({material.safetyStock} - {material.reorderPoint})</div>
              <div>🟣 Zona Sobre-Stock (&gt; {material.maxStock})</div>
            </div>
          </div>

          {/* Consumption History Chart */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Historial de Consumo Reciente ({chartData.length} periodos)
              </h4>
              <div className="text-xs text-slate-400">
                Media: <strong className="text-slate-200">{material.avgDailyDemand} {material.unit}/día</strong> | StdDev: <strong className="text-slate-200">{material.demandStdDev}</strong> (CV: {(material.coefVariation * 100).toFixed(0)}%)
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Sin registros históricos de consumo para este material.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="consumo" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Consumo Real" />
                    <Line type="monotone" dataKey="promedio" stroke="#f59e0b" strokeWidth={2} dot={false} name="Media Diaria" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Deep Diagnostic Section */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-800/40 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Diagnóstico y Recomendación de IA para {material.sku}</h4>
                  <p className="text-xs text-slate-400">Evaluación algorítmica de riesgo de quiebre y optimización de lotes</p>
                </div>
              </div>

              {!aiAnalysis && !isLoadingAi && (
                <button
                  onClick={handleFetchAiRecommendation}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar Diagnóstico IA</span>
                </button>
              )}
            </div>

            {isLoadingAi && (
              <div className="p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-indigo-300 font-medium">Analizando patrones de consumo y calibrando parámetros MRP con Gemini...</p>
              </div>
            )}

            {aiError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                <span>{aiError}</span>
                <button onClick={handleFetchAiRecommendation} className="font-bold underline ml-2">Reintentar</button>
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-semibold text-slate-400">Acción Recomendada:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {aiAnalysis.recommendedAction}
                    </span>
                  </div>
                  <p className="leading-relaxed"><strong className="text-slate-300">Diagnóstico:</strong> {aiAnalysis.diagnostic}</p>
                  <p className="leading-relaxed"><strong className="text-slate-300">Causa Raíz:</strong> {aiAnalysis.rootCause}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-amber-400">💡 Consejo de Negociación con Proveedor:</span>
                    <p className="text-slate-300 leading-relaxed">{aiAnalysis.supplierNegotiationTip}</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-indigo-400">📐 Justificación Matemática:</span>
                    <p className="text-slate-300 leading-relaxed">{aiAnalysis.justification}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Proveedor: <strong className="text-slate-200">{material.supplier}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
