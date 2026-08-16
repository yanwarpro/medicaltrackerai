import { useMemo, useState } from 'react';
import { Plus, Trash2, FlaskConical, X, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { labResultStorage } from '../lib/storage';
import type { LabResult, AbnormalFlag } from '../lib/types';
import { formatDate, formatDateShort, formatNumber, cn } from '../lib/utils';
import { normalizeLabName } from '../lib/checklist';

export default function LabResults() {
  const { activePatient } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    testDate: new Date().toISOString().slice(0, 10),
    testName: '',
    value: '',
    unit: '',
    referenceLow: '',
    referenceHigh: '',
    abnormalFlag: '' as AbnormalFlag | '',
    notes: '',
  });

  const allResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id) : [],
    [activePatient, refreshKey]
  );

  // Group by date
  const grouped = useMemo(() => {
    const filtered = filterDate
      ? allResults.filter((r) => r.testDate === filterDate)
      : allResults;
    const groups: Record<string, LabResult[]> = {};
    filtered.forEach((r) => {
      if (!groups[r.testDate]) groups[r.testDate] = [];
      groups[r.testDate].push(r);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, results]) => ({ date, results }));
  }, [allResults, filterDate]);

  const uniqueDates = useMemo(() =>
    [...new Set(allResults.map((r) => r.testDate))].sort().reverse(),
    [allResults]
  );

  function handleSave() {
    if (!activePatient || !form.testName || !form.value) return;
    labResultStorage.save({
      patientId: activePatient.id,
      testDate: form.testDate,
      testName: form.testName,
      normalizedName: normalizeLabName(form.testName),
      value: parseFloat(form.value),
      unit: form.unit,
      referenceLow: form.referenceLow ? parseFloat(form.referenceLow) : undefined,
      referenceHigh: form.referenceHigh ? parseFloat(form.referenceHigh) : undefined,
      abnormalFlag: (form.abnormalFlag || null) as AbnormalFlag,
      confidence: 1,
      verified: true,
      notes: form.notes,
    });
    setRefreshKey((k) => k + 1);
    setForm((f) => ({ ...f, testName: '', value: '', unit: '', referenceLow: '', referenceHigh: '', abnormalFlag: '', notes: '' }));
  }

  function deleteResult(id: string) {
    if (!confirm('Hapus hasil lab ini?')) return;
    labResultStorage.delete(id);
    setRefreshKey((k) => k + 1);
  }

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hasil Lab</h1>
          <p className="text-slate-400 text-sm mt-1">{allResults.length} hasil tersimpan</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} id="add-lab-btn" className="btn-primary">
          <Plus size={15} />
          Tambah Manual
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card p-5 space-y-4 border border-accent-500/30">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Tambah Hasil Lab Manual</h3>
            <button onClick={() => setShowAddForm(false)} id="close-add-lab-btn">
              <X size={16} className="text-slate-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="label-text">Tanggal Pemeriksaan</label>
              <input type="date" className="input-field" value={form.testDate} onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))} id="lab-date-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Nama Pemeriksaan</label>
              <input className="input-field" value={form.testName} onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))} placeholder="contoh: Hemoglobin" id="lab-name-input" />
            </div>
            <div>
              <label className="label-text">Nilai</label>
              <input type="number" className="input-field" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="8.0" id="lab-value-input" />
            </div>
            <div>
              <label className="label-text">Satuan</label>
              <input className="input-field" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="g/dL" id="lab-unit-input" />
            </div>
            <div>
              <label className="label-text">Ref. Bawah</label>
              <input type="number" className="input-field" value={form.referenceLow} onChange={(e) => setForm((f) => ({ ...f, referenceLow: e.target.value }))} placeholder="12.0" id="lab-ref-low-input" />
            </div>
            <div>
              <label className="label-text">Ref. Atas</label>
              <input type="number" className="input-field" value={form.referenceHigh} onChange={(e) => setForm((f) => ({ ...f, referenceHigh: e.target.value }))} placeholder="16.0" id="lab-ref-high-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <select className="input-field w-32" value={form.abnormalFlag || ''} onChange={(e) => setForm((f) => ({ ...f, abnormalFlag: e.target.value as AbnormalFlag | '' }))} id="lab-flag-select">
              <option value="">Normal</option>
              <option value="H">H (Tinggi)</option>
              <option value="L">L (Rendah)</option>
              <option value="HH">HH (Kritis Tinggi)</option>
              <option value="LL">LL (Kritis Rendah)</option>
            </select>
            <button onClick={handleSave} id="save-lab-btn" className="btn-primary">
              <Save size={14} /> Simpan
            </button>
          </div>
        </div>
      )}

      {/* Filter by Date */}
      {uniqueDates.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterDate('')}
            id="filter-all-dates"
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              !filterDate
                ? 'bg-accent-500 text-white shadow-glow-teal border-accent-500'
                : 'bg-bg-elevated text-slate-300 border-bg-border hover:border-accent-500/50'
            )}
          >
            Semua Tanggal
          </button>
          {uniqueDates.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDate(d)}
              id={`filter-date-${d}`}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                filterDate === d
                  ? 'bg-accent-500 text-white shadow-glow-teal border-accent-500'
                  : 'bg-bg-elevated text-slate-300 border-bg-border hover:border-accent-500/50'
              )}
            >
              {formatDateShort(d)}
            </button>
          ))}
        </div>
      )}

      {/* Results Grouped by Date */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <FlaskConical size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Belum ada hasil lab. Upload dokumen lab dan ekstrak dengan AI, atau tambahkan manual.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, results }) => (
            <div key={date} className="glass-card overflow-hidden border border-bg-border">
              {/* Date Group Header */}
              <div className="px-5 py-3 border-b border-bg-border bg-bg-elevated flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={15} className="text-accent-400" />
                  <span className="text-sm font-bold text-white">{formatDate(date)}</span>
                  <span className="badge-gray text-xs">{results.length} parameter</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-secondary/40">
                    <th className="table-header">PARAMETER</th>
                    <th className="table-header text-right">NILAI</th>
                    <th className="table-header">SATUAN</th>
                    <th className="table-header">REFERENSI</th>
                    <th className="table-header">STATUS</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .sort((a, b) => a.testName.localeCompare(b.testName))
                    .map((r) => (
                      <tr key={r.id} className="table-row border-b border-bg-border/60 hover:bg-bg-elevated/40" id={`lab-result-${r.id}`}>
                        <td className="table-cell">
                          <div className="font-semibold text-white">{r.testName}</div>
                          {!r.verified && <span className="text-xs text-amber-400 font-medium">Belum dikonfirmasi</span>}
                        </td>
                        <td className={cn('table-cell text-right font-mono font-bold text-base',
                          r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'text-amber-400' :
                          r.abnormalFlag === 'L' || r.abnormalFlag === 'LL' ? 'text-blue-400' :
                          'text-white'
                        )}>
                          {formatNumber(r.value, 2)}
                        </td>
                        <td className="table-cell text-slate-400">{r.unit || '—'}</td>
                        <td className="table-cell text-slate-400 text-xs">
                          {r.referenceLow !== undefined && r.referenceHigh !== undefined
                            ? `${r.referenceLow} – ${r.referenceHigh}`
                            : '—'}
                        </td>
                        <td className="table-cell">
                          {r.abnormalFlag && r.abnormalFlag !== 'N' ? (
                            <span className={cn('badge text-xs font-semibold',
                              r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL' ? 'badge-red' :
                              r.abnormalFlag === 'H' ? 'badge-yellow' : 'badge-blue'
                            )}>
                              {r.abnormalFlag === 'H' ? 'Tinggi' :
                               r.abnormalFlag === 'L' ? 'Rendah' :
                               r.abnormalFlag === 'HH' ? 'Kritis ↑' : 'Kritis ↓'}
                            </span>
                          ) : (
                            <span className="badge badge-green text-xs font-semibold">Normal</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <button onClick={() => deleteResult(r.id)} id={`delete-lab-${r.id}`} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
