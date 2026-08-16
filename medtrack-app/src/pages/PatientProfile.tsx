import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, Plus, X, AlertTriangle, Trash2, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { patientStorage } from '../lib/storage';
import type { Gender, BloodType } from '../lib/types';
import { formatDate, calcAge } from '../lib/utils';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

interface TagInputProps {
  label: string;
  items: string[];
  inputVal: string;
  inputKey: 'allergyInput' | 'medicalHistoryInput' | 'surgicalHistoryInput';
  field: 'allergies' | 'medicalHistory' | 'surgicalHistory';
  isEditing: boolean;
  onInputChange: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
}

function TagInput({
  label,
  items,
  inputVal,
  inputKey,
  field,
  isEditing,
  onInputChange,
  onAddTag,
  onRemoveTag,
}: TagInputProps) {
  return (
    <div className="space-y-2">
      <label className="label-text">{label}</label>
      {isEditing && (
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={inputVal}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
            placeholder="Ketik dan Enter"
            id={`input-${inputKey}`}
          />
          <button type="button" onClick={onAddTag} className="btn-secondary px-3">
            <Plus size={15} />
          </button>
        </div>
      )}
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className={`badge ${field === 'allergies' ? 'badge-yellow' : 'badge-teal'} gap-1.5`}>
              {field === 'allergies' && <AlertTriangle size={10} />}
              {item}
              {isEditing && (
                <button type="button" onClick={() => onRemoveTag(i)} className="hover:text-red-400 ml-0.5" id={`remove-${field}-${i}`}>
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : !isEditing && (
        <span className="text-slate-500 text-xs italic">Tidak ada</span>
      )}
    </div>
  );
}

export default function PatientProfile() {
  const { activePatient, patients, refreshPatients, setActivePatient } = useApp();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(!activePatient);
  const [isCreating, setIsCreating] = useState(!activePatient);

  const emptyForm = {
    fullName: '', nickname: '', gender: 'female' as Gender,
    dateOfBirth: '', bloodType: 'unknown' as BloodType,
    height: '', weight: '', generalNotes: '',
    allergyInput: '', allergies: [] as string[],
    medicalHistoryInput: '', medicalHistory: [] as string[],
    surgicalHistoryInput: '', surgicalHistory: [] as string[],
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activePatient && !isCreating) {
      setForm({
        ...emptyForm,
        fullName: activePatient.fullName,
        nickname: activePatient.nickname || '',
        gender: activePatient.gender,
        dateOfBirth: activePatient.dateOfBirth,
        bloodType: activePatient.bloodType,
        height: activePatient.height?.toString() || '',
        weight: activePatient.weight?.toString() || '',
        generalNotes: activePatient.generalNotes,
        allergies: [...activePatient.allergies],
        medicalHistory: [...activePatient.medicalHistory],
        surgicalHistory: [...activePatient.surgicalHistory],
      });
    }
  }, [activePatient, isCreating]);

  function addTag(field: 'allergies' | 'medicalHistory' | 'surgicalHistory', inputField: 'allergyInput' | 'medicalHistoryInput' | 'surgicalHistoryInput') {
    const val = form[inputField].trim();
    if (!val) return;
    setForm((f) => ({ ...f, [field]: [...f[field], val], [inputField]: '' }));
  }

  function removeTag(field: 'allergies' | 'medicalHistory' | 'surgicalHistory', index: number) {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.fullName.trim()) { setError('Nama lengkap wajib diisi'); return; }
    if (!form.dateOfBirth) { setError('Tanggal lahir wajib diisi'); return; }
    setSaving(true);
    setError('');
    try {
      const data = {
        fullName: form.fullName.trim(),
        nickname: form.nickname.trim() || undefined,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bloodType: form.bloodType,
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        generalNotes: form.generalNotes,
        allergies: form.allergies,
        medicalHistory: form.medicalHistory,
        surgicalHistory: form.surgicalHistory,
      };
      if (isCreating || !activePatient) {
        const saved = patientStorage.save(data as any);
        refreshPatients();
        setActivePatient(saved.id);
        setIsCreating(false);
        setIsEditing(false);
        navigate('/');
      } else {
        patientStorage.update(activePatient.id, data);
        refreshPatients();
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!activePatient) return;
    const confirmName = activePatient.nickname || activePatient.fullName;
    if (confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus profil pasien "${confirmName}" beserta seluruh rekam medisnya?`)) {
      patientStorage.delete(activePatient.id);
      refreshPatients();
      const remaining = patients.filter((p) => p.id !== activePatient.id);
      if (remaining.length > 0) {
        setActivePatient(remaining[0].id);
        setIsEditing(false);
        setIsCreating(false);
      } else {
        setIsCreating(true);
        setIsEditing(true);
        setForm(emptyForm);
      }
    }
  }

  // List of patients for switcher
  const showSwitcher = !isCreating && patients.length > 0;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isCreating ? 'Buat Profil Pasien' : 'Profil Pasien'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isCreating ? 'Isi data pasien untuk memulai' : 'Data pribadi, alergi, dan riwayat medis'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCreating && !isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} id="edit-patient-btn" className="btn-secondary">
                <Edit2 size={14} />
                Edit Profil
              </button>

              <button onClick={handleDelete} id="delete-patient-btn" className="btn-danger">
                <Trash2 size={14} />
                Hapus
              </button>
            </>
          )}
          {!isCreating && (
            <button
              onClick={() => { setIsCreating(true); setIsEditing(true); setForm(emptyForm); }}
              id="add-new-patient-btn"
              className="btn-primary"
            >
              <Plus size={15} />
              Pasien Baru
            </button>
          )}
        </div>
      </div>

      {/* Patient Switcher Tabs */}
      {showSwitcher && (
        <div className="flex gap-2 border-b border-bg-border pb-3 overflow-x-auto">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActivePatient(p.id); setIsEditing(false); }}
              id={`switch-patient-${p.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePatient?.id === p.id
                  ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30'
                  : 'bg-bg-elevated text-slate-400 hover:text-white'
              }`}
            >
              <User size={12} />
              {p.nickname || p.fullName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Read-Only Profile View */}
      {!isEditing && activePatient && (
        <div className="space-y-6">
          <div className="glass-card p-6 flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-teal flex items-center justify-center flex-shrink-0 text-white shadow-glow-teal">
              <User size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white">{activePatient.fullName}</h2>
                {activePatient.nickname && (
                  <span className="text-accent-400 text-sm font-medium">"{activePatient.nickname}"</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <span>{calcAge(activePatient.dateOfBirth)} tahun</span>
                <span>•</span>
                <span>{activePatient.gender === 'female' ? 'Perempuan' : activePatient.gender === 'male' ? 'Laki-laki' : 'Lainnya'}</span>
                <span>•</span>
                <span>Lahir: {formatDate(activePatient.dateOfBirth)}</span>
                <span>•</span>
                <span>Gol. Darah: <strong className="text-white">{activePatient.bloodType === 'unknown' ? 'Tidak diketahui' : activePatient.bloodType}</strong></span>
              </div>
              {(activePatient.height || activePatient.weight) && (
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  {activePatient.height && <span>TB: <strong className="text-white">{activePatient.height} cm</strong></span>}
                  {activePatient.weight && <span>BB: <strong className="text-white">{activePatient.weight} kg</strong></span>}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <TagInput
              label="Alergi Obat / Makanan"
              items={activePatient.allergies}
              inputVal={form.allergyInput}
              inputKey="allergyInput"
              field="allergies"
              isEditing={false}
              onInputChange={() => {}}
              onAddTag={() => {}}
              onRemoveTag={() => {}}
            />
            <TagInput
              label="Riwayat Penyakit Dahulu"
              items={activePatient.medicalHistory}
              inputVal={form.medicalHistoryInput}
              inputKey="medicalHistoryInput"
              field="medicalHistory"
              isEditing={false}
              onInputChange={() => {}}
              onAddTag={() => {}}
              onRemoveTag={() => {}}
            />
            <TagInput
              label="Riwayat Operasi / Tindakan"
              items={activePatient.surgicalHistory}
              inputVal={form.surgicalHistoryInput}
              inputKey="surgicalHistoryInput"
              field="surgicalHistory"
              isEditing={false}
              onInputChange={() => {}}
              onAddTag={() => {}}
              onRemoveTag={() => {}}
            />
            {activePatient.generalNotes && (
              <div>
                <label className="label-text">Catatan Umum</label>
                <p className="text-sm text-slate-300 bg-bg-primary/50 p-3 rounded-lg border border-bg-border/50">
                  {activePatient.generalNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit / Create Profile Form */}
      {isEditing && (
        <div className="glass-card p-6 space-y-5">
          <h3 className="section-title">
            {isCreating ? 'Data Pasien Baru' : 'Edit Profil Pasien'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label-text">Nama Lengkap Pasien *</label>
              <input
                className="input-field"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="contoh: Siti Rahayu Supriadi"
                id="input-fullname"
              />
            </div>
            <div>
              <label className="label-text">Nama Panggilan</label>
              <input
                className="input-field"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="Panggilan (opsional)"
                id="input-nickname"
              />
            </div>
            <div>
              <label className="label-text">Tanggal Lahir *</label>
              <input
                type="date"
                className="input-field"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                id="input-dob"
              />
            </div>
            <div>
              <label className="label-text">Jenis Kelamin</label>
              <select
                className="input-field"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
                id="input-gender"
              >
                <option value="female">Perempuan</option>
                <option value="male">Laki-laki</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="label-text">Golongan Darah</label>
              <select
                className="input-field"
                value={form.bloodType}
                onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value as BloodType }))}
                id="input-bloodtype"
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt === 'unknown' ? 'Tidak diketahui' : bt}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Tinggi (cm)</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.height}
                  onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                  placeholder="170"
                  id="input-height"
                />
              </div>
              <div>
                <label className="label-text">Berat (kg)</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  placeholder="60"
                  id="input-weight"
                />
              </div>
            </div>
          </div>

          <TagInput
            label="Alergi"
            items={form.allergies}
            inputVal={form.allergyInput}
            inputKey="allergyInput"
            field="allergies"
            isEditing={true}
            onInputChange={(val) => setForm((f) => ({ ...f, allergyInput: val }))}
            onAddTag={() => addTag('allergies', 'allergyInput')}
            onRemoveTag={(idx) => removeTag('allergies', idx)}
          />

          <TagInput
            label="Riwayat Penyakit"
            items={form.medicalHistory}
            inputVal={form.medicalHistoryInput}
            inputKey="medicalHistoryInput"
            field="medicalHistory"
            isEditing={true}
            onInputChange={(val) => setForm((f) => ({ ...f, medicalHistoryInput: val }))}
            onAddTag={() => addTag('medicalHistory', 'medicalHistoryInput')}
            onRemoveTag={(idx) => removeTag('medicalHistory', idx)}
          />

          <TagInput
            label="Riwayat Operasi"
            items={form.surgicalHistory}
            inputVal={form.surgicalHistoryInput}
            inputKey="surgicalHistoryInput"
            field="surgicalHistory"
            isEditing={true}
            onInputChange={(val) => setForm((f) => ({ ...f, surgicalHistoryInput: val }))}
            onAddTag={() => addTag('surgicalHistory', 'surgicalHistoryInput')}
            onRemoveTag={(idx) => removeTag('surgicalHistory', idx)}
          />

          <div>
            <label className="label-text">Catatan Umum</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={form.generalNotes}
              onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))}
              placeholder="Catatan tambahan..."
              id="input-notes"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-bg-border">
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} id="save-patient-btn" className="btn-primary">
                <Save size={15} />
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              {!isCreating && (
                <button onClick={() => setIsEditing(false)} id="cancel-edit-btn" className="btn-secondary">
                  Batal
                </button>
              )}
            </div>

            {!isCreating && activePatient && (
              <button onClick={handleDelete} id="delete-patient-form-btn" className="btn-danger text-xs">
                <Trash2 size={13} />
                Hapus Pasien Ini
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
