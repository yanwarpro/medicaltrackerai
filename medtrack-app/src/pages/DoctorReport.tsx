import React, { useState, useMemo, useRef } from 'react';
import { FileBarChart, Printer, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  labResultStorage, hospitalizationStorage, transfusionStorage,
  medicationStorage, documentStorage, bloodPressureStorage
} from '../lib/storage';
import { CHECKLIST_ITEMS } from '../lib/checklist';
import { formatDate, formatDateShort, formatNumber, calcAge, calcDelta, cn } from '../lib/utils';

const KEY_LAB_PARAMS = [
  { label: 'Hemoglobin (Hb)', normalized: 'hemoglobin', unit: 'g/dL' },
  { label: 'Trombosit', normalized: 'platelets', unit: '10³/µL' },
  { label: 'Leukosit (WBC)', normalized: 'wbc', unit: '10³/µL' },
  { label: 'MCV', normalized: 'mcv', unit: 'fL' },
  { label: 'Creatinine', normalized: 'creatinine', unit: 'mg/dL' },
  { label: 'Ferritin', normalized: 'ferritin', unit: 'ng/mL' },
  { label: 'TSH', normalized: 'tsh', unit: 'µIU/mL' },
];

export default function DoctorReport() {
  const { activePatient } = useApp();
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  const hospitalizations = useMemo(() =>
    activePatient ? hospitalizationStorage.getAll(activePatient.id).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)) : [],
    [activePatient]
  );

  const transfusions = useMemo(() =>
    activePatient ? transfusionStorage.getAll(activePatient.id).sort((a, b) => b.transfusionDate.localeCompare(a.transfusionDate)) : [],
    [activePatient]
  );

  const medications = useMemo(() =>
    activePatient ? medicationStorage.getAll(activePatient.id).filter((m) => m.isActive) : [],
    [activePatient]
  );

  const bloodPressures = useMemo(() =>
    activePatient ? bloodPressureStorage.getAll(activePatient.id).sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()) : [],
    [activePatient]
  );

  const documents = useMemo(() =>
    activePatient ? documentStorage.getAll(activePatient.id).sort((a, b) => b.documentDate.localeCompare(a.documentDate)) : [],
    [activePatient]
  );

  // Lab trends for key params
  const labTrends = useMemo(() => {
    return KEY_LAB_PARAMS.map((param) => {
      const results = labResults
        .filter((r) => r.normalizedName === param.normalized)
        .sort((a, b) => a.testDate.localeCompare(b.testDate));
      const last3 = results.slice(-3);
      const latest = results[results.length - 1];
      const previous = results[results.length - 2];
      const delta = latest && previous && latest.value !== null && previous.value !== null
        ? calcDelta(latest.value, previous.value) : null;
      return { ...param, results: last3, latest, delta };
    });
  }, [labResults]);

  // Missing checklist items
  const missingItems = useMemo(() => {
    const found = new Set(labResults.map((r) => r.normalizedName));
    return CHECKLIST_ITEMS.filter((item) => item.category === 'Anemia' && !found.has(item.normalizedName));
  }, [labResults]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    if (!reportRef.current || !activePatient) return;
    setDownloadingPdf(true);
    try {
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const element = reportRef.current;
      const patientNameClean = activePatient.fullName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Laporan_Medis_${patientNameClean}_${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback to window.print if html2pdf fails
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Dokter</h1>
          <p className="text-slate-400 text-sm mt-1">Laporan medis terstruktur siap bawa atau unduh untuk konsultasi dokter</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadPDF} 
            disabled={downloadingPdf}
            id="download-pdf-btn" 
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-md disabled:opacity-50"
          >
            <Download size={16} className={downloadingPdf ? 'animate-bounce' : ''} />
            {downloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
          <button 
            onClick={handlePrint} 
            id="print-report-btn" 
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-bg-border hover:bg-bg-elevated text-slate-200"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Report */}
      <div ref={reportRef} className="glass-card p-8 space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:rounded-none print:p-0" id="doctor-report-content">

        {/* Header */}
        <div className="border-b-2 border-accent-500 pb-4 print:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gradient-teal print:text-gray-900">RINGKASAN MEDIS PASIEN</h2>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">MedTrack AI · Dicetak: {today}</p>
            </div>
            <div className="text-right text-xs text-slate-500 print:text-gray-500">
              <p>Data per: {today}</p>
              <p className="text-amber-400 print:text-amber-700 mt-1">⚠ Bukan rekam medis resmi</p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <section>
          <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Informasi Pasien</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Nama', value: activePatient.fullName },
              { label: 'Tanggal Lahir', value: formatDate(activePatient.dateOfBirth) },
              { label: 'Usia', value: `${calcAge(activePatient.dateOfBirth)} tahun` },
              { label: 'Jenis Kelamin', value: activePatient.gender === 'male' ? 'Laki-laki' : 'Perempuan' },
              { label: 'Golongan Darah', value: activePatient.bloodType === 'unknown' ? 'Tidak diketahui' : activePatient.bloodType },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <div className="text-xs text-slate-500 print:text-gray-500">{label}</div>
                <div className="text-sm font-medium text-white print:text-gray-900">{value}</div>
              </div>
            ))}
          </div>
          {activePatient.allergies.length > 0 && (
            <div className="mt-3 flex items-start gap-2">
              <span className="text-xs text-amber-400 font-bold print:text-amber-700">⚠ ALERGI:</span>
              <span className="text-xs text-amber-300 print:text-amber-800">{activePatient.allergies.join(', ')}</span>
            </div>
          )}
        </section>

        {/* Medical History */}
        {(activePatient.medicalHistory.length > 0 || activePatient.surgicalHistory.length > 0) && (
          <section>
            <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Riwayat Medis Utama</h3>
            {activePatient.medicalHistory.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-slate-500 print:text-gray-500 mb-1">Riwayat Penyakit</div>
                <div className="flex flex-wrap gap-2">
                  {activePatient.medicalHistory.map((h, i) => (
                    <span key={i} className="badge badge-teal print:bg-blue-100 print:text-blue-800 text-xs">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {activePatient.surgicalHistory.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 print:text-gray-500 mb-1">Riwayat Operasi</div>
                <div className="flex flex-wrap gap-2">
                  {activePatient.surgicalHistory.map((h, i) => (
                    <span key={i} className="badge badge-gray print:bg-gray-100 print:text-gray-800 text-xs">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Lab Trends */}
        <section>
          <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Tren Laboratorium</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary/40 print:border-gray-300">
                <th className="table-header">PARAMETER</th>
                {[...new Set(labResults.map((r) => r.testDate))].sort().slice(-3).map((d: string) => (
                  <th key={d} className="table-header text-right">{formatDateShort(d)}</th>
                ))}
                <th className="table-header text-right">TREN</th>
              </tr>
            </thead>
            <tbody>
              {labTrends.filter((p) => p.latest).map((param) => (
                <tr key={param.normalized} className="border-b border-bg-border/50 print:border-gray-200">
                  <td className="py-2 font-medium text-white print:text-gray-900">{param.label}</td>
                  {param.results.map((r) => (
                    <td key={r.id} className={cn('py-2 text-right font-mono',
                      r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'text-amber-400 print:text-orange-600' :
                      r.abnormalFlag === 'L' || r.abnormalFlag === 'LL' ? 'text-blue-400 print:text-blue-600' :
                      'text-white print:text-gray-900'
                    )}>
                      {formatNumber(r.value, 1)} {r.unit}
                    </td>
                  ))}
                  {param.results.length < 3 && Array.from({ length: 3 - param.results.length }).map((_, i) => (
                    <td key={i} className="py-2 text-right text-slate-600 print:text-gray-400">—</td>
                  ))}
                  <td className="py-2 text-right">
                    {param.delta ? (
                      <span className={cn('text-xs',
                        param.delta.trend === 'up' ? 'text-emerald-400 print:text-green-700' :
                        param.delta.trend === 'down' ? 'text-red-400 print:text-red-700' : 'text-slate-500'
                      )}>
                        {param.delta.trend === 'up' ? '↑' : param.delta.trend === 'down' ? '↓' : '→'}
                        {param.delta.abs > 0 ? '+' : ''}{formatNumber(param.delta.abs, 1)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Blood Pressure Summary */}
        {bloodPressures.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Pemeriksaan Tekanan Darah (Tensi)</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bg-border bg-bg-secondary/40 print:border-gray-300">
                  <th className="table-header">WAKTU PENGUKURAN</th>
                  <th className="table-header">TEKANAN DARAH</th>
                  <th className="table-header">NADI</th>
                  <th className="table-header">KATEGORI</th>
                  <th className="table-header">CATATAN</th>
                </tr>
              </thead>
              <tbody>
                {bloodPressures.slice(0, 5).map((bp) => (
                  <tr key={bp.id} className="border-b border-bg-border/50 print:border-gray-200">
                    <td className="py-2 text-slate-300 print:text-gray-700">{formatDate(bp.measuredAt)}</td>
                    <td className="py-2 font-mono font-bold text-white print:text-gray-900">{bp.systolic} / {bp.diastolic} mmHg</td>
                    <td className="py-2 text-slate-300 print:text-gray-700">{bp.pulse ? `${bp.pulse} bpm` : '—'}</td>
                    <td className="py-2 text-slate-300 print:text-gray-700">{bp.category}</td>
                    <td className="py-2 text-slate-400 print:text-gray-600">{bp.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Hospitalization History */}
        {hospitalizations.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Riwayat Rawat Inap</h3>
            <div className="space-y-3">
              {hospitalizations.slice(0, 5).map((h) => (
                <div key={h.id} className="bg-bg-primary/50 print:bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white print:text-gray-900">{h.hospital}</div>
                      <div className="text-xs text-slate-400 print:text-gray-600">
                        {formatDateShort(h.admissionDate)} → {h.dischargeDate ? formatDateShort(h.dischargeDate) : 'sekarang'}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {h.hbOnAdmission && <div className="text-slate-400 print:text-gray-600">Hb: {h.hbOnAdmission} → {h.hbOnDischarge || '?'}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 print:text-gray-600 mt-1">{h.reason} · {h.doctorDiagnosis}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Current Medications */}
        {medications.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Obat Saat Ini</h3>
            <div className="space-y-1">
              {medications.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-300 print:text-gray-900 font-medium">{m.medicationName}</span>
                  <span className="text-slate-500 print:text-gray-600">{m.dosage} · {m.frequency}</span>
                  {m.prescribedBy && <span className="text-slate-600 print:text-gray-500">(dr. {m.prescribedBy})</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Missing Investigations */}
        {missingItems.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">
              Belum Ditemukan dalam Dokumen
            </h3>
            <p className="text-xs text-slate-500 print:text-gray-500 mb-2 italic">
              Pemeriksaan berikut belum ditemukan dalam dokumen yang diunggah. Bukan rekomendasi medis.
            </p>
            <div className="flex flex-wrap gap-2">
              {missingItems.map((item) => (
                <span key={item.id} className="badge badge-gray text-xs">{item.name}</span>
              ))}
            </div>
          </section>
        )}

        {/* Source Documents */}
        <section>
          <h3 className="text-sm font-bold text-accent-400 print:text-blue-700 uppercase tracking-wider mb-3">Dokumen Sumber</h3>
          <div className="space-y-1">
            {documents.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 print:text-gray-500 w-24 flex-shrink-0">{formatDateShort(d.documentDate)}</span>
                <span className="badge badge-gray text-xs flex-shrink-0">{d.category}</span>
                <span className="text-slate-300 print:text-gray-700">{d.filename}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-bg-border print:border-gray-300 pt-4">
          <p className="text-xs text-slate-600 print:text-gray-500 text-center">
            Dokumen ini dibuat oleh MedTrack AI untuk membantu komunikasi dengan dokter.
            <strong className="text-amber-400 print:text-amber-700"> Bukan rekam medis resmi dan bukan pengganti konsultasi dokter.</strong>
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          nav, aside { display: none !important; }
          main { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
