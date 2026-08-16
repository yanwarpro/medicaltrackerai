import React, { useState, useMemo } from 'react';
import { Plus, Droplets, Trash2, X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { transfusionStorage } from '../lib/storage';
import type { BloodProduct, Transfusion } from '../lib/types';
import { formatDateShort, formatNumber, cn } from '../lib/utils';

const BLOOD_PRODUCTS: BloodProduct[] = ['PRC', 'WB', 'FFP', 'Platelet Concentrate', 'Cryoprecipitate', 'Other'];

const emptyForm = {
  transfusionDate: new Date().toISOString().slice(0, 10),
  productType: 'PRC' as BloodProduct,
  units: '1',
  hbBefore: '',
  hbAfter: '',
  indication: '',
  hospital: '',
  notes: '',
};

export default function TransfusionTracker() {
  const { activePatient } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [refreshKey, setRefreshKey] = useState(0);

  const transfusions = useMemo(() =>
    activePatient
      ? transfusionStorage.getAll(activePatient.id).sort((a, b) => b.transfusionDate.localeCompare(a.transfusionDate))
      : [],
    [activePatient, refreshKey]
  );

  const stats = useMemo(() => {
    if (transfusions.length === 0) return null;
    const totalUnits = transfusions.reduce((s, t) => s + t.units, 0);
    const withHb = transfusions.filter((t) => t.hbBefore !== undefined && t.hbAfter !== undefined);
    const avgHbIncrease = withHb.length > 0
      ? withHb.reduce((s, t) => s + (t.hbAfter! - t.hbBefore!), 0) / withHb.length
      : null;
    return { total: transfusions.length, totalUnits, avgHbIncrease };
  }, [transfusions]);

  function handleSave() {
    if (!activePatient || !form.hospital || !form.transfusionDate) return;
    transfusionStorage.save({
      patientId: activePatient.id,
      transfusionDate: form.transfusionDate,
      productType: form.productType,
      units: parseInt(form.units) || 1,
      hbBefore: form.hbBefore ? parseFloat(form.hbBefore) : undefined,
      hbAfter: form.hbAfter ? parseFloat(form.hbAfter) : undefined,
      indication: form.indication,
      hospital: form.hospital,
      notes: form.notes,
    });
    setRefreshKey((k) => k + 1);
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function deleteTrans(id: string) {
    if (!confirm('Hapus data transfusi ini?')) return;
    transfusionStorage.delete(id);
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
          <h1 className="text-2xl font-bold text-white">Transfusi</h1>
          <p className="text-slate-400 text-sm mt-1">Riwayat transfusi darah</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="add-transfusion-btn" className="btn-primary">
          <Plus size={15} />
          Tambah Transfusi
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <Droplets size={18} className="text-red-400" />
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Episode</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalUnits}</div>
            <div className="stat-label">Total Kantong</div>
          </div>
          {stats.avgHbIncrease !== null && (
            <div className="stat-card">
              <div className="stat-value text-emerald-400">+{formatNumber(stats.avgHbIncrease, 1)}</div>
              <div className="stat-label">Rata-rata Kenaikan Hb</div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4 border border-accent-500/20">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Tambah Transfusi</h3>
            <button onClick={() => setShowForm(false)} id="close-trans-form-btn"><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Tanggal Transfusi</label>
              <input type="date" className="input-field" value={form.transfusionDate} onChange={(e) => setForm((f) => ({ ...f, transfusionDate: e.target.value }))} id="trans-date-input" />
            </div>
            <div>
              <label className="label-text">Produk Darah</label>
              <select className="input-field" value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value as BloodProduct }))} id="trans-product-select">
                {BLOOD_PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Jumlah Kantong/Unit</label>
              <input type="number" className="input-field" value={form.units} onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))} min="1" id="trans-units-input" />
            </div>
            <div>
              <label className="label-text">Rumah Sakit</label>
              <input className="input-field" value={form.hospital} onChange={(e) => setForm((f) => ({ ...f, hospital: e.target.value }))} placeholder="Nama RS" id="trans-hospital-input" />
            </div>
            <div>
              <label className="label-text">Hb Sebelum (g/dL)</label>
              <input type="number" step="0.1" className="input-field" value={form.hbBefore} onChange={(e) => setForm((f) => ({ ...f, hbBefore: e.target.value }))} placeholder="7.0" id="trans-hb-before-input" />
            </div>
            <div>
              <label className="label-text">Hb Sesudah (g/dL)</label>
              <input type="number" step="0.1" className="input-field" value={form.hbAfter} onChange={(e) => setForm((f) => ({ ...f, hbAfter: e.target.value }))} placeholder="9.5" id="trans-hb-after-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Indikasi (menurut dokter)</label>
              <input className="input-field" value={form.indication} onChange={(e) => setForm((f) => ({ ...f, indication: e.target.value }))} placeholder="Anemia berat / Hb < 7" id="trans-indication-input" />
            </div>
            <div className="col-span-2">
              <label className="label-text">Catatan</label>
              <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} id="trans-notes-input" />
            </div>
          </div>
          <button onClick={handleSave} id="save-trans-btn" className="btn-primary">
            <Save size={14} /> Simpan
          </button>
        </div>
      )}

      {/* List */}
      {transfusions.length === 0 ? (
        <div className="text-center py-16">
          <Droplets size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada data transfusi</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-primary/50">
                <th className="table-header">Tanggal</th>
                <th className="table-header">Produk</th>
                <th className="table-header text-center">Kantong</th>
                <th className="table-header text-center">Hb Sebelum</th>
                <th className="table-header text-center">Hb Sesudah</th>
                <th className="table-header text-center">Efek</th>
                <th className="table-header">RS</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {transfusions.map((t) => {
                const hbChange = t.hbBefore !== undefined && t.hbAfter !== undefined
                  ? t.hbAfter - t.hbBefore : null;
                return (
                  <tr key={t.id} className="table-row" id={`trans-row-${t.id}`}>
                    <td className="table-cell">{formatDateShort(t.transfusionDate)}</td>
                    <td className="table-cell">
                      <span className="badge badge-red text-xs">{t.productType}</span>
                    </td>
                    <td className="table-cell text-center font-bold text-white">{t.units}</td>
                    <td className="table-cell text-center">
                      {t.hbBefore !== undefined ? <span className="text-red-400 font-medium">{formatNumber(t.hbBefore, 1)}</span> : '—'}
                    </td>
                    <td className="table-cell text-center">
                      {t.hbAfter !== undefined ? <span className="text-emerald-400 font-medium">{formatNumber(t.hbAfter, 1)}</span> : '—'}
                    </td>
                    <td className="table-cell text-center">
                      {hbChange !== null ? (
                        <span className={cn('flex items-center justify-center gap-1 text-xs font-medium', hbChange > 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {hbChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {hbChange > 0 ? '+' : ''}{formatNumber(hbChange, 1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell text-slate-400 text-xs">{t.hospital}</td>
                    <td className="table-cell">
                      <button onClick={() => deleteTrans(t.id)} id={`delete-trans-${t.id}`} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
