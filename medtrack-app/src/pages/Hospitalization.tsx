import React, { useState, useMemo } from 'react';
import { Plus, Hospital, Trash2, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hospitalizationStorage, transfusionStorage } from '../lib/storage';
import type { Hospitalization } from '../lib/types';
import { formatDate, formatDateShort, daysBetween, cn } from '../lib/utils';

const emptyForm: Omit<Hospitalization, 'id' | 'patientId' | 'createdAt' | 'updatedAt'> = {
  admissionDate: new Date().toISOString().slice(0, 10),
  dischargeDate: '',
  hospital: '',
  reason: '',
  symptoms: [],
  doctorDiagnosis: '',
  hbOnAdmission: undefined,
  hbOnDischarge: undefined,
  medications: [],
  procedures: [],
  notes: '',
};

export default function HospitalizationTracker() {
  const { activePatient } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, symptomInput: '', medInput: '', procInput: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const hospitalizations = useMemo(() =>
    activePatient
      ? hospitalizationStorage.getAll(activePatient.id).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
      : [],
    [activePatient, refreshKey]
  );

  const transfusions = useMemo(() =>
    activePatient ? transfusionStorage.getAll(activePatient.id) : [],
    [activePatient]
  );

  // Stats
  const stats = useMemo(() => {
    if (hospitalizations.length < 2) return null;
    const intervals = [];
    for (let i = 0; i < hospitalizations.length - 1; i++) {
      intervals.push(daysBetween(hospitalizations[i].admissionDate, hospitalizations[i + 1].admissionDate));
    }
    return {
      total: hospitalizations.length,
      avgInterval: Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length),
      minInterval: Math.min(...intervals),
    };
  }, [hospitalizations]);

  function addTag(field: 'symptoms' | 'medications' | 'procedures', inputKey: 'symptomInput' | 'medInput' | 'procInput') {
    const val = (form as any)[inputKey].trim();
    if (!val) return;
    setForm((f: any) => ({ ...f, [field]: [...f[field], val], [inputKey]: '' }));
  }

  function removeTag(field: 'symptoms' | 'medications' | 'procedures', idx: number) {
    setForm((f: any) => ({ ...f, [field]: f[field].filter((_: any, i: number) => i !== idx) }));
  }

  function handleSave() {
    if (!activePatient || !form.hospital || !form.admissionDate) return;
    hospitalizationStorage.save({
      patientId: activePatient.id,
      admissionDate: form.admissionDate,
      dischargeDate: form.dischargeDate || undefined,
      hospital: form.hospital,
      reason: form.reason,
      symptoms: form.symptoms,
      doctorDiagnosis: form.doctorDiagnosis,
      hbOnAdmission: form.hbOnAdmission ? Number(form.hbOnAdmission) : undefined,
      hbOnDischarge: form.hbOnDischarge ? Number(form.hbOnDischarge) : undefined,
      medications: form.medications,
      procedures: form.procedures,
      notes: form.notes,
    });
    setRefreshKey((k) => k + 1);
    setShowForm(false);
    setForm({ ...emptyForm, symptomInput: '', medInput: '', procInput: '' });
  }

  function deleteHosp(id: string) {
    if (!confirm('Hapus episode rawat inap ini?')) return;
    hospitalizationStorage.delete(id);
    setRefreshKey((k) => k + 1);
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
          <h1 className="text-2xl font-bold text-white">Rawat Inap</h1>
          <p className="text-slate-400 text-sm mt-1">Riwayat episode rawat inap</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="add-hospitalization-btn" className="btn-primary">
          <Plus size={15} />
          Tambah Episode
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <Hospital size={18} className="text-amber-400" />
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Episode</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgInterval}</div>
            <div className="stat-label">Rata-rata Interval (hari)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.minInterval}</div>
            <div className="stat-label">Interval Terpendek (hari)</div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4 border border-accent-500/20">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Tambah Episode Rawat Inap</h3>
            <button onClick={() => setShowForm(false)} id="close-hosp-form-btn"><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Tanggal Masuk</label>
              <input type="date" className="input-field" value={form.admissionDate} onChange={(e) => setForm((f: any) => ({ ...f, admissionDate: e.target.value }))} id="hosp-admission-input" />
            </div>
            <div>
              <label className="label-text">Tanggal Keluar (opsional)</label>
              <input type="date" className="input-field" value={form.dischargeDate} onChange={(e) => setForm((f: any) => ({ ...f, dischargeDate: e.target.value }))} id="hosp-discharge-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Rumah Sakit</label>
              <input className="input-field" value={form.hospital} onChange={(e) => setForm((f: any) => ({ ...f, hospital: e.target.value }))} placeholder="Nama rumah sakit" id="hosp-hospital-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Alasan Masuk</label>
              <input className="input-field" value={form.reason} onChange={(e) => setForm((f: any) => ({ ...f, reason: e.target.value }))} placeholder="Alasan rawat inap" id="hosp-reason-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Diagnosis Dokter</label>
              <input className="input-field" value={form.doctorDiagnosis} onChange={(e) => setForm((f: any) => ({ ...f, doctorDiagnosis: e.target.value }))} placeholder="Diagnosis dari dokter" id="hosp-diagnosis-input" />
            </div>
            <div>
              <label className="label-text">Hb Masuk (g/dL)</label>
              <input type="number" className="input-field" value={form.hbOnAdmission || ''} onChange={(e) => setForm((f: any) => ({ ...f, hbOnAdmission: e.target.value }))} placeholder="7.5" id="hosp-hb-admission-input" />
            </div>
            <div>
              <label className="label-text">Hb Keluar (g/dL)</label>
              <input type="number" className="input-field" value={form.hbOnDischarge || ''} onChange={(e) => setForm((f: any) => ({ ...f, hbOnDischarge: e.target.value }))} placeholder="9.0" id="hosp-hb-discharge-input" />
            </div>
          </div>
          {/* Tags */}
          {(['symptoms', 'medications', 'procedures'] as const).map((field) => {
            const inputKey = field === 'symptoms' ? 'symptomInput' : field === 'medications' ? 'medInput' : 'procInput';
            const label = field === 'symptoms' ? 'Gejala' : field === 'medications' ? 'Obat' : 'Tindakan';
            return (
              <div key={field} className="space-y-2">
                <label className="label-text">{label}</label>
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1"
                    value={(form as any)[inputKey]}
                    onChange={(e) => setForm((f: any) => ({ ...f, [inputKey]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(field, inputKey as any))}
                    placeholder={`Ketik dan Enter`}
                    id={`hosp-${field}-input`}
                  />
                  <button type="button" onClick={() => addTag(field, inputKey as any)} className="btn-secondary px-3"><Plus size={14} /></button>
                </div>
                {(form as any)[field].length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(form as any)[field].map((item: string, i: number) => (
                      <span key={i} className="badge badge-teal gap-1.5">
                        {item}
                        <button onClick={() => removeTag(field, i)} className="hover:text-red-400"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div>
            <label className="label-text">Catatan</label>
            <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." id="hosp-notes-input" />
          </div>
          <button onClick={handleSave} id="save-hosp-btn" className="btn-primary">
            <Save size={14} /> Simpan Episode
          </button>
        </div>
      )}

      {/* List */}
      {hospitalizations.length === 0 ? (
        <div className="text-center py-16">
          <Hospital size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada data rawat inap</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hospitalizations.map((h, idx) => {
            const duration = h.dischargeDate ? daysBetween(h.admissionDate, h.dischargeDate) : null;
            const hospTransfusions = transfusions.filter((t) => t.hospitalizationId === h.id);
            const isExpanded = expandedId === h.id;
            return (
              <div key={h.id} className="glass-card overflow-hidden" id={`hosp-card-${h.id}`}>
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-bg-elevated/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : h.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Hospital size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{h.hospital}</span>
                      {!h.dischargeDate && <span className="badge badge-yellow text-xs">Masih dirawat</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDateShort(h.admissionDate)} {h.dischargeDate ? `→ ${formatDateShort(h.dischargeDate)} (${duration} hari)` : '→ sekarang'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{h.reason}</div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {h.hbOnAdmission && (
                      <div>
                        <div className="text-xs text-slate-500">Hb Masuk</div>
                        <div className="text-sm font-bold text-white">{h.hbOnAdmission}</div>
                      </div>
                    )}
                    {h.hbOnDischarge && (
                      <div>
                        <div className="text-xs text-slate-500">Hb Keluar</div>
                        <div className="text-sm font-bold text-emerald-400">{h.hbOnDischarge}</div>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-bg-border p-5 space-y-4 animate-fade-in">
                    {h.doctorDiagnosis && (
                      <div>
                        <div className="label-text">Diagnosis</div>
                        <p className="text-sm text-slate-300">{h.doctorDiagnosis}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      {h.symptoms.length > 0 && (
                        <div>
                          <div className="label-text">Gejala</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {h.symptoms.map((s, i) => <span key={i} className="badge badge-gray text-xs">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {h.medications.length > 0 && (
                        <div>
                          <div className="label-text">Obat</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {h.medications.map((m, i) => <span key={i} className="badge badge-teal text-xs">{m}</span>)}
                          </div>
                        </div>
                      )}
                      {h.procedures.length > 0 && (
                        <div>
                          <div className="label-text">Tindakan</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {h.procedures.map((p, i) => <span key={i} className="badge badge-blue text-xs">{p}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                    {h.notes && <p className="text-xs text-slate-400 italic">{h.notes}</p>}
                    <div className="flex justify-end">
                      <button onClick={() => deleteHosp(h.id)} id={`delete-hosp-${h.id}`} className="btn-danger text-xs">
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
