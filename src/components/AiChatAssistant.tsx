import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  TrendingDown,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { CalculatedMaterial, InventorySummary } from "../types";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AiChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  summary: InventorySummary;
  materials: CalculatedMaterial[];
}

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({
  isOpen,
  onClose,
  summary,
  materials,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `¡Hola! Soy tu Asistente de Aprovisionamiento e Inventarios IA. He analizado tus **${summary.totalSKUs} materiales** registrados en almacén.
Actualmente tienes **${summary.criticalCount} ítems en quiebre crítico** y **$${summary.overstockValue.toLocaleString("es-ES")}** inmovilizados en sobre-inventario.
¿Qué análisis u optimización te gustaría realizar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input;
    if (!textToSend.trim() || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userPrompt) setInput("");
    setIsSending(true);

    try {
      // Prepare compact context
      const topRisks = materials
        .filter((m) => m.healthStatus === "STOCKOUT_CRITICAL" || m.healthStatus === "OVERSTOCK")
        .slice(0, 8)
        .map((m) => ({
          sku: m.sku,
          name: m.name,
          stock: m.currentStock,
          rop: m.reorderPoint,
          status: m.healthStatus,
          cost: m.unitCost,
          coverage: m.daysOfCoverage,
        }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          inventoryContext: {
            totalSKUs: summary.totalSKUs,
            totalValue: summary.totalInventoryValue,
            criticalCount: summary.criticalCount,
            reorderCount: summary.reorderCount,
            overstockValue: summary.overstockValue,
            topRisks,
          },
        }),
      });

      const data = await res.json();
      const aiReply = data.text || "Disculpa, no pude procesar la consulta en este momento.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Hubo un error de conexión con el servidor de inteligencia artificial.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    "¿Cuáles son los 3 materiales con mayor riesgo de quiebre inminente?",
    "¿Cómo puedo liberar el capital atrapado en sobre-inventario?",
    "¿Qué política de compra debo aplicar a materiales Clase A y Z?",
    "¿Cómo calculo el Stock de Seguridad óptimo para evitar roturas?",
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Copiloto de Aprovisionamiento</h3>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gemini 3.7 Flash Conectado
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

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "ai" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 ${
                m.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-slate-950/80 text-slate-200 border border-slate-800 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              <div
                className={`text-[9px] text-right ${
                  m.sender === "user" ? "text-blue-200" : "text-slate-500"
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.sender === "user" && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 w-fit">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Consultando datos y formulando respuesta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">Preguntas sugeridas:</span>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isSending}
              className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition truncate max-w-full text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          id="chat-user-input"
          placeholder="Pregunta sobre consumos, ROP, stock de seguridad..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSending}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          id="btn-send-chat"
          onClick={() => handleSend()}
          disabled={isSending || !input.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
