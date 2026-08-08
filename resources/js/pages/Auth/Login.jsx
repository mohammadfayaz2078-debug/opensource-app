import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const errorTranslations = {
    Unauthorized: 'ایمیل یا رمز عبور نادرست است',
    'Network Error': 'خطای شبکه - اتصال اینترنت خود را بررسی کنید',
    'Request failed with status code 422': 'ورودی نامعتبر است',
    'Request failed with status code 500': 'خطای سرور - لطفاً بعداً تلاش کنید',
  };

const submit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const res = await api.post('/login', {
      email: email,
      password: password,
    });

    // Safe check for response data
    if (!res || !res.data) {
      throw new Error('No response from server');
    }

    const { token, user, user_type, permissions } = res.data;

    if (!token || !user) {
      throw new Error('Invalid response from server');
    }

    // Store data safely
    localStorage.setItem('api_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_type', user_type);

    if (permissions) {
      localStorage.setItem('permissions', JSON.stringify(permissions));
    }

    if (rememberMe) {
      localStorage.setItem('remember_email', email);
    } else {
      localStorage.removeItem('remember_email');
    }

    // Navigate based on user type
    if (user_type === 'company_admin') {
      navigate('/company-admin/dashboard');
    } else if (user_type === 'superadmin') {
      navigate('/super-admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  } catch (err) {
    console.error('Login error:', err);
    
    // Extract error message safely
    let msg = 'Login failed';
    if (err.response?.data?.message) {
      msg = err.response.data.message;
    } else if (err.response?.data?.error) {
      msg = err.response.data.error;
    } else if (err.message) {
      msg = err.message;
    }
    
    setError(msg);
  } finally {
    setLoading(false);
  }
};

  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div
      className="login-page min-h-screen min-h-[100dvh] flex flex-col text-slate-900 antialiased"
      dir="ltr"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      <style>{`
        .login-page {
          background:
            radial-gradient(ellipse 100% 80% at 50% -20%, rgba(59, 130, 246, 0.14), transparent 55%),
            radial-gradient(ellipse 50% 40% at 100% 100%, rgba(16, 185, 129, 0.08), transparent 50%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #eef2ff 100%);
        }
        .login-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(64px);
          pointer-events: none;
          opacity: 0.5;
        }
        .login-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          box-shadow: 0 10px 25px -8px rgba(37, 99, 235, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
        }
        .login-mesh {
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* Header */}
      <header className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-5 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-md opacity-70" />
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600
                flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white/50
                group-hover:scale-105 transition-transform">
                <span className="text-white font-extrabold text-base sm:text-lg">B</span>
              </div>
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
              bazar<span className="text-blue-600">net</span>
            </span>
          </Link>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600
              hover:bg-blue-50 px-3 py-2 rounded-xl transition border border-transparent hover:border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to products</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-10 sm:py-14 overflow-hidden">
        <div className="absolute inset-0 login-mesh pointer-events-none opacity-60" aria-hidden />
        <div className="login-orb w-72 h-72 bg-blue-400/40 -top-10 -left-20" aria-hidden />
        <div className="login-orb w-64 h-64 bg-emerald-400/25 bottom-0 right-0" aria-hidden />

        <div className="relative w-full max-w-[420px]">
          {/* Card */}
          <div className="bg-white/85 backdrop-blur-xl rounded-[1.5rem] border border-white/80
            shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15),0_0_0_1px_rgba(15,23,42,0.03)]
            p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 font-medium">
                Log in to manage sales, inventory & accounts
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium
                  rounded-xl px-3.5 py-3 text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoComplete="username"
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-[15px] text-slate-900
                    bg-slate-50/80 outline-none focus:bg-white focus:border-blue-400
                    focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-12 border border-slate-200 rounded-xl px-4 pr-12 text-[15px] text-slate-900
                      bg-slate-50/80 outline-none focus:bg-white focus:border-blue-400
                      focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                      p-1 rounded-lg transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-600">Remember me</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="login-btn w-full h-12 text-white text-[16px] font-extrabold rounded-xl
                  transition disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging in…
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-7 font-medium">
            <Link to="/welcome" className="font-bold text-blue-600 hover:text-blue-700 transition">
              Browse products
            </Link>{' '}
            without logging in
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
