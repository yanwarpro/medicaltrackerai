import React, { useState, useEffect } from 'react';
import {
  Loader2, X, CheckCircle, AlertTriangle, Edit2, XCircle,
  Sparkles, FlaskConical, Save
} from 'lucide-react';
import type { MedDocument, ExtractedLabItem, ExtractionResult } from '../../lib/types';
import { extractDocumentWithGemini } from '../../lib/gemini';
import { documentStorage, labResultStorage } from '../../lib/storage';
import { formatNumber, cn } from '../../lib/utils';
import { normalizeLabName } from '../../lib/checklist';

interface Props {
  doc: MedDocument;
  patientId: string;
  apiKey: string;
  onClose: () => void;
}

export default function ExtractionModal({ doc, patientId, apiKey, onClose }: Props) {
  const [step, setStep] = useState<'extracting' | 'review' | 'saving' | 'done' | 'error'>('extracting');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('');

  useEffect(() => {
    runExtraction();
  }, []);

  async function runExtraction() {
    setStep('extracting');
    try {
      documentStorage.update(doc.id, { status: 'processing' });
      let mimeType = doc.fileType;
      let imageData = doc.fileDataUrl || '';

      // For PDF, we need to handle differently - use base64 as is
      if (!imageData) throw new Error('Data file tidak ditemukan. Coba upload ulang dokumen.');
      if (!apiKey || !apiKey.trim()) {
        throw new Error('Google Gemini API Key belum dikonfigurasi. Silakan isi API Key gratis Anda di menu Pengaturan (/settings) untuk menjalankan ekstraksi otomatis AI.');
      }
      const extracted = await extractDocumentWithGemini(apiKey, imageData, mimeType, doc.id);
      setResult(extracted);
      documentStorage.update(doc.id, { status: 'extracted', ocrText: JSON.stringify(extracted) });
      setStep('review');
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan saat ekstraksi');
      documentStorage.update(doc.id, { status: 'failed' });
      setStep('error');
    }
  }

  function updateItem(id: string, updates: Partial<ExtractedLabItem>) {
    if (!result) return;
    setResult({
      ...result,
      labItems: result.labItems.map((item) => item.id === id ? { ...item, ...updates } : item),
    });
  }

  function startEdit(item: ExtractedLabItem) {
    setEditingId(item.id);
    setEditValue(item.value?.toString() || '');
    setEditUnit(item.unit);
  }

  function saveEdit(id: string) {
    const val = parseFloat(editValue);
    updateItem(id, {
      value: isNaN(val) ? null : val,
      unit: editUnit,
      action: 'edited',
    });
    setEditingId(null);
  }

  async function handleConfirmAll() {
    if (!result) return;
    setStep('saving');

    // Only save confirmed/edited items
    const toSave = result.labItems.filter((i) => i.action !== 'rejected' && i.value !== null);

    const docDate = result.identity.documentDate || doc.documentDate;

    await labResultStorage.saveBatch(
      toSave.map((item) => ({
        patientId,
        documentId: doc.id,
        testDate: docDate,
        testName: item.testName,
        normalizedName: normalizeLabName(item.normalizedName || item.testName),
        value: item.action === 'edited' && item.editedValue !== undefined ? item.editedValue : item.value,
        valueText: item.valueText,
        unit: item.action === 'edited' ? (item.editedUnit || item.unit) : item.unit,
        referenceLow: item.referenceLow,
        referenceHigh: item.referenceHigh,
        abnormalFlag: item.abnormalFlag,
        confidence: item.confidence,
        verified: item.action === 'confirmed' || item.action === 'edited',
      }))
    );

    documentStorage.update(doc.id, {
      status: 'confirmed',
      extractionConfidence: result.labItems.reduce((s, i) => s + i.confidence, 0) / result.labItems.length,
    });
    setStep('done');
  }

  const confirmedCount = result?.labItems.filter((i) => i.action === 'confirmed' || i.action === 'edited').length || 0;
  const totalCount = result?.labItems.length || 0;

  function getConfidenceColor(conf: number) {
    if (conf >= 0.9) return 'text-emerald-400';
    if (conf >= 0.7) return 'text-amber-400';
    return 'text-red-400';
  }

  return (
    <div className="modal-overlay">
      <div className="bg-bg-card border border-bg-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-card-hover">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Ekstraksi AI</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{doc.filename}</p>
            </div>
          </div>
          {step !== 'extracting' && (
            <button onClick={onClose} id="close-extraction-btn">
              <X size={18} className="text-slate-400 hover:text-white" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Extracting */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                <Loader2 size={28} className="text-accent-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Membaca dokumen...</p>
                <p className="text-slate-500 text-sm mt-1">Gemini AI sedang mengekstrak data lab</p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle size={28} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Ekstraksi Gagal</p>
                <p className="text-slate-400 text-sm mt-1 max-w-xs">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                {errorMsg.includes('Pengaturan') ? (
                  <a href="/settings" className="btn-primary" id="go-to-settings-btn">
                    Buka Pengaturan
                  </a>
                ) : (
                  <button onClick={runExtraction} id="retry-extraction-btn" className="btn-primary">Coba Lagi</button>
                )}
                <button onClick={onClose} id="close-error-btn" className="btn-secondary">Tutup</button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Berhasil Disimpan!</p>
                <p className="text-slate-400 text-sm mt-1">{confirmedCount} hasil lab telah disimpan ke database</p>
              </div>
              <button onClick={onClose} id="close-done-btn" className="btn-primary">Selesai</button>
            </div>
          )}

          {/* Saving */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 size={32} className="text-accent-400 animate-spin" />
              <p className="text-slate-400">Menyimpan data...</p>
            </div>
          )}

          {/* Review */}
          {step === 'review' && result && (
            <div className="space-y-5">
              {/* Identity */}
              {(result.identity.patientName || result.identity.facility || result.identity.doctor) && (
                <div className="bg-bg-primary rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Informasi Dokumen</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {result.identity.patientName && (
                      <div><span className="text-slate-500">Nama:</span> <span className="text-slate-300">{result.identity.patientName}</span></div>
                    )}
                    {result.identity.documentDate && (
                      <div><span className="text-slate-500">Tanggal:</span> <span className="text-slate-300">{result.identity.documentDate}</span></div>
                    )}
                    {result.identity.facility && (
                      <div><span className="text-slate-500">Fasilitas:</span> <span className="text-slate-300">{result.identity.facility}</span></div>
                    )}
                    {result.identity.doctor && (
                      <div><span className="text-slate-500">Dokter:</span> <span className="text-slate-300">{result.identity.doctor}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary Bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  <span className="text-white font-medium">{totalCount}</span> parameter ditemukan
                </span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => result.labItems.forEach((i) => updateItem(i.id, { action: 'confirmed' }))}
                    id="confirm-all-btn"
                    className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20"
                  >
                    Konfirmasi Semua
                  </button>
                  <button
                    onClick={() => result.labItems.forEach((i) => updateItem(i.id, { action: 'rejected' }))}
                    id="reject-all-btn"
                    className="px-2 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20"
                  >
                    Tolak Semua
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-border">
                      <th className="table-header pl-0">Parameter</th>
                      <th className="table-header text-right">Nilai</th>
                      <th className="table-header">Satuan</th>
                      <th className="table-header text-right">Conf.</th>
                      <th className="table-header text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.labItems.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          'table-row',
                          item.action === 'confirmed' && 'bg-emerald-500/5',
                          item.action === 'rejected' && 'bg-red-500/5 opacity-50',
                          item.action === 'edited' && 'bg-accent-500/5',
                        )}
                        id={`lab-row-${item.id}`}
                      >
                        <td className="table-cell pl-0">
                          <div className="font-medium text-white">{item.testName}</div>
                          <div className="text-xs text-slate-600">{item.normalizedName}</div>
                        </td>
                        <td className="table-cell text-right font-mono">
                          {editingId === item.id ? (
                            <input
                              type="number"
                              className="input-field w-20 text-right text-xs py-1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              id={`edit-value-${item.id}`}
                              autoFocus
                            />
                          ) : (
                            <span className={cn(
                              item.abnormalFlag === 'H' || item.abnormalFlag === 'HH' ? 'text-amber-400 font-bold' :
                              item.abnormalFlag === 'L' || item.abnormalFlag === 'LL' ? 'text-blue-400 font-bold' :
                              'text-white'
                            )}>
                              {item.value !== null ? formatNumber(item.value, 2) : '—'}
                              {item.abnormalFlag && item.abnormalFlag !== 'N' && (
                                <span className="ml-1 text-xs">({item.abnormalFlag})</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="table-cell">
                          {editingId === item.id ? (
                            <input
                              className="input-field w-16 text-xs py-1"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              id={`edit-unit-${item.id}`}
                            />
                          ) : (
                            <span className="text-slate-400 text-xs">{item.unit || '—'}</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <span className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </td>
                        <td className="table-cell">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => saveEdit(item.id)} id={`save-edit-${item.id}`} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10">
                                <Save size={13} />
                              </button>
                              <button onClick={() => setEditingId(null)} id={`cancel-edit-${item.id}`} className="p-1 rounded text-slate-400 hover:bg-bg-elevated">
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateItem(item.id, { action: item.action === 'confirmed' ? 'pending' : 'confirmed' })}
                                id={`confirm-${item.id}`}
                                className={cn('p-1 rounded transition-colors', item.action === 'confirmed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-emerald-400')}
                                title="Konfirmasi"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => startEdit(item)}
                                id={`edit-${item.id}`}
                                className="p-1 rounded text-slate-500 hover:text-accent-400 transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => updateItem(item.id, { action: item.action === 'rejected' ? 'pending' : 'rejected' })}
                                id={`reject-${item.id}`}
                                className={cn('p-1 rounded transition-colors', item.action === 'rejected' ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-red-400')}
                                title="Tolak"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalCount === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <FlaskConical size={32} className="mx-auto mb-2 text-slate-600" />
                  Tidak ada parameter lab yang ditemukan dalam dokumen ini
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Review step */}
        {step === 'review' && result && (
          <div className="border-t border-bg-border p-4 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500">
              {confirmedCount} dari {totalCount} dikonfirmasi
            </span>
            <div className="flex gap-3">
              <button onClick={onClose} id="skip-save-btn" className="btn-secondary text-xs">Lewati</button>
              <button
                onClick={handleConfirmAll}
                disabled={confirmedCount === 0}
                id="save-extraction-btn"
                className="btn-primary text-xs"
              >
                <Save size={13} />
                Simpan {confirmedCount} Hasil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
