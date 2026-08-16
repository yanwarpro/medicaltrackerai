import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, FileText, Activity,
  AlertTriangle, CheckCircle, Hospital, Droplets, ChevronRight,
  FlaskConical, User, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { labResultStorage, documentStorage, hospitalizationStorage, transfusionStorage } from '../lib/storage';
import { formatDate, formatDateShort, calcAge, calcDelta, formatNumber, cn } from '../lib/utils';
import { CHECKLIST_ITEMS } from '../lib/checklist';

const KEY_PARAMS = ['Hemoglobin', 'WBC', 'Platelets', 'MCV', 'Creatinine'];
const NORMALIZED_KEYS: Record<string, string> = {
  'Hemoglobin': 'hemoglobin',
  'WBC': 'wbc',
  'Platelets': 'platelets',
  'MCV': 'mcv',
  'Creatinine': 'creatinine',
};

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-400" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-slate-500" />;
}

export default function Dashboard() {
  const { activePatient } = useApp();

  const labResults = useMemo(() =>
    activePatient ? labResultStorage.getAll(activePatient.id).filter((r) => r.verified) : [],
    [activePatient]
  );

  const documents = useMemo(() =>
    activePatient ? documentStorage.getAll(activePatient.id) : [],
    [activePatient]
  );

  const hospitalizations = useMemo(() =>
    activePatient ? hospitalizationStorage.getAll(activePatient.id) : [],
    [activePatient]
  );

  const transfusions = useMemo(() =>
    activePatient ? transfusionStorage.getAll(activePatient.id) : [],
    [activePatient]
  );

  // Get latest values for key parameters
  const latestLabs = useMemo(() => {
    return KEY_PARAMS.map((param) => {
      const normalized = NORMALIZED_KEYS[param];
      const results = labResults
        .filter((r) => r.normalizedName === normalized)
        .sort((a, b) => b.testDate.localeCompare(a.testDate));
      const latest = results[0];
      const previous = results[1];
      const delta = latest && previous && latest.value !== null && previous.value !== null
        ? calcDelta(latest.value, previous.value)
        : null;
      return { param, latest, previous, delta };
    });
  }, [labResults]);

  // Hb trend data for mini chart
  const hbTrend = useMemo(() => {
    return labResults
      .filter((r) => r.normalizedName === 'hemoglobin')
      .sort((a, b) => a.testDate.localeCompare(b.testDate))
      .slice(-10)
      .map((r) => ({ date: formatDateShort(r.testDate), value: r.value }));
  }, [labResults]);

  // Checklist progress
  const checklistProgress = useMemo(() => {
    const total = CHECKLIST_ITEMS.filter((i) => i.category === 'Anemia').length;
    const normalizedNames = labResults.map((r) => r.normalizedName);
    const found = CHECKLIST_ITEMS.filter(
      (i) => i.category === 'Anemia' && normalizedNames.includes(i.normalizedName)
    ).length;
    return { found, total };
  }, [labResults]);

  // Recent documents
  const recentDocs = useMemo(() =>
    [...documents].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)).slice(0, 5),
    [documents]
  );

  // Abnormal results
  const abnormalResults = useMemo(() =>
    labResults
      .filter((r) => r.abnormalFlag && r.abnormalFlag !== 'N')
      .sort((a, b) => b.testDate.localeCompare(a.testDate))
      .slice(0, 5),
    [labResults]
  );

  if (!activePatient) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto">
            <User size={28} className="text-accent-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Belum Ada Pasien</h2>
          <p className="text-slate-400 text-sm max-w-xs">Buat profil pasien terlebih dahulu untuk mulai menggunakan MedTrack AI</p>
          <Link to="/patient" id="create-patient-btn" className="btn-primary inline-flex">
            <User size={16} />
            Buat Profil Pasien
          </Link>
        </div>
      </div>
    );
  }

  const age = calcAge(activePatient.dateOfBirth);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Ringkasan medis terkini</p>
        </div>
        <Link to="/report" id="generate-report-btn" className="btn-primary">
          <FileText size={15} />
          Laporan Dokter
        </Link>
      </div>

      {/* Patient Card */}
      <div className="glass-card p-5 border-l-4 border-l-accent-500">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-teal flex items-center justify-center shadow-glow-teal">
            <User size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{activePatient.fullName}</h2>
            {activePatient.nickname && (
              <p className="text-accent-400 text-sm">"{activePatient.nickname}"</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-slate-400 text-xs">{age} tahun</span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-slate-400 text-xs">
                {activePatient.gender === 'male' ? 'Laki-laki' : activePatient.gender === 'female' ? 'Perempuan' : 'Lainnya'}
              </span>
              {activePatient.bloodType && activePatient.bloodType !== 'unknown' && (
                <>
                  <span className="text-slate-600 text-xs">•</span>
                  <span className="text-slate-400 text-xs">Gol. Darah {activePatient.bloodType}</span>
                </>
              )}
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-slate-400 text-xs">{formatDate(activePatient.dateOfBirth)}</span>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">{documents.length}</div>
              <div className="text-xs text-slate-500">Dokumen</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{labResults.length}</div>
              <div className="text-xs text-slate-500">Hasil Lab</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{hospitalizations.length}</div>
              <div className="text-xs text-slate-500">Episode</div>
            </div>
          </div>
        </div>
        {activePatient.allergies.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400 font-medium">Alergi:</span>
            {activePatient.allergies.map((a, i) => (
              <span key={i} className="badge-yellow text-xs">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <FileText size={20} className="text-accent-400" />
          <div className="stat-value">{documents.length}</div>
          <div className="stat-label">Total Dokumen</div>
        </div>
        <div className="stat-card">
          <FlaskConical size={20} className="text-emerald-400" />
          <div className="stat-value">{labResults.length}</div>
          <div className="stat-label">Hasil Lab</div>
        </div>
        <div className="stat-card">
          <Hospital size={20} className="text-amber-400" />
          <div className="stat-value">{hospitalizations.length}</div>
          <div className="stat-label">Rawat Inap</div>
        </div>
        <div className="stat-card">
          <Droplets size={20} className="text-red-400" />
          <div className="stat-value">{transfusions.length}</div>
          <div className="stat-label">Transfusi</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Lab Values */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Hasil Lab Terbaru</h3>
            <Link to="/lab-results" className="text-xs text-accent-400 hover:underline flex items-center gap-1" id="view-all-labs-link">
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {latestLabs.map(({ param, latest, delta }) => (
              <div key={param} className="flex items-center gap-3 py-2 border-b border-bg-border/50 last:border-0">
                <div className="w-28 text-xs text-slate-400 font-medium">{param}</div>
                <div className="flex-1">
                  {latest ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-base font-bold',
                        latest.abnormalFlag === 'H' || latest.abnormalFlag === 'HH' ? 'text-amber-400' :
                        latest.abnormalFlag === 'L' || latest.abnormalFlag === 'LL' ? 'text-blue-400' :
                        'text-white'
                      )}>
                        {formatNumber(latest.value)}
                      </span>
                      <span className="text-xs text-slate-500">{latest.unit}</span>
                      {delta && <TrendBadge trend={delta.trend} />}
                      {delta && (
                        <span className={cn('text-xs', delta.trend === 'up' ? 'text-emerald-400' : delta.trend === 'down' ? 'text-red-400' : 'text-slate-500')}>
                          {delta.abs > 0 ? '+' : ''}{formatNumber(delta.abs, 1)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Belum ada data</span>
                  )}
                </div>
                <div className="text-xs text-slate-600">{latest ? formatDateShort(latest.testDate) : '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hb Trend Mini Chart */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Tren Hemoglobin</h3>
            <Link to="/trends" className="text-xs text-accent-400 hover:underline" id="view-trend-link">
              Detail
            </Link>
          </div>
          {hbTrend.length > 1 ? (
            <>
              <div className="text-3xl font-bold text-white">
                {formatNumber(hbTrend[hbTrend.length - 1]?.value)}
                <span className="text-sm font-normal text-slate-400 ml-1">g/dL</span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={hbTrend}>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    contentStyle={{ background: '#131929', border: '1px solid #1e2d45', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: '#22d3ee', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-28 flex items-center justify-center text-slate-600 text-sm">
              Butuh minimal 2 data untuk menampilkan tren
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist Progress */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Checklist Anemia</h3>
            <Link to="/checklist" className="text-xs text-accent-400 hover:underline" id="view-checklist-link">
              Detail
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Pemeriksaan tersedia</span>
              <span className="text-white font-medium">{checklistProgress.found} / {checklistProgress.total}</span>
            </div>
            <div className="w-full bg-bg-primary rounded-full h-2">
              <div
                className="bg-gradient-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${(checklistProgress.found / checklistProgress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">
              {checklistProgress.total - checklistProgress.found} pemeriksaan belum ditemukan dalam dokumen
            </div>
          </div>
        </div>

        {/* Abnormal Results */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Nilai Abnormal</h3>
            <Link to="/lab-results" className="text-xs text-accent-400 hover:underline" id="view-abnormal-link">
              Lihat semua
            </Link>
          </div>
          {abnormalResults.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Tidak ada nilai abnormal yang tercatat
            </div>
          ) : (
            <div className="space-y-2">
              {abnormalResults.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-1.5 border-b border-bg-border/50 last:border-0">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL' ? 'bg-red-500' : 'bg-amber-400'
                  )} />
                  <span className="text-sm text-slate-300 flex-1">{r.testName}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    r.abnormalFlag === 'H' || r.abnormalFlag === 'HH' ? 'text-amber-400' : 'text-blue-400'
                  )}>
                    {formatNumber(r.value)} {r.unit}
                  </span>
                  <span className="text-xs text-slate-600">{formatDateShort(r.testDate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Documents */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Dokumen Terbaru</h3>
          <Link to="/documents" className="text-xs text-accent-400 hover:underline flex items-center gap-1" id="view-all-docs-link">
            Lihat semua <ArrowUpRight size={12} />
          </Link>
        </div>
        {recentDocs.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <FileText size={32} className="text-slate-600 mx-auto" />
            <p className="text-slate-500 text-sm">Belum ada dokumen. Upload dokumen pertama Anda.</p>
            <Link to="/documents" id="upload-first-doc-btn" className="btn-primary inline-flex text-xs">
              <FileText size={13} />
              Upload Dokumen
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-bg-border/50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{doc.filename}</div>
                  <div className="text-xs text-slate-500">{doc.category} · {formatDateShort(doc.documentDate)}</div>
                </div>
                <span className={cn(
                  'badge text-xs flex-shrink-0',
                  doc.status === 'confirmed' ? 'badge-green' :
                  doc.status === 'needs_review' ? 'badge-yellow' :
                  doc.status === 'failed' ? 'badge-red' : 'badge-gray'
                )}>
                  {doc.status === 'confirmed' ? 'Confirmed' :
                   doc.status === 'needs_review' ? 'Review' :
                   doc.status === 'uploaded' ? 'Uploaded' :
                   doc.status === 'extracted' ? 'Extracted' : doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
