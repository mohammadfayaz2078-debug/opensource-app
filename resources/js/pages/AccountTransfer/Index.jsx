import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';

const generatePageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

const formatPrice = (price) => {
  const value = Number(price ?? 0);
  if (Number.isNaN(value)) return '$0.00';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
};

const statusColors = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  reversed: 'bg-amber-100 text-amber-700',
};

export default function AccountTransferIndex() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const basePath = location.pathname.startsWith('/company-admin') ? '/company-admin' : '';
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTransfers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/account-transfers', { params });
      setTransfers(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, perPage, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchTransfers(1), 300);
    return () => clearTimeout(t);
  }, [fetchTransfers]);

  const handleReverse = async (transfer) => {
    const result = await Swal.fire({
      title: t('accountTransfer.reverse_title'),
      html: `
        <p>${t('accountTransfer.reverse_confirm')}</p>
        <p class="mt-2 text-sm text-gray-500">
          ${t('accountTransfer.reference')}: <strong>${transfer.reference_number}</strong><br/>
          ${t('accountTransfer.amount')}: <strong>${formatPrice(transfer.amount)}</strong>
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('accountTransfer.yes_reverse'),
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/account-transfers/${transfer.id}/reverse`, { transfer_id: transfer.id });
        Swal.fire(t('accountTransfer.reversed_success'), t('accountTransfer.reversed_msg'), 'success');
        fetchTransfers(currentPage);
      } catch (err) {
        Swal.fire(t('accountTransfer.error'), err.response?.data?.message || t('accountTransfer.failed_reverse'), 'error');
      }
    }
  };

  const handlePrint = async (id) => {
    try {
      const res = await api.get(`/account-transfers/${id}`);
      const tr = res.data.data;
      const txns = res.data.transactions || [];

      const receiptHtml = buildReceiptHtml(tr, txns);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      const styles = document.querySelectorAll('link[rel="stylesheet"], style');
      let styleTags = '';
      styles.forEach((s) => { styleTags += s.outerHTML; });

      doc.write(`
        <!DOCTYPE html>
        <html>
          <head><title>Receipt</title>${styleTags}</head>
          <body style="margin:0;padding:24px;display:flex;justify-content:center;background:white">
            <div style="width:380px">${receiptHtml}</div>
            <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); } <\/script>
          </body>
        </html>
      `);
      doc.close();
    } catch (err) {
      Swal.fire(t('accountTransfer.error'), t('accountTransfer.failed_load'), 'error');
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/account-transfers/${id}`);
      const tr = res.data.data;
      const txns = res.data.transactions || [];

      const receiptHtml = buildReceiptHtml(tr, txns);
      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.top = '-9999px';
      div.style.left = '-9999px';
      div.style.width = '380px';
      div.style.background = 'white';
      div.style.fontFamily = "'Courier New', Courier, monospace";
      div.style.padding = '24px 20px';
      div.innerHTML = receiptHtml;
      document.body.appendChild(div);

      const canvas = await html2canvas(div, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `receipt-${tr.reference_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(div);
    } catch (err) {
      Swal.fire(t('accountTransfer.error'), t('accountTransfer.failed_load'), 'error');
    }
  };

  const buildReceiptHtml = (tr, txns) => {
    const d = new Date(tr.created_at);
    const statusBadge = statusColors[tr.status] || 'bg-gray-100 text-gray-700';
    const statusLabel = t(`accountTransfer.status_${tr.status}`, { defaultValue: tr.status.charAt(0).toUpperCase() + tr.status.slice(1) });
    let html = `
      <div style="font-family:'Courier New',Courier,monospace">
        <div style="text-align:center;margin-bottom:16px">
          <p style="font-size:18px;font-weight:700;letter-spacing:0.1em;color:#333">${t('accountTransfer.receipt_title')}</p>
          <p style="font-size:10px;color:#999;margin-top:2px">${tr.reference_number}</p>
          <span style="display:inline-block;margin-top:6px;padding:2px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-radius:4px;background:${statusBadge.includes('green') ? '#dcfce7' : statusBadge.includes('red') ? '#fee2e2' : statusBadge.includes('amber') ? '#fef3c7' : '#f3f4f6'};color:${statusBadge.includes('green') ? '#15803d' : statusBadge.includes('red') ? '#b91c1c' : statusBadge.includes('amber') ? '#b45309' : '#374151'}">${statusLabel}</span>
        </div>
        <div style="border-top:1px dashed #ccc;margin-bottom:12px"></div>
        <div style="font-size:10px;color:#666;margin-bottom:12px;line-height:1.5">
          <div style="display:flex;justify-content:space-between"><span>${t('accountTransfer.date')}</span><span>${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
          <div style="display:flex;justify-content:space-between"><span>${t('accountTransfer.time')}</span><span>${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>
        <div style="border-top:1px dashed #ccc;margin-bottom:12px"></div>
        <div style="margin-bottom:12px">
          <p style="font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">${t('accountTransfer.from')}</p>
          <p style="font-size:12px;font-weight:700;color:#111;margin:0">${tr.sender_account?.name || '-'}</p>
          <p style="font-size:10px;color:#777;margin:2px 0 0">${tr.sender_account?.wallet_number || ''}</p>
        </div>
        <div style="margin-bottom:12px">
          <p style="font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">${t('accountTransfer.to')}</p>
          <p style="font-size:12px;font-weight:700;color:#111;margin:0">${tr.receiver_account?.name || '-'}</p>
          <p style="font-size:10px;color:#777;margin:2px 0 0">${tr.receiver_account?.wallet_number || ''}</p>
        </div>
        <div style="border-top:1px dashed #ccc;margin-bottom:12px"></div>
        <div style="text-align:center;margin-bottom:12px">
          <p style="font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin:0">${t('accountTransfer.amount')}</p>
          <p style="font-size:18px;font-weight:700;color:#111;margin-top:2px">${formatPrice(tr.amount)}</p>
        </div>
    `;
    if (tr.note) {
      html += `
        <div style="border-top:1px dashed #ccc;margin-bottom:12px"></div>
        <div style="margin-bottom:12px">
          <p style="font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 2px">${t('accountTransfer.note_label')}</p>
          <p style="font-size:10px;color:#444;margin:0">${tr.note}</p>
        </div>
      `;
    }
    if (txns.length > 0) {
      html += `<div style="border-top:1px dashed #ccc;margin-bottom:12px"></div><div style="margin-bottom:12px"><p style="font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">${t('accountTransfer.ledger')}</p>`;
      txns.forEach((txn) => {
        html += `
          <div style="font-size:10px;margin-bottom:6px;line-height:1.25">
            <div style="display:flex;justify-content:space-between;color:#333"><span style="font-weight:700">${txn.account?.name}</span><span style="font-weight:700">${formatPrice(txn.amount)}</span></div>
            <div style="display:flex;justify-content:space-between;color:#999"><span>${txn.account?.wallet_number || ''}</span><span>${t('accountTransfer.balance')} ${formatPrice(txn.balance_after)}</span></div>
          </div>
        `;
      });
      html += `</div>`;
    }
    html += `
        <div style="border-top:1px dashed #ccc;margin-bottom:12px"></div>
        <div style="text-align:center;font-size:9px;color:#999">
          <p style="margin:0 0 2px">${t('accountTransfer.processed_by', { name: tr.created_by?.name || t('accountTransfer.system') })}</p>
          <p style="margin:0">${t('accountTransfer.comp_gen')}</p>
        </div>
      </div>
    `;
    return html;
  };

  const inputClass = 'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]';

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('accountTransfer.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('accountTransfer.total', { count: total })}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('accountTransfer.search')}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('accountTransfer.search_placeholder')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('accountTransfer.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('accountTransfer.all_status')}</option>
              <option value="completed">{t('accountTransfer.status_completed')}</option>
              <option value="cancelled">{t('accountTransfer.status_cancelled')}</option>
              <option value="reversed">{t('accountTransfer.status_reversed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('accountTransfer.date_from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('accountTransfer.date_to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#007c89] rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-500">{t('accountTransfer.loading')}</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">{t('accountTransfer.empty')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.reference')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.from')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.to')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.amount')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.status_col')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('accountTransfer.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`${basePath}/account-transfers/${transfer.id}`)}
                          className="text-sm font-medium text-[#007c89] hover:underline"
                        >
                          {transfer.reference_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(transfer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{transfer.sender_account?.name}</div>
                        <div className="text-xs text-gray-500">{transfer.sender_account?.wallet_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{transfer.receiver_account?.name}</div>
                        <div className="text-xs text-gray-500">{transfer.receiver_account?.wallet_number}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatPrice(transfer.amount)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[transfer.status] || 'bg-gray-100 text-gray-700'}`}>
                          {t(`accountTransfer.status_${transfer.status}`, { defaultValue: transfer.status })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(transfer.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition"
                            title={t('accountTransfer.print_receipt')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload(transfer.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition"
                            title={t('accountTransfer.download_receipt')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          {transfer.status === 'completed' && !transfer.original_transfer_id && (
                            <button
                              onClick={() => handleReverse(transfer)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                              title={t('accountTransfer.reverse')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <button
                        onClick={() => navigate(`${basePath}/account-transfers/${transfer.id}`)}
                        className="text-sm font-medium text-[#007c89] hover:underline"
                      >
                        {transfer.reference_number}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(transfer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[transfer.status] || 'bg-gray-100 text-gray-700'}`}>
                      {t(`accountTransfer.status_${transfer.status}`, { defaultValue: transfer.status })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-600 truncate">{transfer.sender_account?.name}</span>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="text-gray-600 truncate">{transfer.receiver_account?.name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(transfer.amount)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePrint(transfer.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md"
                        title={t('accountTransfer.print_receipt')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(transfer.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md"
                        title={t('accountTransfer.download_receipt')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {transfer.status === 'completed' && !transfer.original_transfer_id && (
                        <button
                          onClick={() => handleReverse(transfer)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"
                          title={t('accountTransfer.reverse')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('accountTransfer.page_of', { current: currentPage, total: totalPages })}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchTransfers(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('accountTransfer.previous')}
            </button>
            {generatePageNumbers(currentPage, totalPages).map((page, idx) =>
              page === '...' ? (
                <span key={`dots-${idx}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => fetchTransfers(page)}
                  className={`px-3 py-1.5 text-sm border rounded-md ${
                    currentPage === page
                      ? 'bg-[#007c89] text-white border-[#007c89]'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => fetchTransfers(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('accountTransfer.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
