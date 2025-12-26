import { useState } from 'react';
import { User, Lock, UserCog, Stethoscope } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { apiUrl } from '../config';

interface LoginPageProps {
  onLogin: (role: 'admin' | 'doctor', name: string, email: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor'>('doctor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        // Call backend register
        const res = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: selectedRole }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Registration failed');
        }
        // on success show message and switch to sign in
        setIsSignup(false);
        setPassword('');
        setError('Registration successful — please sign in');
      } else {
        // Sign in via backend
        const res = await fetch(apiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // Support both `detail` (FastAPI) and `message` (Express/other) fields
          throw new Error(data.detail || data.message || 'Login failed');
        }
        const data = await res.json();
        const role = data.role as 'admin' | 'doctor';
        const name = email.includes('@') ? email.split('@')[0] : (role === 'admin' ? 'Admin' : 'Doctor');
        
        // Store email in sessionStorage for per-tab session
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userName', name);
        sessionStorage.setItem('userRole', role);
        // Also persist access token if backend returned one
        if (data.access_token) {
          try {
            sessionStorage.setItem('accessToken', data.access_token);
          } catch (e) {
            // ignore storage errors
          }
        }
        
        onLogin(role, name, email);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 mb-4">
            <span className="text-white text-2xl">M</span>
          </div>
          <h1 className="text-slate-900 text-2xl">MBC Therapy Portal</h1>
          <p className="text-slate-600 mt-2">Sign in to access your dashboard</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSelectedRole('doctor')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedRole === 'doctor'
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedRole === 'doctor'
                  ? 'bg-gradient-to-br from-cyan-500 to-teal-500'
                  : 'bg-slate-100'
              }`}>
                <Stethoscope className={`w-6 h-6 ${
                  selectedRole === 'doctor' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div className={`text-sm ${
                selectedRole === 'doctor' ? 'text-cyan-900' : 'text-slate-700'
              }`}>
                Doctor
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('admin')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedRole === 'admin'
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-br from-cyan-500 to-teal-500'
                  : 'bg-slate-100'
              }`}>
                <UserCog className={`w-6 h-6 ${
                  selectedRole === 'admin' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div className={`text-sm ${
                selectedRole === 'admin' ? 'text-cyan-900' : 'text-slate-700'
              }`}>
                Admin
              </div>
            </div>
          </button>
        </div>

        {/* Login / Sign Up Form */}
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === 'admin' ? 'admin@mbctherapy.com' : 'doctor@mbctherapy.com'}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-cyan-600 hover:text-cyan-700">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-60"
              >
                {isSignup ? `Sign Up as ${selectedRole === 'admin' ? 'Admin' : 'Doctor'}` : `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Doctor'}`}
              </button>

              {error && (
                <div className={`text-sm mt-2 ${error.includes('successful') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {error}
                </div>
              )}

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignup((s) => !s); setError(null); }}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-600 mb-2">Demo Credentials:</div>
              <div className="space-y-1 text-xs">
                <div className="text-slate-700">
                  <span className="text-slate-500">Admin:</span> admin@mbctherapy.com
                </div>
                <div className="text-slate-700">
                  <span className="text-slate-500">Doctor:</span> any email address
                </div>
                <div className="text-slate-500">Password: any password</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>Protected by enterprise-grade security</p>
          <p className="mt-1">HIPAA compliant • End-to-end encrypted</p>
        </div>
      </div>
    </div>
  );
}
