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
  X,
  Minus,
  Maximize2,
  Minimize2,
  MessageSquareText,
  ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  labResultStorage,
  hospitalizationStorage,
  transfusionStorage,
  medicationStorage,
  bloodPressureStorage,
  documentStorage,
  settingsStorage,
} from '../../lib/storage';
import { queryMedicalAssistant, checkProxyStatus, type ProxyStatus } from '../../lib/gemini';
import { calcAge } from '../../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Bagaimana tren Hb pada 3 tes terakhir?',
  'Obat apa saja yang sedang aktif saat ini?',
  'Bagaimana catatan tensi terakhir?',
  'Apakah ada hasil lab abnormal?',
  'Saran pertanyaan untuk dokter saat kontrol?',
];

export default function AIChatWidget() {
  const { activePatient } = useApp();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const settings = settingsStorage.get();
  const apiKey = settings.geminiApiKey;

  useEffect(() => {
    checkProxyStatus().then(setProxyStatus);
  }, []);

  // Listen for custom event or navigation to /chat to open the widget
  useEffect(() => {
    if (location.pathname === '/chat') {
      setIsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleOpenWidget = () => setIsOpen(true);
    window.addEventListener('open-ai-chat-widget', handleOpenWidget);
    return () => window.removeEventListener('open-ai-chat-widget', handleOpenWidget);
  }, []);

  const isAiReady = Boolean(apiKey || proxyStatus?.hasDefaultApiKey);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, loading, isOpen]);

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
              content: `Halo! Saya **Asisten MedTrack AI**. Saya siap membantu menganalisis data rekam medis **${activePatient.fullName}** (${calcAge(activePatient.dateOfBirth)} thn).\n\nSilakan tanyakan seputar tren lab, tensi, obat rutin, atau persiapan konsultasi dokter!`,
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
      content: `Percakapan telah direset. Saya siap membantu menganalisis data rekam medis **${activePatient.fullName}**. Ada yang ingin ditanyakan?`,
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

    if (!isAiReady) {
      setError('Gemini API Key belum terpasang. Masukkan API Key di menu Pengaturan.');
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

      const historyForApi = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const responseText = await queryMedicalAssistant(
        apiKey,
        patientSnapshot,
        historyForApi.slice(-6),
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

      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (err: any) {
      console.error('Chat widget error:', err);
      setError(err?.message || 'Gagal memproses dengan Gemini AI.');
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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden pointer-events-auto">
      {/* Floating Chat Box Window */}
      {isOpen && (
        <div
          className={`flex flex-col bg-bg-secondary/95 backdrop-blur-xl border border-teal-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-scale-in mb-3 ${
            isExpanded
              ? 'w-[90vw] sm:w-[600px] h-[85vh] max-w-2xl'
              : 'w-[92vw] sm:w-[400px] h-[540px] max-h-[82vh]'
          }`}
          style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(13, 148, 136, 0.25)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-900/80 via-bg-elevated to-bg-secondary border-b border-bg-border shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center shadow-glow-teal shrink-0">
                <Bot size={17} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate">Tanya MedTrack AI</h3>
                  <span className="badge badge-teal text-[9px] py-0 px-1.5">Online</span>
                </div>
                {activePatient ? (
                  <p className="text-[10px] text-teal-300 truncate">
                    Pasien: {activePatient.nickname || activePatient.fullName}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">Pilih pasien terlebih dahulu</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-bg-elevated rounded-lg transition-colors"
                title="Reset percakapan"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-bg-elevated rounded-lg transition-colors hidden sm:block"
                title={isExpanded ? 'Perkecil' : 'Perbesar'}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-bg-elevated rounded-lg transition-colors"
                title="Tutup chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Missing API Key Warning */}
          {!isAiReady && (
            <div className="m-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-200 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Key size={14} className="text-amber-400 shrink-0" />
                <span className="text-[11px] truncate">API Key belum terpasang.</span>
              </div>
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold rounded-md shrink-0 transition-colors"
              >
                Pengaturan
              </Link>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isBot = msg.role === 'model';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <div className="w-6 h-6 rounded-md bg-gradient-teal flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={13} className="text-white" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      isBot
                        ? 'bg-bg-elevated border border-bg-border/80 text-slate-200 rounded-tl-sm shadow-sm'
                        : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-tr-sm shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words text-[11.5px]">
                      {msg.content}
                    </div>

                    <div
                      className={`mt-1.5 flex items-center justify-between gap-2 text-[9px] ${
                        isBot ? 'text-slate-500' : 'text-teal-100/70'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isBot && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-teal-300 rounded transition-opacity flex items-center gap-0.5"
                          title="Salin jawaban"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {!isBot && (
                    <div className="w-6 h-6 rounded-md bg-bg-card border border-bg-border flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} className="text-teal-400" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-md bg-gradient-teal flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-bg-elevated border border-bg-border rounded-xl rounded-tl-sm p-2.5 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-teal-400" />
                  <span className="text-[11px]">Menyusun jawaban...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-[11px] text-red-200">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-3 py-1.5 bg-bg-primary/40 border-t border-bg-border/60 shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                <HelpCircle size={11} className="text-teal-400" />
                <span>Pertanyaan cepat:</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={loading || !isAiReady}
                    className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-bg-card hover:bg-bg-elevated border border-bg-border text-slate-300 hover:text-teal-200 transition-colors disabled:opacity-40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="p-2.5 bg-bg-secondary border-t border-bg-border shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  !activePatient
                    ? 'Pilih pasien dahulu...'
                    : isAiReady
                    ? `Tanya seputar data ${activePatient.nickname || activePatient.fullName}...`
                    : 'Isi API key di Pengaturan...'
                }
                disabled={loading || !isAiReady || !activePatient}
                className="input-field flex-1 py-2 px-3 pr-10 rounded-xl bg-bg-primary border-bg-border focus:border-teal-500 text-xs shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !isAiReady || !activePatient}
                className="absolute right-1.5 p-1.5 rounded-lg bg-gradient-teal text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-glow-teal"
                title="Kirim"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="floating-ai-chat-btn"
        className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
            : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-white hover:scale-105 active:scale-95 shadow-glow-teal'
        }`}
        style={{
          boxShadow: isOpen
            ? '0 10px 25px rgba(0,0,0,0.5)'
            : '0 10px 30px rgba(13, 148, 136, 0.4), 0 0 15px rgba(20, 184, 166, 0.3)',
        }}
        title="Tanya Asisten AI MedTrack"
      >
        {isOpen ? (
          <>
            <ChevronDown size={18} />
            <span className="text-xs font-semibold">Tutup AI Chat</span>
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <Sparkles size={18} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
            </div>
            <span className="text-xs font-bold tracking-wide">Tanya AI</span>
          </>
        )}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
