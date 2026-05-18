import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 5;

export default function EmployeeShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [genModal, setGenModal] = useState(false);
  const [contractModal, setContractModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState('payroll');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, slipRes, contractRes, currRes] = await Promise.all([
        api.get(`/employees/${id}`),
        api.get('/payslips', { params: { employee_id: id, year: CURRENT_YEAR } }),
        api.get(`/employees/${id}/contracts`),
        api.get('/currencies'),
      ]);
      setEmployee(empRes.data.data);
      setPayslips(slipRes.data.data || []);
      setContracts(contractRes.data.data || []);
      const currPayload = currRes.data.data;
      setCurrencies(Array.isArray(currPayload) ? currPayload : currPayload?.data || []);
    } catch {
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const getPayslip = (month) => payslips.find(p => p.month === month);

  const isMonthInContract = (month) => {
    if (!contract || !contract.start_date) return false;
    const monthStr = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}`;
    const startStr = contract.start_date.slice(0, 7);
    const endStr = contract.end_date ? contract.end_date.slice(0, 7) : null;
    if (monthStr < startStr) return false;
    if (endStr && monthStr > endStr) return false;
    return true;
  };

  const getMonthState = (month) => {
    if (!isMonthInContract(month)) return 'nocontact';
    const p = getPayslip(month);
    if (!p) return month > CURRENT_MONTH ? 'future' : 'unpaid';
    const paid = p.amount_paid || 0;
    if (paid >= p.base_salary) return 'paid';
    if (paid > 0) return 'partial';
    if (month > CURRENT_MONTH) return 'future';
    return 'unpaid';
  };

  const handleGenerate = async (month) => {
    setActionLoading(true);
    try {
      await api.post(`/employees/${id}/payslips`, { month, year: CURRENT_YEAR });
      await fetchAll();
      setGenModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate payslip');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (payslipId, method, amount) => {
    setActionLoading(true);
    try {
      await api.post(`/payslips/${payslipId}/pay`, {
        payment_method: method,
        payment_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(amount),
      });
      await fetchAll();
      setPayModal(null);
      setPayAmount('');
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      navigate('/employees');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!employee) return null;

  const contract = contracts.find(c => c.status === 'active');
  const progress = { paid: 0, unpaid: 0, total: 0 };
  for (let m = 1; m <= 12; m++) {
    if (!isMonthInContract(m)) continue;
    progress.total++;
    const p = getPayslip(m);
    if (p && (p.amount_paid || 0) >= p.base_salary) {
      progress.paid++;
    } else if (p || m <= CURRENT_MONTH) {
      progress.unpaid++;
    }
  }

  const statusColor = employee.status === 'active' ? 'bg-green-100 text-green-700' : employee.status === 'terminated' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/employees')} className="hover:text-[#007c89]">Employees</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{employee.first_name} {employee.last_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${employee.gender === 'female' ? 'bg-pink-500' : 'bg-[#007c89]'}`}>
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{employee.first_name} {employee.last_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm text-gray-500">{employee.employee_code}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{employee.status}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/employees/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {['payroll','info','contracts'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="space-y-6">
            {/* Salary Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Payroll Overview</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Monthly Salary</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {contract ? `${Number(contract.monthly_salary).toLocaleString()} ${contract.currency?.code}` : 'No active contract'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Progress ({CURRENT_YEAR})</p>
                    <p className="text-2xl font-bold text-[#007c89] mt-1">{progress.paid}/{progress.total} months</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mt-4">
                  <div className="bg-[#007c89] h-2.5 rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.paid / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Month Grid */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Salary Payments</h2>
                <button onClick={() => setGenModal(true)} className="inline-flex items-center px-3 py-1.5 bg-[#007c89]/10 text-[#007c89] rounded-md text-sm font-medium hover:bg-[#007c89]/20 transition-colors">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Generate
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                  {MONTHS.map((name, idx) => {
                    const month = idx + 1;
                    const state = getMonthState(month);
                    const p = getPayslip(month);
                    const bg = state === 'paid'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : state === 'partial'
                        ? 'bg-orange-50 border-orange-200 text-orange-700 cursor-pointer hover:bg-orange-100'
                        : state === 'unpaid'
                          ? 'bg-[#007c89]/5 border-[#007c89]/20 text-[#007c89] cursor-pointer hover:bg-[#007c89]/10'
                          : state === 'nocontact'
                            ? 'bg-gray-100 border-gray-200 text-gray-300'
                            : 'bg-gray-50 border-gray-100 text-gray-400';
                    const icon = state === 'paid' ? '✓' : state === 'partial' ? '◐' : state === 'unpaid' ? '$' : state === 'nocontact' ? '×' : '−';
                    const clickHandler = state === 'unpaid' ? () => handleGenerate(month)
                      : state === 'partial' ? () => { setPayModal(p); setPayAmount(String((p.base_salary || 0) - (p.amount_paid || 0))); }
                      : null;

                    return (
                      <button
                        key={month}
                        onClick={clickHandler}
                        disabled={!clickHandler}
                        className={`relative py-3 px-1 rounded-md border text-center text-xs font-medium transition-all ${bg}`}
                      >
                        <div className="uppercase tracking-wide text-[10px] opacity-70 mb-1">{name}</div>
                        <div className="text-base">{icon}</div>
                        {(state === 'paid' || state === 'partial' || state === 'unpaid') && p && (
                          <div className="text-[10px] mt-1 opacity-70">
                            {state === 'partial'
                              ? `${Number(p.amount_paid || 0).toLocaleString()} / ${Number(p.base_salary).toLocaleString()}`
                              : Number(p.base_salary).toLocaleString()}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payslips Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Payslip History</h2>
              </div>
              {payslips.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">No payslips generated yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (Base)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.sort((a,b) => b.month - a.month).map(p => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{MONTHS[p.month - 1]} {p.year}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{Number(p.base_salary).toLocaleString()} {p.currency?.code}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{p.exchange_rate}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{Number(p.amount_base).toLocaleString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              (p.amount_paid || 0) >= p.base_salary ? 'bg-green-100 text-green-700' :
                              (p.amount_paid || 0) > 0 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {(p.amount_paid || 0) >= p.base_salary ? 'Paid' : (p.amount_paid || 0) > 0 ? 'Partial' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {(p.amount_paid || 0) < p.base_salary ? (
                              <button onClick={() => { setPayModal(p); setPayAmount(String((p.base_salary || 0) - (p.amount_paid || 0))); }} className="text-sm text-[#007c89] hover:text-[#006d77] font-medium">Pay Now</button>
                            ) : (
                              <span className="text-xs text-gray-400">{p.payment_date ? p.payment_date.slice(0, 10) : '—'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Employee Details</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</dt><dd className="mt-1 text-sm text-gray-900">{employee.first_name} {employee.last_name}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Father's Name</dt><dd className="mt-1 text-sm text-gray-900">{employee.father_name || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</dt><dd className="mt-1 text-sm text-gray-900 capitalize">{employee.gender || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</dt><dd className="mt-1 text-sm text-gray-900">{employee.date_of_birth ? employee.date_of_birth.slice(0, 10) : '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt><dd className="mt-1 text-sm text-gray-900">{employee.email || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt><dd className="mt-1 text-sm text-gray-900">{employee.phone || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Street Address</dt><dd className="mt-1 text-sm text-gray-900">{employee.street_address || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Village</dt><dd className="mt-1 text-sm text-gray-900">{employee.village || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">District</dt><dd className="mt-1 text-sm text-gray-900">{employee.district || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Province</dt><dd className="mt-1 text-sm text-gray-900">{employee.province || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</dt><dd className="mt-1 text-sm text-gray-900">{employee.country || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hire Date</dt><dd className="mt-1 text-sm text-gray-900">{employee.hire_date ? employee.hire_date.slice(0, 10) : '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt><dd className="mt-1 text-sm text-gray-900 capitalize">{employee.status}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qualifications</dt><dd className="mt-1 text-sm text-gray-900">{employee.qualifications || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salary Expense Account</dt><dd className="mt-1 text-sm text-gray-900">{employee.salary_expense_account ? `${employee.salary_expense_account.code} - ${employee.salary_expense_account.name}` : '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Account</dt><dd className="mt-1 text-sm text-gray-900">{employee.payment_account ? `${employee.payment_account.code} - ${employee.payment_account.name}` : '—'}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="space-y-6">
            <ContractTab
              employeeId={id}
              contracts={contracts}
              currencies={currencies}
              onChange={setContracts}
              onEdit={(c) => setContractModal(c)}
              onCreate={() => setContractModal({})}
            />
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Payment</h2>
            <p className="text-gray-600 text-sm mb-4">{MONTHS[payModal.month - 1]} {payModal.year} salary</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Base Salary</span><span className="font-medium">{Number(payModal.base_salary).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Already Paid</span><span className="font-medium">{Number(payModal.amount_paid || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Remaining</span><span className="font-medium text-[#007c89]">{Number((payModal.base_salary || 0) - (payModal.amount_paid || 0)).toLocaleString()}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Amount</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={`Max ${Number((payModal.base_salary || 0) - (payModal.amount_paid || 0)).toLocaleString()}`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPayModal(null); setPayAmount(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancel</button>
              <button
                onClick={() => handlePay(payModal.id, 'bank_transfer', payAmount || ((payModal.base_salary || 0) - (payModal.amount_paid || 0)))}
                disabled={actionLoading || !payAmount}
                className="flex-1 px-4 py-2 bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? 'Processing...' : 'Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {genModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Generate Payslip</h2>
            <p className="text-gray-600 text-sm mb-4">Choose a month to generate a payslip for {CURRENT_YEAR}.</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MONTHS.map((name, idx) => {
                const month = idx + 1;
                const p = getPayslip(month);
                const exists = !!p;
                const inContract = isMonthInContract(month);
                const isFuture = month > CURRENT_MONTH && !exists;
                const canGenerate = inContract && !exists && !isFuture;
                return (
                  <button
                    key={month}
                    onClick={() => canGenerate && handleGenerate(month)}
                    disabled={!canGenerate || actionLoading}
                    className={`py-2 rounded-md text-xs font-medium border ${
                      exists
                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                        : !inContract || isFuture
                          ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                          : 'bg-[#007c89]/10 text-[#007c89] border-[#007c89]/20 hover:bg-[#007c89]/20'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setGenModal(false)} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {contractModal && (
        <ContractModal
          employeeId={id}
          contract={contractModal}
          currencies={currencies}
          onClose={() => setContractModal(null)}
          onSaved={(saved) => {
            if (contractModal.id) {
              setContracts(prev => prev.map(c => c.id === saved.id ? saved : c));
            } else {
              setContracts(prev => [saved, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}

function ContractTab({ employeeId, contracts, currencies, onChange, onEdit, onCreate }) {
  const handleDelete = async (contractId) => {
    if (!confirm('Delete this contract?')) return;
    try {
      await api.delete(`/employees/${employeeId}/contracts/${contractId}`);
      onChange(contracts.filter(c => c.id !== contractId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Contracts</h2>
        <button onClick={onCreate} className="inline-flex items-center px-3 py-1.5 bg-[#007c89]/10 text-[#007c89] rounded-md text-sm font-medium hover:bg-[#007c89]/20 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Contract
        </button>
      </div>
      {contracts.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No contracts found.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {contracts.map(c => (
            <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">{c.contract_type.replace('_', ' ')}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'terminated' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{c.start_date ? c.start_date.slice(0, 10) : '—'} — {c.end_date ? c.end_date.slice(0, 10) : 'Ongoing'}</div>
                {c.probation_end_date && <div className="text-xs text-gray-400">Probation ends: {c.probation_end_date.slice(0, 10)}</div>}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{Number(c.monthly_salary).toLocaleString()} {c.currency?.code}</div>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <button onClick={() => onEdit(c)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractModal({ employeeId, contract, currencies, onClose, onSaved }) {
  const isEdit = contract?.id != null;
  const [form, setForm] = useState({
    contract_type: contract?.contract_type || 'full_time',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    monthly_salary: contract?.monthly_salary || '',
    currency_id: contract?.currency_id || '',
    probation_end_date: contract?.probation_end_date || '',
    status: contract?.status || 'active',
    notes: contract?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (isEdit) {
        const res = await api.put(`/employees/${employeeId}/contracts/${contract.id}`, form);
        onSaved(res.data.data);
      } else {
        const res = await api.post(`/employees/${employeeId}/contracts`, form);
        onSaved(res.data.data);
      }
      onClose();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to save contract.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{isEdit ? 'Edit Contract' : 'New Contract'}</h2>
        {errors.general && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inputClass('contract_type')}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass('status')}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className={inputClass('start_date')} />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className={inputClass('end_date')} />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly Salary *</label>
              <input type="number" name="monthly_salary" value={form.monthly_salary} onChange={handleChange} className={inputClass('monthly_salary')} />
              {errors.monthly_salary && <p className="text-red-500 text-xs mt-1">{errors.monthly_salary[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency *</label>
              <select name="currency_id" value={form.currency_id} onChange={handleChange} className={inputClass('currency_id')}>
                <option value="">Select</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
              {errors.currency_id && <p className="text-red-500 text-xs mt-1">{errors.currency_id[0]}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Probation End Date</label>
            <input type="date" name="probation_end_date" value={form.probation_end_date} onChange={handleChange} className={inputClass('probation_end_date')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputClass('notes')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50 text-sm font-medium">
              {loading ? 'Saving...' : (isEdit ? 'Update Contract' : 'Create Contract')}
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
