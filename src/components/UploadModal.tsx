import React, { useState } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Info,
  ShieldCheck,
  Package,
  Sliders,
  TrendingUp,
} from "lucide-react";
import {
  parseSpreadsheetFile,
  parseSapMb52,
  parseSapDataMovements,
  parseSapMovimientosDict,
  parseSapMrpParams,
  extractMaterialsFromData,
  extractConsumptionsFromData,
  downloadTemplate,
  SapMovementRule,
  DEFAULT_SAP_MOVEMENTS,
} from "../utils/fileParser";
import { MaterialItem, ConsumptionRecord } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (materials: MaterialItem[], consumptions: ConsumptionRecord[]) => void;
  currentMaterials: MaterialItem[];
  currentConsumptions: ConsumptionRecord[];
  defaultStorageLoc?: string;
  defaultExchangeRate?: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  currentMaterials,
  currentConsumptions,
  defaultStorageLoc = "L001",
  defaultExchangeRate = 3.75,
}) => {
  const [activeMode, setActiveMode] = useState<"sap" | "consolidated" | "multi">("sap");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Storage Location and Currency Settings
  const [targetStorageLoc, setTargetStorageLoc] = useState<string>(defaultStorageLoc);
  const [convertFromPen, setConvertFromPen] = useState<boolean>(true);
  const [exchangeRate, setExchangeRate] = useState<number>(defaultExchangeRate);

  // SAP Ingestion States (The 4 files requested by the user)
  const [sapDataFile, setSapDataFile] = useState<{
    fileName: string;
    consumptions: ConsumptionRecord[];
    summary: { totalRows: number; consumptionRows: number; ignoredRows: number; totalQty: number };
  } | null>(null);

  const [sapMb52File, setSapMb52File] = useState<{
    fileName: string;
    materials: Partial<MaterialItem>[];
    targetStorageLoc?: string;
    currency?: string;
  } | null>(null);

  const [sapMovimientosFile, setSapMovimientosFile] = useState<{
    fileName: string;
    rules: Record<string, SapMovementRule>;
    count: number;
  } | null>(null);

  const [sapMrpFile, setSapMrpFile] = useState<{
    fileName: string;
    materials: Partial<MaterialItem>[];
  } | null>(null);

  // Staged generic data
  const [uploadedConsolidated, setUploadedConsolidated] = useState<{
    materials: MaterialItem[];
    consumptions: ConsumptionRecord[];
    fileName: string;
  } | null>(null);

  const [uploadedConsumptions, setUploadedConsumptions] = useState<{
    records: ConsumptionRecord[];
    fileName: string;
  } | null>(null);

  const [uploadedStock, setUploadedStock] = useState<{
    materials: Partial<MaterialItem>[];
    fileName: string;
  } | null>(null);

  const [uploadedMrp, setUploadedMrp] = useState<{
    materials: Partial<MaterialItem>[];
    fileName: string;
  } | null>(null);

  if (!isOpen) return null;

  // --- HANDLERS FOR SAP FILES ---

  // 1. DATA (3 Years Movements)
  const handleSapDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const activeRules = sapMovimientosFile?.rules || DEFAULT_SAP_MOVEMENTS;
      const result = parseSapDataMovements(rows, activeRules);

      if (result.consumptions.length === 0) {
        throw new Error("No se detectaron movimientos de consumo válidos en el archivo DATA.");
      }

      setSapDataFile({
        fileName: file.name,
        consumptions: result.consumptions,
        summary: result.summary,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar archivo DATA");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. MB52 (Current Stock filtered by L001 and converted to USD)
  const handleSapMb52Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const materials = parseSapMb52(rows, {
        targetStorageLoc: targetStorageLoc || "L001",
        exchangeRatePenToUsd: exchangeRate,
        convertFromPen: convertFromPen,
      });

      if (materials.length === 0) {
        throw new Error(`No se encontraron registros para el almacén "${targetStorageLoc || "L001"}" en el archivo MB52.`);
      }

      setSapMb52File({
        fileName: file.name,
        materials,
        targetStorageLoc: targetStorageLoc || "L001",
        currency: "USD",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar archivo MB52");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. MOVIMIENTOS (Movement Class Rules)
  const handleSapMovimientosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const rules = parseSapMovimientosDict(rows);
      const count = Object.keys(rules).length;

      setSapMovimientosFile({
        fileName: file.name,
        rules,
        count,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar archivo MOVIMIENTOS");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. MRP (SAP Current Parameters)
  const handleSapMrpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const materials = parseSapMrpParams(rows, {
        exchangeRatePenToUsd: exchangeRate,
        convertFromPen: convertFromPen,
      });

      if (materials.length === 0) {
        throw new Error("No se detectaron parámetros MRP válidos en el archivo.");
      }

      setSapMrpFile({
        fileName: file.name,
        materials,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar archivo MRP");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- GENERIC UPLOAD HANDLERS ---
  const handleConsolidatedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const materials = extractMaterialsFromData(rows, {
        exchangeRatePenToUsd: exchangeRate,
        convertFromPen: convertFromPen,
        defaultStorageLoc: targetStorageLoc,
      });
      const consumptions = extractConsumptionsFromData(rows);

      if (materials.length === 0) {
        throw new Error("No se detectaron columnas válidas de materiales (SKU, Descripción, Stock, etc.)");
      }

      setUploadedConsolidated({
        materials,
        consumptions,
        fileName: file.name,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el archivo consolidado");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenericConsumptionsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const consumptions = extractConsumptionsFromData(rows);
      if (consumptions.length === 0) throw new Error("No se detectaron consumos válidos.");
      setUploadedConsumptions({ records: consumptions, fileName: file.name });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al leer consumos");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenericStockUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const materials = extractMaterialsFromData(rows, {
        exchangeRatePenToUsd: exchangeRate,
        convertFromPen: convertFromPen,
        defaultStorageLoc: targetStorageLoc,
      });
      if (materials.length === 0) throw new Error("No se detectaron datos de stock.");
      setUploadedStock({ materials, fileName: file.name });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al leer stock");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenericMrpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseSpreadsheetFile(file);
      const materials = extractMaterialsFromData(rows, {
        exchangeRatePenToUsd: exchangeRate,
        convertFromPen: convertFromPen,
        defaultStorageLoc: targetStorageLoc,
      });
      if (materials.length === 0) throw new Error("No se detectaron datos MRP.");
      setUploadedMrp({ materials, fileName: file.name });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al leer MRP");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- APPLY AND COMBINE DATASETS ---
  const handleApplyChanges = () => {
    if (activeMode === "sap") {
      // Merge SAP files: MB52 (Master/Stock) + DATA (Consumptions) + MRP (Params) + MOVIMIENTOS (Rules)
      const materialMap = new Map<string, MaterialItem>();

      // 1. Seed from MB52 or DATA
      if (sapMb52File) {
        sapMb52File.materials.forEach((m) => {
          if (!m.sku) return;
          materialMap.set(m.sku, {
            sku: m.sku,
            name: m.name || `Material ${m.sku}`,
            category: m.category || "SAP General",
            unit: m.unit || "UND",
            unitCost: m.unitCost || 10,
            leadTimeDays: m.leadTimeDays || 15,
            supplier: m.supplier || "Proveedor Principal SAP",
            currentStock: m.currentStock || 0,
            reservedStock: m.reservedStock || 0,
            inTransitStock: m.inTransitStock || 0,
            minLotSize: m.minLotSize || 1,
            serviceLevelTarget: 0.95,
            sapPlant: m.sapPlant,
            sapStorageLoc: m.sapStorageLoc,
          });
        });
      }

      // 2. Add any SKUs that exist in DATA but not yet in MB52
      if (sapDataFile) {
        sapDataFile.consumptions.forEach((c) => {
          if (!materialMap.has(c.sku)) {
            materialMap.set(c.sku, {
              sku: c.sku,
              name: `Material ${c.sku}`,
              category: "SAP Repuestos/MRO",
              unit: "UND",
              unitCost: 15,
              leadTimeDays: 14,
              supplier: "Proveedor SAP",
              currentStock: 0,
              reservedStock: 0,
              inTransitStock: 0,
              minLotSize: 1,
              serviceLevelTarget: 0.95,
            });
          }
        });
      }

      // 3. Merge SAP MRP parameters
      if (sapMrpFile) {
        sapMrpFile.materials.forEach((mrp) => {
          if (!mrp.sku) return;
          const existing = materialMap.get(mrp.sku);
          if (existing) {
            if (mrp.unitCost && mrp.unitCost > 0) existing.unitCost = mrp.unitCost;
            if (mrp.leadTimeDays && mrp.leadTimeDays > 0) existing.leadTimeDays = mrp.leadTimeDays;
            if (mrp.minLotSize && mrp.minLotSize > 0) existing.minLotSize = mrp.minLotSize;
            if (mrp.supplier && !mrp.supplier.includes("Proveedor SAP")) existing.supplier = mrp.supplier;
            existing.sapMrpType = mrp.sapMrpType || existing.sapMrpType;
            existing.sapSafetyStock = mrp.sapSafetyStock ?? existing.sapSafetyStock;
            existing.sapReorderPoint = mrp.sapReorderPoint ?? existing.sapReorderPoint;
            existing.sapLotSizeKey = mrp.sapLotSizeKey || existing.sapLotSizeKey;
          } else {
            materialMap.set(mrp.sku, {
              sku: mrp.sku,
              name: mrp.name || `Material ${mrp.sku}`,
              category: "SAP MRP",
              unit: "UND",
              unitCost: mrp.unitCost || 10,
              leadTimeDays: mrp.leadTimeDays || 15,
              supplier: mrp.supplier || "Proveedor SAP",
              currentStock: 0,
              reservedStock: 0,
              inTransitStock: 0,
              minLotSize: mrp.minLotSize || 1,
              serviceLevelTarget: 0.95,
              sapMrpType: mrp.sapMrpType,
              sapSafetyStock: mrp.sapSafetyStock,
              sapReorderPoint: mrp.sapReorderPoint,
              sapLotSizeKey: mrp.sapLotSizeKey,
            });
          }
        });
      }

      const mergedMaterials = Array.from(materialMap.values());
      const mergedConsumptions = sapDataFile ? sapDataFile.consumptions : currentConsumptions;

      onDataLoaded(
        mergedMaterials.length > 0 ? mergedMaterials : currentMaterials,
        mergedConsumptions
      );
      onClose();
      return;
    }

    if (activeMode === "consolidated" && uploadedConsolidated) {
      onDataLoaded(uploadedConsolidated.materials, uploadedConsolidated.consumptions);
      onClose();
      return;
    }

    if (activeMode === "multi") {
      let mergedMaterials: MaterialItem[] = [...currentMaterials];
      let mergedConsumptions: ConsumptionRecord[] = uploadedConsumptions
        ? uploadedConsumptions.records
        : [...currentConsumptions];

      if (uploadedStock) {
        const stockMap = new Map<string, Partial<MaterialItem>>(
          uploadedStock.materials.map((m) => [m.sku!, m])
        );
        mergedMaterials = mergedMaterials.map((orig) => {
          const updated = stockMap.get(orig.sku);
          if (updated) {
            return {
              ...orig,
              currentStock: updated.currentStock ?? orig.currentStock,
              reservedStock: updated.reservedStock ?? orig.reservedStock,
              inTransitStock: updated.inTransitStock ?? orig.inTransitStock,
              name: updated.name || orig.name,
              category: updated.category || orig.category,
              unit: updated.unit || orig.unit,
            };
          }
          return orig;
        });

        uploadedStock.materials.forEach((m) => {
          if (m.sku && !mergedMaterials.some((orig) => orig.sku === m.sku)) {
            mergedMaterials.push({
              sku: m.sku,
              name: m.name || `Material ${m.sku}`,
              category: m.category || "General",
              unit: m.unit || "UND",
              unitCost: m.unitCost || 10,
              leadTimeDays: m.leadTimeDays || 15,
              supplier: m.supplier || "Proveedor Principal",
              currentStock: m.currentStock || 0,
              reservedStock: m.reservedStock || 0,
              inTransitStock: m.inTransitStock || 0,
              minLotSize: m.minLotSize || 1,
              serviceLevelTarget: 0.95,
            });
          }
        });
      }

      if (uploadedMrp) {
        const mrpMap = new Map<string, Partial<MaterialItem>>(
          uploadedMrp.materials.map((m) => [m.sku!, m])
        );
        mergedMaterials = mergedMaterials.map((orig) => {
          const mrpInfo = mrpMap.get(orig.sku);
          if (mrpInfo) {
            return {
              ...orig,
              unitCost: mrpInfo.unitCost ?? orig.unitCost,
              leadTimeDays: mrpInfo.leadTimeDays ?? orig.leadTimeDays,
              minLotSize: mrpInfo.minLotSize ?? orig.minLotSize,
              supplier: mrpInfo.supplier || orig.supplier,
              serviceLevelTarget: mrpInfo.serviceLevelTarget ?? orig.serviceLevelTarget,
            };
          }
          return orig;
        });
      }

      onDataLoaded(mergedMaterials, mergedConsumptions);
      onClose();
    }
  };

  const isSapReady = Boolean(sapDataFile || sapMb52File || sapMrpFile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>Carga & Adaptación de Datos de Almacén</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SAP & MRP Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sube los 4 archivos de tu ERP (DATA, MB52, MOVIMIENTOS y MRP) o tu archivo consolidado.
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

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 bg-slate-900">
          <div className="flex border-b border-slate-800 gap-2">
            <button
              onClick={() => setActiveMode("sap")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeMode === "sap"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>🏛️ Pack SAP (DATA + MB52 + MOVIMIENTOS + MRP)</span>
            </button>
            <button
              onClick={() => setActiveMode("consolidated")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeMode === "consolidated"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📄 Archivo Único Consolidado</span>
            </button>
            <button
              onClick={() => setActiveMode("multi")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeMode === "multi"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>🗂️ 3 Archivos Genéricos</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE 1: SAP 4 FILES SPECIFIC UPLOADER */}
          {activeMode === "sap" && (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl flex items-start gap-3 text-blue-200 text-xs">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-300 mb-0.5">Adaptador Nativo para Extracciones SAP ERP / S4HANA</p>
                  <p className="text-slate-400 leading-relaxed">
                    El sistema cruza automáticamente los 3 años de consumos (<strong className="text-slate-300">DATA / MB51</strong>), 
                    filtra por las clases de movimiento reales (<strong className="text-slate-300">MOVIMIENTOS</strong> como 201/261 neteando 202/262 y descartando traslados 311), 
                    obtiene el stock físico actual (<strong className="text-slate-300">MB52</strong>) y compara tus parámetros SAP vigentes (<strong className="text-slate-300">MRP</strong>).
                  </p>
                </div>
              </div>

              {/* SAP Storage Location & Currency Valuation Bar */}
              <div className="p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    📍 Almacén a Valorizar:
                  </span>
                  <input
                    type="text"
                    id="sap-target-storage-loc"
                    value={targetStorageLoc}
                    onChange={(e) => setTargetStorageLoc(e.target.value.toUpperCase().trim())}
                    className="w-24 bg-slate-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-white font-mono font-bold text-xs uppercase focus:outline-none focus:ring-1 focus:ring-amber-400"
                    placeholder="L001"
                  />
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    (Solo considera filas con Almacén = <strong>{targetStorageLoc || "L001"}</strong>)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      id="chk-convert-pen-usd"
                      checked={convertFromPen}
                      onChange={(e) => setConvertFromPen(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-emerald-300 font-semibold">Convertir Soles (S/.) a Dólares ($ USD)</span>
                  </label>

                  {convertFromPen && (
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-emerald-700/60">
                      <span className="text-slate-400">T/C:</span>
                      <input
                        type="number"
                        id="sap-exchange-rate-input"
                        step="0.01"
                        min="0.1"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 3.75)}
                        className="w-16 bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Files Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. DATA (3 Años Movimientos) */}
                <div className={`p-4 rounded-xl border transition ${
                  sapDataFile ? "bg-slate-950/80 border-emerald-500/40" : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">DATA (3 Años Movimientos)</h4>
                        <p className="text-[11px] text-slate-400">Export MB51 / MSEG con BUDAT, BWART, MENGE</p>
                      </div>
                    </div>
                    {sapDataFile ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/40">
                        Primario
                      </span>
                    )}
                  </div>

                  <div className="mt-3 relative">
                    <input
                      type="file"
                      id="sap-data-input"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSapDataUpload}
                      disabled={isProcessing}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      {sapDataFile ? sapDataFile.fileName : "Seleccionar archivo DATA"}
                    </button>
                  </div>

                  {sapDataFile && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Movimientos de consumo procesados:</span>
                        <span className="font-semibold text-emerald-400">{sapDataFile.consumptions.length.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total unidades consumidas:</span>
                        <span className="font-semibold text-white">{sapDataFile.summary.totalQty.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Registros ignorados (traslados/compras):</span>
                        <span className="font-semibold text-slate-400">{sapDataFile.summary.ignoredRows.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. MB52 (Stock Real) */}
                <div className={`p-4 rounded-xl border transition ${
                  sapMb52File ? "bg-slate-950/80 border-emerald-500/40" : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">MB52 (Stock Real Almacén)</h4>
                        <p className="text-[11px] text-slate-400">Export MB52: Libre utilización, valor, reservas</p>
                      </div>
                    </div>
                    {sapMb52File ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/40">
                        Primario
                      </span>
                    )}
                  </div>

                  <div className="mt-3 relative">
                    <input
                      type="file"
                      id="sap-mb52-input"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSapMb52Upload}
                      disabled={isProcessing}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      {sapMb52File ? sapMb52File.fileName : "Seleccionar archivo MB52"}
                    </button>
                  </div>

                  {sapMb52File && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300 flex justify-between">
                      <span className="text-slate-400">SKUs detectados con stock:</span>
                      <span className="font-semibold text-emerald-400">{sapMb52File.materials.length.toLocaleString()} materiales</span>
                    </div>
                  )}
                </div>

                {/* 3. MOVIMIENTOS (Clasificación de Movimientos) */}
                <div className={`p-4 rounded-xl border transition ${
                  sapMovimientosFile ? "bg-slate-950/80 border-emerald-500/40" : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">MOVIMIENTOS (Clases SAP)</h4>
                        <p className="text-[11px] text-slate-400">Mapeo de clases (201, 261, 202, 101, 311...)</p>
                      </div>
                    </div>
                    {sapMovimientosFile ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Opcional (Usa estándar)
                      </span>
                    )}
                  </div>

                  <div className="mt-3 relative">
                    <input
                      type="file"
                      id="sap-mov-input"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSapMovimientosUpload}
                      disabled={isProcessing}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      {sapMovimientosFile ? sapMovimientosFile.fileName : "Cargar Tabla MOVIMIENTOS"}
                    </button>
                  </div>

                  {sapMovimientosFile ? (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-emerald-400 flex justify-between">
                      <span>✓ {sapMovimientosFile.count} reglas personalizadas aplicadas</span>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-[11px] text-slate-500">
                      ℹ️ Si no se sube, se aplican reglas automáticas estándar SAP MM.
                    </div>
                  )}
                </div>

                {/* 4. MRP (Parámetros SAP Actuales) */}
                <div className={`p-4 rounded-xl border transition ${
                  sapMrpFile ? "bg-slate-950/80 border-emerald-500/40" : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        4
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">MRP (Configuración SAP)</h4>
                        <p className="text-[11px] text-slate-400">DISMM, PLIFZ, EISBE (Stock Seg), MINBE (ROP)</p>
                      </div>
                    </div>
                    {sapMrpFile ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700/40">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <div className="mt-3 relative">
                    <input
                      type="file"
                      id="sap-mrp-input"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSapMrpUpload}
                      disabled={isProcessing}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      {sapMrpFile ? sapMrpFile.fileName : "Seleccionar archivo MRP SAP"}
                    </button>
                  </div>

                  {sapMrpFile && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300 flex justify-between">
                      <span className="text-slate-400">Parámetros SAP cargados:</span>
                      <span className="font-semibold text-purple-400">{sapMrpFile.materials.length.toLocaleString()} SKUs</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* MODE 2: Consolidated Single File */}
          {activeMode === "consolidated" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 bg-slate-950/40 rounded-2xl p-8 text-center transition flex flex-col items-center justify-center relative">
                <input
                  type="file"
                  id="consolidated-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleConsolidatedUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={isProcessing}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h4 className="text-base font-semibold text-white mb-1">
                  Arrastra tu archivo maestro aquí o haz clic para buscar
                </h4>
                <p className="text-xs text-slate-400 max-w-md mb-3">
                  Acepta archivos .xlsx o .csv que contengan columnas de SKU, Nombre, Stock Actual, Lead Time, Costo y Consumos.
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                  Formatos soportados: Excel (.xlsx, .xls) y CSV
                </span>
              </div>

              {uploadedConsolidated && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-sm text-emerald-200">
                        {uploadedConsolidated.fileName}
                      </p>
                      <p className="text-xs text-emerald-400/80">
                        Detectados {uploadedConsolidated.materials.length} materiales y {uploadedConsolidated.consumptions.length} registros de consumo.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/20 rounded">
                    Listo para procesar
                  </span>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: Generic Multi File (Consumos, Stock, MRP) */}
          {activeMode === "multi" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* File 1: Consumos */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Paso 1</span>
                    {uploadedConsumptions ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Requerido</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm">Últimos Consumos</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Historial de salidas diarias/semanales (SKU, Fecha, Cantidad).
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="consumptions-file-input"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleGenericConsumptionsUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedConsumptions ? uploadedConsumptions.fileName.slice(0, 14) + "..." : "Cargar Consumos"}
                  </button>
                </div>
                {uploadedConsumptions && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ {uploadedConsumptions.records.length} consumos leídos
                  </p>
                )}
              </div>

              {/* File 2: Stock Real */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Paso 2</span>
                    {uploadedStock ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Requerido</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm">Stock Real Almacén</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Inventario físico, reservado y en tránsito por SKU.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="stock-file-input"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleGenericStockUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedStock ? uploadedStock.fileName.slice(0, 14) + "..." : "Cargar Stock"}
                  </button>
                </div>
                {uploadedStock && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ {uploadedStock.materials.length} SKUs con stock
                  </p>
                )}
              </div>

              {/* File 3: Base MRP */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Paso 3</span>
                    {uploadedMrp ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Opcional</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm">Base de Datos MRP</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Lead Times, Costo Unitario, MOQ y Proveedor por material.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="mrp-file-input"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleGenericMrpUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <button className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedMrp ? uploadedMrp.fileName.slice(0, 14) + "..." : "Cargar MRP"}
                  </button>
                </div>
                {uploadedMrp && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ {uploadedMrp.materials.length} parámetros MRP leídos
                  </p>
                )}
              </div>

            </div>
          )}

          {/* Download Templates Section */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Descargar Plantillas de Ejemplo Excel / SAP
                </h5>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => downloadTemplate("sap_pack", "xlsx")}
                className="py-1.5 px-2 bg-blue-900/30 hover:bg-blue-800/40 text-blue-200 hover:text-white rounded-lg text-xs font-medium border border-blue-700/50 flex items-center justify-center gap-1.5 transition"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Ejemplo SAP (MB52)
              </button>
              <button
                onClick={() => downloadTemplate("consumos", "xlsx")}
                className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Plantilla Consumos
              </button>
              <button
                onClick={() => downloadTemplate("stock", "xlsx")}
                className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                Plantilla Stock
              </button>
              <button
                onClick={() => downloadTemplate("mrp", "xlsx")}
                className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
                Plantilla MRP
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium transition"
          >
            Cancelar
          </button>

          <button
            id="btn-apply-uploaded-data"
            onClick={handleApplyChanges}
            disabled={
              activeMode === "sap"
                ? !isSapReady
                : activeMode === "consolidated"
                ? !uploadedConsolidated
                : !uploadedConsumptions && !uploadedStock && !uploadedMrp
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-900/40 transition"
          >
            <span>Calcular Parámetros Óptimos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
