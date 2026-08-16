import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, User, LogIn, UserPlus, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthPage() {
  const { signIn, signUp, user } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // If already logged in, redirect to home
  if (user) {
    navigate('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi');
      return;
    }
    if (mode === 'register' && !fullName) {
      setError('Nama lengkap wajib diisi');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi atau langsung masuk.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat otentikasi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mx-auto shadow-glow-teal mb-3">
            <Activity size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MedTrack <span className="text-gradient-teal">AI</span></h1>
          <p className="text-slate-400 text-sm">Simpan. Pahami. Pantau Rekam Medis Keluarga.</p>
        </div>

        {/* Auth Box */}
        <div className="glass-card p-6 space-y-6 border border-bg-border shadow-card-hover">
          {/* Mode Switcher */}
          <div className="flex bg-bg-primary p-1 rounded-lg border border-bg-border">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'login' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-slate-400 hover:text-white'
              }`}
              id="auth-tab-login"
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setMessage(''); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'register' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'text-slate-400 hover:text-white'
              }`}
              id="auth-tab-register"
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label-text">Nama Lengkap *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Anda"
                    id="auth-fullname-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label-text">Email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  className="input-field pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  id="auth-email-input"
                />
              </div>
            </div>

            <div>
              <label className="label-text">Password *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  className="input-field pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  id="auth-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="auth-submit-btn"
              className="btn-primary w-full justify-center py-3 text-sm mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Memproses...</>
              ) : mode === 'login' ? (
                <><LogIn size={16} /> Masuk ke MedTrack AI</>
              ) : (
                <><UserPlus size={16} /> Buat Akun Baru</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-bg-border" />
            <span className="text-xs text-slate-600 uppercase">atau</span>
            <div className="h-px flex-1 bg-bg-border" />
          </div>

          {/* Guest Mode */}
          <button
            type="button"
            onClick={() => navigate('/')}
            id="auth-guest-btn"
            className="w-full btn-secondary justify-center text-xs text-slate-400 hover:text-white"
          >
            Lanjutkan sebagai Tamu (Mode Lokal) <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
