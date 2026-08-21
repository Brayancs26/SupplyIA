import React, { useState, useMemo } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { MaterialsTableView } from "./components/MaterialsTableView";
import { ProcurementPlanView } from "./components/ProcurementPlanView";
import { SimulationWorkbench } from "./components/SimulationWorkbench";
import { UploadModal } from "./components/UploadModal";
import { MaterialDetailModal } from "./components/MaterialDetailModal";
import { AiAuditModal } from "./components/AiAuditModal";
import { AiChatAssistant } from "./components/AiChatAssistant";
import { DATASET_PRESETS } from "./data/sampleDatasets";
import { calculateInventoryMetrics } from "./utils/inventoryCalculations";
import { MaterialItem, ConsumptionRecord, CalculatedMaterial } from "./types";

export default function App() {
  // Active preset & data
  const [selectedPresetId, setSelectedPresetId] = useState<string>("mro-industrial");
  const [customDataLoaded, setCustomDataLoaded] = useState<boolean>(false);

  const initialPreset = DATASET_PRESETS[0];
  const [materials, setMaterials] = useState<MaterialItem[]>(initialPreset.materials);
  const [consumptions, setConsumptions] = useState<ConsumptionRecord[]>(initialPreset.consumptions);

  // Storage Location & Currency Controls (Default: L001 and USD $)
  const [selectedStorageLoc, setSelectedStorageLoc] = useState<string>("L001");
  const [exchangeRate, setExchangeRate] = useState<number>(3.75); // Tipo de cambio PEN -> USD

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "procurement" | "simulation">("dashboard");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAiAuditModalOpen, setIsAiAuditModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMaterialForDetail, setSelectedMaterialForDetail] = useState<CalculatedMaterial | null>(null);

  // Table filters when navigated from Dashboard
  const [tableStatusFilter, setTableStatusFilter] = useState<string>("ALL");
  const [tableAbcFilter, setTableAbcFilter] = useState<string>("ALL");
  const [tableXyzFilter, setTableXyzFilter] = useState<string>("ALL");

  // Filter materials based on Storage Location (e.g. L001 strictly for Valued Inventory)
  const scopedMaterials = useMemo(() => {
    if (!selectedStorageLoc || selectedStorageLoc === "ALL") {
      return materials;
    }
    return materials.filter((m) => {
      // If material has explicit storage location, check if it matches L001
      if (m.sapStorageLoc) {
        return m.sapStorageLoc.toUpperCase() === selectedStorageLoc.toUpperCase();
      }
      return true; // If not specified, include under active warehouse
    });
  }, [materials, selectedStorageLoc]);

  // Calculate live metrics for scoped warehouse L001
  const { calculatedMaterials, summary } = useMemo(() => {
    return calculateInventoryMetrics(scopedMaterials, consumptions);
  }, [scopedMaterials, consumptions]);

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    const preset = DATASET_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setCustomDataLoaded(false);
      setMaterials(preset.materials);
      setConsumptions(preset.consumptions);
      setSelectedStorageLoc("L001");
    }
  };

  // Handle User Uploaded Data
  const handleDataLoaded = (newMaterials: MaterialItem[], newConsumptions: ConsumptionRecord[]) => {
    setMaterials(newMaterials);
    setConsumptions(newConsumptions);
    setCustomDataLoaded(true);
    setSelectedStorageLoc("L001");
    setActiveTab("dashboard");
  };

  // Convert all items from PEN to USD or update exchange rate
  const handleConvertCurrencyPenToUsd = (rate: number) => {
    setExchangeRate(rate);
    setMaterials((prev) =>
      prev.map((m) => ({
        ...m,
        unitCost: Number((m.unitCost / rate).toFixed(2)),
      }))
    );
  };

  // Navigate from Dashboard to Table with filters
  const handleNavigateToMaterials = (filterStatus?: string, filterAbc?: string, filterXyz?: string) => {
    setTableStatusFilter(filterStatus || "ALL");
    setTableAbcFilter(filterAbc || "ALL");
    setTableXyzFilter(filterXyz || "ALL");
    setActiveTab("inventory");
  };

  // Update single material parameter
  const handleUpdateMaterialParams = (sku: string, updatedParams: Partial<MaterialItem>) => {
    setMaterials((prev) =>
      prev.map((m) => (m.sku === sku ? { ...m, ...updatedParams } : m))
    );
    if (selectedMaterialForDetail && selectedMaterialForDetail.sku === sku) {
      const refreshed = calculatedMaterials.find((cm) => cm.sku === sku);
      if (refreshed) {
        setSelectedMaterialForDetail({
          ...refreshed,
          ...updatedParams,
        } as CalculatedMaterial);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenAiAudit={() => setIsAiAuditModalOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        customDataLoaded={customDataLoaded}
        selectedStorageLoc={selectedStorageLoc}
        onSelectStorageLoc={setSelectedStorageLoc}
        exchangeRate={exchangeRate}
        onConvertCurrency={handleConvertCurrencyPenToUsd}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "dashboard" && (
          <DashboardView
            summary={summary}
            materials={calculatedMaterials}
            selectedStorageLoc={selectedStorageLoc}
            onOpenAiAudit={() => setIsAiAuditModalOpen(true)}
            onNavigateToMaterials={handleNavigateToMaterials}
            onSelectMaterial={(mat) => setSelectedMaterialForDetail(mat)}
          />
        )}

        {activeTab === "inventory" && (
          <MaterialsTableView
            materials={calculatedMaterials}
            selectedStorageLoc={selectedStorageLoc}
            onSelectMaterial={(mat) => setSelectedMaterialForDetail(mat)}
            initialStatusFilter={tableStatusFilter}
            initialAbcFilter={tableAbcFilter}
            initialXyzFilter={tableXyzFilter}
          />
        )}

        {activeTab === "procurement" && (
          <ProcurementPlanView
            materials={calculatedMaterials}
            selectedStorageLoc={selectedStorageLoc}
            onOpenMaterialDetail={(mat) => setSelectedMaterialForDetail(mat)}
          />
        )}

        {activeTab === "simulation" && (
          <SimulationWorkbench
            materials={scopedMaterials}
            consumptions={consumptions}
            selectedStorageLoc={selectedStorageLoc}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>
          OptiStock AI • Control de Aprovisionamiento, MRP y Prevención de Quiebres • Almacén <span className="text-blue-400 font-bold">L001</span> • Moneda: <span className="text-emerald-400 font-bold">Dólares ($ USD)</span> &copy; 2026
        </p>
      </footer>

      {/* Upload File Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataLoaded={handleDataLoaded}
        currentMaterials={materials}
        currentConsumptions={consumptions}
        defaultStorageLoc={selectedStorageLoc}
        defaultExchangeRate={exchangeRate}
      />

      {/* Material Detail Modal */}
      <MaterialDetailModal
        material={selectedMaterialForDetail}
        consumptions={consumptions}
        onClose={() => setSelectedMaterialForDetail(null)}
        onUpdateMaterialParams={handleUpdateMaterialParams}
      />

      {/* Full AI Inventory Audit Modal */}
      <AiAuditModal
        isOpen={isAiAuditModalOpen}
        onClose={() => setIsAiAuditModalOpen(false)}
        summary={summary}
        materials={calculatedMaterials}
        selectedStorageLoc={selectedStorageLoc}
      />

      {/* AI Chat Copilot Drawer */}
      <AiChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        summary={summary}
        materials={calculatedMaterials}
        selectedStorageLoc={selectedStorageLoc}
      />

    </div>
  );
}
