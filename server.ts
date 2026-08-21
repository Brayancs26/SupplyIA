import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Server-Side Gemini Initialization
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in server environment.");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Diagnostic & Inventory Audit Endpoint
app.post("/api/gemini/inventory-audit", async (req, res) => {
  try {
    const client = getGeminiClient();
    const { summary, criticalItems, overstockItems, totalItemsCount } = req.body;

    const prompt = `
Eres un experto de clase mundial en Planificación de la Cadena de Suministro, Aprovisionamiento Estratégico y Control de Inventarios (Supply Chain & MRP Expert).

Analiza el siguiente resumen del inventario de materiales de la empresa:
- Total de ítems / SKUs: ${totalItemsCount}
- Valor total del inventario valorizado: $${summary?.totalValue?.toLocaleString("es-ES") || 0}
- Ítems en Quiebre Crítico / Ruptura: ${summary?.criticalCount || 0}
- Ítems en Punto de Reorden (Necesidad de Compra): ${summary?.reorderCount || 0}
- Capital inmovilizado en Sobre-Inventario: $${summary?.overstockValue?.toLocaleString("es-ES") || 0} (${summary?.overstockCount || 0} SKUs)
- Capital en Stock Muerto / Sin Movimiento: $${summary?.deadStockValue?.toLocaleString("es-ES") || 0} (${summary?.deadStockCount || 0} SKUs)
- Días de cobertura promedio general: ${summary?.avgCoverageDays || 0} días

Top materiales críticos con riesgo de quiebre inminente:
${JSON.stringify(criticalItems?.slice(0, 10) || [], null, 2)}

Top materiales con mayor sobre-stock / capital atrapado:
${JSON.stringify(overstockItems?.slice(0, 10) || [], null, 2)}

Genera un informe ejecutivo de auditoría y plan de acción de aprovisionamiento con la siguiente estructura en formato JSON válido:
{
  "executiveSummary": "Resumen ejecutivo claro y contundente del estado de salud del almacén.",
  "healthScore": 0-100 (número representando la salud general del inventario),
  "criticalRisks": [
    { "title": "...", "description": "...", "severity": "ALTA" | "MEDIA" | "BAJA", "impact": "..." }
  ],
  "immediateActions": [
    { "step": 1, "action": "...", "department": "Compras/Almacén/Producción", "targetSKUs": ["SKU1", "SKU2"], "expectedBenefit": "..." }
  ],
  "overstockReleaseStrategy": "Estrategia concreta para liquidar, renegociar o ralentizar compras del capital sobre-inventariado.",
  "mrpParameterRecommendations": "Recomendaciones específicas para calibrar Lead Times, Lotes Mínimos (MOQ), Niveles de Servicio y Stocks de Seguridad en el sistema MRP.",
  "financialImpact": {
    "potentialSavingsUSD": 0,
    "preventedLossesUSD": 0,
    "turnoverImprovement": "Ejemplo: +35% rotación"
  }
}
Responde ÚNICAMENTE con el objeto JSON estructurado, sin markdown extra antes o después.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in inventory-audit:", error);
    res.status(500).json({ success: false, error: error.message || "Error al analizar inventario" });
  }
});

// AI Single Material / SKU Deep Recommendation
app.post("/api/gemini/material-recommendation", async (req, res) => {
  try {
    const client = getGeminiClient();
    const { material } = req.body;

    const prompt = `
Eres un especialista en gestión de inventarios y aprovisionamiento de materiales.
Analiza este SKU en detalle:
SKU: ${material.sku}
Descripción: ${material.name}
Categoría: ${material.category}
Proveedor: ${material.supplier}
Costo Unitario: $${material.unitCost}
Stock Actual: ${material.currentStock} ${material.unit}
Stock en Tránsito: ${material.inTransitStock || 0} ${material.unit}
Stock Reservado: ${material.reservedStock || 0} ${material.unit}
Consumo Diario Promedio: ${material.avgDailyDemand} ${material.unit}/día
Desviación Estándar de la Demanda: ${material.demandStdDev}
Tiempo de Entrega (Lead Time): ${material.leadTimeDays} días
Lote Mínimo de Compra (MOQ): ${material.minLotSize} ${material.unit}
Stock de Seguridad Actual: ${material.safetyStock} ${material.unit}
Punto de Reorden (ROP): ${material.reorderPoint} ${material.unit}
Lote Económico (EOQ): ${material.eoq} ${material.unit}
Días de Cobertura Actual: ${material.daysOfCoverage} días
Clasificación ABC-XYZ: ${material.abcClass}-${material.xyzClass}
Estado Actual: ${material.healthStatus}

Genera un análisis específico para este material en formato JSON:
{
  "diagnostic": "Diagnóstico claro de la situación actual de abastecimiento del material",
  "stockoutRiskLevel": "CRÍTICO" | "MODERADO" | "BAJO" | "NULO",
  "overstockRiskLevel": "ALTO" | "MODERADO" | "BAJO" | "NULO",
  "recommendedAction": "COMPRAR_URGENTE" | "COMPRAR_PROGRAMADO" | "MANTENER" | "DETENER_PEDIDOS" | "REDUCIR_LOTE",
  "suggestedOrderQty": 0,
  "suggestedSafetyStock": 0,
  "suggestedReorderPoint": 0,
  "supplierNegotiationTip": "Consejo para negociar tiempo de entrega o lote mínimo con ${material.supplier}",
  "rootCause": "Causa raíz del estado actual (ej. volatilidad imprevista, lead time inflado, MOQ excesivo)",
  "justification": "Justificación matemática y operativa"
}
Responde ÚNICAMENTE con el objeto JSON.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in material-recommendation:", error);
    res.status(500).json({ success: false, error: error.message || "Error al analizar material" });
  }
});

// AI Purchase Order Batch Optimization
app.post("/api/gemini/procurement-plan", async (req, res) => {
  try {
    const client = getGeminiClient();
    const { itemsToOrder, budgetLimit } = req.body;

    const prompt = `
Eres un Gerente de Abastecimiento y Compras. Optimiza la siguiente lista de órdenes de compra sugeridas por el sistema MRP:
Límite de presupuesto disponible: ${budgetLimit ? `$${budgetLimit}` : "Sin límite estricto"}

Ítems con necesidad de reposición:
${JSON.stringify(itemsToOrder || [], null, 2)}

Genera un plan de compra optimizado agrupado por proveedor y priorizado por criticidad en formato JSON:
{
  "totalEstimatedCost": 0,
  "ordersBySupplier": [
    {
      "supplier": "Nombre Proveedor",
      "itemsCount": 0,
      "subtotalUSD": 0,
      "items": [
        {
          "sku": "...",
          "name": "...",
          "orderQty": 0,
          "unit": "...",
          "unitCost": 0,
          "subtotal": 0,
          "priority": "CRÍTICA_QUIEBRE" | "ALTA" | "MEDIA",
          "justification": "..."
        }
      ],
      "logisticsNote": "Recomendación para consolidación de flete o negociación por volumen"
    }
  ],
  "budgetAllocationAdvice": "Cómo distribuir el capital si hay restricciones financieras",
  "riskMitigationNotes": "Acciones preventivas para evitar que se repitan los quiebres"
}
Responde ÚNICAMENTE con el JSON.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in procurement-plan:", error);
    res.status(500).json({ success: false, error: error.message || "Error al optimizar compras" });
  }
});

// AI Interactive Supply Chain Chat / Assistant
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const client = getGeminiClient();
    const { message, history, inventoryContext } = req.body;

    const systemInstruction = `
Eres "OptiSupply AI", el asistente inteligente de aprovisionamiento, MRP y gestión de inventarios para almacenes de materiales.
Cuentas con la información en tiempo real de la base de datos de inventario del usuario:
- Total SKUs: ${inventoryContext?.totalSKUs || 0}
- Valor Total Inventario: $${inventoryContext?.totalValue || 0}
- Quiebres Críticos: ${inventoryContext?.criticalCount || 0}
- En Punto de Reorden: ${inventoryContext?.reorderCount || 0}
- Sobre-Inventario: $${inventoryContext?.overstockValue || 0}
- Top Riesgos: ${JSON.stringify(inventoryContext?.topRisks || [])}

Tus respuestas deben ser profesionales, analíticas, con rigor matemático de ingeniería de operaciones (fórmulas de Wilson/EOQ, Stock de Seguridad $SS = Z \\times \\sigma \\times \\sqrt{L}$, ROP = Demanda * LeadTime + SS, matriz ABC-XYZ). Brinda consejos accionables para evitar sobrecostos por almacenamiento y evitar paradas de planta o quiebres comerciales. Habla en español de forma amigable y ejecutiva.
`;

    const chat = client.chats.create({
      model: "gemini-3.7-flash",
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    // Replay history if any
    const formattedMessage = message;
    const response = await chat.sendMessage({ message: formattedMessage });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Error in chat:", error);
    res.status(500).json({ success: false, error: error.message || "Error en asistente IA" });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OptiStock AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
