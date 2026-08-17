import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse, Plus, Activity, TrendingUp, AlertTriangle, CheckCircle2,
  Calendar, Edit2, Trash2, X, Save, Clock, Info, Search, Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { bloodPressureStorage, calcBPCategory } from '../lib/storage';
import type { BloodPressureRecord, BloodPressureCategory } from '../lib/types';
import { formatDate, cn } from '../lib/utils';

export default function BloodPressure() {
  const { activePatient } = useApp();
  const [records, setRecords] = useState<BloodPressureRecord[]>([]);
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BloodPressureRecord | null>(null);
  
  // Form fields
  const [systolicInput, setSystolicInput] = useState('120');
  const [diastolicInput, setDiastolicInput] = useState('80');
  const [pulseInput, setPulseInput] = useState('72');
  const [measuredAtInput, setMeasuredAtInput] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [notesInput, setNotesInput] = useState('');

  const loadData = () => {
    if (!activePatient) return;
    const data = bloodPressureStorage.getAll(activePatient.id);
    // Sort descending by measuredAt
    data.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    setRecords(data);
  };

  useEffect(() => {
    loadData();
  }, [activePatient]);

  const openAddModal = () => {
    setEditingRecord(null);
    setSystolicInput('120');
    setDiastolicInput('80');
    setPulseInput('72');
    setMeasuredAtInput(
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
    setNotesInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: BloodPressureRecord) => {
    setEditingRecord(rec);
    setSystolicInput(rec.systolic.toString());
    setDiastolicInput(rec.diastolic.toString());
    setPulseInput(rec.pulse ? rec.pulse.toString() : '');
    setMeasuredAtInput(
      new Date(new Date(rec.measuredAt).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );
    setNotesInput(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    const sys = parseInt(systolicInput, 10);
    const dia = parseInt(diastolicInput, 10);
    const pulse = pulseInput ? parseInt(pulseInput, 10) : undefined;

    if (isNaN(sys) || sys < 50 || sys > 250) {
      alert('Sistolik harus berupa angka antara 50 dan 250 mmHg');
      return;
    }
    if (isNaN(dia) || dia < 30 || dia > 180) {
      alert('Diastolik harus berupa angka antara 30 dan 180 mmHg');
      return;
    }

    const measuredAtIso = new Date(measuredAtInput).toISOString();

    if (editingRecord) {
      bloodPressureStorage.update(editingRecord.id, {
        systolic: sys,
        diastolic: dia,
        pulse,
        measuredAt: measuredAtIso,
        notes: notesInput,
      });
    } else {
      bloodPressureStorage.save({
        patientId: activePatient.id,
        systolic: sys,
        diastolic: dia,
        pulse,
        measuredAt: measuredAtIso,
        notes: notesInput,
      });
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan tensi ini?')) {
      bloodPressureStorage.delete(id);
      loadData();
    }
  };

  // Filtered records by time range and search
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (timeFilter !== 'all') {
      const now = new Date().getTime();
      const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      result = result.filter((r) => new Date(r.measuredAt).getTime() >= cutoff);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.notes?.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          `${r.systolic}/${r.diastolic}`.includes(q)
      );
    }

    return result;
  }, [records, timeFilter, categoryFilter, searchQuery]);

  // Chronological order for chart (oldest to newest)
  const chartRecords = useMemo(() => {
    return [...filteredRecords].reverse();
  }, [filteredRecords]);

  // Summary statistics
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const latest = records[0];

    // 7 days average
    const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = records.filter((r) => new Date(r.measuredAt).getTime() >= sevenDaysAgo);

    const avgSys7 = last7Days.length > 0
      ? Math.round(last7Days.reduce((acc, r) => acc + r.systolic, 0) / last7Days.length)
      : Math.round(records.reduce((acc, r) => acc + r.systolic, 0) / records.length);

    const avgDia7 = last7Days.length > 0
      ? Math.round(last7Days.reduce((acc, r) => acc + r.diastolic, 0) / last7Days.length)
      : Math.round(records.reduce((acc, r) => acc + r.diastolic, 0) / records.length);

    const maxSys = Math.max(...records.map((r) => r.systolic));
    const recordsWithPulse = records.filter((r) => r.pulse);
    const avgPulse = recordsWithPulse.length > 0
      ? Math.round(recordsWithPulse.reduce((acc, r) => acc + (r.pulse || 0), 0) / recordsWithPulse.length)
      : null;

    return { latest, avgSys7, avgDia7, maxSys, avgPulse, total: records.length };
  }, [records]);

  // Live category calculation in modal
  const currentModalCategory = useMemo(() => {
    const sys = parseInt(systolicInput, 10);
    const dia = parseInt(diastolicInput, 10);
    if (!isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0) {
      return calcBPCategory(sys, dia);
    }
    return 'Normal';
  }, [systolicInput, diastolicInput]);

  const getCategoryBadgeClass = (category: BloodPressureCategory) => {
    switch (category) {
      case 'Normal':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Elevated':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Hypertension Stage 1':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'Hypertension Stage 2':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'Hypertensive Crisis':
        return 'bg-rose-600/20 text-rose-300 border-rose-500/40 animate-pulse font-bold';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const translateCategory = (cat: BloodPressureCategory) => {
    switch (cat) {
      case 'Normal': return 'Normal';
      case 'Elevated': return 'Meningkat (Prehipertensi)';
      case 'Hypertension Stage 1': return 'Hipertensi Stage 1';
      case 'Hypertension Stage 2': return 'Hipertensi Stage 2';
      case 'Hypertensive Crisis': return 'Krisis Hipertensi!';
    }
  };

  if (!activePatient) {
    return (
      <div className="p-8 text-center text-slate-400">
        Silakan pilih atau tambah pasien terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-glow-rose">
              <HeartPulse size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Riwayat Tensi & Vital Signs</h1>
              <p className="text-xs text-slate-400">Pemantauan Tekanan Darah ({activePatient.nickname || activePatient.fullName})</p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          id="add-bp-record-btn"
          className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-glow-teal"
        >
          <Plus size={16} />
          <span>Catat Tensi Baru</span>
        </button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Latest Reading */}
          <div className="card p-4 space-y-2 border-rose-500/20 bg-gradient-to-br from-bg-card to-rose-950/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tensi Terakhir</span>
              <Activity size={16} className="text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.latest.systolic}/{stats.latest.diastolic}</span>
              <span className="text-xs text-slate-400">mmHg</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className={cn('px-2 py-0.5 text-[11px] font-semibold border rounded-full', getCategoryBadgeClass(stats.latest.category))}>
                {translateCategory(stats.latest.category)}
              </span>
              <span className="text-[11px] text-slate-500">{formatDate(stats.latest.measuredAt)}</span>
            </div>
          </div>

          {/* 7-Day Average */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata 7 Hari</span>
              <TrendingUp size={16} className="text-accent-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.avgSys7}/{stats.avgDia7}</span>
              <span className="text-xs text-slate-400">mmHg</span>
            </div>
            <p className="text-xs text-slate-500">Estimasi stabilisasi tekanan darah</p>
          </div>

          {/* Max Reading */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistolik Tertinggi</span>
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 font-mono">{stats.maxSys}</span>
              <span className="text-xs text-slate-400">mmHg</span>
            </div>
            <p className="text-xs text-slate-500">Batas puncak pengukuran</p>
          </div>

          {/* Average Pulse */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Nadi</span>
              <HeartPulse size={16} className="text-teal-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.avgPulse || '—'}</span>
              <span className="text-xs text-slate-400">bpm</span>
            </div>
            <p className="text-xs text-slate-500">Total {stats.total} catatan tersimpan</p>
          </div>
        </div>
      )}

      {/* SVG Chart Section */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-400" />
              Grafik Tren Tekanan Darah
            </h2>
            <p className="text-xs text-slate-400">Perbandingan Sistolik (Rose) vs Diastolik (Cyan) dari waktu ke waktu</p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center bg-bg-primary border border-bg-border rounded-lg p-1 text-xs self-start sm:self-auto">
            {(['7d', '30d', '90d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                id={`time-filter-${t}`}
                className={cn(
                  'px-3 py-1 font-medium rounded-md transition-colors',
                  timeFilter === t ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-slate-400 hover:text-white'
                )}
              >
                {t === '7d' ? '7 Hari' : t === '30d' ? '30 Hari' : t === '90d' ? '90 Hari' : 'Semua'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom SVG Line Chart */}
        {chartRecords.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] h-64 relative pt-4 pb-8 pr-4">
              <BloodPressureSvgChart records={chartRecords} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            Belum ada data tensi untuk periode ini. Klik "Catat Tensi Baru" untuk menambahkan data.
          </div>
        )}
      </div>

      {/* History Table Section */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-teal-400" />
              Riwayat Catatan Tensi ({filteredRecords.length})
            </h2>
            <p className="text-xs text-slate-400">Daftar pengukuran terurut dari yang terbaru</p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="search-bp-input"
                className="input-field text-xs pl-8 py-1.5 w-40 sm:w-56"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              id="category-bp-select"
              className="input-field text-xs py-1.5 px-2 text-white bg-bg-primary border border-bg-border rounded-lg"
            >
              <option value="all">Semua Kategori</option>
              <option value="Normal">Normal</option>
              <option value="Elevated">Prehipertensi</option>
              <option value="Hypertension Stage 1">Hipertensi Stg 1</option>
              <option value="Hypertension Stage 2">Hipertensi Stg 2</option>
              <option value="Hypertensive Crisis">Krisis</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-bg-border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary/60 text-slate-400 text-xs uppercase tracking-wider">
                <th className="table-header pl-4">Waktu Pengukuran</th>
                <th className="table-header">Sistolik / Diastolik</th>
                <th className="table-header">Detak Nadi</th>
                <th className="table-header">Kategori Kesehatan</th>
                <th className="table-header">Catatan</th>
                <th className="table-header text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="table-row border-b border-bg-border/40 hover:bg-bg-elevated/40 transition-colors">
                    <td className="table-cell pl-4 text-xs text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-500" />
                        <span>{formatDate(r.measuredAt)}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono font-bold text-white text-sm">
                        {r.systolic} / {r.diastolic}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">mmHg</span>
                    </td>
                    <td className="table-cell text-xs text-slate-300">
                      {r.pulse ? (
                        <span className="font-mono text-teal-300">{r.pulse} <span className="text-slate-500">bpm</span></span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={cn('px-2.5 py-0.5 text-xs font-medium border rounded-full inline-block', getCategoryBadgeClass(r.category))}>
                        {translateCategory(r.category)}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-400 max-w-xs truncate">
                      {r.notes || <span className="text-slate-600 italic">Tidak ada catatan</span>}
                    </td>
                    <td className="table-cell text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(r)}
                          id={`edit-bp-${r.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          id={`delete-bp-${r.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                    Tidak ada catatan tensi yang cocok dengan filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card / AHA Guidelines */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-accent-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">Panduan Klasifikasi Tekanan Darah (Standar AHA/JNC):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1 text-[11px]">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-emerald-300">
              <span className="font-bold block">Normal</span> &lt; 120 dan &lt; 80 mmHg
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-300">
              <span className="font-bold block">Prehipertensi</span> 120-129 dan &lt; 80 mmHg
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-orange-300">
              <span className="font-bold block">Hipertensi Stg 1</span> 130-139 atau 80-89 mmHg
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-red-300">
              <span className="font-bold block">Hipertensi Stg 2</span> &ge; 140 atau &ge; 90 mmHg
            </div>
            <div className="bg-rose-600/20 border border-rose-500/30 p-2 rounded-lg text-rose-300">
              <span className="font-bold block">Krisis</span> &gt; 180 atau &gt; 120 mmHg
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Record */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="bg-bg-card border border-bg-border rounded-xl w-full max-w-md p-6 space-y-5 shadow-card-hover animate-fade-in">
            <div className="flex items-center justify-between border-b border-bg-border pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <HeartPulse size={16} />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingRecord ? 'Edit Catatan Tensi' : 'Catat Tensi Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} id="close-modal-bp-btn" className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Systolic & Diastolic */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sistolik (mmHg) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="250"
                    required
                    value={systolicInput}
                    onChange={(e) => setSystolicInput(e.target.value)}
                    id="systolic-input"
                    className="input-field text-lg font-mono font-bold text-white text-center py-2"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Diastolik (mmHg) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    required
                    value={diastolicInput}
                    onChange={(e) => setDiastolicInput(e.target.value)}
                    id="diastolic-input"
                    className="input-field text-lg font-mono font-bold text-white text-center py-2"
                    placeholder="80"
                  />
                </div>
              </div>

              {/* Pulse & Measured Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Detak Nadi (bpm)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="220"
                    value={pulseInput}
                    onChange={(e) => setPulseInput(e.target.value)}
                    id="pulse-input"
                    className="input-field text-sm text-center"
                    placeholder="72"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Waktu Pengukuran
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={measuredAtInput}
                    onChange={(e) => setMeasuredAtInput(e.target.value)}
                    id="measured-at-input"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              {/* Category Live Preview */}
              <div className="bg-bg-primary border border-bg-border rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">Kategori Otomatis:</span>
                <span className={cn('px-2.5 py-0.5 text-xs font-semibold border rounded-full', getCategoryBadgeClass(currentModalCategory))}>
                  {translateCategory(currentModalCategory)}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Catatan Tambahan (opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  id="bp-notes-input"
                  className="input-field text-xs text-white"
                  placeholder="Contoh: Diukur setelah istirahat 10 menit, kondisi rileks..."
                />
              </div>

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  id="cancel-bp-modal-btn"
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="save-bp-modal-btn"
                  className="btn-primary text-xs flex items-center gap-1.5 shadow-glow-teal"
                >
                  <Save size={14} />
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SVG Line Chart Component for Blood Pressure
// ============================================================
function BloodPressureSvgChart({ records }: { records: BloodPressureRecord[] }) {
  if (records.length === 0) return null;

  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const width = Math.max(560, records.length * 65);

  const minVal = 40;
  const maxVal = Math.max(180, ...records.map((r) => Math.max(r.systolic, r.diastolic))) + 10;

  const getY = (val: number) => {
    const chartH = height - padding.top - padding.bottom;
    return height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * chartH;
  };

  const getX = (idx: number) => {
    const chartW = width - padding.left - padding.right;
    if (records.length === 1) return padding.left + chartW / 2;
    return padding.left + (idx / (records.length - 1)) * chartW;
  };

  // Generate SVG paths
  const sysPoints = records.map((r, i) => `${getX(i)},${getY(r.systolic)}`).join(' ');
  const diaPoints = records.map((r, i) => `${getX(i)},${getY(r.diastolic)}`).join(' ');

  const y120 = getY(120);
  const y80 = getY(80);
  const y140 = getY(140);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Target Reference Zones */}
      {/* Normal Zone (80 - 120) */}
      <rect
        x={padding.left}
        y={y120}
        width={width - padding.left - padding.right}
        height={Math.max(0, y80 - y120)}
        fill="#10b981"
        fillOpacity="0.06"
      />

      {/* Threshold lines */}
      <line x1={padding.left} y1={y120} x2={width - padding.right} y2={y120} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x={width - padding.right + 4} y={y120 + 3} fill="#10b981" fontSize="9" opacity="0.8">120 (Target Sys)</text>

      <line x1={padding.left} y1={y80} x2={width - padding.right} y2={y80} stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x={width - padding.right + 4} y={y80 + 3} fill="#06b6d4" fontSize="9" opacity="0.8">80 (Target Dia)</text>

      <line x1={padding.left} y1={y140} x2={width - padding.right} y2={y140} stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
      <text x={width - padding.right + 4} y={y140 + 3} fill="#ef4444" fontSize="9" opacity="0.8">140 (Stg 2)</text>

      {/* Systolic Line */}
      <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={sysPoints} />
      {/* Diastolic Line */}
      <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={diaPoints} />

      {/* Data Points */}
      {records.map((r, i) => {
        const x = getX(i);
        const sysY = getY(r.systolic);
        const diaY = getY(r.diastolic);
        const dateStr = new Date(r.measuredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        return (
          <g key={r.id}>
            {/* Vertical connector line */}
            <line x1={x} y1={sysY} x2={x} y2={diaY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />

            {/* Systolic Point */}
            <circle cx={x} cy={sysY} r="4.5" fill="#f43f5e" stroke="#0f172a" strokeWidth="2" />
            <text x={x} y={sysY - 8} fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">
              {r.systolic}
            </text>

            {/* Diastolic Point */}
            <circle cx={x} cy={diaY} r="4.5" fill="#06b6d4" stroke="#0f172a" strokeWidth="2" />
            <text x={x} y={diaY + 16} fill="#67e8f9" fontSize="10" fontWeight="bold" textAnchor="middle">
              {r.diastolic}
            </text>

            {/* X-axis Label */}
            <text x={x} y={height - 10} fill="#64748b" fontSize="9" textAnchor="middle">
              {dateStr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
