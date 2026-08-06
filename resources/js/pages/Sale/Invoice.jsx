import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function SaleInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    api.get(`/sales/${id}`)
      .then(r => setSale(r.data.data))
      .catch(() => navigate('/sales'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${t('sale.invoice_badge')} ${sale?.reference_no || ''}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:40px;color:#333}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:2px solid #007c89;padding-bottom:20px}
        .company-info h1{font-size:24px;color:#007c89;margin-bottom:5px}
        .company-info p,.invoice-title p{font-size:12px;color:#666}
        .invoice-title{text-align:right}
        .invoice-title h2{font-size:28px;color:#007c89}
        .details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px}
        .details-box{background:#f9f9f9;padding:15px;border-radius:5px}
        .details-box h3{font-size:12px;text-transform:uppercase;color:#666;margin-bottom:8px}
        .details-box p{font-size:13px;margin:3px 0}
        table{width:100%;border-collapse:collapse;margin-bottom:30px}
        th{background:#007c89;color:white;padding:10px;text-align:left;font-size:12px;text-transform:uppercase}
        td{padding:10px;border-bottom:1px solid #eee;font-size:13px}
        tr:nth-child(even){background:#f9f9f9}
        .totals{display:flex;justify-content:flex-end}
        .totals-box{width:300px}
        .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
        .totals-row.total{font-weight:bold;font-size:16px;border-top:2px solid #007c89;padding-top:10px}
        .totals-row.paid{color:#16a34a}
        .totals-row.due{color:#dc2626;font-weight:bold}
        .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <div class="company-info"><h1>${t('sale.invoice_badge')}</h1><p>${t('sale.reference_colon', { ref: sale?.reference_no || '' })}</p></div>
        <div class="invoice-title"><h2>${t('sale.invoice_badge')}</h2><p>${t('sale.date_colon', { date: sale?.document_date || '' })}</p>${sale?.due_date ? `<p>${t('sale.due_colon', { due: sale.due_date })}</p>` : ''}</div>
      </div>
      <div class="details">
        <div class="details-box"><h3>${t('sale.customer_header')}</h3><p><strong>${sale?.customer?.first_name || ''} ${sale?.customer?.last_name || ''}</strong></p><p>${sale?.customer?.phone || ''}</p><p>${sale?.customer?.email || ''}</p></div>
        <div class="details-box"><h3>${t('sale.invoice_details_header')}</h3><p><strong>${t('sale.reference_colon', { ref: sale?.reference_no || '' })}</strong></p><p><strong>${t('sale.date_colon', { date: sale?.document_date || '' })}</strong></p>${sale?.due_date ? `<p><strong>${t('sale.due_colon', { due: sale.due_date })}</strong></p>` : ''}${sale?.account ? `<p><strong>${t('sale.wallet_colon', { wallet: sale.account.name })}</strong></p>` : ''}</div>
      </div>
      <table><thead><tr><th>#</th><th>${t('sale.col_product')}</th><th style="text-align:right">${t('sale.col_qty')}</th><th style="text-align:right">${t('sale.delivered')}</th><th style="text-align:right">${t('sale.col_price')}</th><th style="text-align:right">${t('sale.col_total')}</th></tr></thead>
      <tbody>${sale?.items?.map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.product?.name || '—'}</td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${item.delivered_qty}</td><td style="text-align:right">${parseFloat(item.unit_price).toFixed(2)}</td><td style="text-align:right;font-weight:bold">${parseFloat(item.total).toFixed(2)}</td></tr>`).join('') || ''}</tbody></table>
      <div class="totals"><div class="totals-box">
        <div class="totals-row"><span>${t('sale.subtotal')}:</span><span>${parseFloat(sale?.subtotal || 0).toFixed(2)}</span></div>
        <div class="totals-row"><span>${t('sale.discount')}:</span><span>-${parseFloat(sale?.discount_value || 0).toFixed(2)}</span></div>
        <div class="totals-row"><span>${t('sale.shipping')}:</span><span>${parseFloat(sale?.shipping_cost || 0).toFixed(2)}</span></div>
        <div class="totals-row total"><span>${t('sale.total')}:</span><span>${parseFloat(sale?.total_amount || 0).toFixed(2)}</span></div>
        <div class="totals-row paid"><span>${t('sale.paid')}:</span><span>${parseFloat(sale?.paid_amount || 0).toFixed(2)}</span></div>
        <div class="totals-row due"><span>${t('sale.due')}:</span><span>${(parseFloat(sale?.total_amount || 0) - parseFloat(sale?.paid_amount || 0)).toFixed(2)}</span></div>
      </div></div>
      ${sale?.notes ? `<div class="footer"><p><strong>${t('sale.notes')}:</strong> ${sale.notes}</p></div>` : ''}
      <div class="footer"><p>${t('sale.generated_on', { date: new Date().toLocaleDateString() })}</p></div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('sale.loading_invoice')}</div>;
  if (!sale) return null;

  const unpaid = parseFloat(sale.total_amount) - parseFloat(sale.paid_amount);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline">&larr; {t('sale.back')}</button>
        <button onClick={handlePrint} className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10V5z" /></svg>
          {t('sale.print_invoice')}
        </button>
      </div>
      <div ref={printRef} className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-[#007c89]">
          <div><h1 className="text-2xl font-bold text-[#007c89]">{t('sale.invoice_badge')}</h1><p className="text-sm text-gray-500 mt-1">{t('sale.reference_colon', { ref: sale.reference_no })}</p></div>
          <div className="text-right"><h2 className="text-lg font-bold text-[#007c89]">{t('sale.invoice_badge')}</h2><p className="text-sm text-gray-500">{t('sale.date_colon', { date: sale.document_date })}</p>{sale.due_date && <p className="text-sm text-gray-500">{t('sale.due_colon', { due: sale.due_date })}</p>}</div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{t('sale.customer_header')}</h3>
            <p className="font-medium">{sale.customer?.first_name} {sale.customer?.last_name}</p>
            <p className="text-sm text-gray-600">{sale.customer?.phone}</p>
            <p className="text-sm text-gray-600">{sale.customer?.email}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{t('sale.invoice_details_header')}</h3>
            <p className="text-sm"><span className="text-gray-500">{t('sale.reference_colon', { ref: sale.reference_no })} </span></p>
            <p className="text-sm"><span className="text-gray-500">{t('sale.date_colon', { date: sale.document_date })} </span></p>
            {sale.due_date && <p className="text-sm"><span className="text-gray-500">{t('sale.due_colon', { due: sale.due_date })} </span></p>}
            {sale.account && <p className="text-sm"><span className="text-gray-500">{t('sale.wallet_colon', { wallet: sale.account.name })} </span></p>}
          </div>
        </div>
        <table className="w-full mb-8">
          <thead><tr className="bg-[#007c89] text-white"><th className="px-4 py-3 text-left text-xs font-medium uppercase">#</th><th className="px-4 py-3 text-left text-xs font-medium uppercase">{t('sale.col_product')}</th><th className="px-4 py-3 text-right text-xs font-medium uppercase">{t('sale.col_qty')}</th><th className="px-4 py-3 text-right text-xs font-medium uppercase">{t('sale.delivered')}</th><th className="px-4 py-3 text-right text-xs font-medium uppercase">{t('sale.col_price')}</th><th className="px-4 py-3 text-right text-xs font-medium uppercase">{t('sale.col_total')}</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{sale.items?.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product?.name || '—'}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">{item.quantity}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">{item.delivered_qty}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">{parseFloat(item.unit_price).toFixed(2)}</td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{parseFloat(item.total).toFixed(2)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="flex justify-end"><div className="w-72">
          <div className="flex justify-between py-2 text-sm"><span className="text-gray-600">{t('sale.subtotal')}</span><span>{parseFloat(sale.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between py-2 text-sm"><span className="text-gray-600">{t('sale.discount')}</span><span className="text-red-600">-{parseFloat(sale.discount_value).toFixed(2)}</span></div>
          <div className="flex justify-between py-2 text-sm"><span className="text-gray-600">{t('sale.shipping')}</span><span>{parseFloat(sale.shipping_cost).toFixed(2)}</span></div>
          <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-[#007c89] mt-2"><span>{t('sale.total')}</span><span>{parseFloat(sale.total_amount).toFixed(2)}</span></div>
          <div className="flex justify-between py-2 text-sm text-green-600"><span>{t('sale.paid')}</span><span>{parseFloat(sale.paid_amount).toFixed(2)}</span></div>
          <div className="flex justify-between py-2 text-sm text-red-600 font-bold"><span>{t('sale.due')}</span><span>{unpaid.toFixed(2)}</span></div>
        </div></div>
        {sale.notes && <div className="mt-8 pt-4 border-t border-gray-200"><p className="text-sm text-gray-600"><strong>{t('sale.notes')}:</strong> {sale.notes}</p></div>}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">{t('sale.generated_on', { date: new Date().toLocaleDateString() })}</div>
      </div>
    </div>
  );
}
