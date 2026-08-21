import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Brain,
  AlertTriangle,
  ShoppingCart,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { CalculatedMaterial, HealthStatus, ABCClass, XYZClass } from "../types";
import { exportToExcel } from "../utils/fileParser";

interface MaterialsTableViewProps {
  materials: CalculatedMaterial[];
  selectedStorageLoc?: string;
  onSelectMaterial: (material: CalculatedMaterial) => void;
  initialStatusFilter?: string;
  initialAbcFilter?: string;
  initialXyzFilter?: string;
}

export const MaterialsTableView: React.FC<MaterialsTableViewProps> = ({
  materials,
  selectedStorageLoc = "L001",
  onSelectMaterial,
  initialStatusFilter = "ALL",
  initialAbcFilter = "ALL",
  initialXyzFilter = "ALL",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [abcFilter, setAbcFilter] = useState<string>(initialAbcFilter);
  const [xyzFilter, setXyzFilter] = useState<string>(initialXyzFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("daysOfCoverage");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get distinct categories
  const categories = useMemo(() => {
    const cats = new Set(materials.map((m) => m.category));
    return Array.from(cats).sort();
  }, [materials]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Search
      const matchesSearch =
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== "ALL" && item.healthStatus !== statusFilter) return false;

      // ABC
      if (abcFilter !== "ALL" && item.abcClass !== abcFilter) return false;

      // XYZ
      if (xyzFilter !== "ALL" && item.xyzClass !== xyzFilter) return false;

      // Category
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;

      return true;
    });
  }, [materials, searchTerm, statusFilter, abcFilter, xyzFilter, categoryFilter]);

  // Sort materials
  const sortedMaterials = useMemo(() => {
    return [...filteredMaterials].sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];

      if (typeof aVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc" ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });
  }, [filteredMaterials, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    const exportData = sortedMaterials.map((m) => ({
      SKU: m.sku,
      Descripcion: m.name,
      Categoria: m.category,
      Proveedor: m.supplier,
      Unidad: m.unit,
      StockFisico: m.currentStock,
      StockReservado: m.reservedStock,
      StockEnTransito: m.inTransitStock,
      StockDisponible: m.availableStock,
      DiasCobertura: m.daysOfCoverage,
      ConsumoDiarioPromedio: m.avgDailyDemand,
      LeadTimeDias: m.leadTimeDays,
      StockSeguridadSS: m.safetyStock,
      PuntoReordenROP: m.reorderPoint,
      LoteOptimoEOQ: m.eoq,
      LoteMinimoMOQ: m.minLotSize,
      CostoUnitarioUSD: m.unitCost,
      ClasificacionABC: m.abcClass,
      ClasificacionXYZ: m.xyzClass,
      EstadoSalud: m.healthStatus,
      CantidadSugeridaCompra: m.recommendedOrderQty,
      CostoEstimadoCompraUSD: m.estimatedOrderCost,
      SobreInventarioUSD: m.overstockValue,
    }));
    exportToExcel(exportData, "maestro_materiales_mrp");
  };

  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case "STOCKOUT_CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Quiebre Crítico
          </span>
        );
      case "REORDER_URGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            En Reorden
          </span>
        );
      case "OPTIMAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Óptimo
          </span>
        );
      case "OVERSTOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Sobre-Stock
          </span>
        );
      case "DEAD_STOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Sin Movimiento
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Base de Datos de Materiales & Parámetros MRP
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualiza existencias físicas, consumos medios, stocks de seguridad y puntos de reorden calculados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Exportar a Excel con fórmulas y parámetros"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-material"
              placeholder="Buscar por SKU, descripción, proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-health-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="STOCKOUT_CRITICAL">🔴 Quiebre Crítico</option>
              <option value="REORDER_URGENT">🟠 En Reorden</option>
              <option value="OPTIMAL">🟢 Stock Óptimo</option>
              <option value="OVERSTOCK">🟣 Sobre-Stock</option>
              <option value="DEAD_STOCK">⚫ Sin Movimiento</option>
            </select>
          </div>

          {/* ABC Filter */}
          <div>
            <select
              id="filter-abc-class"
              value={abcFilter}
              onChange={(e) => setAbcFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Clases ABC</option>
              <option value="A">Clase A (Alto Valor / 80%)</option>
              <option value="B">Clase B (Medio Valor / 15%)</option>
              <option value="C">Clase C (Bajo Valor / 5%)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th
                  onClick={() => handleSort("sku")}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>SKU / Material</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("currentStock")}
                  className="py-3 px-3 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Actual</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("daysOfCoverage")}
                  className="py-3 px-3 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cobertura</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("avgDailyDemand")}
                  className="py-3 px-3 cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Demanda Día</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Lead Time</th>
                <th className="py-3 px-3 text-right" title="Stock de Seguridad SS = Z * sigma * sqrt(L)">
                  SS (Seg.)
                </th>
                <th className="py-3 px-3 text-right" title="Punto de Reorden ROP = (d * L) + SS">
                  ROP (Reorden)
                </th>
                <th className="py-3 px-3 text-right" title="Lote Económico de Compra">
                  EOQ / MOQ
                </th>
                <th className="py-3 px-3 text-center">ABC-XYZ</th>
                <th className="py-3 px-3 text-center">Estado de Salud</th>
                <th className="py-3 px-3 text-right">Compra Sugerida</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {sortedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No se encontraron materiales con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                sortedMaterials.map((item) => {
                  const isStockout = item.healthStatus === "STOCKOUT_CRITICAL";
                  const isReorder = item.healthStatus === "REORDER_URGENT";

                  return (
                    <tr
                      key={item.sku}
                      className={`hover:bg-slate-800/50 transition ${
                        isStockout
                          ? "bg-rose-950/10"
                          : isReorder
                          ? "bg-amber-950/10"
                          : ""
                      }`}
                    >
                      {/* SKU & Name */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-[220px]">
                          <div className="font-mono font-bold text-xs text-blue-400">
                            {item.sku}
                          </div>
                          <div className="font-semibold text-slate-200 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.category} • {item.supplier}
                          </div>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-white text-sm">
                          {item.currentStock} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </div>
                        {(item.reservedStock > 0 || item.inTransitStock > 0) && (
                          <div className="text-[10px] text-slate-400">
                            Disp: {item.availableStock}
                            {item.inTransitStock > 0 && <span className="text-blue-400"> (+{item.inTransitStock} trans)</span>}
                          </div>
                        )}
                      </td>

                      {/* Days of Coverage */}
                      <td className="py-3 px-3 text-right font-semibold">
                        <span
                          className={
                            item.daysOfCoverage <= 5
                              ? "text-rose-400 font-bold"
                              : item.daysOfCoverage <= item.leadTimeDays
                              ? "text-amber-400"
                              : item.daysOfCoverage > 120
                              ? "text-purple-400"
                              : "text-emerald-400"
                          }
                        >
                          {item.daysOfCoverage > 900 ? "+1 año" : `${item.daysOfCoverage} d`}
                        </span>
                      </td>

                      {/* Daily Demand */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {item.avgDailyDemand} <span className="text-[10px] text-slate-500">/d</span>
                      </td>

                      {/* Lead Time */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {item.leadTimeDays} d
                      </td>

                      {/* Safety Stock */}
                      <td className="py-3 px-3 text-right font-mono text-indigo-300 font-semibold">
                        {item.safetyStock}
                      </td>

                      {/* Reorder Point (ROP) */}
                      <td className="py-3 px-3 text-right font-mono text-amber-300 font-bold">
                        {item.reorderPoint}
                      </td>

                      {/* EOQ / MOQ */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {item.eoq}
                        {item.minLotSize > 1 && (
                          <div className="text-[10px] text-slate-500">MOQ: {item.minLotSize}</div>
                        )}
                      </td>

                      {/* ABC-XYZ */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-xs text-slate-200">
                          {item.abcClass}-{item.xyzClass}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(item.healthStatus)}
                      </td>

                      {/* Recommended Order */}
                      <td className="py-3 px-3 text-right">
                        {item.recommendedOrderQty > 0 ? (
                          <div>
                            <span className="font-bold text-amber-400">
                              +{item.recommendedOrderQty} {item.unit}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              ${item.estimatedOrderCost.toLocaleString("es-ES")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onSelectMaterial(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition text-xs font-semibold inline-flex items-center gap-1"
                          title="Ver Gráfica y Diagnóstico IA"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Analizar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Mostrando {sortedMaterials.length} de {materials.length} materiales registrados.
          </span>
          <span className="text-slate-500">
            Fórmulas: SS = Z × σ_L, ROP = d × L + SS, EOQ = √(2DS/H)
          </span>
        </div>
      </div>

    </div>
  );
};
