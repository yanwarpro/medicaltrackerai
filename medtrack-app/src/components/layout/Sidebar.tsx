import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  FlaskConical,
  TrendingUp,
  ClipboardList,
  Hospital,
  Droplets,
  Pill,
  Brain,
  FileBarChart,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  HeartPulse,
  Users,
  ChevronDown,
  LogIn,
  LogOut,
  Bot,
  Sparkles,
  Download,
} from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { cn, calcAge } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/timeline', icon: Activity, label: 'Timeline' },
  { to: '/blood-pressure', icon: HeartPulse, label: 'Riwayat Tensi' },
  { to: '/documents', icon: FileText, label: 'Dokumen' },
  { to: '/lab-results', icon: FlaskConical, label: 'Hasil Lab' },
  { to: '/trends', icon: TrendingUp, label: 'Tren Lab' },
  { to: '/checklist', icon: ClipboardList, label: 'Checklist' },
  { to: '/hospitalization', icon: Hospital, label: 'Rawat Inap' },
  { to: '/transfusion', icon: Droplets, label: 'Transfusi' },
  { to: '/medications', icon: Pill, label: 'Obat-obatan' },
  { to: '/summary', icon: Brain, label: 'Ringkasan AI' },
  { to: '/report', icon: FileBarChart, label: 'Laporan Dokter' },
  { to: '/search', icon: Search, label: 'Pencarian' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [patientMenuOpen, setPatientMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const { activePatient, patients, setActivePatient, user, signOut } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-bg-secondary border-r border-bg-border transition-all duration-300 relative z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-bg-border', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center flex-shrink-0 shadow-glow-teal">
          <Activity size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-white">MedTrack</span>
            <span className="text-sm font-bold text-gradient-teal"> AI</span>
          </div>
        )}
      </div>

      {/* Patient Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-bg-border">
          <button
            onClick={() => setPatientMenuOpen(!patientMenuOpen)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-elevated hover:bg-bg-card border border-bg-border transition-all duration-200"
            id="patient-selector-btn"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-teal flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-white truncate">
                {activePatient?.nickname || activePatient?.fullName || 'Pilih Pasien'}
              </div>
              {activePatient && (
                <div className="text-xs text-slate-500">
                  {calcAge(activePatient.dateOfBirth)} tahun
                </div>
              )}
            </div>
            <ChevronDown size={14} className={cn('text-slate-500 transition-transform', patientMenuOpen && 'rotate-180')} />
          </button>

          {patientMenuOpen && (
            <div className="mt-1 bg-bg-primary border border-bg-border rounded-lg overflow-hidden shadow-card animate-fade-in">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActivePatient(p.id); setPatientMenuOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    activePatient?.id === p.id
                      ? 'bg-accent-500/10 text-accent-400'
                      : 'text-slate-300 hover:bg-bg-elevated'
                  )}
                  id={`patient-option-${p.id}`}
                >
                  <User size={12} />
                  <span className="truncate">{p.nickname || p.fullName}</span>
                </button>
              ))}
              <button
                onClick={() => { navigate('/patient'); setPatientMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-400 hover:bg-bg-elevated border-t border-bg-border"
                id="add-patient-btn"
              >
                <Users size={12} />
                <span>+ Tambah Pasien</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              cn(
                'nav-item',
                isActive && 'nav-item-active',
                collapsed && 'justify-center px-0'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom User / Settings */}
      <div className="border-t border-bg-border px-2 py-2 space-y-1">
        {installPrompt && (
          <button
            onClick={handleInstallClick}
            id="install-pwa-btn"
            className={cn(
              'nav-item text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 w-full text-left',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Pasang Aplikasi' : undefined}
          >
            <Download size={17} className="flex-shrink-0 text-emerald-400 animate-pulse" />
            {!collapsed && <span className="text-sm font-medium">Pasang Aplikasi</span>}
          </button>
        )}

        <NavLink
          to="/settings"
          id="nav-settings"
          className={({ isActive }) =>
            cn('nav-item', isActive && 'nav-item-active', collapsed && 'justify-center px-0')
          }
          title={collapsed ? 'Pengaturan' : undefined}
        >
          <Settings size={17} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Pengaturan</span>}
        </NavLink>

        {user ? (
          <button
            onClick={() => signOut()}
            id="nav-logout"
            className={cn('nav-item text-red-400 hover:text-red-300 w-full text-left', collapsed && 'justify-center px-0')}
            title={collapsed ? `Keluar (${user.email})` : undefined}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs truncate block text-slate-400">{user.email}</span>
                <span className="text-xs font-semibold text-red-400">Keluar</span>
              </div>
            )}
          </button>
        ) : (
          <NavLink
            to="/auth"
            id="nav-auth"
            className={({ isActive }) =>
              cn('nav-item text-accent-400 hover:text-accent-300', isActive && 'nav-item-active', collapsed && 'justify-center px-0')
            }
            title={collapsed ? 'Masuk / Daftar' : undefined}
          >
            <LogIn size={17} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Masuk / Daftar</span>}
          </NavLink>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        id="sidebar-toggle-btn"
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center hover:border-accent-500 hover:text-accent-400 text-slate-500 transition-all duration-200 shadow-card"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
