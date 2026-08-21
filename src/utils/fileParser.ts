import * as XLSX from "xlsx";
import { MaterialItem, ConsumptionRecord } from "../types";

/**
 * Normalizes header strings for flexible fuzzy matching
 */
export function normalizeHeader(str: string): string {
  return (
    str
      ?.toLowerCase()
      ?.trim()
      ?.replace(/[_\s\-\.\/]+/g, "")
      ?.normalize("NFD")
      ?.replace(/[\u0300-\u036f]/g, "") || ""
  );
}

/**
 * Standard movement behavior interface
 */
export interface SapMovementRule {
  code: string;
  description: string;
  effect: "CONSUMPTION" | "RETURN" | "RECEIPT" | "TRANSFER" | "SCRAP" | "IGNORE";
  factor: number; // 1 for consumption, -1 for return/annulment, 0 for ignore
}

/**
 * Default SAP Standard Movement Rules (BWART)
 */
export const DEFAULT_SAP_MOVEMENTS: Record<string, SapMovementRule> = {
  // Consumptions (+)
  "201": { code: "201", description: "Salida de mercancías para centro de coste (Consumo)", effect: "CONSUMPTION", factor: 1 },
  "221": { code: "221", description: "Salida para proyecto (Consumo)", effect: "CONSUMPTION", factor: 1 },
  "241": { code: "241", description: "Salida para activo fijo (Consumo)", effect: "CONSUMPTION", factor: 1 },
  "261": { code: "261", description: "Consumo para orden de fabricación/mantenimiento", effect: "CONSUMPTION", factor: 1 },
  "551": { code: "551", description: "Salida por desguace / merma / baja", effect: "SCRAP", factor: 1 },
  "601": { code: "601", description: "Salida de mercancías para entrega / despacho", effect: "CONSUMPTION", factor: 1 },

  // Returns / Annulments (-)
  "202": { code: "202", description: "Anulación salida a centro de coste (Devolución)", effect: "RETURN", factor: -1 },
  "222": { code: "222", description: "Anulación salida para proyecto (Devolución)", effect: "RETURN", factor: -1 },
  "242": { code: "242", description: "Anulación salida activo fijo", effect: "RETURN", factor: -1 },
  "262": { code: "262", description: "Anulación consumo para orden (Devolución al almacén)", effect: "RETURN", factor: -1 },
  "552": { code: "552", description: "Anulación desguace / merma", effect: "RETURN", factor: -1 },
  "602": { code: "602", description: "Anulación entrega / devolución cliente", effect: "RETURN", factor: -1 },

  // Receipts / Purchases (Inflows - Not consumption)
  "101": { code: "101", description: "Entrada de mercancías por pedido de compras", effect: "RECEIPT", factor: 0 },
  "102": { code: "102", description: "Anulación entrada de mercancías por compra", effect: "RECEIPT", factor: 0 },
  "105": { code: "105", description: "Liberación stock bloqueado en control calidad", effect: "RECEIPT", factor: 0 },
  "501": { code: "501", description: "Entrada sin pedido / inventario inicial", effect: "RECEIPT", factor: 0 },

  // Internal Transfers (Do not generate artificial demand duplicate)
  "301": { code: "301", description: "Traspaso de centro a centro", effect: "TRANSFER", factor: 0 },
  "302": { code: "302", description: "Anulación traspaso de centro a centro", effect: "TRANSFER", factor: 0 },
  "311": { code: "311", description: "Traspaso dentro del mismo centro (almacén a almacén)", effect: "TRANSFER", factor: 0 },
  "312": { code: "312", description: "Anulación traspaso almacén a almacén", effect: "TRANSFER", factor: 0 },
  "321": { code: "321", description: "Traspaso de control calidad a libre utilización", effect: "TRANSFER", factor: 0 },
  "344": { code: "344", description: "Bloqueo de stock libre utilización", effect: "TRANSFER", factor: 0 },
};

/**
 * Parses an Excel or CSV file buffer into raw JSON rows
 */
export async function parseSpreadsheetFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper to extract value from row by checking multiple possible header variations
 */
function findRowValue(row: any, possibleHeaders: string[]): any {
  const keys = Object.keys(row);
  const matchKey = keys.find((k) =>
    possibleHeaders.some((ph) => normalizeHeader(k).includes(normalizeHeader(ph)))
  );
  return matchKey ? row[matchKey] : undefined;
}

/**
 * Parses SAP MB52 report (Stock actual detallado por almacén)
 * Supports filtering strictly by Storage Location (default: L001) and currency conversion (PEN -> USD)
 */
export function parseSapMb52(
  rows: any[],
  options?: {
    targetStorageLoc?: string; // e.g. "L001"
    exchangeRatePenToUsd?: number; // e.g. 3.75
    convertFromPen?: boolean;
  }
): Partial<MaterialItem>[] {
  const mapBySku = new Map<string, Partial<MaterialItem>>();
  const targetLoc = (options?.targetStorageLoc || "L001").trim().toUpperCase();
  const rate = options?.convertFromPen && options?.exchangeRatePenToUsd && options.exchangeRatePenToUsd > 0
    ? options.exchangeRatePenToUsd
    : 1;

  for (const row of rows) {
    const skuRaw = findRowValue(row, ["material", "matnr", "codigo", "itemcode", "artículo", "codmaterial"]);
    if (!skuRaw) continue;
    const sku = String(skuRaw).trim();
    if (!sku || sku.toLowerCase() === "total" || sku.startsWith("*")) continue;

    const plant = findRowValue(row, ["centro", "werks", "planta"])?.toString()?.trim() || "1000";
    const storageLocRaw = findRowValue(row, ["almacen", "lgort", "alm", "ubicacion", "storage_loc"])?.toString()?.trim();
    const storageLoc = storageLocRaw ? storageLocRaw.toUpperCase() : "L001";

    // If targetLoc is specified (e.g. L001) and row has an explicit storage location that does NOT match, skip it
    if (targetLoc && targetLoc !== "ALL" && storageLocRaw && storageLoc !== targetLoc) {
      continue;
    }

    const name = findRowValue(row, ["textobrevematerial", "maktx", "descripcion", "nombre", "denominacion", "materialdesc"])?.toString()?.trim();
    const unit = findRowValue(row, ["unidadmedidabase", "umb", "meins", "unidad", "um"])?.toString()?.trim() || "UND";

    const freeStock = Number(findRowValue(row, ["libreutilizacion", "labst", "stocklibre", "stockactual", "libre"])) || 0;
    const stockValRaw = Number(findRowValue(row, ["valorlibreutil", "salk3", "valortotal", "valorstock", "valor"])) || 0;
    const inTransit = Number(findRowValue(row, ["entransito", "umlmc", "trame", "transito", "pedidopendiente"])) || 0;
    const reserved = Number(findRowValue(row, ["reservas", "reservado", "vmeng", "comprometido"])) || 0;

    let unitCost = 0;
    const explicitCost = Number(findRowValue(row, ["costounitario", "preciounitario", "precio", "stprs", "verpr"]));
    if (explicitCost > 0) {
      unitCost = explicitCost / rate;
    } else if (freeStock > 0 && stockValRaw > 0) {
      unitCost = Number(((stockValRaw / freeStock) / rate).toFixed(2));
    }

    if (!mapBySku.has(sku)) {
      mapBySku.set(sku, {
        sku,
        name: name || `Material SAP ${sku}`,
        category: "SAP Material L001",
        unit,
        currentStock: Math.max(0, freeStock),
        inTransitStock: Math.max(0, inTransit),
        reservedStock: Math.max(0, reserved),
        unitCost: unitCost > 0 ? Number(unitCost.toFixed(2)) : 10,
        sapPlant: plant,
        sapStorageLoc: storageLoc || "L001",
      });
    } else {
      // Aggregate if multiple records exist for this SKU within L001
      const existing = mapBySku.get(sku)!;
      existing.currentStock = (existing.currentStock || 0) + Math.max(0, freeStock);
      existing.inTransitStock = (existing.inTransitStock || 0) + Math.max(0, inTransit);
      existing.reservedStock = (existing.reservedStock || 0) + Math.max(0, reserved);
      if (name && !existing.name?.includes("SAP Material")) existing.name = name;
      if (unitCost > 0 && (!existing.unitCost || existing.unitCost === 10)) {
        existing.unitCost = Number(unitCost.toFixed(2));
      }
    }
  }

  return Array.from(mapBySku.values());
}

/**
 * Parses SAP MOVIMIENTOS dictionary if uploaded by user
 */
export function parseSapMovimientosDict(rows: any[]): Record<string, SapMovementRule> {
  const dict: Record<string, SapMovementRule> = { ...DEFAULT_SAP_MOVEMENTS };

  for (const row of rows) {
    const codeRaw = findRowValue(row, ["clasedemovimiento", "clasemov", "bwart", "movimiento", "codigo", "clase"]);
    if (!codeRaw) continue;
    const code = String(codeRaw).trim();

    const description = findRowValue(row, ["descripcion", "textobreve", "nombre", "denominacion"])?.toString()?.trim() || `Clase Movimiento ${code}`;
    const effectRaw = findRowValue(row, ["tipo", "efecto", "clasificacion", "signo", "categoria"])?.toString()?.toLowerCase()?.trim() || "";

    let factor = 1;
    let effect: SapMovementRule["effect"] = "CONSUMPTION";

    if (effectRaw.includes("anul") || effectRaw.includes("devol") || effectRaw.includes("ret") || effectRaw.includes("-")) {
      factor = -1;
      effect = "RETURN";
    } else if (effectRaw.includes("compra") || effectRaw.includes("recep") || effectRaw.includes("101") || effectRaw.includes("ingreso")) {
      factor = 0;
      effect = "RECEIPT";
    } else if (effectRaw.includes("traslado") || effectRaw.includes("traspaso") || effectRaw.includes("transfer")) {
      factor = 0;
      effect = "TRANSFER";
    } else if (effectRaw.includes("merma") || effectRaw.includes("baja") || effectRaw.includes("desguace")) {
      factor = 1;
      effect = "SCRAP";
    } else if (effectRaw.includes("ignorar") || effectRaw.includes("no") || effectRaw.includes("0")) {
      factor = 0;
      effect = "IGNORE";
    }

    dict[code] = {
      code,
      description,
      effect,
      factor,
    };
  }

  return dict;
}

/**
 * Parses SAP DATA (MB51 / MSEG - 3 years of movements) using movement rules
 */
export function parseSapDataMovements(
  rows: any[],
  customRules?: Record<string, SapMovementRule>
): { consumptions: ConsumptionRecord[]; summary: { totalRows: number; consumptionRows: number; ignoredRows: number; totalQty: number } } {
  const rules = customRules || DEFAULT_SAP_MOVEMENTS;
  const consumptions: ConsumptionRecord[] = [];
  
  let consumptionRows = 0;
  let ignoredRows = 0;
  let totalQty = 0;

  for (const row of rows) {
    const skuRaw = findRowValue(row, ["material", "matnr", "codigo", "itemcode", "sku"]);
    if (!skuRaw) continue;
    const sku = String(skuRaw).trim();
    if (!sku || sku.toLowerCase() === "total" || sku.startsWith("*")) continue;

    const bwartRaw = findRowValue(row, ["clasedemovimiento", "clasemov", "bwart", "movimiento", "tipo"]);
    const bwart = bwartRaw ? String(bwartRaw).trim() : "201";

    const dateRaw = findRowValue(row, ["fechacontab", "fechadocumento", "budat", "bldat", "fecha", "date", "periodo"]);
    let dateStr = "2026-01-01";
    if (dateRaw) {
      if (dateRaw instanceof Date) {
        dateStr = dateRaw.toISOString().split("T")[0];
      } else {
        const rawStr = String(dateRaw).trim();
        // Check if dd.mm.yyyy or dd/mm/yyyy
        const parts = rawStr.split(/[\.\/\-]/);
        if (parts.length === 3 && parts[2].length === 4) {
          dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else {
          dateStr = rawStr;
        }
      }
    }

    const qtyRaw = findRowValue(row, ["cantidad", "cantidadenume", "erfmg", "menge", "qty", "cant"]);
    if (qtyRaw === undefined || qtyRaw === "") continue;
    let qty = Math.abs(Number(qtyRaw));
    if (isNaN(qty)) continue;

    // Check Debit/Credit indicator if present (SHKZG: 'H' = Salida/Debe, 'S' = Entrada/Haber)
    const shkzg = findRowValue(row, ["indicadordebehaber", "shkzg", "debehaber", "signo"])?.toString()?.toUpperCase()?.trim();

    // Determine multiplier from BWART rules
    const rule = rules[bwart];
    let effectiveFactor = 1;

    if (rule) {
      effectiveFactor = rule.factor;
    } else {
      // Default heuristic: If bwart is even (e.g. 262, 202) it's likely an annulment (-1), if odd (261, 201) it's consumption (+1)
      if (["202", "262", "222", "242", "552", "602", "102"].includes(bwart)) {
        effectiveFactor = -1;
      } else if (["101", "301", "311", "321", "344"].includes(bwart)) {
        effectiveFactor = 0; // Purchase or transfer
      } else {
        effectiveFactor = 1;
      }
    }

    if (shkzg === "S" && effectiveFactor > 0) {
      // S indicates credit/inflow return
      effectiveFactor = -1;
    }

    if (effectiveFactor === 0) {
      ignoredRows++;
      continue;
    }

    const netQuantity = qty * effectiveFactor;
    consumptionRows++;
    totalQty += netQuantity;

    consumptions.push({
      sku,
      date: dateStr,
      quantity: netQuantity,
    });
  }

  return {
    consumptions,
    summary: {
      totalRows: rows.length,
      consumptionRows,
      ignoredRows,
      totalQty: Number(totalQty.toFixed(2)),
    },
  };
}

/**
 * Parses SAP MRP Database / Table (MD04 / MARC / MDMA Parameters)
 */
export function parseSapMrpParams(
  rows: any[],
  options?: {
    exchangeRatePenToUsd?: number;
    convertFromPen?: boolean;
  }
): Partial<MaterialItem>[] {
  const materials: Partial<MaterialItem>[] = [];
  const rate = options?.convertFromPen && options?.exchangeRatePenToUsd && options.exchangeRatePenToUsd > 0
    ? options.exchangeRatePenToUsd
    : 1;

  for (const row of rows) {
    const skuRaw = findRowValue(row, ["material", "matnr", "codigo", "sku", "itemcode"]);
    if (!skuRaw) continue;
    const sku = String(skuRaw).trim();
    if (!sku || sku.toLowerCase() === "total" || sku.startsWith("*")) continue;

    const mrpType = findRowValue(row, ["caractplanifnec", "tipomrp", "dismm", "mrp", "tipoplanificacion"])?.toString()?.trim() || "VB";
    const leadTime = Number(findRowValue(row, ["plazoentregaprevisto", "plifz", "leadtime", "diasentrega", "tiemporeposicion", "plazo"])) || 15;
    const safetyStock = Number(findRowValue(row, ["stockdeseguridad", "eisbe", "stockseguridad", "stockseg"])) || 0;
    const reorderPoint = Number(findRowValue(row, ["puntodepedido", "minbe", "puntopedido", "rop", "puntoreorden"])) || 0;
    const lotSizeKey = findRowValue(row, ["tamanodelote", "disls", "tamanolote", "lotekey"])?.toString()?.trim() || "EX";
    const minLotSize = Number(findRowValue(row, ["tamanolotemin", "bstmi", "loteminimo", "moq", "pedidominimo"])) || 1;
    const supplier = findRowValue(row, ["proveedorhabitual", "lifnr", "proveedor", "vendor", "fabricante"])?.toString()?.trim() || "Proveedor SAP";
    const rawCost = Number(findRowValue(row, ["preciovariable", "precioestandar", "verpr", "stprs", "costounitario", "costo", "precio"])) || 10;
    const unitCost = Number((rawCost / rate).toFixed(2));
    const plant = findRowValue(row, ["centro", "werks"])?.toString()?.trim() || "1000";
    const storageLoc = findRowValue(row, ["almacen", "lgort", "alm"])?.toString()?.trim() || "L001";

    materials.push({
      sku,
      unitCost: Math.max(0.01, unitCost),
      leadTimeDays: Math.max(1, Math.round(leadTime)),
      minLotSize: Math.max(1, Math.round(minLotSize)),
      supplier,
      sapMrpType: mrpType,
      sapSafetyStock: Math.max(0, safetyStock),
      sapReorderPoint: Math.max(0, reorderPoint),
      sapLotSizeKey: lotSizeKey,
      sapPlant: plant,
      sapStorageLoc: storageLoc,
      serviceLevelTarget: 0.95,
    });
  }

  return materials;
}

/**
 * Standard General Extractor for Generic CSV/Excel
 */
export function extractMaterialsFromData(
  rows: any[],
  options?: {
    exchangeRatePenToUsd?: number;
    convertFromPen?: boolean;
    defaultStorageLoc?: string;
  }
): MaterialItem[] {
  const materials: MaterialItem[] = [];
  const rate = options?.convertFromPen && options?.exchangeRatePenToUsd && options.exchangeRatePenToUsd > 0
    ? options.exchangeRatePenToUsd
    : 1;

  for (const row of rows) {
    const sku = findRowValue(row, ["sku", "codigo", "itemcode", "codmaterial", "idmaterial", "material", "item"])?.toString()?.trim();
    const name = findRowValue(row, ["nombre", "name", "descripcion", "material", "itemname", "producto", "textobrevematerial", "maktx"])?.toString()?.trim();

    if (!sku && !name) continue;

    const finalSku = sku || `MAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const finalName = name || `Material ${finalSku}`;
    const category = findRowValue(row, ["categoria", "category", "familia", "grupo", "rubro", "tipo", "grupodearticulos"])?.toString()?.trim() || "Almacén L001";
    const unit = findRowValue(row, ["unidad", "unit", "um", "uom", "medida", "umb", "meins"])?.toString()?.trim() || "UND";
    const rawCost = Number(findRowValue(row, ["costounitario", "costo", "precio", "unitcost", "price", "valunitario", "stprs", "verpr"])) || 10;
    const unitCost = Number((rawCost / rate).toFixed(2));
    const leadTimeDays = Number(findRowValue(row, ["leadtime", "tiemporeposicion", "tiempoentrega", "diasentrega", "diasproveedor", "plazo", "plifz"])) || 15;
    const supplier = findRowValue(row, ["proveedor", "supplier", "vendor", "fabricante", "lifnr"])?.toString()?.trim() || "Proveedor Principal";
    const currentStock = Number(findRowValue(row, ["stockactual", "stockreal", "stockfisico", "stock", "existencia", "inventarioactual", "saldo", "libreutilizacion", "labst"])) || 0;
    const reservedStock = Number(findRowValue(row, ["reservado", "stockreservado", "comprometido", "reserved", "reservas", "vmeng"])) || 0;
    const inTransitStock = Number(findRowValue(row, ["entransito", "transito", "pedidopendiente", "ocpendiente", "intransit", "umlmc", "trame"])) || 0;
    const minLotSize = Number(findRowValue(row, ["moq", "loteminimo", "pedidominimo", "minlotsize", "lote", "bstmi"])) || 1;
    const storageLoc = findRowValue(row, ["almacen", "lgort", "alm", "ubicacion"])?.toString()?.trim() || options?.defaultStorageLoc || "L001";
    const plant = findRowValue(row, ["centro", "werks", "planta"])?.toString()?.trim() || "1000";
    
    let serviceLevel = Number(findRowValue(row, ["nivelservicio", "servicelevel", "sl", "nivelconfianza"]));
    if (serviceLevel && serviceLevel > 1) {
      serviceLevel = serviceLevel / 100;
    }
    if (!serviceLevel || serviceLevel < 0.5 || serviceLevel > 0.999) {
      serviceLevel = 0.95;
    }

    materials.push({
      sku: finalSku,
      name: finalName,
      category,
      unit,
      unitCost: Math.max(0.01, unitCost),
      leadTimeDays: Math.max(1, Math.round(leadTimeDays)),
      supplier,
      currentStock: Math.max(0, currentStock),
      reservedStock: Math.max(0, reservedStock),
      inTransitStock: Math.max(0, inTransitStock),
      minLotSize: Math.max(1, Math.round(minLotSize)),
      serviceLevelTarget: serviceLevel,
      sapStorageLoc: storageLoc,
      sapPlant: plant,
    });
  }

  return materials;
}

/**
 * Standard General Extractor for Generic Consumptions
 */
export function extractConsumptionsFromData(rows: any[]): ConsumptionRecord[] {
  const consumptions: ConsumptionRecord[] = [];

  for (const row of rows) {
    const sku = findRowValue(row, ["sku", "codigo", "itemcode", "codmaterial", "idmaterial", "material", "item"])?.toString()?.trim();
    const quantityVal = findRowValue(row, ["consumo", "cantidad", "quantity", "cant", "salida", "despacho", "uso", "demanda", "erfmg", "menge"]);
    const dateVal = findRowValue(row, ["fecha", "date", "periodo", "mes", "semana", "dia", "time", "fechacontab", "budat"])?.toString()?.trim() || "2026-01-01";

    if (!sku || quantityVal === undefined) continue;

    const quantity = Number(quantityVal);
    if (!isNaN(quantity)) {
      consumptions.push({
        sku,
        date: dateVal,
        quantity: Math.max(0, quantity),
      });
    }
  }

  return consumptions;
}

/**
 * Generates and downloads standard Excel / CSV templates including SAP-ready format
 */
export function downloadTemplate(type: "consumos" | "stock" | "mrp" | "consolidado" | "sap_pack", format: "xlsx" | "csv" = "xlsx") {
  let data: any[] = [];
  let filename = `plantilla_${type}`;

  if (type === "sap_pack") {
    // Multi-sheet or sample SAP format
    data = [
      { Material: "10004581", TextoBreveMaterial: "Rodamiento Rígido SKF 6205-2RS", Centro: "1000", Almacen: "0001", LibreUtilizacion: 24, ValorLibreUtil: 588.00, EnTransito: 10, Reservas: 4, UnidadMedidaBase: "ST" },
      { Material: "10004582", TextoBreveMaterial: "Válvula Solenoide Festo 24V", Centro: "1000", Almacen: "0001", LibreUtilizacion: 2, ValorLibreUtil: 290.00, EnTransito: 0, Reservas: 0, UnidadMedidaBase: "ST" },
      { Material: "10004583", TextoBreveMaterial: "Aceite Hidráulico Shell Tellus 68", Centro: "1000", Almacen: "0002", LibreUtilizacion: 350, ValorLibreUtil: 6370.00, EnTransito: 50, Reservas: 30, UnidadMedidaBase: "L" },
    ];
  } else if (type === "consumos") {
    data = [
      { SKU: "ROD-6205", Fecha: "2026-05-01", Consumo: 15 },
      { SKU: "ROD-6205", Fecha: "2026-05-02", Consumo: 12 },
      { SKU: "ROD-6205", Fecha: "2026-05-03", Consumo: 18 },
      { SKU: "VAL-PNEU-24", Fecha: "2026-05-01", Consumo: 4 },
      { SKU: "VAL-PNEU-24", Fecha: "2026-05-02", Consumo: 6 },
      { SKU: "LUB-ISO68", Fecha: "2026-05-01", Consumo: 25 },
      { SKU: "LUB-ISO68", Fecha: "2026-05-02", Consumo: 30 },
    ];
  } else if (type === "stock") {
    data = [
      { SKU: "ROD-6205", Descripcion: "Rodamiento Rígido de Bolas SKF 6205-2RS", Categoria: "MRO Mecánico", StockActual: 18, Reservado: 4, EnTransito: 0, Unidad: "UND" },
      { SKU: "VAL-PNEU-24", Descripcion: "Electroválvula Neumática Festo 5/2 24V", Categoria: "Neumática", StockActual: 2, Reservado: 0, EnTransito: 0, Unidad: "UND" },
      { SKU: "LUB-ISO68", Descripcion: "Aceite Hidráulico Shell Tellus S2 MX 68", Categoria: "Lubricantes", StockActual: 320, Reservado: 40, EnTransito: 60, Unidad: "GL" },
    ];
  } else if (type === "mrp") {
    data = [
      { SKU: "ROD-6205", CostoUnitario: 24.50, LeadTimeDias: 14, LoteMinimoMOQ: 10, Proveedor: "SKF Distribuidor Autorizado", NivelServicioPct: 95 },
      { SKU: "VAL-PNEU-24", CostoUnitario: 145.00, LeadTimeDias: 25, LoteMinimoMOQ: 2, Proveedor: "Festo Automatización", NivelServicioPct: 98 },
      { SKU: "LUB-ISO68", CostoUnitario: 18.20, LeadTimeDias: 7, LoteMinimoMOQ: 20, Proveedor: "Shell Lubricantes Industriales", NivelServicioPct: 95 },
    ];
  } else {
    data = [
      {
        SKU: "ROD-6205",
        Descripcion: "Rodamiento Rígido de Bolas SKF 6205-2RS",
        Categoria: "MRO Mecánico",
        Unidad: "UND",
        StockActual: 18,
        Reservado: 4,
        EnTransito: 0,
        CostoUnitario: 24.50,
        LeadTimeDias: 14,
        LoteMinimoMOQ: 10,
        Proveedor: "SKF Distribución",
        NivelServicioPct: 95,
      },
      {
        SKU: "VAL-PNEU-24",
        Descripcion: "Electroválvula Neumática Festo 5/2 24V",
        Categoria: "Neumática",
        Unidad: "UND",
        StockActual: 2,
        Reservado: 0,
        EnTransito: 0,
        CostoUnitario: 145.00,
        LeadTimeDias: 25,
        LoteMinimoMOQ: 2,
        Proveedor: "Festo Automatización",
        NivelServicioPct: 98,
      },
      {
        SKU: "LUB-ISO68",
        Descripcion: "Aceite Hidráulico Shell Tellus S2 MX 68",
        Categoria: "Lubricantes",
        Unidad: "GL",
        StockActual: 320,
        Reservado: 40,
        EnTransito: 60,
        CostoUnitario: 18.20,
        LeadTimeDias: 7,
        LoteMinimoMOQ: 20,
        Proveedor: "Shell Lubricantes",
        NivelServicioPct: 95,
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");

  if (format === "csv") {
    XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
  } else {
    XLSX.writeFile(wb, `${filename}.xlsx`, { bookType: "xlsx" });
  }
}

/**
 * Export table data to Excel (.xlsx)
 */
export function exportToExcel(data: any[], fileName: string = "reporte_inventario") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}
