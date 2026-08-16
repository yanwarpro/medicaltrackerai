import { useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { labResultStorage } from '../lib/storage';
import { CHECKLIST_ITEMS, CHECKLIST_CATEGORIES } from '../lib/checklist';
import { formatDateShort, cn } from '../lib/utils';

const STATUS_CONFIG = {
  available: { label: 'Tersedia', icon: CheckCircle, cls: 'text-emerald-500', badge: 'badge-green' },
  missing: { label: 'Belum ditemukan', icon: XCircle, cls: 'text-slate-400', badge: 'badge-gray' },
  outdated: { label: 'Sudah lama', icon: Clock, cls: 'text-amber-500', badge: 'badge-yellow' },
  needs_review: { label: 'Perlu review', icon: AlertTriangle, cls: 'text-amber-500', badge: 'badge-yellow' },
};

export default function Checklist() {
  const { activePatient } = useApp();

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  // Compute status for each checklist item
  const itemStatuses = useMemo(() => {
    const result: Record<string, { status: 'available' | 'missing' | 'outdated'; lastDate?: string }> = {};

    CHECKLIST_ITEMS.forEach((item) => {
      const matches = labResults.filter((r) => r.normalizedName === item.normalizedName);
      if (matches.length === 0) {
        result[item.id] = { status: 'missing' };
      } else {
        const latest = matches.sort((a, b) => b.testDate.localeCompare(a.testDate))[0];
        const daysSince = (new Date().getTime() - new Date(latest.testDate).getTime()) / (1000 * 60 * 60 * 24);
        result[item.id] = {
          status: daysSince > 180 ? 'outdated' : 'available',
          lastDate: latest.testDate,
        };
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
        <p className="text-slate-500">Pilih pasien terlebih dahulu</p>
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

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300">
        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Checklist ini hanya menunjukkan pemeriksaan yang <strong>ditemukan dalam dokumen yang diunggah</strong>, bukan rekomendasi medis.
          "Belum ditemukan" bukan berarti pemeriksaan harus dilakukan — konsultasikan selalu dengan dokter.
        </p>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categoryStats.map(({ cat, total, available }) => (
          <div key={cat} className="glass-card p-4" id={`checklist-cat-${cat.toLowerCase()}`}>
            <div className="text-sm font-semibold text-white mb-3">{cat}</div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-2xl font-bold text-white">{available}</span>
              <span className="text-slate-500 text-sm font-medium">/ {total}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-bg-primary rounded-full h-1.5">
              <div
                className="bg-gradient-accent h-1.5 rounded-full"
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
            <div key={cat} className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-bg-border bg-slate-100 dark:bg-bg-primary/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-accent-500" />
                  <span className="text-sm font-bold text-white">{cat} Workup</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {items.filter((i) => itemStatuses[i.id]?.status === 'available').length} / {items.length} tersedia
                </span>
              </div>
              <div className="divide-y divide-bg-border/50">
                {items.map((item) => {
                  const statusData = itemStatuses[item.id] || { status: 'missing' as const };
                  const config = STATUS_CONFIG[statusData.status];
                  const Icon = config.icon;
                  return (
                    <div key={item.id} className={cn('flex items-center gap-4 px-5 py-3 transition-colors', statusData.status === 'available' && 'bg-emerald-500/5')} id={`checklist-item-${item.id}`}>
                      <Icon size={16} className={config.cls} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium', statusData.status === 'available' ? 'text-white font-semibold' : 'text-slate-500')}>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500">{item.description}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`badge text-xs ${config.badge}`}>{config.label}</span>
                        {statusData.lastDate && (
                          <div className="text-xs font-medium text-slate-500 mt-1">{formatDateShort(statusData.lastDate)}</div>
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
