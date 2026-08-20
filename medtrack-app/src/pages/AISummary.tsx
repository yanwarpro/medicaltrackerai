import React, { useState, useMemo, useEffect } from 'react';
import { Brain, Sparkles, Loader2, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  labResultStorage, hospitalizationStorage, transfusionStorage, medicationStorage
} from '../lib/storage';
import { generateMedicalSummary, checkProxyStatus, type ProxyStatus } from '../lib/gemini';
import { formatDateShort } from '../lib/utils';

export default function AISummary() {
  const { activePatient, settings } = useApp();
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);

  useEffect(() => {
    checkProxyStatus().then(setProxyStatus);
  }, []);

  const isAiReady = Boolean(settings.geminiApiKey || proxyStatus?.hasDefaultApiKey);

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  async function generateSummary() {
    if (!activePatient || !isAiReady) return;
    setGenerating(true);
    setError('');
    setSummary('');
    try {
      const hospitalizations = hospitalizationStorage.getAll(activePatient.id);
      const transfusions = transfusionStorage.getAll(activePatient.id);
      const medications = medicationStorage.getAll(activePatient.id);

      const result = await generateMedicalSummary(settings.geminiApiKey, {
        patient: {
          fullName: activePatient.fullName,
          dateOfBirth: activePatient.dateOfBirth,
          gender: activePatient.gender,
          allergies: activePatient.allergies,
          medicalHistory: activePatient.medicalHistory,
        },
        labResults: labResults.slice(-50).map((r) => ({
          testName: r.testName,
          value: r.value,
          unit: r.unit,
          testDate: r.testDate,
          abnormalFlag: r.abnormalFlag,
        })),
        hospitalizations: hospitalizations.map((h) => ({
          admissionDate: h.admissionDate,
          reason: h.reason,
          doctorDiagnosis: h.doctorDiagnosis,
        })),
        transfusions: transfusions.map((t) => ({
          transfusionDate: t.transfusionDate,
          units: t.units,
          hbBefore: t.hbBefore,
          hbAfter: t.hbAfter,
        })),
        medications: medications.filter((m) => m.isActive).map((m) => ({
          medicationName: m.medicationName,
          dosage: m.dosage,
          isActive: m.isActive,
        })),
      });
      setSummary(result);
    } catch (e: any) {
      setError(e.message || 'Gagal menghasilkan ringkasan AI');
    } finally {
      setGenerating(false);
    }
  }

  function copySummary() {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ringkasan AI</h1>
          <p className="text-slate-400 text-sm mt-1">Ringkasan medis yang dibuat AI berdasarkan data yang tersimpan</p>
        </div>
        <button
          onClick={generateSummary}
          disabled={generating || !isAiReady}
          id="generate-summary-btn"
          className="btn-primary"
        >
          {generating ? (
            <><Loader2 size={15} className="animate-spin" /> Memproses...</>
          ) : (
            <><Sparkles size={15} /> Buat Ringkasan</>
          )}
        </button>
      </div>

      {!isAiReady && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Gemini API key belum diatur di server maupun di browser. Masuk ke <strong>Pengaturan</strong> untuk menambahkan API key.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <Brain size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300/80">
          Ringkasan ini dibuat oleh AI berdasarkan data yang tersimpan. <strong>Bukan diagnosis medis.</strong>
          AI berperan sebagai pengorganisir informasi, bukan dokter. Semua keputusan medis harus dikonfirmasi kepada dokter.
        </p>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hasil Lab', value: labResults.length },
          { label: 'Hasil Terbaru', value: labResults.length > 0 ? formatDateShort([...labResults].sort((a, b) => b.testDate.localeCompare(a.testDate))[0].testDate) : '—' },
          { label: 'Obat Aktif', value: medicationStorage.getAll(activePatient.id).filter((m) => m.isActive).length },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-value text-lg">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Summary Output */}
      {summary ? (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Ringkasan AI untuk {activePatient.nickname || activePatient.fullName}</span>
            </div>
            <button onClick={copySummary} id="copy-summary-btn" className="btn-ghost text-xs">
              {copied ? <><CheckCircle size={13} className="text-emerald-400" /> Tersalin</> : <><Copy size={13} /> Salin</>}
            </button>
          </div>
          <div className="prose prose-sm prose-invert max-w-none">
            {summary.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <h3 key={i} className="text-white font-semibold mt-4 mb-2 text-sm">{line.replace(/\*\*/g, '')}</h3>;
              }
              if (line.startsWith('- ') || line.startsWith('• ')) {
                return <p key={i} className="text-slate-300 text-sm pl-4 border-l-2 border-accent-500/30 mb-1">{line.replace(/^[-•] /, '')}</p>;
              }
              if (line.match(/^\d+\./)) {
                return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>;
              }
              if (!line.trim()) return <br key={i} />;
              return <p key={i} className="text-slate-300 text-sm mb-2">{line}</p>;
            })}
          </div>
        </div>
      ) : !generating && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto">
            <Brain size={28} className="text-accent-400" />
          </div>
          <p className="text-slate-400">Klik "Buat Ringkasan" untuk menghasilkan ringkasan medis berdasarkan data yang tersimpan</p>
          {labResults.length === 0 && (
            <p className="text-slate-600 text-sm">Tip: Upload dan konfirmasi hasil lab terlebih dahulu untuk mendapat ringkasan yang lebih akurat</p>
          )}
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-16 space-x-3">
          <Loader2 size={24} className="text-accent-400 animate-spin" />
          <p className="text-slate-400">Gemini AI sedang menganalisis data...</p>
        </div>
      )}
    </div>
  );
}
