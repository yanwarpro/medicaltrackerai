import React, { useState, useMemo } from 'react';
import { Search, FlaskConical, FileText, Hospital, Droplets } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  labResultStorage, documentStorage, hospitalizationStorage, transfusionStorage
} from '../lib/storage';
import { formatDateShort, formatNumber, cn } from '../lib/utils';

export default function GlobalSearch() {
  const { activePatient } = useApp();
  const [query, setQuery] = useState('');

  const allData = useMemo(() => {
    if (!activePatient || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const results: Array<{ type: string; title: string; subtitle: string; date: string; id: string }> = [];

    // Lab results
    labResultStorage.getAll(activePatient.id)
      .filter((r) => r.testName.toLowerCase().includes(q) || (r.value?.toString() || '').includes(q))
      .forEach((r) => results.push({
        type: 'lab', id: r.id,
        title: `${r.testName}: ${formatNumber(r.value)} ${r.unit}`,
        subtitle: r.abnormalFlag && r.abnormalFlag !== 'N' ? `⚠ ${r.abnormalFlag}` : 'Normal',
        date: r.testDate,
      }));

    // Documents
    documentStorage.getAll(activePatient.id)
      .filter((d) => d.filename.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.notes?.toLowerCase().includes(q))
      .forEach((d) => results.push({
        type: 'document', id: d.id,
        title: d.filename,
        subtitle: d.category,
        date: d.documentDate,
      }));

    // Hospitalizations
    hospitalizationStorage.getAll(activePatient.id)
      .filter((h) => h.hospital.toLowerCase().includes(q) || h.reason.toLowerCase().includes(q) || h.doctorDiagnosis.toLowerCase().includes(q))
      .forEach((h) => results.push({
        type: 'hospitalization', id: h.id,
        title: `Rawat Inap: ${h.hospital}`,
        subtitle: h.reason,
        date: h.admissionDate,
      }));

    // Transfusions
    transfusionStorage.getAll(activePatient.id)
      .filter((t) => t.productType.toLowerCase().includes(q) || t.hospital.toLowerCase().includes(q) || t.indication.toLowerCase().includes(q))
      .forEach((t) => results.push({
        type: 'transfusion', id: t.id,
        title: `Transfusi ${t.productType} (${t.units} unit)`,
        subtitle: t.hospital,
        date: t.transfusionDate,
      }));

    return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [activePatient, query]);

  const typeConfig: Record<string, { icon: React.FC<any>; color: string }> = {
    lab: { icon: FlaskConical, color: 'text-accent-400' },
    document: { icon: FileText, color: 'text-slate-400' },
    hospitalization: { icon: Hospital, color: 'text-amber-400' },
    transfusion: { icon: Droplets, color: 'text-red-400' },
  };

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div>
        <h1 className="text-2xl font-bold text-white">Pencarian</h1>
        <p className="text-slate-400 text-sm mt-1">Cari seluruh rekam medis</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input-field pl-12 text-base py-4"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Cari "ferritin", "transfusi", "creatinine", "opname"...'
          id="global-search-input"
          autoFocus
        />
      </div>

      {/* Results */}
      {query.length >= 2 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{allData.length} hasil ditemukan</p>
          {allData.length === 0 ? (
            <div className="text-center py-12">
              <Search size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Tidak ada hasil untuk "{query}"</p>
            </div>
          ) : (
            allData.map((item) => {
              const { icon: Icon, color } = typeConfig[item.type] || typeConfig.document;
              return (
                <div key={`${item.type}-${item.id}`} className="glass-card p-4 flex items-center gap-3 hover:border-bg-border/80 transition-all" id={`search-result-${item.type}-${item.id}`}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-primary')}>
                    <Icon size={15} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-slate-500">{item.subtitle}</div>
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0">{formatDateShort(item.date)}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {query.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Search size={48} className="text-slate-700 mx-auto" />
          <p className="text-slate-500">Ketik minimal 2 karakter untuk mulai mencari</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['ferritin', 'transfusi', 'Hb', 'creatinine', 'opname'].map((ex) => (
              <button
                key={ex}
                onClick={() => setQuery(ex)}
                id={`search-example-${ex}`}
                className="px-3 py-1.5 rounded-lg text-xs bg-bg-elevated border border-bg-border text-slate-400 hover:text-accent-400 hover:border-accent-500/30"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
