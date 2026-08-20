import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Key,
  Trash2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  labResultStorage,
  hospitalizationStorage,
  transfusionStorage,
  medicationStorage,
  bloodPressureStorage,
  documentStorage,
  settingsStorage,
} from '../lib/storage';
import { queryMedicalAssistant } from '../lib/gemini';
import { calcAge, formatDate } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Bagaimana tren Hemoglobin (Hb) pada 3 pemeriksaan terakhir?',
  'Obat apa saja yang sedang aktif dikonsumsi saat ini?',
  'Bagaimana catatan tekanan darah (tensi) terakhir?',
  'Apakah ada hasil lab yang ditandai abnormal?',
  'Saran pertanyaan apa yang relevan untuk dibawa saat kontrol ke dokter?',
];

export default function AIChat() {
  const { activePatient } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const settings = settingsStorage.get();
  const apiKey = settings.geminiApiKey;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat session per patient if available
  useEffect(() => {
    if (activePatient) {
      try {
        const saved = sessionStorage.getItem(`medtrack_chat_${activePatient.id}`);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([
            {
              id: 'welcome',
              role: 'model',
              content: `Halo! Saya **Asisten MedTrack AI**. Saya sudah membaca seluruh rekam medis untuk **${activePatient.fullName}** (${calcAge(activePatient.dateOfBirth)} tahun). \n\nSilakan tanyakan apa saja seputar hasil lab, riwayat rawat inap, tensi, tren obat, atau pertanyaan untuk dokter.`,
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch {
        // Fallback
      }
    }
  }, [activePatient?.id]);

  const saveChatHistory = (newMessages: ChatMessage[]) => {
    if (activePatient) {
      sessionStorage.setItem(`medtrack_chat_${activePatient.id}`, JSON.stringify(newMessages));
    }
  };

  const handleClearChat = () => {
    if (!activePatient) return;
    const initialMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      content: `Percakapan telah direset. Saya siap membantu Anda menganalisis data rekam medis **${activePatient.fullName}**. Ada yang ingin Anda tanyakan?`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialMessage]);
    saveChatHistory([initialMessage]);
    setError(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    if (!activePatient) {
      setError('Silakan pilih profil pasien terlebih dahulu.');
      return;
    }

    if (!apiKey) {
      setError('Gemini API Key belum dimasukkan. Buka menu Pengaturan untuk memasukkan API Key.');
      return;
    }

    setError(null);
    setInput('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setLoading(true);

    try {
      // Gather full patient medical snapshot
      const labResults = labResultStorage.getAll(activePatient.id).filter((r) => r.verified);
      const hospitalizations = hospitalizationStorage.getAll(activePatient.id);
      const transfusions = transfusionStorage.getAll(activePatient.id);
      const medications = medicationStorage.getAll(activePatient.id);
      const bloodPressures = bloodPressureStorage.getAll(activePatient.id);
      const documents = documentStorage.getAll(activePatient.id);

      const patientSnapshot = {
        profile: {
          fullName: activePatient.fullName,
          dateOfBirth: activePatient.dateOfBirth,
          age: calcAge(activePatient.dateOfBirth),
          gender: activePatient.gender,
          bloodType: activePatient.bloodType,
          allergies: activePatient.allergies,
          medicalHistory: activePatient.medicalHistory,
          surgicalHistory: activePatient.surgicalHistory,
          generalNotes: activePatient.generalNotes,
        },
        activeMedications: medications.filter((m) => m.isActive).map((m) => ({
          name: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.startDate,
        })),
        recentLabResults: labResults.slice(-20).map((l) => ({
          name: l.testName,
          value: l.value,
          valueText: l.valueText,
          unit: l.unit,
          flag: l.abnormalFlag,
          date: l.testDate,
        })),
        recentBloodPressures: bloodPressures.slice(0, 7).map((bp) => ({
          date: bp.measuredAt,
          systolic: bp.systolic,
          diastolic: bp.diastolic,
          pulse: bp.pulse,
          category: bp.category,
        })),
        recentHospitalizations: hospitalizations.map((h) => ({
          hospital: h.hospital,
          admissionDate: h.admissionDate,
          dischargeDate: h.dischargeDate,
          reason: h.reason,
          diagnosis: h.doctorDiagnosis,
        })),
        recentTransfusions: transfusions.map((t) => ({
          date: t.transfusionDate,
          productType: t.productType,
          units: t.units,
          hbBefore: t.hbBefore,
          hbAfter: t.hbAfter,
        })),
        totalDocumentsCount: documents.length,
      };

      // Prepare conversation history (exclude initial system/welcome greeting from history context)
      const historyForApi = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const responseText = await queryMedicalAssistant(
        apiKey,
        patientSnapshot,
        historyForApi.slice(-6), // Send last 6 messages context
        query
      );

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: responseText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = err?.message || 'Terjadi kesalahan saat memproses pertanyaan dengan Gemini AI.';
      setError(errMsg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!activePatient) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-teal flex items-center justify-center mb-4 shadow-glow-teal">
          <Bot size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Pilih Profil Pasien</h2>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          Silakan pilih pasien di pojok kiri atas untuk memulai sesi tanya jawab cerdas mengenai rekam medis.
        </p>
        <Link to="/patient" className="btn-primary flex items-center gap-2">
          Buka Profil Pasien <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto pb-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-bg-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-glow-teal">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Tanya AI — Rekam Medis</h1>
              <span className="badge badge-teal text-[10px] py-0.5 px-2">Gemini Flash</span>
            </div>
            <p className="text-xs text-slate-400">
              Membahas riwayat <span className="text-teal-300 font-medium">{activePatient.fullName}</span> ({calcAge(activePatient.dateOfBirth)} thn)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-bg-elevated hover:bg-bg-card border border-bg-border transition-colors"
            title="Reset percakapan"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Reset Sesi</span>
          </button>
        </div>
      </div>

      {/* Missing API Key Warning */}
      {!apiKey && (
        <div className="my-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-amber-400 shrink-0" />
            <span>Gemini API Key belum terpasang. Masukkan API Key agar asisten dapat menjawab.</span>
          </div>
          <Link
            to="/settings"
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg shrink-0 transition-colors"
          >
            Buka Pengaturan
          </Link>
        </div>
      )}

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isBot = msg.role === 'model';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={16} className="text-white" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed transition-all ${
                  isBot
                    ? 'bg-bg-secondary border border-bg-border/80 text-slate-200 rounded-tl-sm shadow-card'
                    : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-tr-sm shadow-md font-normal'
                }`}
              >
                {/* Content formatting */}
                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                </div>

                {/* Footer / Meta */}
                <div
                  className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                    isBot ? 'text-slate-500' : 'text-teal-100/70'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isBot && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-teal-300 rounded transition-opacity flex items-center gap-1"
                      title="Salin jawaban"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!isBot && (
                <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} className="text-teal-400" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-bg-secondary border border-bg-border rounded-2xl rounded-tl-sm p-4 text-sm text-slate-400 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-teal-400" />
              <span>Sedang membaca data & menyusun jawaban...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      {messages.length <= 3 && (
        <div className="py-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <HelpCircle size={13} className="text-teal-400" />
            <span>Saran pertanyaan cepat:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading || !apiKey}
                className="text-xs px-3 py-1.5 rounded-full bg-bg-card hover:bg-bg-elevated border border-bg-border text-slate-300 hover:text-teal-200 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="pt-2 border-t border-bg-border shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              apiKey
                ? `Tanyakan riwayat medis ${activePatient.fullName}...`
                : 'Silakan isi Gemini API Key di Pengaturan terlebih dahulu'
            }
            disabled={loading || !apiKey}
            className="input-field flex-1 py-3 px-4 pr-12 rounded-xl bg-bg-secondary border-bg-border focus:border-teal-500 text-sm shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !apiKey}
            className="absolute right-2 p-2 rounded-lg bg-gradient-teal text-white disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-95 transition-all shadow-glow-teal"
            title="Kirim pesan"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-500 mt-2">
          Asisten AI memberikan rangkuman berbasis data yang tersimpan. Bukan pengganti diagnosis medis resmi dokter.
        </p>
      </div>
    </div>
  );
}
