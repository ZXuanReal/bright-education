import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<'details' | 'code'>('details');
  const [email, setEmail] = useState('admin@brightenglish.com');
  const [password, setPassword] = useState('Admin@123');
  const [fullName, setFullName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const getErrorMessage = (requestError: unknown) => {
    if (axios.isAxiosError<{ message?: string }>(requestError)) {
      return requestError.response?.data?.message || 'The request could not be completed.';
    }
    return requestError instanceof Error ? requestError.message : 'The request could not be completed.';
  };

  const changeMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setRegisterStep('details');
    setError('');
    setNotice('');
    if (nextMode === 'register') {
      setEmail('');
      setPassword('');
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.post('/auth/email-verification', { email: normalizedEmail });
      const generatedCode = typeof response.data?.code === 'string' ? response.data.code : '';
      setEmail(normalizedEmail);
      setRegisterStep('code');
      if (generatedCode) {
        setVerificationCode(generatedCode);
        setNotice(`Development mode: use verification code ${generatedCode} for ${normalizedEmail}.`);
      } else {
        setNotice(`A verification code was sent to ${normalizedEmail}.`);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = (event: React.FormEvent) => {
    event.preventDefault();
    void sendVerificationCode();
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await api.post('/auth/register', {
        fullName,
        email: normalizedEmail,
        password,
        code: verificationCode,
      });
      const loggedIn = await login(normalizedEmail, password);
      if (loggedIn) {
        navigate('/dashboard');
      } else {
        setMode('login');
        setRegisterStep('details');
        setEmail(normalizedEmail);
        setNotice('Your account is ready. Please log in with your new credentials.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft lg:grid-cols-2">
        <div className="flex flex-col justify-between bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 p-8 text-white">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-100">BRIGHT ENGLISH</div>
            <h1 className="mt-4 text-4xl font-bold">Learn Better</h1>
            <p className="mt-3 max-w-xs text-sm text-violet-100">Grow brighter with a modern digital learning portal built for teachers, students, and administrators.</p>
          </div>

          <div className="mt-10 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="text-sm text-violet-100">Demo account</div>
            <div className="mt-2 text-lg font-semibold">admin@brightenglish.com</div>
            <div className="text-sm text-violet-100">Admin@123</div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mb-7">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
              {mode === 'login' ? 'Welcome back' : registerStep === 'details' ? 'Join Bright English' : 'Verify your email'}
            </div>
            <h2 className="mt-2 text-3xl font-bold text-slate-800">
              {mode === 'login' ? 'Login to portal' : registerStep === 'details' ? 'Create your account' : 'Enter your code'}
            </h2>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => changeMode('login')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Login
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Register
            </button>
          </div>

          {mode === 'login' && (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="login-email">Email</label>
                <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="login-password">Password</label>
                <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white" />
              </div>
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          )}

          {mode === 'register' && registerStep === 'details' && (
            <form className="space-y-5" onSubmit={handleRequestCode}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="register-name">Full name</label>
                <input id="register-name" type="text" autoComplete="name" maxLength={100} required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="register-email">Gmail address</label>
                <input id="register-email" type="email" autoComplete="email" placeholder="you@gmail.com" pattern="[A-Za-z0-9._%+-]+@gmail[.]com" title="Use a Gmail address ending in @gmail.com." required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="register-password">Password</label>
                <input id="register-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white" />
                <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
              </div>
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </form>
          )}

          {mode === 'register' && registerStep === 'code' && (
            <form className="space-y-5" onSubmit={handleRegister}>
              <p className="text-sm leading-6 text-slate-600">Enter the code sent to <span className="font-semibold text-slate-800">{email}</span>.</p>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="verification-code">Verification code</label>
                <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" maxLength={10} required value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-semibold tracking-[0.3em] outline-none transition focus:border-violet-400 focus:bg-white" />
              </div>
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? 'Verifying...' : 'Verify and create account'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setRegisterStep('details'); setError(''); setNotice(''); }} className="font-medium text-slate-600 hover:text-slate-900">Change details</button>
                <button type="button" disabled={loading} onClick={() => void sendVerificationCode()} className="font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-60">Resend code</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
