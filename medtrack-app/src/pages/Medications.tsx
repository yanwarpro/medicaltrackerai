import React, { useState, useMemo } from 'react';
import { Plus, Pill, Trash2, X, Save, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { medicationStorage } from '../lib/storage';
import { formatDateShort, cn } from '../lib/utils';

const emptyForm = {
  medicationName: '',
  dosage: '',
  frequency: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  prescribedBy: '',
  notes: '',
  isActive: true,
};

export default function Medications() {
  const { activePatient } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterActive, setFilterActive] = useState(true);

  const medications = useMemo(() =>
    activePatient
      ? medicationStorage.getAll(activePatient.id)
          .filter((m) => filterActive ? m.isActive : true)
          .sort((a, b) => b.startDate.localeCompare(a.startDate))
      : [],
    [activePatient, filterActive, refreshKey]
  );

  function handleSave() {
    if (!activePatient || !form.medicationName) return;
    medicationStorage.save({
      patientId: activePatient.id,
      medicationName: form.medicationName,
      dosage: form.dosage,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      prescribedBy: form.prescribedBy || undefined,
      notes: form.notes,
      isActive: form.isActive,
    });
    setRefreshKey((k) => k + 1);
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function deleteMed(id: string) {
    if (!confirm('Hapus obat ini?')) return;
    medicationStorage.delete(id);
    setRefreshKey((k) => k + 1);
  }

  function toggleActive(id: string, current: boolean) {
    medicationStorage.update(id, { isActive: !current, endDate: !current ? undefined : new Date().toISOString().slice(0, 10) });
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
          <h1 className="text-2xl font-bold text-white">Obat-obatan</h1>
          <p className="text-slate-400 text-sm mt-1">Daftar obat yang dikonsumsi</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="add-medication-btn" className="btn-primary">
          <Plus size={15} />
          Tambah Obat
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterActive(true)}
          id="filter-active-meds"
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            filterActive ? 'bg-accent-500/20 text-accent-400 border-accent-500/30' : 'bg-bg-elevated text-slate-400 border-bg-border'
          )}
        >
          Aktif
        </button>
        <button
          onClick={() => setFilterActive(false)}
          id="filter-all-meds"
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            !filterActive ? 'bg-accent-500/20 text-accent-400 border-accent-500/30' : 'bg-bg-elevated text-slate-400 border-bg-border'
          )}
        >
          Semua
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4 border border-accent-500/20">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Tambah Obat</h3>
            <button onClick={() => setShowForm(false)} id="close-med-form-btn"><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-text">Nama Obat *</label>
              <input className="input-field" value={form.medicationName} onChange={(e) => setForm((f) => ({ ...f, medicationName: e.target.value }))} placeholder="contoh: Eritropoietin" id="med-name-input" />
            </div>
            <div>
              <label className="label-text">Dosis</label>
              <input className="input-field" value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} placeholder="4000 IU" id="med-dose-input" />
            </div>
            <div>
              <label className="label-text">Frekuensi</label>
              <input className="input-field" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="3x seminggu" id="med-freq-input" />
            </div>
            <div>
              <label className="label-text">Mulai</label>
              <input type="date" className="input-field" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} id="med-start-input" />
            </div>
            <div>
              <label className="label-text">Selesai (opsional)</label>
              <input type="date" className="input-field" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} id="med-end-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Diresepkan oleh</label>
              <input className="input-field" value={form.prescribedBy} onChange={(e) => setForm((f) => ({ ...f, prescribedBy: e.target.value }))} placeholder="dr. Nama Dokter" id="med-doctor-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Catatan</label>
              <input className="input-field" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Catatan..." id="med-notes-input" />
            </div>
          </div>
          <button onClick={handleSave} id="save-med-btn" className="btn-primary">
            <Save size={14} /> Simpan Obat
          </button>
        </div>
      )}

      {/* List */}
      {medications.length === 0 ? (
        <div className="text-center py-16">
          <Pill size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada data obat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((m) => (
            <div key={m.id} className="glass-card p-4 flex items-center gap-4" id={`med-card-${m.id}`}>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', m.isActive ? 'bg-emerald-500/10' : 'bg-slate-500/10')}>
                <Pill size={18} className={m.isActive ? 'text-emerald-400' : 'text-slate-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{m.medicationName}</span>
                  {m.isActive ? (
                    <span className="badge badge-green text-xs">Aktif</span>
                  ) : (
                    <span className="badge badge-gray text-xs">Selesai</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {m.dosage} · {m.frequency}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {formatDateShort(m.startDate)} {m.endDate ? `→ ${formatDateShort(m.endDate)}` : '→ sekarang'}
                  {m.prescribedBy && ` · ${m.prescribedBy}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(m.id, m.isActive)}
                  id={`toggle-med-${m.id}`}
                  className="btn-ghost text-xs py-1.5 px-2"
                  title={m.isActive ? 'Tandai selesai' : 'Aktifkan kembali'}
                >
                  <CheckCircle size={13} />
                </button>
                <button onClick={() => deleteMed(m.id)} id={`delete-med-${m.id}`} className="btn-ghost text-red-400/60 hover:text-red-400 py-1.5 px-2">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
