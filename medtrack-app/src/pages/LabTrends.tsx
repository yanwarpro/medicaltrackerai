import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Activity, BarChart2,
  Calendar, Check, Filter
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { labResultStorage } from '../lib/storage';
import { PARAM_OPTIONS } from '../lib/checklist';
import { formatDateShort, formatNumber, calcDelta, cn } from '../lib/utils';

const COLORS = [
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899', // pink
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#3b82f6', // blue
];

export default function LabTrends() {
  const { activePatient } = useApp();
  const [selectedParams, setSelectedParams] = useState<string[]>(['hemoglobin']);
  const [dateRange, setDateRange] = useState<'all' | '1y' | '6m' | '3m'>('all');

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  // Available params present in data
  const availableParams = useMemo(() => {
    const counts: Record<string, number> = {};
    labResults.forEach((r) => {
      counts[r.normalizedName] = (counts[r.normalizedName] || 0) + 1;
    });
    return PARAM_OPTIONS.map((opt) => ({
      ...opt,
      count: counts[opt.normalized] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [labResults]);

  // Filtered by date range
  const filteredResults = useMemo(() => {
    if (dateRange === 'all') return labResults;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '3m') cutoff.setMonth(now.getMonth() - 3);
    else if (dateRange === '6m') cutoff.setMonth(now.getMonth() - 6);
    else if (dateRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return labResults.filter((r) => r.testDate >= cutoffStr);
  }, [labResults, dateRange]);

  // Chart Data: group by testDate
  const chartData = useMemo(() => {
    if (selectedParams.length === 0) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    filteredResults.forEach((r) => {
      if (selectedParams.includes(r.normalizedName) && r.value !== null) {
        if (!dateMap[r.testDate]) dateMap[r.testDate] = {};
        dateMap[r.testDate][r.normalizedName] = r.value;
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date: formatDateShort(date),
        rawDate: date,
        ...values,
      }));
  }, [filteredResults, selectedParams]);

  // Stats for selected params
  const paramStats = useMemo(() => {
    return selectedParams.map((param) => {
      const results = labResults
        .filter((r) => r.normalizedName === param)
        .sort((a, b) => a.testDate.localeCompare(b.testDate));
      const latest = results[results.length - 1];
      const previous = results[results.length - 2];
      const delta = latest && previous && latest.value !== null && previous.value !== null
        ? calcDelta(latest.value, previous.value)
        : null;
      const option = PARAM_OPTIONS.find((o) => o.normalized === param);
      return { param, option, latest, previous, delta, results };
    });
  }, [labResults, selectedParams]);

  function toggleParam(param: string) {
    setSelectedParams((prev) =>
      prev.includes(param)
        ? prev.filter((p) => p !== param)
        : [...prev, param]
    );
  }

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Pilih pasien terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tren Laboratorium</h1>
          <p className="text-slate-400 text-sm mt-1">Grafik & analisis perubahan nilai lab dari waktu ke waktu</p>
        </div>
      </div>

      {/* Parameter Selector Pills */}
      <div className="space-y-2">
        <label className="label-text flex items-center gap-1.5">
          <Filter size={13} className="text-accent-400" />
          Pilih Parameter untuk Ditampilkan
        </label>
        <div className="flex flex-wrap gap-2">
          {availableParams.map((opt) => {
            const isSelected = selectedParams.includes(opt.normalized);
            const idx = selectedParams.indexOf(opt.normalized);
            const color = idx !== -1 ? COLORS[idx % COLORS.length] : undefined;
            return (
              <button
                key={opt.normalized}
                onClick={() => toggleParam(opt.normalized)}
                id={`param-pill-${opt.normalized}`}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border',
                  isSelected
                    ? 'bg-accent-500/20 text-white border-accent-500 shadow-glow-teal'
                    : opt.count > 0
                    ? 'bg-bg-elevated text-slate-300 border-bg-border hover:border-accent-500/40'
                    : 'bg-bg-secondary/40 text-slate-500 border-bg-border opacity-60'
                )}
              >
                {color && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                )}
                {opt.label}
                {opt.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-primary text-slate-400">
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', '1y', '6m', '3m'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              id={`range-${r}`}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-all border',
                dateRange === r
                  ? 'bg-accent-500 text-white border-accent-500'
                  : 'bg-bg-elevated text-slate-300 border-bg-border hover:border-accent-500/30'
              )}
            >
              {r === 'all' ? 'Semua' : r === '1y' ? '1 Tahun' : r === '6m' ? '6 Bulan' : '3 Bulan'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="glass-card p-5 space-y-4 border border-bg-border">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    background: '#131929',
                    borderColor: '#1e2d45',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {selectedParams.map((param, i) => {
                  const color = COLORS[i % COLORS.length];
                  return (
                    <Line
                      key={param}
                      type="monotone"
                      dataKey={param}
                      name={param}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ fill: color, strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: color }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center border border-bg-border">
          <BarChart2 size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {labResults.length === 0
              ? 'Belum ada data lab. Upload dan konfirmasi dokumen hasil lab terlebih dahulu.'
              : 'Pilih parameter di atas untuk menampilkan grafik tren'}
          </p>
        </div>
      )}

      {/* Param Stats Cards */}
      {paramStats.filter((s) => s.latest).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paramStats.filter((s) => s.latest).map(({ param, option, latest, delta, results }, i) => (
            <div key={param} className="glass-card p-4 space-y-3 border border-bg-border" id={`param-stat-${param.replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{option?.label || param}</span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{formatNumber(latest?.value, 2)}</span>
                <span className="text-xs text-slate-400">{latest?.unit || option?.unit}</span>
              </div>
              {delta && (
                <div className="flex items-center gap-2">
                  {delta.trend === 'up' ? (
                    <TrendingUp size={14} className="text-emerald-400" />
                  ) : delta.trend === 'down' ? (
                    <TrendingDown size={14} className="text-red-400" />
                  ) : (
                    <Minus size={14} className="text-slate-400" />
                  )}
                  <span className={cn(
                    'text-xs font-bold',
                    delta.trend === 'up' ? 'text-emerald-400' :
                    delta.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                  )}>
                    {delta.abs > 0 ? '+' : ''}{formatNumber(delta.abs, 2)} ({delta.pct > 0 ? '+' : ''}{formatNumber(delta.pct, 1)}%)
                  </span>
                  <span className="text-xs text-slate-400">vs sebelumnya</span>
                </div>
              )}
              {option && latest?.value !== null && latest?.value !== undefined && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">
                    Referensi: {option.refLow} – {option.refHigh} {option.unit}
                  </div>
                  <div className="w-full bg-bg-primary rounded-full h-1.5 relative border border-bg-border">
                    <div
                      className={cn(
                        'h-1.5 rounded-full',
                        latest.abnormalFlag === 'H' || latest.abnormalFlag === 'HH' ? 'bg-amber-400' :
                        latest.abnormalFlag === 'L' || latest.abnormalFlag === 'LL' ? 'bg-blue-400' :
                        'bg-emerald-400'
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, ((latest.value! - option.refLow) / (option.refHigh - option.refLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-400">
                {results.length} pengukuran · Terakhir: {formatDateShort(latest?.testDate)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Table */}
      {selectedParams.length === 1 && (
        <div className="glass-card p-5 space-y-4 border border-bg-border">
          <h3 className="section-title">Riwayat {PARAM_OPTIONS.find((o) => o.normalized === selectedParams[0])?.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border bg-bg-secondary/40">
                  <th className="table-header pl-0">TANGGAL</th>
                  <th className="table-header text-right">NILAI</th>
                  <th className="table-header">SATUAN</th>
                  <th className="table-header">FLAG</th>
                  <th className="table-header">PERUBAHAN</th>
                </tr>
              </thead>
              <tbody>
                {labResults
                  .filter((r) => r.normalizedName === selectedParams[0])
                  .sort((a, b) => b.testDate.localeCompare(a.testDate))
                  .map((r, idx, arr) => {
                    const prev = arr[idx + 1];
                    const delta = prev && r.value !== null && prev.value !== null ? calcDelta(r.value, prev.value) : null;
                    return (
                      <tr key={r.id} className="table-row border-b border-bg-border/60 hover:bg-bg-elevated/40" id={`lab-trend-row-${r.id}`}>
                        <td className="table-cell pl-0 font-semibold text-white">{formatDateShort(r.testDate)}</td>
                        <td className={cn('table-cell text-right font-mono font-bold text-base',
                          r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'text-amber-400' :
                          r.abnormalFlag === 'L' || r.abnormalFlag === 'LL' ? 'text-blue-400' :
                          'text-white'
                        )}>
                          {formatNumber(r.value, 2)}
                        </td>
                        <td className="table-cell text-slate-400">{r.unit || '—'}</td>
                        <td className="table-cell">
                          {r.abnormalFlag && r.abnormalFlag !== 'N' ? (
                            <span className={cn('badge text-xs font-semibold',
                              r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL' ? 'badge-red' :
                              r.abnormalFlag === 'H' ? 'badge-yellow' : 'badge-blue'
                            )}>
                              {r.abnormalFlag}
                            </span>
                          ) : (
                            <span className="badge badge-green text-xs font-semibold">Normal</span>
                          )}
                        </td>
                        <td className="table-cell">
                          {delta ? (
                            <span className={cn('flex items-center gap-1 text-xs font-bold',
                              delta.trend === 'up' ? 'text-emerald-400' :
                              delta.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                            )}>
                              {delta.trend === 'up' ? <TrendingUp size={11} /> : delta.trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
                              {delta.abs > 0 ? '+' : ''}{formatNumber(delta.abs, 2)}
                            </span>
                          ) : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
