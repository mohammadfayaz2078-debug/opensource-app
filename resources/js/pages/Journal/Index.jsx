import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const statusConfig = {
  draft:    { label: 'Draft',    color: 'bg-gray-100 text-gray-700 border-gray-200' },
  posted:   { label: 'Posted',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  reversed: { label: 'Reversed', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const JournalIndex = () => {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [journalFilter, setJournalFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryDetail, setEntryDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEntries = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: 20 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (journalFilter) params.journal_id = journalFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/journal-entries', { params });
      console.log('Journal entries API response:', res.data);
      setEntries(res.data?.data || []);
      setCurrentPage(res.data?.current_page || 1);
      setLastPage(res.data?.last_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
      let msg = 'Failed to load journal entries.';
      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);
        msg = err.response.data?.message || `Error ${err.response.status}: ${msg}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchJournals = async () => {
    try {
      const res = await api.get('/journals');
      setJournals(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch journals:', err);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchJournals();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEntries(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, journalFilter, dateFrom, dateTo]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= lastPage) {
      fetchEntries(page);
    }
  };

  const openDetail = async (entry) => {
    setSelectedEntry(entry);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/journal-entries/${entry.id}`);
      setEntryDetail(res.data?.data || null);
    } catch (err) {
      Swal.fire('Error', 'Failed to load entry details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModalOpen(false);
    setSelectedEntry(null);
    setEntryDetail(null);
  };

  const handlePost = async (entry) => {
    const result = await Swal.fire({
      title: 'Post Journal Entry?',
      text: `Post ${entry.entry_number}? This will update account balances.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#007c89',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, post it',
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    try {
      const res = await api.post(`/journal-entries/${entry.id}/post`);
      Swal.fire({ icon: 'success', title: 'Posted', text: res.data?.message, timer: 2000, showConfirmButton: false });
      fetchEntries(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Post failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async (entry) => {
    const { value: reason } = await Swal.fire({
      title: 'Reverse Journal Entry?',
      text: `Reverse ${entry.entry_number}? A reversal entry will be created.`,
      icon: 'warning',
      input: 'text',
      inputLabel: 'Reversal reason',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reverse',
      inputValidator: (value) => {
        if (!value || value.trim().length < 3) {
          return 'Reason must be at least 3 characters';
        }
      }
    });
    if (!reason) return;

    setSaving(true);
    try {
      const res = await api.post(`/journal-entries/${entry.id}/reverse`, { reason });
      Swal.fire({ icon: 'success', title: 'Reversed', text: res.data?.message, timer: 2000, showConfirmButton: false });
      fetchEntries(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Reversal failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const formatMoney = (n) => (n === null || n === undefined) ? '—' : parseFloat(n).toFixed(2);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Journal Entries</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage accounting journal entries</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="reversed">Reversed</option>
            </select>
            <select value={journalFilter} onChange={(e) => setJournalFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
              <option value="">All Journals</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
              title="Date From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
              title="Date To"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => fetchEntries(currentPage)} className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l6-6m-5.5.5h.01m6 0h.01m-11 0h.01m5 0h.01M9 17h6M9 5h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">No journal entries found.</p>
                      {(searchQuery || statusFilter || journalFilter || dateFrom || dateTo) && (
                        <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setJournalFilter(''); setDateFrom(''); setDateTo(''); }} className="mt-2 text-xs font-medium text-[#007c89] underline hover:text-[#005f6b]">Clear filters</button>
                      )}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const status = statusConfig[entry.status] || statusConfig.draft;
                    return (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{entry.entry_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(entry.entry_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{entry.journal?.code || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{entry.description || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatMoney(entry.total_debit)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatMoney(entry.total_credit)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openDetail(entry)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {entry.status === 'draft' && (
                              <button onClick={() => handlePost(entry)} disabled={saving} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Post">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              </button>
                            )}
                            {entry.status === 'posted' && (
                              <button onClick={() => handleReverse(entry)} disabled={saving} className="p-1.5 rounded hover:bg-orange-50 text-orange-600" title="Reverse">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {entries.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="text-sm">No journal entries found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const status = statusConfig[entry.status] || statusConfig.draft;
                  return (
                    <div key={entry.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{entry.entry_number}</p>
                          <p className="text-xs text-gray-500">{entry.journal?.name || '—'} · {formatDate(entry.entry_date)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>{status.label}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 truncate">{entry.description || '—'}</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-600">
                          <span className="text-gray-500">DR:</span> <span className="font-medium text-gray-900">{formatMoney(entry.total_debit)}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-gray-500">CR:</span> <span className="font-medium text-gray-900">{formatMoney(entry.total_credit)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(entry)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          {entry.status === 'draft' && (
                            <button onClick={() => handlePost(entry)} disabled={saving} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Post">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </button>
                          )}
                          {entry.status === 'posted' && (
                            <button onClick={() => handleReverse(entry)} disabled={saving} className="p-1.5 rounded hover:bg-orange-50 text-orange-600" title="Reverse">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-gray-500">Showing page {currentPage} of {lastPage} ({total} total)</p>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">Prev</button>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => handlePageChange(page)} className={`px-3 py-1 text-xs rounded-md ${page === currentPage ? 'bg-[#007c89] text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                ))}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage} className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeDetail}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {entryDetail?.entry_number || selectedEntry?.entry_number || 'Journal Entry'}
              </h2>
              <button onClick={closeDetail} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm">Loading details...</p>
              </div>
            ) : entryDetail ? (
              <div className="px-6 py-5 space-y-5">
                {/* Header info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(entryDetail.entry_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium text-gray-900 capitalize">{entryDetail.status}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Journal</p>
                    <p className="font-medium text-gray-900">{entryDetail.journal?.name || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Currency</p>
                    <p className="font-medium text-gray-900">{entryDetail.currency || 'USD'}</p>
                  </div>
                </div>

                {entryDetail.expense && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <p className="text-xs text-blue-600 font-medium mb-1">Linked Expense</p>
                    <p className="text-gray-700">
                      <strong>{entryDetail.expense.reference_no}</strong> — {entryDetail.expense.description}
                    </p>
                  </div>
                )}

                {/* Lines table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Journal Lines</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Account</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryDetail.lines?.map((line, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="px-4 py-2">
                              <span className="font-medium text-gray-900">{line.account_code || '—'}</span>
                              <span className="text-gray-500 ml-1">{line.account_name || ''}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{line.description || '—'}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              {line.type === 'debit' ? formatMoney(line.amount) : '—'}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              {line.type === 'credit' ? formatMoney(line.amount) : '—'}
                            </td>
                          </tr>
                        ))}
                        {(!entryDetail.lines || entryDetail.lines.length === 0) && (
                          <tr>
                            <td colSpan="4" className="px-4 py-6 text-center text-gray-500 text-sm">No lines found.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan="2" className="px-4 py-2 text-right text-xs font-medium text-gray-600">Total</td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{formatMoney(entryDetail.total_debit)}</td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{formatMoney(entryDetail.total_credit)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Posting info */}
                {(entryDetail.posted_by || entryDetail.posted_at) && (
                  <div className="text-xs text-gray-500">
                    Posted by <strong>{entryDetail.posted_by?.first_name} {entryDetail.posted_by?.last_name}</strong> on {formatDate(entryDetail.posted_at)}
                  </div>
                )}
                {(entryDetail.reversed_by || entryDetail.reversed_at) && (
                  <div className="text-xs text-orange-600">
                    Reversed by <strong>{entryDetail.reversed_by?.first_name} {entryDetail.reversed_by?.last_name}</strong> on {formatDate(entryDetail.reversed_at)}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p className="text-sm">Failed to load entry details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalIndex;
