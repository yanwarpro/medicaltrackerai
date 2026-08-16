import React, { useMemo, useState } from 'react';
import { Activity, FlaskConical, Hospital, Droplets, FileText, Pill, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  labResultStorage, documentStorage, hospitalizationStorage,
  transfusionStorage, medicationStorage
} from '../lib/storage';
import { formatDate, formatDateShort, formatNumber, cn } from '../lib/utils';
import type { TimelineEventType } from '../lib/types';

const TYPE_COLORS: Record<string, string> = {
  lab: 'bg-accent-500',
  hospitalization: 'bg-amber-500',
  transfusion: 'bg-red-500',
  document: 'bg-slate-500',
  medication: 'bg-emerald-500',
  consultation: 'bg-purple-500',
  procedure: 'bg-pink-500',
};

const TYPE_LABELS: Record<string, string> = {
  lab: 'Hasil Lab',
  hospitalization: 'Rawat Inap',
  transfusion: 'Transfusi',
  document: 'Dokumen',
  medication: 'Obat',
  all: 'Semua',
};

const TYPE_ICONS: Record<string, React.FC<any>> = {
  lab: FlaskConical,
  hospitalization: Hospital,
  transfusion: Droplets,
  document: FileText,
  medication: Pill,
};

export default function Timeline() {
  const { activePatient } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const events = useMemo(() => {
    if (!activePatient) return [];
    const all: Array<{ date: string; type: string; title: string; description: string; id: string }> = [];

    // Lab results - group by date
    const labByDate: Record<string, typeof labDates[string]> = {};
    const labDates: Record<string, ReturnType<typeof labResultStorage.getAll>> = {};
    labResultStorage.getAll(activePatient.id).filter((r) => r.verified).forEach((r) => {
      if (!labDates[r.testDate]) labDates[r.testDate] = [];
      labDates[r.testDate].push(r);
    });
    Object.entries(labDates).forEach(([date, results]) => {
      const hb = results.find((r) => r.normalizedName === 'hemoglobin');
      all.push({
        id: `lab-${date}`,
        date,
        type: 'lab',
        title: 'Pemeriksaan Laboratorium',
        description: `${results.length} parameter · ${hb ? `Hb: ${formatNumber(hb.value, 1)} ${hb.unit}` : ''}`,
      });
    });

    // Hospitalizations
    hospitalizationStorage.getAll(activePatient.id).forEach((h) => {
      all.push({
        id: `hosp-${h.id}`,
        date: h.admissionDate,
        type: 'hospitalization',
        title: `Rawat Inap: ${h.hospital}`,
        description: h.reason + (h.dischargeDate ? ` · Keluar: ${formatDateShort(h.dischargeDate)}` : ' · Masih dirawat'),
      });
    });

    // Transfusions
    transfusionStorage.getAll(activePatient.id).forEach((t) => {
      all.push({
        id: `trans-${t.id}`,
        date: t.transfusionDate,
        type: 'transfusion',
        title: `Transfusi ${t.productType}`,
        description: `${t.units} unit · ${t.hospital}${t.hbBefore ? ` · Hb: ${t.hbBefore} → ${t.hbAfter || '?'}` : ''}`,
      });
    });

    // Documents
    documentStorage.getAll(activePatient.id).forEach((d) => {
      if (d.category === 'Laboratory') return; // already covered by lab
      all.push({
        id: `doc-${d.id}`,
        date: d.documentDate,
        type: 'document',
        title: d.category,
        description: d.filename,
      });
    });

    // Medications (start dates)
    medicationStorage.getAll(activePatient.id).forEach((m) => {
      all.push({
        id: `med-${m.id}`,
        date: m.startDate,
        type: 'medication',
        title: `Mulai Obat: ${m.medicationName}`,
        description: `${m.dosage} · ${m.frequency}`,
      });
    });

    return all
      .filter((e) => filter === 'all' || e.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activePatient, filter]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, typeof events> = {};
    events.forEach((e) => {
      const month = e.date.slice(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

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
          <h1 className="text-2xl font-bold text-white">Timeline Medis</h1>
          <p className="text-slate-400 text-sm mt-1">Kronologi seluruh riwayat medis</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Filter size={14} />
          <span className="text-xs">Filter</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            id={`timeline-filter-${key}`}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === key
                ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                : 'bg-bg-elevated text-slate-400 border-bg-border hover:border-accent-500/30'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada data timeline. Upload dokumen atau tambahkan data pasien.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, monthEvents]) => {
            const [year, m] = month.split('-');
            const monthName = new Date(parseInt(year), parseInt(m) - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            return (
              <div key={month}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-bg-border" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{monthName}</span>
                  <div className="h-px flex-1 bg-bg-border" />
                </div>
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-bg-border" />
                  <div className="space-y-4">
                    {monthEvents.map((event) => {
                      const Icon = TYPE_ICONS[event.type] || Activity;
                      return (
                        <div key={event.id} className="relative" id={`timeline-${event.id}`}>
                          {/* Dot */}
                          <div className={cn('absolute -left-4 w-3 h-3 rounded-full border-2 border-bg-primary top-2', TYPE_COLORS[event.type] || 'bg-slate-500')} />
                          <div className="glass-card p-4 hover:border-bg-border/80 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', TYPE_COLORS[event.type] ? `${TYPE_COLORS[event.type]}/10` : 'bg-slate-500/10')}>
                                  <Icon size={14} className={
                                    event.type === 'lab' ? 'text-accent-400' :
                                    event.type === 'hospitalization' ? 'text-amber-400' :
                                    event.type === 'transfusion' ? 'text-red-400' :
                                    event.type === 'medication' ? 'text-emerald-400' :
                                    'text-slate-400'
                                  } />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white">{event.title}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">{event.description}</div>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 flex-shrink-0">{formatDateShort(event.date)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
