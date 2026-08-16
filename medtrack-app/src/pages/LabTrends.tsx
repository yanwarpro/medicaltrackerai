import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { labResultStorage } from '../lib/storage';
import { formatDateShort, formatNumber, calcDelta, cn } from '../lib/utils';

const PARAM_OPTIONS = [
  { label: 'Hemoglobin (Hb)', normalized: 'hemoglobin', unit: 'g/dL', refLow: 12, refHigh: 16 },
  { label: 'Hematocrit (Hct)', normalized: 'hematocrit', unit: '%', refLow: 37, refHigh: 47 },
  { label: 'WBC (Leukosit)', normalized: 'wbc', unit: '10³/µL', refLow: 4.5, refHigh: 11 },
  { label: 'Platelets (Trombosit)', normalized: 'platelets', unit: '10³/µL', refLow: 150, refHigh: 400 },
  { label: 'MCV', normalized: 'mcv', unit: 'fL', refLow: 80, refHigh: 100 },
  { label: 'MCH', normalized: 'mch', unit: 'pg', refLow: 27, refHigh: 33 },
  { label: 'Ferritin', normalized: 'ferritin', unit: 'ng/mL', refLow: 12, refHigh: 150 },
  { label: 'Serum Iron', normalized: 'serum iron', unit: 'µg/dL', refLow: 60, refHigh: 170 },
  { label: 'Creatinine', normalized: 'creatinine', unit: 'mg/dL', refLow: 0.5, refHigh: 1.1 },
  { label: 'eGFR', normalized: 'egfr', unit: 'mL/min', refLow: 60, refHigh: 120 },
  { label: 'TSH', normalized: 'tsh', unit: 'µIU/mL', refLow: 0.4, refHigh: 4.0 },
  { label: 'AST (SGOT)', normalized: 'ast', unit: 'U/L', refLow: 0, refHigh: 40 },
  { label: 'ALT (SGPT)', normalized: 'alt', unit: 'U/L', refLow: 0, refHigh: 40 },
  { label: 'LDH', normalized: 'ldh', unit: 'U/L', refLow: 140, refHigh: 280 },
  { label: 'Bilirubin Total', normalized: 'bilirubin', unit: 'mg/dL', refLow: 0, refHigh: 1.2 },
  { label: 'Albumin', normalized: 'albumin', unit: 'g/dL', refLow: 3.5, refHigh: 5.0 },
  { label: 'Vitamin B12', normalized: 'vitamin b12', unit: 'pg/mL', refLow: 200, refHigh: 900 },
  { label: 'Folate', normalized: 'folate', unit: 'ng/mL', refLow: 3, refHigh: 20 },
  { label: 'Neutrophils', normalized: 'neutrophils', unit: '%', refLow: 50, refHigh: 70 },
  { label: 'Lymphocytes', normalized: 'lymphocytes', unit: '%', refLow: 20, refHigh: 40 },
];

const COLORS = ['#0891b2', '#10b981', '#d97706', '#dc2626', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label, isLight }: any) => {
  if (!active || !payload) return null;
  return (
    <div className={cn(
      'p-3 rounded-lg shadow-card text-xs border',
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-bg-card border-bg-border text-white'
    )}>
      <p className="text-slate-500 mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatNumber(p.value, 2)} {p.payload?.unit || ''}
        </p>
      ))}
    </div>
  );
};

export default function LabTrends() {
  const { activePatient, settings } = useApp();
  const [selectedParams, setSelectedParams] = useState<string[]>(['hemoglobin']);
  const isLight = settings.theme === 'light';

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  // Build chart data per parameter
  const chartData = useMemo(() => {
    const dates = [...new Set(
      labResults
        .filter((r) => selectedParams.includes(r.normalizedName))
        .map((r) => r.testDate)
    )].sort();

    return dates.map((date) => {
      const point: Record<string, any> = { date: formatDateShort(date) };
      selectedParams.forEach((param) => {
        const result = labResults
          .filter((r) => r.normalizedName === param && r.testDate === date)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (result?.value !== null && result?.value !== undefined) {
          point[param] = result.value;
          point[`${param}_unit`] = result.unit;
        }
      });
      return point;
    });
  }, [labResults, selectedParams]);

  // Delta comparison for each selected param
  const paramStats = useMemo(() => {
    return selectedParams.map((param) => {
      const option = PARAM_OPTIONS.find((o) => o.normalized === param);
      const results = labResults
        .filter((r) => r.normalizedName === param)
        .sort((a, b) => a.testDate.localeCompare(b.testDate));
      const latest = results[results.length - 1];
      const previous = results[results.length - 2];
      const delta = latest && previous && latest.value !== null && previous.value !== null
        ? calcDelta(latest.value, previous.value) : null;
      return { param, option, latest, previous, delta, results };
    });
  }, [labResults, selectedParams]);

  function toggleParam(normalized: string) {
    setSelectedParams((prev) =>
      prev.includes(normalized)
        ? prev.filter((p) => p !== normalized)
        : [...prev, normalized]
    );
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
      <div>
        <h1 className="text-2xl font-bold text-white">Tren Lab</h1>
        <p className="text-slate-400 text-sm mt-1">Analisis perubahan parameter lab dari waktu ke waktu</p>
      </div>

      {/* Parameter Selector */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Pilih Parameter</p>
        <div className="flex flex-wrap gap-2">
          {PARAM_OPTIONS.map((opt) => {
            const isSelected = selectedParams.includes(opt.normalized);
            const hasData = labResults.some((r) => r.normalizedName === opt.normalized);
            const paramColor = COLORS[selectedParams.indexOf(opt.normalized) % COLORS.length];

            return (
              <button
                key={opt.normalized}
                onClick={() => hasData && toggleParam(opt.normalized)}
                id={`param-toggle-${opt.normalized.replace(/\s+/g, '-')}`}
                disabled={!hasData}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  isSelected
                    ? 'shadow-sm text-white'
                    : hasData
                    ? isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:border-cyan-500 hover:text-cyan-700'
                      : 'bg-bg-elevated border-bg-border text-slate-400 hover:border-accent-500/30'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-bg-primary border-bg-border/30 text-slate-700 cursor-not-allowed'
                )}
                style={isSelected ? {
                  background: paramColor,
                  borderColor: paramColor,
                  color: '#ffffff',
                } : {}}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && selectedParams.length > 0 ? (
        <div className="glass-card p-5">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e2d45'} />
              <XAxis dataKey="date" tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip isLight={isLight} />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px', color: isLight ? '#334155' : '#e2e8f0' }}
                formatter={(value) => {
                  const opt = PARAM_OPTIONS.find((o) => o.normalized === value);
                  return opt?.label || value;
                }}
              />
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
      ) : (
        <div className="glass-card p-12 text-center">
          <BarChart2 size={48} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">
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
            <div key={param} className="glass-card p-4 space-y-3" id={`param-stat-${param.replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{option?.label || param}</span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{formatNumber(latest?.value, 2)}</span>
                <span className="text-xs text-slate-500">{latest?.unit || option?.unit}</span>
              </div>
              {delta && (
                <div className="flex items-center gap-2">
                  {delta.trend === 'up' ? (
                    <TrendingUp size={14} className="text-emerald-500" />
                  ) : delta.trend === 'down' ? (
                    <TrendingDown size={14} className="text-red-500" />
                  ) : (
                    <Minus size={14} className="text-slate-500" />
                  )}
                  <span className={cn(
                    'text-xs font-semibold',
                    delta.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                    delta.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
                  )}>
                    {delta.abs > 0 ? '+' : ''}{formatNumber(delta.abs, 2)} ({delta.pct > 0 ? '+' : ''}{formatNumber(delta.pct, 1)}%)
                  </span>
                  <span className="text-xs text-slate-500">vs sebelumnya</span>
                </div>
              )}
              {option && latest?.value !== null && latest?.value !== undefined && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    Referensi: {option.refLow} – {option.refHigh} {option.unit}
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-bg-primary rounded-full h-1.5 relative">
                    <div
                      className={cn(
                        'h-1.5 rounded-full',
                        latest.abnormalFlag === 'H' || latest.abnormalFlag === 'HH' ? 'bg-amber-500' :
                        latest.abnormalFlag === 'L' || latest.abnormalFlag === 'LL' ? 'bg-blue-500' :
                        'bg-emerald-500'
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, ((latest.value! - option.refLow) / (option.refHigh - option.refLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-500">
                {results.length} pengukuran · Terakhir: {formatDateShort(latest?.testDate)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Table */}
      {selectedParams.length === 1 && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="section-title">Riwayat {PARAM_OPTIONS.find((o) => o.normalized === selectedParams[0])?.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="table-header pl-0">Tanggal</th>
                  <th className="table-header text-right">Nilai</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Flag</th>
                  <th className="table-header">Perubahan</th>
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
                      <tr key={r.id} className="table-row">
                        <td className="table-cell pl-0 font-medium">{formatDateShort(r.testDate)}</td>
                        <td className={cn('table-cell text-right font-mono font-bold',
                          r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'text-amber-600 dark:text-amber-400' :
                          r.abnormalFlag === 'L' || r.abnormalFlag === 'LL' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'
                        )}>
                          {formatNumber(r.value, 2)}
                        </td>
                        <td className="table-cell text-slate-500">{r.unit}</td>
                        <td className="table-cell">
                          {r.abnormalFlag && r.abnormalFlag !== 'N' && (
                            <span className={cn('badge text-xs font-semibold',
                              r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'badge-yellow' : 'badge-blue'
                            )}>
                              {r.abnormalFlag}
                            </span>
                          )}
                        </td>
                        <td className="table-cell">
                          {delta ? (
                            <span className={cn('flex items-center gap-1 text-xs font-semibold',
                              delta.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                              delta.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
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
