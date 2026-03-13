import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">Blood Bank</p>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Login</h1>
          <p className="text-sm text-slate-500">Use your staff credentials to continue.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">Username</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
