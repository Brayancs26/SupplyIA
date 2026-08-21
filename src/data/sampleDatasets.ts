import { MaterialItem, ConsumptionRecord } from "../types";

export interface DatasetPreset {
  id: string;
  name: string;
  industry: string;
  description: string;
  materials: MaterialItem[];
  consumptions: ConsumptionRecord[];
}

// Generate realistic consumption history helper
function generateHistory(sku: string, baseDaily: number, varianceFactor: number, days: number = 60): ConsumptionRecord[] {
  const records: ConsumptionRecord[] = [];
  const today = new Date();

  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    // If zero consumption item
    if (baseDaily === 0) {
      records.push({ sku, date: dateStr, quantity: 0 });
      continue;
    }

    // Add noise and occasional peak or zero days
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dayFactor = isWeekend ? 0.3 : 1.1;
    const randomNoise = (Math.random() - 0.5) * 2 * varianceFactor;
    const qty = Math.max(0, Math.round((baseDaily + randomNoise * baseDaily) * dayFactor));

    records.push({
      sku,
      date: dateStr,
      quantity: qty,
    });
  }

  return records;
}

// Dataset 1: Planta Industrial, Maquinaria y Repuestos MRO (Almacén L001)
const mroMaterials: MaterialItem[] = [
  {
    sku: "MRO-ROD-6205",
    name: "Rodamiento Rígido de Bolas SKF 6205-2RS1",
    category: "Mecánica / Rodamientos",
    unit: "UND",
    unitCost: 18.50,
    leadTimeDays: 15,
    supplier: "SKF Rodamientos Industriales",
    currentStock: 4,          // CRÍTICO (Muy bajo, ROP es ~18)
    reservedStock: 2,
    inTransitStock: 0,
    minLotSize: 10,
    serviceLevelTarget: 0.98,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-ROD-22216",
    name: "Rodamiento de Rodillos a Rótula 22216 E/C3",
    category: "Mecánica / Rodamientos",
    unit: "UND",
    unitCost: 145.00,
    leadTimeDays: 30,
    supplier: "SKF Rodamientos Industriales",
    currentStock: 1,          // CRÍTICO
    reservedStock: 1,
    inTransitStock: 0,
    minLotSize: 2,
    serviceLevelTarget: 0.98,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-VAL-PNEU-24V",
    name: "Electroválvula Neumática Festo 5/2 VUVG 24VDC",
    category: "Neumática & Automatización",
    unit: "UND",
    unitCost: 88.00,
    leadTimeDays: 20,
    supplier: "Festo Automatización S.A.",
    currentStock: 2,          // EN PUNTO DE REORDEN
    reservedStock: 0,
    inTransitStock: 0,
    minLotSize: 5,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-SEN-IND-M18",
    name: "Sensor Inductivo M18 PNP NA Telemecanique",
    category: "Instrumentación & Sensores",
    unit: "UND",
    unitCost: 42.00,
    leadTimeDays: 14,
    supplier: "Schneider Electric Corp",
    currentStock: 5,          // EN PUNTO DE REORDEN
    reservedStock: 1,
    inTransitStock: 0,
    minLotSize: 5,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-LUB-ISO68",
    name: "Aceite Hidráulico Anti-Desgaste ISO VG 68",
    category: "Lubricantes & Químicos",
    unit: "GLN",
    unitCost: 22.50,
    leadTimeDays: 7,
    supplier: "Mobil Industrial Lubricants",
    currentStock: 120,        // ÓPTIMO
    reservedStock: 20,
    inTransitStock: 40,
    minLotSize: 20,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-GRS-EP2",
    name: "Grasa Complejo de Litio EP-2 Alta Temperatura",
    category: "Lubricantes & Químicos",
    unit: "KG",
    unitCost: 14.00,
    leadTimeDays: 7,
    supplier: "Mobil Industrial Lubricants",
    currentStock: 85,         // ÓPTIMO
    reservedStock: 10,
    inTransitStock: 0,
    minLotSize: 15,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-COR-B58",
    name: "Faja de Transmisión Trapezoidal Sección B-58",
    category: "Transmisión de Potencia",
    unit: "UND",
    unitCost: 12.80,
    leadTimeDays: 10,
    supplier: "Gates Transmisiones",
    currentStock: 35,         // ÓPTIMO
    reservedStock: 5,
    inTransitStock: 0,
    minLotSize: 10,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-FIL-HYD-10U",
    name: "Elemento Filtrante Hidráulico 10 Micras Donaldson",
    category: "Filtración Industrial",
    unit: "UND",
    unitCost: 65.00,
    leadTimeDays: 25,
    supplier: "Donaldson Filtration Solutions",
    currentStock: 8,          // ÓPTIMO
    reservedStock: 2,
    inTransitStock: 0,
    minLotSize: 4,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-EMP-PTFE-3MM",
    name: "Plancha de Empaquetadura PTFE Expandido 3mm",
    category: "Sellado & Empaquetaduras",
    unit: "PLN",
    unitCost: 180.00,
    leadTimeDays: 21,
    supplier: "Garlock Sealing Technologies",
    currentStock: 45,         // SOBRE-INVENTARIO (Capital atrapado ~$8,100)
    reservedStock: 0,
    inTransitStock: 0,
    minLotSize: 5,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-MAN-R2-1/2",
    name: "Manguera Hidráulica 2 Mallas 1/2 pulg SAE 100R2",
    category: "Mangueras & Conexiones",
    unit: "MTR",
    unitCost: 9.50,
    leadTimeDays: 10,
    supplier: "Parker Hannifin",
    currentStock: 420,        // SOBRE-INVENTARIO
    reservedStock: 10,
    inTransitStock: 0,
    minLotSize: 50,
    serviceLevelTarget: 0.90,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-CAD-ANSI-80",
    name: "Cadena de Rodillos de Acero ANSI 80-1 Paso 1 pulg",
    category: "Transmisión de Potencia",
    unit: "MTR",
    unitCost: 38.00,
    leadTimeDays: 18,
    supplier: "Tsubaki Cadenas Industriales",
    currentStock: 180,        // SOBRE-INVENTARIO
    reservedStock: 5,
    inTransitStock: 0,
    minLotSize: 10,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-RET-VITON-50",
    name: "Retén de Aceite Viton 50x72x10 FKM",
    category: "Sellado & Empaquetaduras",
    unit: "UND",
    unitCost: 16.50,
    leadTimeDays: 14,
    supplier: "Freudenberg Simrit",
    currentStock: 65,         // STOCK MUERTO / SIN MOVIMIENTO
    reservedStock: 0,
    inTransitStock: 0,
    minLotSize: 10,
    serviceLevelTarget: 0.90,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-TER-PT100-6",
    name: "Termorresistencia RTD PT100 Cabezal Marino 6x150mm",
    category: "Instrumentación & Sensores",
    unit: "UND",
    unitCost: 75.00,
    leadTimeDays: 30,
    supplier: "WIKA Sensores",
    currentStock: 28,         // STOCK MUERTO / SIN USO
    reservedStock: 0,
    inTransitStock: 0,
    minLotSize: 2,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-DIS-COR-7",
    name: "Disco de Corte para Acero Inoxidable 7 x 1/16 pulg",
    category: "Consumibles de Taller",
    unit: "UND",
    unitCost: 3.20,
    leadTimeDays: 5,
    supplier: "3M Soluciones Industriales",
    currentStock: 80,         // EN REORDEN
    reservedStock: 20,
    inTransitStock: 0,
    minLotSize: 50,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "MRO-ELE-7018-1/8",
    name: "Electrodo para Soldadura AWS E7018 1/8 pulg",
    category: "Consumibles de Taller",
    unit: "KG",
    unitCost: 4.50,
    leadTimeDays: 7,
    supplier: "Lincoln Electric",
    currentStock: 350,        // ÓPTIMO
    reservedStock: 50,
    inTransitStock: 100,
    minLotSize: 100,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
];

// Consumptions for Dataset 1
const mroConsumptions: ConsumptionRecord[] = [
  ...generateHistory("MRO-ROD-6205", 2.2, 0.4),      // Demanda diaria ~2.2 -> consumo 60dias ~132
  ...generateHistory("MRO-ROD-22216", 0.35, 0.7),    // Demanda ~0.35/dia
  ...generateHistory("MRO-VAL-PNEU-24V", 0.45, 0.5), // Demanda ~0.45/dia
  ...generateHistory("MRO-SEN-IND-M18", 0.6, 0.3),   // Demanda ~0.6/dia
  ...generateHistory("MRO-LUB-ISO68", 8.5, 0.25),    // Demanda ~8.5 galones/dia
  ...generateHistory("MRO-GRS-EP2", 3.2, 0.3),       // Demanda ~3.2 kg/dia
  ...generateHistory("MRO-COR-B58", 1.8, 0.4),       // Demanda ~1.8 und/dia
  ...generateHistory("MRO-FIL-HYD-10U", 0.25, 0.6),  // Demanda ~0.25/dia
  ...generateHistory("MRO-EMP-PTFE-3MM", 0.15, 0.8), // Demanda bajísima ~0.15/dia pero stock 45 -> Sobre-inventario
  ...generateHistory("MRO-MAN-R2-1/2", 1.5, 0.5),    // Demanda ~1.5 m/dia pero stock 420 -> Sobre-inventario
  ...generateHistory("MRO-CAD-ANSI-80", 0.4, 0.6),   // Demanda ~0.4 m/dia pero stock 180 -> Sobre-inventario
  ...generateHistory("MRO-RET-VITON-50", 0.0, 0.0),  // Consumo 0 -> Stock Muerto
  ...generateHistory("MRO-TER-PT100-6", 0.0, 0.0),   // Consumo 0 -> Stock Muerto
  ...generateHistory("MRO-DIS-COR-7", 12.0, 0.35),   // Demanda alta ~12/dia -> En Reorden
  ...generateHistory("MRO-ELE-7018-1/8", 15.0, 0.2), // Demanda ~15 kg/dia -> Óptimo
];

// Dataset 2: Manufactura de Alimentos & Bebidas (Materias Primas & Envasado - Almacén L001)
const foodMaterials: MaterialItem[] = [
  {
    sku: "RAW-SUGAR-REF",
    name: "Azúcar Refinada Grado Alimento Saco 50kg",
    category: "Materias Primas / Endulzantes",
    unit: "SCO",
    unitCost: 45.00,
    leadTimeDays: 7,
    supplier: "Agroindustrial del Norte",
    currentStock: 40,         // CRÍTICO (Consumo 18 sacos/día, ROP ~150)
    reservedStock: 25,
    inTransitStock: 0,
    minLotSize: 100,
    serviceLevelTarget: 0.99,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "RAW-ACID-CITRIC",
    name: "Ácido Cítrico Anhidro USP Saco 25kg",
    category: "Materias Primas / Acidulantes",
    unit: "SCO",
    unitCost: 68.00,
    leadTimeDays: 14,
    supplier: "Química Andina Especialidades",
    currentStock: 12,         // EN REORDEN
    reservedStock: 4,
    inTransitStock: 0,
    minLotSize: 20,
    serviceLevelTarget: 0.98,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "PKG-PET-500ML",
    name: "Preforma PET 22g Cristal PCO 1881",
    category: "Empaque Primario",
    unit: "MIL",
    unitCost: 32.00,
    leadTimeDays: 10,
    supplier: "Plásticos y Envases Industriales",
    currentStock: 180,        // ÓPTIMO
    reservedStock: 30,
    inTransitStock: 100,
    minLotSize: 50,
    serviceLevelTarget: 0.98,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "PKG-CAP-28MM",
    name: "Tapa Rosca HDPE 28mm con Liner Hermético",
    category: "Empaque Primario",
    unit: "MIL",
    unitCost: 11.50,
    leadTimeDays: 10,
    supplier: "Plásticos y Envases Industriales",
    currentStock: 210,        // ÓPTIMO
    reservedStock: 30,
    inTransitStock: 0,
    minLotSize: 50,
    serviceLevelTarget: 0.98,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "PKG-BOX-CORR-24",
    name: "Caja Cartón Corrugado Doble Onda para 24x500ml",
    category: "Empaque Secundario",
    unit: "UND",
    unitCost: 1.15,
    leadTimeDays: 12,
    supplier: "Cartones y Embalajes del Pacífico",
    currentStock: 850,        // CRÍTICO
    reservedStock: 400,
    inTransitStock: 0,
    minLotSize: 1000,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "RAW-COL-CARAMEL",
    name: "Colorante Caramelo Clase IV Líquido Bidón 25kg",
    category: "Aditivos & Saborizantes",
    unit: "BDN",
    unitCost: 110.00,
    leadTimeDays: 20,
    supplier: "Ingredientes Globales S.A.",
    currentStock: 48,         // SOBRE-INVENTARIO
    reservedStock: 2,
    inTransitStock: 0,
    minLotSize: 5,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "PKG-ETIQ-BOPP-500",
    name: "Etiqueta Envolvente BOPP Impresa Bobina 5000u",
    category: "Empaque Primario",
    unit: "BOB",
    unitCost: 85.00,
    leadTimeDays: 25,
    supplier: "Flexografía y Etiquetas Modernas",
    currentStock: 120,        // SOBRE-INVENTARIO ($10,200)
    reservedStock: 5,
    inTransitStock: 0,
    minLotSize: 20,
    serviceLevelTarget: 0.95,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
  {
    sku: "RAW-PRE-SOD-BENZ",
    name: "Benzoato de Sodio Grado Alimentario 25kg",
    category: "Conservantes & Químicos",
    unit: "SCO",
    unitCost: 52.00,
    leadTimeDays: 15,
    supplier: "Química Andina Especialidades",
    currentStock: 35,         // STOCK MUERTO (Reformulación eliminó conservante)
    reservedStock: 0,
    inTransitStock: 0,
    minLotSize: 10,
    serviceLevelTarget: 0.90,
    sapPlant: "1000",
    sapStorageLoc: "L001",
  },
];

const foodConsumptions: ConsumptionRecord[] = [
  ...generateHistory("RAW-SUGAR-REF", 18.0, 0.2),
  ...generateHistory("RAW-ACID-CITRIC", 1.8, 0.35),
  ...generateHistory("PKG-PET-500ML", 14.5, 0.2),
  ...generateHistory("PKG-CAP-28MM", 14.5, 0.2),
  ...generateHistory("PKG-BOX-CORR-24", 280.0, 0.25),
  ...generateHistory("RAW-COL-CARAMEL", 0.4, 0.5),
  ...generateHistory("PKG-ETIQ-BOPP-500", 1.2, 0.4),
  ...generateHistory("RAW-PRE-SOD-BENZ", 0.0, 0.0),
];

// Preset definitions
export const DATASET_PRESETS: DatasetPreset[] = [
  {
    id: "mro-industrial",
    name: "Planta Industrial & Repuestos MRO",
    industry: "Mantenimiento y Maquinaria Industrial",
    description: "Rodamientos, electroválvulas neumáticas, aceites hidráulicos, empaquetaduras y sensores con sobrestock y quiebres reales.",
    materials: mroMaterials,
    consumptions: mroConsumptions,
  },
  {
    id: "food-beverage",
    name: "Manufactura de Alimentos & Bebidas",
    industry: "Procesamiento y Embotellado",
    description: "Materias primas (azúcar, ácidos), preformas PET, tapas, cajas corrugadas y aditivos con altos volúmenes de rotación.",
    materials: foodMaterials,
    consumptions: foodConsumptions,
  },
];
