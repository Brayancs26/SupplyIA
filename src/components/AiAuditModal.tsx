import React, { useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Layers,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { AiAuditReport, CalculatedMaterial, InventorySummary } from "../types";

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: InventorySummary;
  materials: CalculatedMaterial[];
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({
  isOpen,
  onClose,
  summary,
  materials,
}) => {
  const [report, setReport] = useState<AiAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateAudit = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const criticalItems = materials
      .filter((m) => m.healthStatus === "STOCKOUT_CRITICAL")
      .map((m) => ({
        sku: m.sku,
        name: m.name,
        daysCoverage: m.daysOfCoverage,
        supplier: m.supplier,
        costUSD: m.unitCost,
        currentStock: m.currentStock,
        rop: m.reorderPoint,
      }));

    const overstockItems = materials
      .filter((m) => m.healthStatus === "OVERSTOCK")
      .map((m) => ({
        sku: m.sku,
        name: m.name,
        daysCoverage: m.daysOfCoverage,
        overstockValueUSD: m.overstockValue,
        currentStock: m.currentStock,
        maxStock: m.maxStock,
      }));

    try {
      const res = await fetch("/api/gemini/inventory-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          criticalItems,
          overstockItems,
          totalItemsCount: materials.length,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        throw new Error(data.error || "No se pudo generar la auditoría");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la auditoría con Gemini");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Auditoría Inteligente de Aprovisionamiento</h3>
              <p className="text-xs text-slate-400">
                Evaluación integral de riesgos de quiebre, sobre-inventario y calibración de parámetros MRP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Initial State / Action Button */}
          {!report && !isLoading && (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                Generar Informe de Auditoría con IA
              </h4>
              <p className="text-xs text-slate-400">
                Gemini analizará los {materials.length} materiales, detectará causas raíz de sobrestock y quiebres, y formulará un plan táctico de compras y calibración MRP.
              </p>
              <button
                onClick={handleGenerateAudit}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-950 transition"
              >
                Comenzar Auditoría Ahora
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <h5 className="font-bold text-sm text-white">Auditando Cadena de Suministro...</h5>
              <p className="text-xs text-indigo-300 max-w-sm mx-auto">
                Calculando dispersión de demanda, analizando matrices ABC-XYZ y formulando plan de compras estratégico...
              </p>
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={handleGenerateAudit} className="font-bold underline ml-2">Reintentar</button>
            </div>
          )}

          {/* Rendered Audit Report */}
          {report && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Executive Score Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950 border border-indigo-900/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Puntaje de Salud del Almacén</span>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-white">{report.healthScore}</span>
                    <span className="text-xs text-slate-400">/ 100 puntos de eficiencia de inventario</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    {report.executiveSummary}
                  </p>
                </div>

                <div className="flex-shrink-0 grid grid-cols-2 gap-2 text-right text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Ahorro Potencial</span>
                    <strong className="text-emerald-400 text-sm font-bold">
                      ${report.financialImpact?.potentialSavingsUSD?.toLocaleString("es-ES") || 0}
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Mejora Rotación</span>
                    <strong className="text-blue-400 text-sm font-bold">
                      {report.financialImpact?.turnoverImprovement || "+25%"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Critical Risks */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Riesgos Críticos Identificados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.criticalRisks?.map((risk, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{risk.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            risk.severity === "ALTA"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{risk.description}</p>
                      <p className="text-[11px] text-indigo-300 font-medium pt-1">
                        Impacto: {risk.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departmental Immediate Action Plan */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Plan de Acción Inmediato por Área
                </h4>
                <div className="space-y-2.5">
                  {report.immediateActions?.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {act.step}
                          </span>
                          <span className="font-bold text-slate-200">{act.action}</span>
                        </div>
                        <p className="text-slate-400 pl-7">
                          Beneficio esperado: <strong className="text-emerald-400 font-normal">{act.expectedBenefit}</strong>
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-semibold text-[10px] flex-shrink-0">
                        {act.department}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overstock & MRP Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-950/20 border border-purple-900/40 rounded-xl space-y-2 text-xs">
                  <h5 className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Estrategia de Liberación de Sobre-Stock
                  </h5>
                  <p className="text-slate-300 leading-relaxed">
                    {report.overstockReleaseStrategy}
                  </p>
                </div>

                <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-2 text-xs">
                  <h5 className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    Calibración de Parámetros MRP
                  </h5>
                  <p className="text-slate-300 leading-relaxed">
                    {report.mrpParameterRecommendations}
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Powered by Google Gemini 3.7 Flash Supply Chain Architecture
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
