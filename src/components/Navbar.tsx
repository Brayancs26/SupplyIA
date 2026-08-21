import React, { useState } from "react";
import {
  Boxes,
  UploadCloud,
  Brain,
  ShoppingCart,
  Sliders,
  MessageSquareText,
  FileSpreadsheet,
  MapPin,
  DollarSign,
  ArrowRightLeft,
} from "lucide-react";
import { DATASET_PRESETS } from "../data/sampleDatasets";
import { InventorySummary } from "../types";

interface NavbarProps {
  activeTab: "dashboard" | "inventory" | "procurement" | "simulation";
  setActiveTab: (tab: "dashboard" | "inventory" | "procurement" | "simulation") => void;
  summary: InventorySummary;
  onOpenUpload: () => void;
  onOpenAiAudit: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  customDataLoaded: boolean;
  selectedStorageLoc?: string;
  onSelectStorageLoc?: (loc: string) => void;
  exchangeRate?: number;
  onConvertCurrency?: (rate: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  summary,
  onOpenUpload,
  onOpenAiAudit,
  onToggleChat,
  isChatOpen,
  selectedPresetId,
  onSelectPreset,
  customDataLoaded,
  selectedStorageLoc = "L001",
  onSelectStorageLoc,
  exchangeRate = 3.75,
  onConvertCurrency,
}) => {
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 text-white">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">OptiStock AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  MRP & Supply Chain
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {/* Storage Location Badge */}
                <span className="inline-flex items-center gap-1 font-medium text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  Almacén: <strong className="text-white">{selectedStorageLoc}</strong>
                </span>

                {/* Currency Badge */}
                <span className="inline-flex items-center gap-1 font-medium text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Moneda: <strong className="text-white">USD ($)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Dashboard
            </button>
            <button
              id="nav-tab-inventory"
              onClick={() => setActiveTab("inventory")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "inventory"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Materiales & MRP
              <span className="ml-1 text-xs px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                {summary.totalSKUs}
              </span>
            </button>
            <button
              id="nav-tab-procurement"
              onClick={() => setActiveTab("procurement")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "procurement"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Órdenes de Compra
              {summary.criticalCount + summary.reorderCount > 0 && (
                <span className="text-xs px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold">
                  {summary.criticalCount + summary.reorderCount}
                </span>
              )}
            </button>
            <button
              id="nav-tab-simulation"
              onClick={() => setActiveTab("simulation")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "simulation"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Simulador What-If
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Storage Location Selector */}
            {onSelectStorageLoc && (
              <div className="hidden xl:flex items-center">
                <select
                  id="storage-loc-select"
                  value={selectedStorageLoc}
                  onChange={(e) => onSelectStorageLoc(e.target.value)}
                  className="text-xs bg-slate-800 border border-amber-700/60 text-amber-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
                  title="Filtrar por Ubicación / Almacén SAP"
                >
                  <option value="L001">📍 L001 (Almacén Principal)</option>
                  <option value="ALL">🌐 Todos los Almacenes</option>
                </select>
              </div>
            )}

            {/* Quick Currency Rate Toggle */}
            <button
              id="btn-currency-rate"
              onClick={() => setShowRateModal(true)}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-emerald-700/60 text-emerald-300 text-xs font-semibold transition"
              title="Tipo de Cambio PEN/USD"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>1 USD = S/ {exchangeRate}</span>
            </button>

            {/* Dataset Selector / Preset */}
            <div className="hidden lg:flex items-center">
              <select
                id="dataset-preset-select"
                value={customDataLoaded ? "custom" : selectedPresetId}
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    onSelectPreset(e.target.value);
                  }
                }}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
              >
                {customDataLoaded && <option value="custom">📁 Datos Subidos por Usuario</option>}
                {DATASET_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload Files Button */}
            <button
              id="btn-open-upload-modal"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-sm"
              title="Subir archivos MB52, DATA, MOVIMIENTOS y MRP"
            >
              <UploadCloud className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Subir Archivos</span>
            </button>

            {/* AI Audit Button */}
            <button
              id="btn-open-ai-audit"
              onClick={onOpenAiAudit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-sm shadow-indigo-950 transition"
              title="Generar Auditoría Inteligente de Inventarios"
            >
              <Brain className="w-4 h-4 text-violet-200 animate-pulse" />
              <span className="hidden sm:inline">Auditoría IA</span>
            </button>

            {/* AI Assistant Chat Toggle */}
            <button
              id="btn-toggle-ai-chat"
              onClick={onToggleChat}
              className={`p-2 rounded-lg border transition relative ${
                isChatOpen
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
              title="Asistente de Aprovisionamiento IA"
            >
              <MessageSquareText className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden items-center justify-around bg-slate-950 border-t border-slate-800/80 px-2 py-1.5">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "inventory" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Materiales ({summary.totalSKUs})
        </button>
        <button
          onClick={() => setActiveTab("procurement")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "procurement" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Compras ({summary.criticalCount + summary.reorderCount})
        </button>
        <button
          onClick={() => setActiveTab("simulation")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "simulation" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Simulación
        </button>
      </div>

      {/* Quick Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Configuración de Moneda y Tipo de Cambio
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              El inventario valorizado está expresado en <strong className="text-emerald-300">Dólares Americanos ($ USD)</strong> para el almacén <strong className="text-blue-300">L001</strong>. Si sus archivos SAP estaban en Soles (PEN), se convierte aplicando este tipo de cambio.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Cambio PEN a USD (Soles por 1 USD):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej. 3.75"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRateModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const rateNum = parseFloat(tempRate);
                  if (rateNum && rateNum > 0 && onConvertCurrency) {
                    onConvertCurrency(rateNum);
                  }
                  setShowRateModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
              >
                Aplicar Tipo de Cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
