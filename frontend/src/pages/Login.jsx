import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

function InputField({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  autoComplete,
  showToggle,
  showPassword,
  onTogglePassword,
}) {
  const isPassword = type === 'password' || (type === 'text' && showToggle);
  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative w-full">
      <div className="input-group">
        <span className="input-group-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={2} />
        </span>
        <input
          type={inputType}
          className={`input-group-input ${showToggle ? 'input-group-input-pr' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
        />
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="input-group-action"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('welcome');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const TopWave = ({ gradId, h = 85 }) => (
    <svg
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{ height: h, zIndex: 0 }}
      viewBox="0 0 350 85"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <path d="M0,0 L350,0 L350,52 Q290,78 175,65 Q60,52 0,72 Z" fill={`url(#${gradId})`} />
    </svg>
  );

  const BottomWave = ({ gradId, h = 55 }) => (
    <svg
      className="absolute bottom-0 left-0 w-full pointer-events-none"
      style={{ height: h, zIndex: 0 }}
      viewBox="0 0 350 65"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>
      <path d="M0,12 Q60,38 175,18 Q290,0 350,28 L350,65 L0,65 Z" fill={`url(#${gradId})`} />
    </svg>
  );

  const WelcomePage = () => (
    <div className="login-card">
      <TopWave gradId="tw-welcome" h={90} />
      <div className="login-card-body">
        <div className="mt-4 mb-2 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand">
          <Droplet size={28} className="text-white" fill="currentColor" strokeWidth={0} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 text-center tracking-tight">Welcome!</h1>
        <p className="text-sm text-slate-500 mb-8 text-center">Blood Bank Management System</p>
        <div className="w-full space-y-3.5 px-2">
          <button type="button" onClick={() => setCurrentPage('login')} className="login-btn-primary">
            Login
          </button>
          <button type="button" onClick={() => setCurrentPage('signin')} className="login-btn-outline">
            Sign In
          </button>
        </div>
      </div>
      <BottomWave gradId="bw-welcome" h={60} />
    </div>
  );

  const SignInPage = () => (
    <div className="login-card">
      <TopWave gradId="tw-signin" h={75} />
      <div className="login-card-body">
        <div className="mt-2 mb-1 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <User size={22} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-1 text-center tracking-tight">Sign In</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">Create your account</p>
        <form className="w-full space-y-3.5 px-2" onSubmit={(e) => e.preventDefault()}>
          <InputField icon={User} placeholder="Full name" autoComplete="name" />
          <InputField icon={Mail} type="email" placeholder="Email address" autoComplete="email" />
          <InputField
            icon={Lock}
            placeholder="Password"
            autoComplete="new-password"
            showToggle
            showPassword={showSignupPwd}
            onTogglePassword={() => setShowSignupPwd(!showSignupPwd)}
          />
          <button type="button" className="login-btn-primary mt-2">
            Sign In
          </button>
        </form>
        <button type="button" onClick={() => setCurrentPage('welcome')} className="mt-4 text-xs text-slate-400 hover:text-brand-600 transition">
          Back
        </button>
      </div>
      <BottomWave gradId="bw-signin" h={50} />
    </div>
  );

  const LoginForm = () => (
    <div className="login-card">
      <TopWave gradId="tw-login" h={75} />
      <div className="login-card-body">
        <div className="mt-2 mb-1 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Droplet size={22} className="text-white" fill="currentColor" strokeWidth={0} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-1 text-center tracking-tight">Login</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">Enter your credentials to continue</p>
        <form onSubmit={onSubmit} className="w-full space-y-3.5 px-2">
          <InputField
            icon={Mail}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <InputField
            icon={Lock}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            showToggle
            showPassword={showLoginPwd}
            onTogglePassword={() => setShowLoginPwd(!showLoginPwd)}
          />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs text-center">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="login-btn-primary mt-2 disabled:opacity-70">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-3 w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
          <p className="text-[10px] text-slate-400 mb-1 text-center font-semibold uppercase tracking-wider">Default Credentials</p>
          <div className="flex justify-center gap-6 text-xs text-slate-500">
            <span>Username: <span className="font-bold text-slate-700">admin</span></span>
            <span>Password: <span className="font-bold text-slate-700">admin123</span></span>
          </div>
        </div>
        <button type="button" onClick={() => setCurrentPage('welcome')} className="mt-3 text-xs text-slate-400 hover:text-brand-600 transition">
          Back
        </button>
      </div>
      <BottomWave gradId="bw-login" h={50} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-mesh">
      {currentPage === 'welcome' && <WelcomePage />}
      {currentPage === 'signin' && <SignInPage />}
      {currentPage === 'login' && <LoginForm />}
    </div>
  );
}
