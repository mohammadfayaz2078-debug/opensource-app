import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentName, setCommentName] = useState('');
  const [commentMsg, setCommentMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    customer_address: '', notes: '',
    items: [{ product_id: '', quantity: '1' }],
  });
  const [ordering, setOrdering] = useState(false);

  const sessionId = localStorage.getItem('visitor_id') || (() => { const id = 'v_' + Math.random().toString(36).slice(2); localStorage.setItem('visitor_id', id); return id; })();

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/publications/public/${id}`);
      setProduct(res.data.data);
      setComments(res.data.data?.comments || []);
      const likeRes = await api.get(`/products/${id}/likes`);
      setLikeCount(likeRes.data.count || 0);
      const likeCheck = await api.get(`/products/${id}/likes`, { params: { session_id: sessionId } });
      setLiked(likeCheck.data.liked || false);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const handleLike = async () => {
    try {
      const res = await api.post(`/products/${id}/likes`, { session_id: sessionId });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async () => {
    if (!commentName.trim() || !commentMsg.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/products/${id}/comments`, { name: commentName, message: commentMsg });
      setComments(res.data.data);
      setCommentName('');
      setCommentMsg('');
    } catch (err) { alert(err.response?.data?.message || t('product.failed')); }
    finally { setSubmitting(false); }
  };

  const orderTotal = orderForm.items.reduce((sum, item) => {
    return sum + (parseFloat(product.sale_price || 0) * (parseInt(item.quantity) || 0));
  }, 0);

  const handleOrder = async () => {
    if (!orderForm.customer_name.trim()) return;
    setOrdering(true);
    try {
      await api.post('/orders', {
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        customer_email: orderForm.customer_email,
        customer_address: orderForm.customer_address,
        notes: orderForm.notes,
        items: [{ product_id: parseInt(id), quantity: parseInt(orderForm.items[0]?.quantity) || 1 }],
      });
      alert(t('product.order_placed'));
      setShowOrderModal(false);
      setOrderForm({
        customer_name: '', customer_phone: '', customer_email: '',
        customer_address: '', notes: '',
        items: [{ product_id: String(id), quantity: '1' }],
      });
    } catch (err) { alert(err.response?.data?.message || t('product.failed')); }
    finally { setOrdering(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div></div>;
  if (!product) return null;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline mb-4">&larr; {t('product.back')}</button>

        {/* Product Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{product.category?.name || t('product.single')}</p>
              <p className="text-2xl font-bold text-[#007c89] mt-2">{parseFloat(product.sale_price || 0).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleLike}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition ${liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {likeCount}
              </button>
              <button onClick={() => { setOrderForm(prev => ({ ...prev, items: [{ product_id: String(id), quantity: '1' }] })); setShowOrderModal(true); }}
                className="px-4 py-2 bg-[#007c89] text-white rounded-md text-sm font-medium hover:bg-[#006d77]">
                {t('product.order_now')}
              </button>
            </div>
          </div>
          {product.description && <p className="text-gray-600 mt-3">{product.description}</p>}
        </div>

        {/* Comments */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.comments', { count: comments.length })}</h2>

          <div className="flex gap-3 mb-4">
            <input type="text" value={commentName} onChange={e => setCommentName(e.target.value)} placeholder={t('product.your_name')}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
            <input type="text" value={commentMsg} onChange={e => setCommentMsg(e.target.value)} placeholder={t('product.write_comment')}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
            <button onClick={handleAddComment} disabled={submitting}
              className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50">
              {submitting ? '...' : t('product.post')}
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('product.no_comments')}</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.created_at}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowOrderModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 z-10 max-h-[90vh] overflow-y-auto">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-semibold text-gray-900">{t('product.create_order')}</h2>
                <button onClick={() => setShowOrderModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{t('product.customer_info')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{t('product.full_name')}</label>
                      <input type="text" value={orderForm.customer_name} onChange={e => setOrderForm({ ...orderForm, customer_name: e.target.value })} className={inputCls} placeholder={t('product.customer_name_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{t('product.phone')}</label>
                      <input type="text" value={orderForm.customer_phone} onChange={e => setOrderForm({ ...orderForm, customer_phone: e.target.value })} className={inputCls} placeholder={t('product.phone_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{t('product.email')}</label>
                      <input type="email" value={orderForm.customer_email} onChange={e => setOrderForm({ ...orderForm, customer_email: e.target.value })} className={inputCls} placeholder={t('product.email_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{t('product.address')}</label>
                      <input type="text" value={orderForm.customer_address} onChange={e => setOrderForm({ ...orderForm, customer_address: e.target.value })} className={inputCls} placeholder={t('product.address_placeholder')} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{t('product.notes')}</label>
                    <textarea value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} rows="2" className={inputCls} placeholder={t('product.notes_placeholder')} />
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{t('product.order_item')}</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('product.col_product')}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase w-24">{t('product.col_qty')}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase w-28">{t('product.col_price')}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase w-28">{t('product.col_total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-400">{t('product.each', { price: parseFloat(product.sale_price || 0).toFixed(2) })}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="number" min="1" value={orderForm.items[0]?.quantity || '1'}
                              onChange={e => {
                                const items = [...orderForm.items];
                                items[0] = { ...items[0], quantity: e.target.value };
                                setOrderForm(prev => ({ ...prev, items }));
                              }}
                              className="w-20 px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-gray-700">{parseFloat(product.sale_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">{orderTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td colSpan="3" className="px-3 py-2 text-right text-sm font-semibold text-gray-700">{t('product.total_colon')}</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-[#007c89]">{orderTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md">{t('cancel')}</button>
                <button onClick={handleOrder} disabled={ordering}
                  className="px-6 py-2 text-sm bg-[#007c89] text-white font-medium rounded-md hover:bg-[#006d77] disabled:opacity-50">
                  {ordering ? t('product.placing') : t('product.place_order')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
