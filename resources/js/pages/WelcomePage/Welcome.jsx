import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import {
  Heart,
  MessageCircle,
  ShoppingCart,
  MapPin,
  X,
  Search,
  User,
  Phone,
  Mail,
  Home,
  Navigation,
  AlertCircle,
  Check,
  ArrowRight,
  ThumbsUp,
  Send,
  Loader2,
  ShoppingBag,
  Package,
  CreditCard,
  Store,
  LogIn,
  Sparkles,
  MapPinned,
  Users,
  Clock,
  Tag,
  Star,
  ChevronRight,
  Menu,
  LayoutGrid,
  List,
  Grid3x3,
} from 'lucide-react';

const CATEGORY_META = {
  Electronics: { gradient: 'from-sky-400 via-blue-500 to-indigo-600', emoji: '🎧', soft: '#dbeafe' },
  Grocery: { gradient: 'from-lime-400 via-emerald-500 to-teal-600', emoji: '🍃', soft: '#d1fae5' },
  Fashion: { gradient: 'from-fuchsia-400 via-pink-500 to-rose-600', emoji: '👕', soft: '#fce7f3' },
  Home: { gradient: 'from-amber-300 via-orange-400 to-orange-600', emoji: '🏠', soft: '#ffedd5' },
  Toys: { gradient: 'from-violet-400 via-purple-500 to-indigo-600', emoji: '🧩', soft: '#ede9fe' },
};

const DEFAULT_META = { gradient: 'from-slate-400 via-slate-500 to-slate-700', emoji: '📦', soft: '#e2e8f0' };

const FEATURES = [
  { label: 'Sales & POS', desc: 'Fast checkout and clear invoices', icon: ShoppingBag, color: 'text-[#ee5b43]', bg: 'bg-[#fff0ec]' },
  { label: 'Live inventory', desc: 'Know what is in stock anywhere', icon: Package, color: 'text-[#078b82]', bg: 'bg-[#e7f8f5]' },
  { label: 'Smart accounts', desc: 'Cash, wallets and ledgers together', icon: CreditCard, color: 'text-[#4d56a5]', bg: 'bg-[#eef0ff]' },
  { label: 'Every branch', desc: 'One view across every location', icon: Store, color: 'text-[#b47708]', bg: 'bg-[#fff5d9]' },
];

const formatPrice = (price) => {
  const value = Number(price ?? 0);
  if (Number.isNaN(value)) return '0.00 AFN';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 2,
  });
};

const getCategoryMeta = (name) => CATEGORY_META[name] || DEFAULT_META;

const getProductImage = (product) =>
  product?.image ||
  product?.image_url ||
  product?.thumbnail ||
  product?.attachments?.[0]?.url ||
  product?.attachments?.[0]?.path ||
  null;

async function fetchProducts() {
  const { data } = await api.get('/publications/public');
  return data?.data ?? data ?? [];
}

const getSessionId = () => {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('visitor_id', id);
  }
  return id;
};

/* ── Product card ─────────────────────────────────────────────── */
const ProductCardWithActions = ({ product, index }) => {
  const sessionId = useRef(getSessionId());

  const categoryName = product.category?.name || product.category_name || 'Product';
  const meta = getCategoryMeta(categoryName);
  const image = getProductImage(product);
  const location = product.location || product.branch?.name || product.city || 'Available';

  const initialLikes = product.likes_count ?? 0;
  const initialComments = product.comments_count ?? (product.comments?.length ?? 0);
  const initialOrders = product.orders_count ?? 0;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentMsg, setCommentMsg] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const commentsListRef = useRef(null);

  const [showDetail, setShowDetail] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_last_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    province: '',
    gps_lat: '',
    gps_lng: '',
    notes: '',
    items: [{ product_id: '', quantity: '1' }],
  });
  const [locating, setLocating] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState(null);

  const handleLike = useCallback(async () => {
    try {
      const res = await api.post(`/products/${product.id}/likes`, {
        session_id: sessionId.current,
      });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 400);
    } catch {
      /* ignore */
    }
  }, [product.id]);

  const openComments = useCallback(async () => {
    setShowComments(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await api.get(`/products/${product.id}/comments`);
        const fetched = res.data?.data ?? [];
        setComments(fetched);
        setCommentsCount(fetched.length);
      } catch {
        /* ignore */
      } finally {
        setLoadingComments(false);
      }
    }
  }, [product.id, comments.length]);

  const handleAddComment = useCallback(async () => {
    if (!commentName.trim() || !commentMsg.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/products/${product.id}/comments`, {
        name: commentName.trim(),
        message: commentMsg.trim(),
      });
      const updated = res.data?.data ?? [];
      setComments(updated);
      setCommentsCount(updated.length);
      setCommentName('');
      setCommentMsg('');
      setTimeout(() => {
        commentsListRef.current?.scrollTo({ top: 9999, behavior: 'smooth' });
      }, 50);
    } catch {
      alert('Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  }, [product.id, commentName, commentMsg]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrderForm((p) => ({
          ...p,
          gps_lat: pos.coords.latitude.toFixed(7),
          gps_lng: pos.coords.longitude.toFixed(7),
        }));
        setLocating(false);
      },
      () => {
        alert('Could not get your location. Please check location permissions.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const handleCheckEmail = useCallback(async (email) => {
    if (!email || !email.includes('@')) return;
    setCheckingEmail(true);
    try {
      const res = await api.get('/customers/check-email', { params: { email } });
      if (res.data.exists) {
        setExistingCustomer(res.data.customer);
        setEmailChecked(true);
        setOrderForm((p) => ({
          ...p,
          customer_name: res.data.customer.first_name || '',
          customer_last_name: res.data.customer.last_name || '',
          customer_phone: res.data.customer.phone || '',
          customer_email: res.data.customer.email || '',
          customer_address: res.data.customer.address || '',
          province: res.data.customer.province || '',
        }));
      } else {
        setExistingCustomer(null);
        setEmailChecked(true);
      }
    } catch {
      /* ignore */
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!orderForm.customer_email.trim()) return;
    if (!existingCustomer && (!orderForm.customer_name.trim() || !orderForm.customer_phone.trim())) return;
    const validItems = orderForm.items.filter(i => i.product_id);
    if (validItems.length === 0) return;
    setOrdering(true);
    try {
      await api.post('/orders', {
        customer_name: orderForm.customer_name.trim(),
        customer_last_name: orderForm.customer_last_name.trim(),
        customer_phone: orderForm.customer_phone.trim(),
        customer_email: orderForm.customer_email.trim(),
        customer_address: orderForm.customer_address.trim(),
        province: orderForm.province.trim(),
        gps_lat: orderForm.gps_lat || null,
        gps_lng: orderForm.gps_lng || null,
        notes: orderForm.notes.trim(),
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity, 10) || 1,
        })),
      });
      alert('Order placed successfully!');
      setShowOrder(false);
      setOrderForm({
        customer_name: '', customer_last_name: '', customer_phone: '',
        customer_email: '', customer_address: '', province: '',
        gps_lat: '', gps_lng: '', notes: '',
        items: [{ product_id: '', quantity: '1' }],
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setOrdering(false);
    }
  }, [orderForm, existingCustomer, emailChecked]);

  const getLocBtnClass = (active) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
      active
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'
    }`;

  const openOrder = useCallback(() => {
    setShowDetail(false);
    setShowOrder(true);
    setEmailChecked(false);
    setExistingCustomer(null);
    setOrderForm({
      customer_name: '',
      customer_last_name: '',
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      province: '',
      gps_lat: '',
      gps_lng: '',
      notes: '',
      items: [{ product_id: String(product.id), quantity: '1' }],
    });
  }, [product.id]);

  useEffect(() => {
    if (showDetail || showComments || showOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetail, showComments, showOrder]);

  const closeAllModals = useCallback(() => {
    setShowDetail(false);
    setShowComments(false);
    setShowOrder(false);
  }, []);

  return (
    <>
      <article
        className="fb-card group relative bg-white rounded-xl overflow-hidden
          border border-gray-200
          shadow-[0_1px_2px_rgba(0,0,0,0.1)]
          hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
          hover:-translate-y-0.5
          transition-all duration-200 flex flex-col"
        style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      >
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="relative w-full aspect-square bg-gray-100 overflow-hidden focus:outline-none"
          aria-label={`View ${product.name}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name || 'Product'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`${image ? 'hidden' : ''} absolute inset-0 bg-gradient-to-br ${meta.gradient}
              flex items-center justify-center`}
          >
            <div className="text-center text-white px-3">
              <div className="text-4xl sm:text-5xl drop-shadow-md mb-2 filter">{meta.emoji}</div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] opacity-90">
                {categoryName}
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <span className="absolute top-2.5 left-2.5 max-w-[72%] truncate
            bg-white/90 backdrop-blur-md text-gray-800 text-[10px] sm:text-[11px] font-semibold
            px-2.5 py-1 rounded-full shadow-sm border border-white/50 tracking-wide">
            {categoryName}
          </span>

          <span className="absolute bottom-2.5 right-2.5
            bg-white/95 backdrop-blur-md text-gray-900 text-xs sm:text-sm font-bold
            px-2.5 py-1 rounded-lg shadow-md border border-white/60 tracking-tight">
            {formatPrice(product.sale_price ?? product.price)}
          </span>
        </button>

        <div className="px-3 sm:px-3.5 pt-3 pb-1.5 flex-1 flex flex-col">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-left focus:outline-none"
          >
            <h3 className="text-[13px] sm:text-[15px] text-gray-900 font-semibold line-clamp-2 leading-snug min-h-[2.5em]
              group-hover:text-[#1877F2] transition-colors">
              {product.name || 'Untitled product'}
            </h3>
          </button>
          <p className="mt-1.5 text-[11px] sm:text-xs text-gray-500 flex items-center gap-1 truncate">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[#1877F2]/60" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
              <path d="M8 0a5 5 0 0 0-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 0 0-5-5zm0 7.5A2.5 2.5 0 1 1 8 2.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span className="truncate">{location}</span>
          </p>
          {product.description && (
            <p className="mt-1.5 text-[11px] sm:text-xs text-gray-400 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="mx-2.5 mb-2.5 mt-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
          <div className="flex items-stretch divide-x divide-gray-200">
            <button
              type="button"
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-2.5 text-[11px] sm:text-xs
                font-semibold transition-all duration-150
                ${liked ? 'text-[#F0284A] bg-red-50/60 hover:bg-red-50' : 'text-gray-500 hover:bg-white hover:text-[#F0284A]'}`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-300 ${likeAnimating ? 'scale-125' : ''}`}
                fill={liked ? 'currentColor' : 'none'}
                strokeWidth={liked ? 0 : 1.8}
              />
              <span className="hidden min-[380px]:inline">{likeCount > 0 ? likeCount : 'Like'}</span>
              <span className="min-[380px]:hidden">{likeCount > 0 ? likeCount : ''}</span>
            </button>

            <button
              type="button"
              onClick={openComments}
              className="flex-1 flex items-center justify-center gap-1 py-2 sm:py-2.5 text-[11px] sm:text-xs
                font-semibold text-gray-500 hover:bg-white hover:text-[#1877F2] transition-all duration-150"
              aria-label="Comments"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="hidden min-[380px]:inline">{commentsCount > 0 ? commentsCount : 'Comment'}</span>
              <span className="min-[380px]:hidden">{commentsCount > 0 ? commentsCount : ''}</span>
            </button>

            <button
              type="button"
              onClick={openOrder}
              className="flex-1 flex items-center justify-center gap-1 py-2 sm:py-2.5 text-[11px] sm:text-xs
                font-semibold text-[#1877F2] hover:bg-blue-50 active:bg-blue-100 transition-all duration-150"
              aria-label="Order"
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={1.8} />
              <span className="hidden min-[380px]:inline">{initialOrders > 0 ? initialOrders : 'Order'}</span>
              <span className="min-[380px]:hidden">{initialOrders > 0 ? initialOrders : ''}</span>
            </button>
          </div>
        </div>
      </article>

      {/* ── Expanded product detail modal ────────────────── */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fb-modal-overlay p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeAllModals(); }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl
            shadow-2xl flex flex-col fb-modal-panel overflow-hidden">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-gray-100 overflow-hidden">
                {image ? (
                  <img
                    src={image}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${meta.gradient}
                    flex items-center justify-center`}>
                    <div className="text-center text-white">
                      <div className="text-6xl sm:text-7xl drop-shadow-xl mb-3">{meta.emoji}</div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-85">{categoryName}</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-800
                  text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md border border-white/50">
                  {categoryName}
                </span>

                <button
                  type="button"
                  onClick={closeAllModals}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60
                    text-white flex items-center justify-center backdrop-blur-sm transition shadow-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>

                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-gray-900
                  text-lg sm:text-xl font-bold px-4 py-1.5 rounded-xl shadow-lg border border-white/50">
                  {formatPrice(product.sale_price ?? product.price)}
                </div>
              </div>

              <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {product.name || 'Untitled product'}
                </h2>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 font-medium">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1877F2]/60" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 0a5 5 0 0 0-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 0 0-5-5zm0 7.5A2.5 2.5 0 1 1 8 2.5a2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    {location}
                  </span>
                  {product.barcode && (
                    <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                      SKU: {product.barcode}
                    </span>
                  )}
                </div>

                {product.description ? (
                  <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {product.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-gray-400 italic border-t border-gray-100 pt-4">
                    No description available.
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className={`font-bold ${liked ? 'text-[#F0284A]' : 'text-gray-600'}`}>
                      {likeCount}
                    </span>
                    <span className="text-gray-400 text-xs font-medium">likes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-gray-600">{commentsCount}</span>
                    <span className="text-gray-400 text-xs font-medium">comments</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-amber-600">{initialOrders}</span>
                    <span className="text-gray-400 text-xs font-medium">orders</span>
                  </div>
                  {product.stock_balance !== undefined && product.stock_balance !== null && (
                    <div className="flex items-center gap-1.5 text-sm ml-auto">
                      <span className={`font-bold ${parseFloat(product.stock_balance) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {parseFloat(product.stock_balance) > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-3.5 shrink-0 bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold transition
                  ${liked
                    ? 'bg-red-50 text-[#F0284A] border border-red-200 hover:bg-red-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-[#F0284A]'
                  }`}
              >
                <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 1.8} />
                {likeCount > 0 ? likeCount : 'Like'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDetail(false); openComments(); }}
                className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold
                  bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-[#1877F2] transition"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                {commentsCount > 0 ? commentsCount : 'Comment'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={openOrder}
                className="flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg text-sm font-bold
                  bg-[#1877F2] text-white shadow-lg shadow-[#1877F2]/25
                  hover:bg-[#166FE5] active:scale-[0.97] transition"
              >
                <ShoppingCart className="w-4 h-4" strokeWidth={1.8} />
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments modal */}
      {showComments && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fb-modal-overlay p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white w-full max-w-lg max-h-[88dvh] sm:max-h-[82vh] rounded-t-2xl sm:rounded-2xl
            shadow-2xl flex flex-col fb-modal-panel overflow-hidden">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0 ring-2 ring-gray-100">
                  {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white text-lg`}>
                      {meta.emoji}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 leading-tight truncate">{product.name}</p>
                  <p className="text-xs font-semibold text-[#1877F2] mt-0.5">
                    {formatPrice(product.sale_price ?? product.price)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAllModals}
                className="w-9 h-9 rounded-full flex items-center justify-center
                  bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div ref={commentsListRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {loadingComments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-2 border-gray-200 border-t-[#1877F2] rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-2xl mb-3">
                    💬
                  </div>
                  <p className="text-gray-700 text-sm font-semibold">No comments yet</p>
                  <p className="text-gray-400 text-xs mt-1">Be the first to share your thoughts</p>
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={idx} className="flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0C5DC7]
                      flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                      {(c.name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                        <p className="text-xs font-bold text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                          {c.message}
                        </p>
                      </div>
                      {c.created_at && (
                        <p className="text-[11px] text-gray-400 mt-1 ml-1.5">
                          {new Date(c.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 px-4 py-3.5 shrink-0 bg-white space-y-2">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your name…"
                maxLength={255}
                className="w-full px-4 py-2.5 text-sm bg-gray-100 rounded-full border border-gray-200
                  outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]
                  placeholder:text-gray-400 transition"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentMsg}
                  onChange={(e) => setCommentMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Write a comment…"
                  maxLength={1000}
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-100 rounded-full border border-gray-200
                    outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]
                    placeholder:text-gray-400 transition"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={submittingComment || !commentName.trim() || !commentMsg.trim()}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full
                    bg-[#1877F2] text-white shadow-md shadow-[#1877F2]/25
                    hover:bg-[#166FE5]
                    disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Send comment"
                >
                  {submittingComment ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order modal */}
      {showOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fb-modal-overlay p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl
            shadow-2xl flex flex-col fb-modal-panel overflow-hidden">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Place Order</h2>
                <p className="text-xs text-gray-500 mt-0.5">We&apos;ll contact you to confirm</p>
              </div>
              <button
                type="button"
                onClick={closeAllModals}
                className="w-9 h-9 rounded-full flex items-center justify-center
                  bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={orderForm.customer_email}
                    onChange={(e) => {
                      setOrderForm((p) => ({ ...p, customer_email: e.target.value }));
                      setEmailChecked(false);
                      setExistingCustomer(null);
                    }}
                    onBlur={(e) => handleCheckEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCheckEmail(e.target.value);
                      }
                    }}
                    placeholder="Enter your email"
                    className="flex-1 px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200
                      outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]
                      placeholder:text-gray-400 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckEmail(orderForm.customer_email)}
                    disabled={checkingEmail || !orderForm.customer_email.includes('@')}
                    className="shrink-0 px-4 py-3 rounded-xl text-sm font-bold text-white
                      bg-[#1877F2] hover:bg-[#166FE5]
                      disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {checkingEmail ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Check'
                    )}
                  </button>
                </div>
              </div>

              {emailChecked && existingCustomer && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">
                        Welcome back, {existingCustomer.first_name}!
                      </p>
                      <p className="text-xs text-emerald-600">
                        {existingCustomer.first_name} {existingCustomer.last_name} • {existingCustomer.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {emailChecked && !existingCustomer && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={orderForm.customer_name}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_name: e.target.value }))}
                        placeholder="First name"
                        className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200
                          outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]
                          placeholder:text-gray-400 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={orderForm.customer_last_name}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_last_name: e.target.value }))}
                        placeholder="Last name"
                        className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200
                          outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]
                          placeholder:text-gray-400 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Phone <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="tel" 
                        value={orderForm.customer_phone}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_phone: e.target.value }))}
                        placeholder="Phone number"
                        className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] placeholder:text-gray-400 transition"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Province</label>
                      <input 
                        type="text" 
                        value={orderForm.province}
                        onChange={(e) => setOrderForm((p) => ({ ...p, province: e.target.value }))}
                        placeholder="Province / State"
                        className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] placeholder:text-gray-400 transition" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Address</label>
                    <textarea 
                      value={orderForm.customer_address}
                      onChange={(e) => setOrderForm((p) => ({ ...p, customer_address: e.target.value }))}
                      rows={2} 
                      placeholder="Street, city, area..."
                      className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] placeholder:text-gray-400 resize-none transition" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">GPS Location</label>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={handleGetLocation} 
                        disabled={locating}
                        className={`${getLocBtnClass(!!(orderForm.gps_lat && orderForm.gps_lng))} disabled:opacity-50`}
                      >
                        {locating ? (
                          <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Detecting…</>
                        ) : (
                          <><Navigation className="w-3.5 h-3.5" strokeWidth={2} />
                            {orderForm.gps_lat && orderForm.gps_lng ? '📍 Located' : '📍 Get Location'}
                          </>
                        )}
                      </button>
                      {orderForm.gps_lat && orderForm.gps_lng && (
                        <span className="text-[10px] text-gray-400 font-mono truncate">
                          {orderForm.gps_lat}, {orderForm.gps_lng}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea 
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={1} 
                  placeholder="Any special requests?"
                  className="w-full px-3.5 py-3 text-sm bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] placeholder:text-gray-400 resize-none transition" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order Item</label>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase w-20">Qty</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase w-24">Price</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="text-xs font-semibold text-gray-800">{product.name}</div>
                          <div className="text-[10px] text-gray-400">{formatPrice(product.sale_price)} each</div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input 
                            type="number" 
                            min="1" 
                            value={orderForm.items[0]?.quantity || '1'}
                            onChange={(e) => {
                              const items = [...orderForm.items];
                              items[0] = { ...items[0], quantity: e.target.value };
                              setOrderForm(prev => ({ ...prev, items }));
                            }}
                            className="w-16 px-2 py-1.5 text-xs text-center bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#1877F2]" 
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-600">{formatPrice(product.sale_price)}</td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-800">{formatPrice((parseFloat(product.sale_price) || 0) * (parseInt(orderForm.items[0]?.quantity) || 0))}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan="3" className="px-3 py-2 text-right text-xs font-bold text-gray-600">Total:</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-[#1877F2]">
                          {formatPrice((parseFloat(product.sale_price) || 0) * (parseInt(orderForm.items[0]?.quantity) || 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 shrink-0 flex gap-3 bg-white">
              <button
                type="button"
                onClick={closeAllModals}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600
                  bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={ordering || !orderForm.customer_email.trim() || (emailChecked && !existingCustomer && (!orderForm.customer_name.trim() || !orderForm.customer_phone.trim())) || !emailChecked}
                className="flex-[2] py-3 rounded-xl text-sm font-bold text-white
                  bg-[#1877F2] hover:bg-[#166FE5]
                  shadow-lg shadow-[#1877F2]/25
                  disabled:opacity-40 disabled:cursor-not-allowed transition
                  flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Placing…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2.2} />
                    Place Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ProductSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse shadow-sm">
    <div className="aspect-square bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-4 bg-gray-100 rounded-md w-full" />
      <div className="h-4 bg-gray-100 rounded-md w-3/5" />
      <div className="h-3 bg-gray-100 rounded-md w-1/2" />
      <div className="h-9 bg-gray-100 rounded-lg w-full mt-2" />
    </div>
  </div>
);

/* ── Main page ────────────────────────────────────────────────── */
const Welcome = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load products. Please try again later.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = useMemo(() => {
    const names = new Set(products.map((p) => p.category?.name || p.category_name).filter(Boolean));
    return ['All', ...Array.from(names)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const cat = p.category?.name || p.category_name;
      const matchCat = activeCategory === 'All' || cat === activeCategory;
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        cat?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, activeCategory]);

  const featuredProducts = useMemo(
    () => products.filter((product) => getProductImage(product)).slice(0, 3),
    [products],
  );

  return (
    <div className="fb-page min-h-screen min-h-[100dvh] text-gray-900 antialiased" dir="ltr">
      <style>{`
        .fb-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-tap-highlight-color: transparent;
          background: #f6f7f8;
          color: #17211f;
        }

        .fb-card {
          animation: fbFadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes fbFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fbModalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes fbOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fb-modal-overlay {
          animation: fbOverlayIn 0.2s ease-out both;
        }

        .fb-modal-panel {
          animation: fbModalIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .fb-hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .fb-hide-scrollbar::-webkit-scrollbar { display: none; }

        .fb-tabs-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .fb-tabs-scroll::-webkit-scrollbar { display: none; }

        @media (prefers-reduced-motion: reduce) {
          .fb-card,
          .fb-modal-overlay,
          .fb-modal-panel {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <header className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled ? 'bg-white/95 border-gray-200 shadow-sm backdrop-blur-xl' : 'bg-white border-transparent'
      }`}>
        <div className="max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-6">
          <div className="h-14 sm:h-[3.75rem] flex items-center justify-between gap-2 sm:gap-4">
            <Link
              to="/welcome"
              className="flex items-center gap-2.5 shrink-0 group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-10 h-10 rounded-lg bg-[#17211f] flex items-center justify-center shadow-sm">
                <span className="text-white font-extrabold text-xl">B</span>
              </div>
              <span className="hidden sm:block text-[#17211f] font-black text-xl">
                Bazar<span className="text-[#ee5b43]">Net</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="flex items-center w-full bg-[#f3f5f4] rounded-lg px-4 h-10 border border-transparent
                focus-within:bg-white focus-within:border-[#078b82] focus-within:ring-4 focus-within:ring-[#078b82]/10 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2.2} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, categories or places"
                  className="bg-transparent border-0 outline-none text-sm ml-2.5 w-full text-gray-800 placeholder:text-gray-400"
                  aria-label="Search products"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-full
                  text-gray-600 bg-[#f0f2f5] hover:bg-gray-200 transition"
                aria-label="Toggle search"
                aria-expanded={mobileSearchOpen}
              >
                <Search className="w-5 h-5" strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center justify-center h-10 px-5 rounded-full
                  text-sm font-bold text-white bg-[#17211f] hover:bg-[#293633]
                  shadow-sm transition"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="sm:hidden inline-flex items-center justify-center h-9 px-4 rounded-full
                  text-xs font-bold text-white bg-[#17211f] hover:bg-[#293633]
                  shadow-sm transition"
              >
                Log in
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="md:hidden pb-3">
              <div className="flex items-center bg-[#f0f2f5] rounded-full px-4 h-10">
                <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2.2} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search bazarnet"
                  autoFocus
                  className="bg-transparent border-0 outline-none text-sm ml-2 w-full text-gray-800 placeholder:text-gray-400"
                  aria-label="Search products"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-[#eef3f1] border-b border-[#dce5e1] overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-6 py-10 sm:py-14 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
            <div className="max-w-xl xl:max-w-2xl text-left mx-auto lg:mx-0">
              <div className="inline-flex items-center gap-2 text-[#078b82]
                text-xs font-extrabold uppercase mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Local commerce, made simple
              </div>

              <h1 className="text-[2.35rem] sm:text-5xl lg:text-[4rem] font-black leading-[1.02]">
                <span className="text-[#17211f]">Buy local. Run your business </span>
                <span className="text-[#ee5b43]">better.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[#52605c] leading-relaxed max-w-xl">
                Discover products near you, order in a few taps, and manage sales, stock and accounts from one dependable platform.
              </p>

              <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center
                justify-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="h-12 px-6 rounded-lg bg-[#17211f] text-white font-bold text-sm
                    shadow-lg shadow-black/10 hover:bg-[#293633] hover:-translate-y-0.5 active:translate-y-0 transition inline-flex items-center justify-center gap-2"
                >
                  Open your workspace <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#products"
                  className="h-12 px-6 rounded-lg bg-white text-[#17211f] font-bold text-sm transition inline-flex items-center justify-center gap-2
                    border border-[#cad6d1] hover:border-[#078b82] hover:text-[#078b82] hover:-translate-y-0.5"
                >
                  <ShoppingBag className="w-4 h-4" /> Browse marketplace
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-start gap-6 sm:gap-9">
                {[
                  { n: loading ? '—' : String(products.length), l: 'Products' },
                  { n: loading ? '—' : String(Math.max(categories.length - 1, 0)), l: 'Categories' },
                  { n: '24/7', l: 'Available' },
                ].map((s) => (
                  <div key={s.l} className="text-left min-w-[4.5rem]">
                    <p className="text-xl sm:text-2xl font-black text-[#17211f]">{s.n}</p>
                    <p className="text-[11px] sm:text-xs font-bold text-[#71807b] uppercase mt-1">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full max-w-lg mx-auto lg:mx-0">
              <div className="relative aspect-[4/3] bg-[#17211f] rounded-lg p-4 sm:p-6 shadow-2xl shadow-[#17211f]/20 overflow-hidden">
                <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
                  <div className="row-span-2 rounded-lg overflow-hidden bg-[#dce7e3]">
                    {featuredProducts[0] ? (
                      <img src={getProductImage(featuredProducts[0])} alt={featuredProducts[0].name} className="w-full h-full object-cover" />
                    ) : <div className="h-full flex items-center justify-center"><ShoppingBag className="w-14 h-14 text-[#078b82]" /></div>}
                  </div>
                  <div className="rounded-lg overflow-hidden bg-[#fee5dd]">
                    {featuredProducts[1] ? (
                      <img src={getProductImage(featuredProducts[1])} alt={featuredProducts[1].name} className="w-full h-full object-cover" />
                    ) : <div className="h-full flex items-center justify-center"><Store className="w-10 h-10 text-[#ee5b43]" /></div>}
                  </div>
                  <div className="rounded-lg overflow-hidden bg-[#fff1c9]">
                    {featuredProducts[2] ? (
                      <img src={getProductImage(featuredProducts[2])} alt={featuredProducts[2].name} className="w-full h-full object-cover" />
                    ) : <div className="h-full flex items-center justify-center"><Package className="w-10 h-10 text-[#b47708]" /></div>}
                  </div>
                </div>
                <div className="absolute left-8 bottom-8 bg-white rounded-lg px-4 py-3 shadow-xl flex items-center gap-3 max-w-[220px]">
                  <span className="w-9 h-9 rounded-full bg-[#e7f8f5] text-[#078b82] flex items-center justify-center shrink-0"><Check className="w-5 h-5" /></span>
                  <span><strong className="block text-xs sm:text-sm text-[#17211f]">Easy ordering</strong><small className="block text-[10px] sm:text-xs text-[#71807b]">Direct from local sellers</small></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {FEATURES.map((item) => {
                  const Icon = item.icon;
                  return <div key={item.label} className="bg-white/80 border border-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
                    <span className={`w-9 h-9 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4" /></span>
                    <span className="text-xs sm:text-sm font-bold text-[#17211f]">{item.label}</span>
                  </div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────── */}
      <main id="products" className="relative max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-6 py-8 sm:py-12 scroll-mt-14">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-5 sm:mb-6">
          <div className="px-4 sm:px-5 pt-4 pb-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#ee5b43] mb-1">Discover nearby</p>
                <h2 className="text-xl sm:text-2xl font-black text-[#17211f]">Fresh from the marketplace</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {loading
                    ? 'Loading products…'
                    : `${filtered.length} product${filtered.length === 1 ? '' : 's'}${
                        activeCategory !== 'All' ? ` in ${activeCategory}` : ''
                      }`}
                </p>
              </div>
            </div>
          </div>

          <div className="px-2 sm:px-3 pb-3 pt-2">
            <div className="flex gap-1.5 overflow-x-auto pb-2 fb-tabs-scroll">
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 h-9 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-semibold
                      transition-all duration-150 whitespace-nowrap ${
                      active
                        ? 'bg-[#17211f] text-white'
                        : 'bg-[#f0f2f5] text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700
            px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={loadProducts}
              className="shrink-0 font-bold text-[#1877F2] hover:text-[#166FE5] self-start sm:self-auto"
            >
              Retry →
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200
            py-14 sm:py-20 px-6 text-center shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gray-100
              flex items-center justify-center text-3xl sm:text-4xl mb-4">
              🔍
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">No products found</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Try another search or category. Published products will appear here.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
              className="mt-5 inline-flex h-10 px-6 items-center justify-center rounded-full
                bg-[#1877F2] text-white font-bold text-sm hover:bg-[#166FE5] transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((product, index) => (
              <ProductCardWithActions
                key={product.id ?? `${product.name}-${index}`}
                product={product}
                index={index}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-[#17211f] border-t border-[#17211f] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ee5b43] flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">B</span>
              </div>
              <div>
                <p className="font-extrabold text-white text-sm leading-none">
                  BazarNet
                </p>
                <p className="text-[10px] text-white/55 mt-0.5 font-medium">Local commerce, connected</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-white/55">
              {['Sales', 'Inventory', 'Wallets', 'Branches'].map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && <span className="text-gray-300 hidden sm:inline">·</span>}
                  <span className="hover:text-white transition cursor-default">{item}</span>
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs font-medium text-white/45">
              © {new Date().getFullYear()} BazarNet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
