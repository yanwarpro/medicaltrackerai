import { useMemo } from 'react';
import { AlertTriangle, ClipboardList, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { labResultStorage } from '../lib/storage';
import { CHECKLIST_ITEMS, CHECKLIST_CATEGORIES } from '../lib/checklist';
import { formatDateShort, cn } from '../lib/utils';

const STATUS_CONFIG = {
  available: {
    label: 'Tersedia',
    badge: 'badge-green',
    icon: CheckCircle,
    cls: 'text-emerald-400',
  },
  missing: {
    label: 'Belum ditemukan',
    badge: 'badge-gray',
    icon: XCircle,
    cls: 'text-slate-500',
  },
  unknown: {
    label: 'Tidak ada data',
    badge: 'badge-gray',
    icon: HelpCircle,
    cls: 'text-slate-500',
  },
};

export default function Checklist() {
  const { activePatient } = useApp();

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id) : [],
    [activePatient]
  );

  const itemStatuses = useMemo(() => {
    const result: Record<string, { status: 'available' | 'missing'; lastDate?: string }> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      const match = labResults.find((r) => r.normalizedName === item.normalizedName);
      if (match) {
        result[item.id] = { status: 'available', lastDate: match.testDate };
      } else {
        result[item.id] = { status: 'missing' };
      }
    });
    return result;
  }, [labResults]);

  const categoryStats = useMemo(() => {
    return CHECKLIST_CATEGORIES.map((cat) => {
      const items = CHECKLIST_ITEMS.filter((i) => i.category === cat);
      const available = items.filter((i) => itemStatuses[i.id]?.status === 'available').length;
      return { cat, total: items.length, available };
    });
  }, [itemStatuses]);

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div>
        <h1 className="text-2xl font-bold text-white">Checklist Pemeriksaan</h1>
        <p className="text-slate-400 text-sm mt-1">
          Status pemeriksaan yang ditemukan dalam dokumen yang diunggah
        </p>
      </div>

      {/* Disclaimer Alert Box */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Checklist ini hanya menunjukkan pemeriksaan yang <strong>ditemukan dalam dokumen yang diunggah</strong>, bukan rekomendasi medis.
          "Belum ditemukan" bukan berarti pemeriksaan harus dilakukan — konsultasikan selalu dengan dokter.
        </p>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categoryStats.map(({ cat, total, available }) => (
          <div key={cat} className="glass-card p-4 border border-bg-border" id={`checklist-cat-${cat.toLowerCase()}`}>
            <div className="text-xs text-slate-400 font-medium">{cat}</div>
            <div className="text-2xl font-bold text-white mt-1">
              {available} <span className="text-sm font-normal text-slate-500">/ {total}</span>
            </div>
            <div className="w-full bg-bg-primary h-1.5 rounded-full mt-2 overflow-hidden border border-bg-border">
              <div
                className="bg-accent-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(available / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Checklist per Category */}
      <div className="space-y-6">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const items = CHECKLIST_ITEMS.filter((i) => i.category === cat);
          return (
            <div key={cat} className="glass-card overflow-hidden border border-bg-border">
              {/* Category Header Banner */}
              <div className="px-5 py-3 border-b border-bg-border bg-bg-elevated flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-accent-400" />
                  <span className="text-sm font-bold text-white">{cat} Workup</span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {items.filter((i) => itemStatuses[i.id]?.status === 'available').length} / {items.length} tersedia
                </span>
              </div>
              <div className="divide-y divide-bg-border/60">
                {items.map((item) => {
                  const statusData = itemStatuses[item.id] || { status: 'missing' as const };
                  const config = STATUS_CONFIG[statusData.status];
                  const Icon = config.icon;
                  return (
                    <div key={item.id} className={cn('flex items-center gap-4 px-5 py-3 transition-colors hover:bg-bg-elevated/30', statusData.status === 'available' && 'bg-emerald-500/5')} id={`checklist-item-${item.id}`}>
                      <Icon size={16} className={config.cls} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium', statusData.status === 'available' ? 'text-white font-semibold' : 'text-slate-300')}>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`badge text-xs font-semibold ${config.badge}`}>{config.label}</span>
                        {statusData.lastDate && (
                          <div className="text-xs font-medium text-slate-400 mt-1">{formatDateShort(statusData.lastDate)}</div>
                        )}
                        {statusData.status === 'missing' && (
                          <div className="text-xs text-slate-400 mt-1 italic max-w-32 text-right">
                            Belum ditemukan dalam dokumen
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
