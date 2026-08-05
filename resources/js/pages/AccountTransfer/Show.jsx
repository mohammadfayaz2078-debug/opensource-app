import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';

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

export default function AccountTransferReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/company-admin') ? '/company-admin' : '';
  const [searchParams] = useSearchParams();
  const receiptRef = useRef();
  const [transfer, setTransfer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSender, setCopiedSender] = useState(false);
  const [copiedReceiver, setCopiedReceiver] = useState(false);

  const fetchTransfer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/account-transfers/${id}`);
      setTransfer(res.data.data);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load transfer details', 'error');
      navigate(`${basePath}/accounts`);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTransfer();
  }, [fetchTransfer]);

  useEffect(() => {
    if (!transfer) return;
    if (searchParams.get('print') === '1') {
      setTimeout(() => { window.print(); }, 500);
    } else if (searchParams.get('download') === '1') {
      setTimeout(() => { handleDownload(); }, 500);
    }
  }, [transfer]);

  const handlePrint = () => {
    const receipt = receiptRef.current;
    if (!receipt) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const styles = document.querySelectorAll('link[rel="stylesheet"], style');
    let styleTags = '';
    styles.forEach((s) => { styleTags += s.outerHTML; });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transfer.reference_number}</title>
          ${styleTags}
          <style>
            body { margin: 0; padding: 24px; display: flex; justify-content: center; background: white; }
            @page { margin: 0.1in; }
            * { box-sizing: border-box; }
            #receipt-bill { width: 380px; max-width: 100%; }
          </style>
        </head>
        <body>
          <div id="receipt-bill" style="width:380px">${receipt.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 1000);
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    });
    const link = document.createElement('a');
    link.download = `receipt-${transfer.reference_number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleReverse = async () => {
    const result = await Swal.fire({
      title: 'Reverse Transfer?',
      html: `
        <p>Are you sure you want to reverse this transfer?</p>
        <p class="mt-2 text-sm text-gray-500">
          Amount: <strong>${formatPrice(transfer.amount)}</strong>
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, reverse it',
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/account-transfers/${transfer.id}/reverse`, { transfer_id: transfer.id });
        Swal.fire('Reversed!', 'Transfer has been reversed.', 'success');
        fetchTransfer();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to reverse transfer', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#007c89] rounded-full animate-spin" />
      </div>
    );
  }

  if (!transfer) return null;

  const canReverse = transfer.status === 'completed' && !transfer.original_transfer_id;
  const date = new Date(transfer.created_at);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center print:py-0 print:bg-white">
      {/* Toolbar */}
      <div className="w-[380px] mb-3 print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`${basePath}/accounts`)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-1.5">
            {canReverse && (
              <button
                onClick={handleReverse}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Reverse
              </button>
            )}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-[#007c89] rounded-lg hover:bg-[#006a75] transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Bill */}
      <div
        ref={receiptRef}
        id="receipt-bill"
        className="w-[380px] bg-white shadow-sm border border-gray-200 px-5 py-6 print:shadow-none print:border-0"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-lg font-bold tracking-widest text-gray-800">TRANSFER RECEIPT</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{transfer.reference_number}</p>
          <span className={`inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${statusColors[transfer.status] || 'bg-gray-100 text-gray-700'}`}>
            {transfer.status}
          </span>
        </div>

        <div className="border-t border-dashed border-gray-300 mb-3" />

        {/* Date Time */}
        <div className="text-[10px] text-gray-600 mb-3 leading-relaxed">
          <div className="flex justify-between">
            <span>Date</span>
            <span>{date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Time</span>
            <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 mb-3" />

        {/* From */}
        <div className="mb-3">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">FROM</p>
          <p className="text-xs font-bold text-gray-900">{transfer.sender_account?.name}</p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{transfer.sender_account?.wallet_number}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(transfer.sender_account?.wallet_number);
                setCopiedSender(true);
                setTimeout(() => setCopiedSender(false), 1500);
              }}
            >
              {copiedSender ? (
                <span className="text-[8px] text-green-600 font-bold">Copied!</span>
              ) : (
                <svg className="w-2.5 h-2.5 text-gray-300 hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* To */}
        <div className="mb-3">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">TO</p>
          <p className="text-xs font-bold text-gray-900">{transfer.receiver_account?.name}</p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{transfer.receiver_account?.wallet_number}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(transfer.receiver_account?.wallet_number);
                setCopiedReceiver(true);
                setTimeout(() => setCopiedReceiver(false), 1500);
              }}
            >
              {copiedReceiver ? (
                <span className="text-[8px] text-green-600 font-bold">Copied!</span>
              ) : (
                <svg className="w-2.5 h-2.5 text-gray-300 hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 mb-3" />

        {/* Amount */}
        <div className="text-center mb-3">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Amount</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatPrice(transfer.amount)}</p>
        </div>

        {transfer.note && (
          <>
            <div className="border-t border-dashed border-gray-300 mb-3" />
            <div className="mb-3">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Note</p>
              <p className="text-[10px] text-gray-700">{transfer.note}</p>
            </div>
          </>
        )}

        {/* Ledger */}
        {transactions.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-300 mb-3" />
            <div className="mb-3">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">LEDGER</p>
              {transactions.map((txn) => (
                <div key={txn.id} className="text-[10px] mb-1.5 leading-tight">
                  <div className="flex justify-between text-gray-800">
                    <span className="font-bold">{txn.account?.name}</span>
                    <span className="font-bold">{formatPrice(txn.amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>{txn.account?.wallet_number}</span>
                    <span>Balance: {formatPrice(txn.balance_after)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-gray-300 mb-3" />

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-400">
          <p className="mb-0.5">Processed by {transfer.created_by?.name || 'System'}</p>
          <p>Computer-generated receipt &bull; No signature required</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.1in; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }

          /* Hide sidebar */
          aside.sidebar-container,
          .sidebar-container,
          [class*="sidebar"],
          /* Hide nav, header, fixed, sticky */
          nav, header, footer,
          .fixed, .sticky,
          .print\\:hidden {
            display: none !important;
          }

          /* Hide the header bar in main content */
          [class*="h-14"], 
          [class*="h-16"],
          [class*="flex-shrink-0"] {
            display: none !important;
          }

          /* Reset layout containers */
          main, 
          .flex-1,
          [class*="flex-1"] {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Show only receipt */
          #receipt-bill {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}
