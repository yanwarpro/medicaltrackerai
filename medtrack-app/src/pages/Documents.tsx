import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, FileText, Image, Trash2, Eye, X, Plus, AlertCircle,
  CheckCircle, Clock, Loader2, FlaskConical
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { documentStorage } from '../lib/storage';
import type { MedDocument, DocumentCategory, DocumentStatus } from '../lib/types';
import { formatDate, formatDateShort, fileToBase64, cn } from '../lib/utils';
import ExtractionModal from '../components/documents/ExtractionModal';

const CATEGORIES: DocumentCategory[] = [
  'Laboratory', 'Hospitalization', 'Prescription', 'Doctor Note',
  'Ultrasound', 'CT Scan', 'X-Ray', 'MRI', 'Procedure', 'Transfusion', 'Other'
];

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { label: string; cls: string }> = {
    uploaded: { label: 'Uploaded', cls: 'badge-gray' },
    processing: { label: 'Processing', cls: 'badge-yellow' },
    extracted: { label: 'Extracted', cls: 'badge-teal' },
    needs_review: { label: 'Perlu Review', cls: 'badge-yellow' },
    confirmed: { label: 'Confirmed', cls: 'badge-green' },
    failed: { label: 'Gagal', cls: 'badge-red' },
  };
  const { label, cls } = map[status] || map.uploaded;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Documents() {
  const { activePatient, settings } = useApp();
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: 'Laboratory' as DocumentCategory,
    facility: '',
    documentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [previewDoc, setPreviewDoc] = useState<MedDocument | null>(null);
  const [extractionDoc, setExtractionDoc] = useState<MedDocument | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const availableFacilities = useMemo(() => {
    if (!activePatient) return [];
    const all = documentStorage.getAll(activePatient.id);
    const set = new Set<string>();
    all.forEach((d) => {
      if (d.facility && d.facility.trim()) set.add(d.facility.trim());
    });
    return Array.from(set).sort();
  }, [activePatient, refreshKey]);

  const documents = useMemo(() => {
    if (!activePatient) return [];
    let all = documentStorage.getAll(activePatient.id);
    if (filterCategory !== 'all') {
      all = all.filter((d) => d.category === filterCategory);
    }
    if (filterFacility !== 'all') {
      all = all.filter((d) => d.facility === filterFacility);
    }
    return all.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [activePatient, filterCategory, filterFacility, refreshKey]);

  const handleFileDrop = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (valid.length === 0) { setError('Hanya file PDF, JPG, JPEG, atau PNG yang diizinkan.'); return; }
    setPendingFiles(valid);
    setShowUploadForm(true);
    setError('');
  }, []);

  async function handleUpload() {
    if (!activePatient || pendingFiles.length === 0) return;
    if (!uploadForm.documentDate) { setError('Tanggal dokumen wajib diisi'); return; }
    setUploading(true);
    setError('');
    try {
      for (const file of pendingFiles) {
        const base64 = await fileToBase64(file);
        documentStorage.save({
          patientId: activePatient.id,
          filename: file.name,
          category: uploadForm.category,
          facility: uploadForm.facility.trim() || undefined,
          documentDate: uploadForm.documentDate,
          uploadDate: new Date().toISOString(),
          fileDataUrl: base64,
          fileType: file.type,
          status: 'uploaded',
          notes: uploadForm.notes,
        });
      }
      setPendingFiles([]);
      setShowUploadForm(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError('Gagal mengupload file. Coba lagi.');
    } finally {
      setUploading(false);
    }
  }

  function deleteDoc(id: string) {
    if (!confirm('Hapus dokumen ini?')) return;
    documentStorage.delete(id);
    setRefreshKey((k) => k + 1);
  }

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Pilih pasien terlebih dahulu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dokumen Medis</h1>
          <p className="text-slate-400 text-sm mt-1">{documents.length} dokumen tersimpan</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} id="upload-doc-btn" className="btn-primary">
          <Upload size={15} />
          Upload Dokumen
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        id="file-input"
        onChange={(e) => handleFileDrop(e.target.files)}
      />

      {/* Upload Form */}
      {showUploadForm && (
        <div className="glass-card p-5 space-y-4 border border-accent-500/30">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Upload {pendingFiles.length} File</h3>
            <button onClick={() => { setShowUploadForm(false); setPendingFiles([]); }} id="cancel-upload-btn">
              <X size={18} className="text-slate-400 hover:text-white" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, i) => (
              <span key={i} className="badge-teal text-xs flex items-center gap-1">
                <FileText size={11} />
                {f.name}
              </span>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Kategori Dokumen</label>
              <select
                className="input-field"
                value={uploadForm.category}
                onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value as DocumentCategory }))}
                id="upload-category-select"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Fasilitas / RS (Opsional)</label>
              <input
                className="input-field"
                value={uploadForm.facility}
                onChange={(e) => setUploadForm((f) => ({ ...f, facility: e.target.value }))}
                placeholder="RSUP Dr. Hasan Sadikin, Prodia..."
                id="upload-facility-input"
              />
            </div>
            <div>
              <label className="label-text">Tanggal Dokumen *</label>
              <input
                type="date"
                className="input-field"
                value={uploadForm.documentDate}
                onChange={(e) => setUploadForm((f) => ({ ...f, documentDate: e.target.value }))}
                id="upload-date-input"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Catatan</label>
            <input
              className="input-field"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Catatan opsional..."
              id="upload-notes-input"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleUpload} disabled={uploading} id="confirm-upload-btn" className="btn-primary">
              {uploading ? <><Loader2 size={15} className="animate-spin" /> Mengupload...</> : <><Upload size={15} /> Upload</>}
            </button>
          </div>
        </div>
      )}

      {/* Drag Drop Zone */}
      {!showUploadForm && (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
            'border-bg-border hover:border-accent-500/50 hover:bg-accent-500/5'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
          id="drop-zone"
        >
          <Upload size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Drag & drop atau klik untuk upload</p>
          <p className="text-slate-600 text-xs mt-1">PDF, JPG, JPEG, PNG</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-500 font-medium">Kategori:</span>
          {(['all', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              id={`filter-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterCategory === cat
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'bg-bg-elevated text-slate-400 border border-bg-border hover:border-accent-500/30'
              )}
            >
              {cat === 'all' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        {availableFacilities.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center pt-1">
            <span className="text-xs text-slate-500 font-medium">Fasilitas Medis:</span>
            <button
              onClick={() => setFilterFacility('all')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all border',
                filterFacility === 'all'
                  ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                  : 'bg-bg-elevated text-slate-400 border-bg-border'
              )}
            >
              Semua RS / Lab
            </button>
            {availableFacilities.map((fac) => (
              <button
                key={fac}
                onClick={() => setFilterFacility(fac)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all border',
                  filterFacility === fac
                    ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                    : 'bg-bg-elevated text-slate-400 border-bg-border'
                )}
              >
                🏥 {fac}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada dokumen dalam kriteria ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card p-4 space-y-3 hover:border-bg-border/80 transition-all group" id={`doc-card-${doc.id}`}>
              {/* Preview Thumbnail */}
              <div className="w-full h-32 rounded-lg bg-bg-primary flex items-center justify-center overflow-hidden border border-bg-border">
                {doc.fileType?.startsWith('image/') && doc.fileDataUrl ? (
                  <img src={doc.fileDataUrl} alt={doc.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={32} className="text-accent-400/60" />
                    <span className="text-xs text-slate-600">PDF</span>
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-white truncate" title={doc.filename}>{doc.filename}</div>
                <div className="text-xs text-slate-500 mt-0.5">{formatDateShort(doc.documentDate)}</div>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="badge badge-teal text-xs">{doc.category}</span>
                {doc.facility && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-accent-500/10 text-accent-400 border border-accent-500/20 truncate max-w-[140px]" title={doc.facility}>
                    🏥 {doc.facility}
                  </span>
                )}
                <StatusBadge status={doc.status} />
              </div>
              {doc.notes && <p className="text-xs text-slate-500 truncate">{doc.notes}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  id={`preview-doc-${doc.id}`}
                  className="btn-ghost flex-1 text-xs py-1.5 justify-center"
                >
                  <Eye size={13} /> Preview
                </button>
                {doc.status !== 'confirmed' && (
                  <button
                    onClick={() => setExtractionDoc(doc)}
                    id={`extract-doc-${doc.id}`}
                    className="btn-secondary flex-1 text-xs py-1.5 justify-center"
                  >
                    <FlaskConical size={13} /> Ekstrak AI
                  </button>
                )}
                {doc.status === 'confirmed' && (
                  <span className="flex-1 flex items-center justify-center gap-1 text-xs text-emerald-400 py-1.5">
                    <CheckCircle size={13} /> Confirmed
                  </span>
                )}
                <button onClick={() => deleteDoc(doc.id)} id={`delete-doc-${doc.id}`} className="btn-ghost px-2 text-red-400/60 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-bg-border">
              <div>
                <h3 className="text-sm font-medium text-white truncate">{previewDoc.filename}</h3>
                <p className="text-xs text-slate-500">{previewDoc.category} · {formatDate(previewDoc.documentDate)}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} id="close-preview-btn">
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="p-4">
              {previewDoc.fileType?.startsWith('image/') && previewDoc.fileDataUrl ? (
                <img src={previewDoc.fileDataUrl} alt={previewDoc.filename} className="w-full rounded-lg" />
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="text-accent-400 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Preview PDF tidak tersedia di browser</p>
                  <p className="text-slate-600 text-xs mt-1">Gunakan tombol "Ekstrak AI" untuk mengolah isi dokumen</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extraction Modal */}
      {extractionDoc && (
        <ExtractionModal
          doc={extractionDoc}
          patientId={activePatient.id}
          apiKey={settings.geminiApiKey}
          onClose={() => { setExtractionDoc(null); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
