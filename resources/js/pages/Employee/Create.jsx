import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    father_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    street_address: '',
    village: '',
    district: '',
    province: '',
    country: 'Afghanistan',
    hire_date: '',
    status: 'active',
    qualifications: '',
    salary_expense_account_id: '',
    payment_account_id: '',
  });

  useEffect(() => {
    api.get('/chart-of-accounts?per_page=1000').then(r => {
      const payload = r.data.data;
      setAccounts(Array.isArray(payload) ? payload : payload?.data || []);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/employees', form);
      navigate('/employees');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create employee.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/employees')} className="hover:text-[#007c89]">Employees</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Employee</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Add Employee</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Employee Code *</label>
                    <input name="employee_code" value={form.employee_code} onChange={handleChange} className={inputClass('employee_code')} placeholder="EMP-001" />
                    {errors.employee_code && <p className="text-red-500 text-xs mt-1">{errors.employee_code[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">First Name *</label>
                    <input name="first_name" value={form.first_name} onChange={handleChange} className={inputClass('first_name')} />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Name *</label>
                    <input name="last_name" value={form.last_name} onChange={handleChange} className={inputClass('last_name')} />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Father's Name</label>
                    <input name="father_name" value={form.father_name} onChange={handleChange} className={inputClass('father_name')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gender</label>
                    <select name="gender" value={form.gender} onChange={handleChange} className={inputClass('gender')}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date of Birth</label>
                    <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className={inputClass('date_of_birth')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Contact</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass('email')} />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} className={inputClass('phone')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Address</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Street Address</label>
                    <input name="street_address" value={form.street_address} onChange={handleChange} className={inputClass('street_address')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Village</label>
                    <input name="village" value={form.village} onChange={handleChange} className={inputClass('village')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">District</label>
                    <input name="district" value={form.district} onChange={handleChange} className={inputClass('district')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Province</label>
                    <input name="province" value={form.province} onChange={handleChange} className={inputClass('province')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Country</label>
                    <input name="country" value={form.country} onChange={handleChange} className={inputClass('country')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Employment</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hire Date *</label>
                    <input type="date" name="hire_date" value={form.hire_date} onChange={handleChange} className={inputClass('hire_date')} />
                    {errors.hire_date && <p className="text-red-500 text-xs mt-1">{errors.hire_date[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className={inputClass('status')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Qualifications</label>
                    <input name="qualifications" value={form.qualifications} onChange={handleChange} className={inputClass('qualifications')} placeholder="e.g. BSc Computer Science" />
                  </div>
                </div>
              </div>
            </div>

            {/* Accounts */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Accounts</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Salary Expense Account</label>
                    <select name="salary_expense_account_id" value={form.salary_expense_account_id} onChange={handleChange} className={inputClass('salary_expense_account_id')}>
                      <option value="">Select account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Account</label>
                    <select name="payment_account_id" value={form.payment_account_id} onChange={handleChange} className={inputClass('payment_account_id')}>
                      <option value="">Select account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Create Employee
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
