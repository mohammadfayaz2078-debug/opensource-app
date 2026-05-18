import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const errorTranslations = {
    'Unauthorized': 'ایمیل یا رمز عبور نادرست است',
    'Network Error': 'خطای شبکه - اتصال اینترنت خود را بررسی کنید',
    'Request failed with status code 422': 'ورودی نامعتبر است',
    'Request failed with status code 500': 'خطای سرور - لطفاً بعداً تلاش کنید'
  };

const submit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const res = await api.post('/login', {
      email: email,
      password: password
    });

    const token = res.data.token;
    const user = res.data.user;
    const userType = res.data.user_type; // ✅ Now consistent across all user types
    
    localStorage.setItem('api_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_type', userType);

    if (rememberMe) {
      localStorage.setItem('remember_email', email);
    } else {
      localStorage.removeItem('remember_email');
    }

    if (res.data.permissions) {
      localStorage.setItem('permissions', JSON.stringify(res.data.permissions));
    }

    // Redirect based on user type
    if (userType === 'super_admin') {
      navigate('/super-admin/dashboard');
    } else if (userType === 'company_admin') {
      navigate('/company-admin/dashboard');
    } else {
      navigate('/dashboard');
    }
    
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Login failed';
    setError(errorTranslations[msg] || msg);
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
    <div dir="ltr" className="min-h-screen bg-[#f2f2f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Log in</h1>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Username or Email 
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:border-black transition rtl:text-right"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-gray-700">Password</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:border-black transition rtl:text-right"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 border-gray-400 accent-[#0066cc]"
            />
            <label className="text-sm text-gray-700">Remember me</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#007c89] text-white px-6 py-2.5 rounded-full hover:bg-[#006d77] transition disabled:opacity-60 cursor-pointer"
          >
            {!loading ? 'Log in' : 'Loading...'}
          </button>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;