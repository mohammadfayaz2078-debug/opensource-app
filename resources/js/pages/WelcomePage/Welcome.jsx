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
  { label: 'Sales & POS', desc: 'Fast checkout & invoices', icon: ShoppingBag, ring: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
  { label: 'Inventory', desc: 'Real-time stock control', icon: Package, ring: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
  { label: 'Wallets', desc: 'Cash, books & ledgers', icon: CreditCard, ring: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' },
  { label: 'Multi-branch', desc: 'All locations in one', icon: Store, ring: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
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
        className="welcome-card group relative bg-white rounded-[1.25rem] overflow-hidden
          border border-slate-200/70
          shadow-[0_2px_8px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.03)]
          hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.15),0_8px_16px_-8px_rgba(24,119,242,0.12)]
          hover:-translate-y-1.5 hover:border-blue-200/60
          transition-all duration-300 ease-out flex flex-col"
        style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
      >
        {/* Image */}
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="relative w-full aspect-square bg-slate-100 overflow-hidden focus:outline-none"
          aria-label={`View ${product.name}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name || 'Product'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
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

          {/* Soft gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <span className="absolute top-2.5 left-2.5 max-w-[72%] truncate
            bg-white/90 backdrop-blur-md text-slate-800 text-[10px] sm:text-[11px] font-bold
            px-2.5 py-1 rounded-full shadow-sm border border-white/50 tracking-wide">
            {categoryName}
          </span>

          <span className="absolute bottom-2.5 right-2.5
            bg-white/95 backdrop-blur-md text-slate-900 text-xs sm:text-sm font-extrabold
            px-2.5 py-1 rounded-lg shadow-md border border-white/60 tracking-tight">
            {formatPrice(product.sale_price ?? product.price)}
          </span>
        </button>

        {/* Info */}
        <div className="px-3 sm:px-3.5 pt-3 pb-1.5 flex-1 flex flex-col">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-left focus:outline-none"
          >
            <h3 className="text-[13px] sm:text-[15px] text-slate-900 font-semibold line-clamp-2 leading-snug min-h-[2.5em]
              group-hover:text-[#1864f2] transition-colors">
              {product.name || 'Untitled product'}
            </h3>
          </button>
          <p className="mt-1.5 text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-blue-500/70" />
            <span className="truncate">{location}</span>
          </p>
          {product.description && (
            <p className="mt-1.5 text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="mx-2.5 mb-2.5 mt-1 rounded-xl bg-slate-50/90 border border-slate-100 overflow-hidden">
          <div className="flex items-stretch divide-x divide-slate-200/80">
            <button
              type="button"
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-2.5 text-[11px] sm:text-xs
                font-bold transition-all duration-200
                ${liked ? 'text-rose-500 bg-rose-50/60 hover:bg-rose-50' : 'text-slate-500 hover:bg-white hover:text-rose-500'}`}
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
                font-bold text-slate-500 hover:bg-white hover:text-blue-600 transition-all duration-200"
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
                font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-all duration-200"
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center welcome-modal-overlay p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeAllModals(); }}
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" aria-hidden />
          <div className="relative bg-white w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-[1.5rem] sm:rounded-[1.5rem]
            shadow-2xl flex flex-col welcome-modal-panel overflow-hidden border border-white/20">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Large image */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-100 overflow-hidden">
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
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                {/* Category badge */}
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-800
                  text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md border border-white/50">
                  {categoryName}
                </span>

                {/* Close button on image */}
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60
                    text-white flex items-center justify-center backdrop-blur-sm transition shadow-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>

                {/* Price badge on image */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-slate-900
                  text-lg sm:text-xl font-extrabold px-4 py-1.5 rounded-xl shadow-lg border border-white/50">
                  {formatPrice(product.sale_price ?? product.price)}
                </div>
              </div>

              {/* Product info */}
              <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  {product.name || 'Untitled product'}
                </h2>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500/70" />
                    {location}
                  </span>
                  {product.barcode && (
                    <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      SKU: {product.barcode}
                    </span>
                  )}
                </div>

                {/* Description */}
                {product.description ? (
                  <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {product.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-slate-400 italic border-t border-slate-100 pt-4">
                    No description available.
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className={`font-bold ${liked ? 'text-rose-500' : 'text-slate-600'}`}>
                      {likeCount}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">likes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-slate-600">{commentsCount}</span>
                    <span className="text-slate-400 text-xs font-medium">comments</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-amber-600">{initialOrders}</span>
                    <span className="text-slate-400 text-xs font-medium">orders</span>
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

            {/* Action buttons footer */}
            <div className="border-t border-slate-100 px-5 py-3.5 shrink-0 bg-white/95 backdrop-blur flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold transition
                  ${liked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-rose-500'
                  }`}
              >
                <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 1.8} />
                {likeCount > 0 ? likeCount : 'Like'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDetail(false); openComments(); }}
                className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold
                  bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 transition"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                {commentsCount > 0 ? commentsCount : 'Comment'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={openOrder}
                className="flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl text-sm font-bold
                  bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25
                  hover:from-blue-600 hover:to-blue-700 active:scale-[0.97] transition"
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center welcome-modal-overlay p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white w-full max-w-lg max-h-[88dvh] sm:max-h-[82vh] rounded-t-[1.5rem] sm:rounded-[1.5rem]
            shadow-2xl flex flex-col welcome-modal-panel overflow-hidden border border-white/20">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0 bg-white/95 backdrop-blur">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 ring-2 ring-slate-100">
                  {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white text-lg`}>
                      {meta.emoji}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 leading-tight truncate">{product.name}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    {formatPrice(product.sale_price ?? product.price)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAllModals}
                className="w-9 h-9 rounded-full flex items-center justify-center
                  bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div ref={commentsListRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {loadingComments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-2xl mb-3">
                    💬
                  </div>
                  <p className="text-slate-700 text-sm font-semibold">No comments yet</p>
                  <p className="text-slate-400 text-xs mt-1">Be the first to share your thoughts</p>
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={idx} className="flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                      flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                      {(c.name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                        <p className="text-xs font-bold text-slate-900">{c.name}</p>
                        <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                          {c.message}
                        </p>
                      </div>
                      {c.created_at && (
                        <p className="text-[11px] text-slate-400 mt-1 ml-1.5">
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

            <div className="border-t border-slate-100 px-4 py-3.5 shrink-0 bg-white space-y-2">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your name…"
                maxLength={255}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-full border border-slate-200
                  outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
                  placeholder:text-slate-400 transition"
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
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 rounded-full border border-slate-200
                    outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
                    placeholder:text-slate-400 transition"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={submittingComment || !commentName.trim() || !commentMsg.trim()}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full
                    bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25
                    hover:from-blue-600 hover:to-blue-700
                    disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Send comment"
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center welcome-modal-overlay p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-[1.5rem] sm:rounded-[1.5rem]
            shadow-2xl flex flex-col welcome-modal-panel overflow-hidden">
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Place Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">We&apos;ll contact you to confirm</p>
              </div>
              <button
                type="button"
                onClick={closeAllModals}
                className="w-9 h-9 rounded-full flex items-center justify-center
                  bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Email — Primary Identifier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                    className="flex-1 px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200
                      outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
                      placeholder:text-slate-400 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckEmail(orderForm.customer_email)}
                    disabled={checkingEmail || !orderForm.customer_email.includes('@')}
                    className="shrink-0 px-4 py-3 rounded-xl text-sm font-bold text-white
                      bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                      disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {checkingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Check'
                    )}
                  </button>
                </div>
              </div>

              {/* Existing customer — show welcome back */}
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

              {/* New customer — show full form */}
              {emailChecked && !existingCustomer && (
                <>
                  {/* Customer Name — First + Last */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={orderForm.customer_name}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_name: e.target.value }))}
                        placeholder="First name"
                        className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200
                          outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
                          placeholder:text-slate-400 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={orderForm.customer_last_name}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_last_name: e.target.value }))}
                        placeholder="Last name"
                        className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200
                          outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
                          placeholder:text-slate-400 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Phone <span className="text-rose-500">*</span>
                      </label>
                      <input type="tel" value={orderForm.customer_phone}
                        onChange={(e) => setOrderForm((p) => ({ ...p, customer_phone: e.target.value }))}
                        placeholder="Phone number"
                        className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 placeholder:text-slate-400 transition"
                        required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Province</label>
                      <input type="text" value={orderForm.province}
                        onChange={(e) => setOrderForm((p) => ({ ...p, province: e.target.value }))}
                        placeholder="Province / State"
                        className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 placeholder:text-slate-400 transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Address</label>
                    <textarea value={orderForm.customer_address}
                      onChange={(e) => setOrderForm((p) => ({ ...p, customer_address: e.target.value }))}
                      rows={2} placeholder="Street, city, area..."
                      className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 placeholder:text-slate-400 resize-none transition" />
                  </div>

                  {/* GPS Location */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">GPS Location</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleGetLocation} disabled={locating}
                        className={`${getLocBtnClass(!!(orderForm.gps_lat && orderForm.gps_lng))} disabled:opacity-50`}>
                        {locating ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting…</>
                        ) : (
                          <><Navigation className="w-3.5 h-3.5" strokeWidth={2} />
                            {orderForm.gps_lat && orderForm.gps_lng ? '📍 Located' : '📍 Get Location'}
                          </>
                        )}
                      </button>
                      {orderForm.gps_lat && orderForm.gps_lng && (
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          {orderForm.gps_lat}, {orderForm.gps_lng}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={orderForm.notes}
                  onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={1} placeholder="Any special requests?"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 placeholder:text-slate-400 resize-none transition" />
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Item</label>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-20">Qty</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase w-24">Price</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <div className="text-xs font-semibold text-slate-800">{product.name}</div>
                          <div className="text-[10px] text-slate-400">{formatPrice(product.sale_price)} each</div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input type="number" min="1" value={orderForm.items[0]?.quantity || '1'}
                            onChange={(e) => {
                              const items = [...orderForm.items];
                              items[0] = { ...items[0], quantity: e.target.value };
                              setOrderForm(prev => ({ ...prev, items }));
                            }}
                            className="w-16 px-2 py-1.5 text-xs text-center bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs text-slate-600">{formatPrice(product.sale_price)}</td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-slate-800">{formatPrice((parseFloat(product.sale_price) || 0) * (parseInt(orderForm.items[0]?.quantity) || 0))}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan="3" className="px-3 py-2 text-right text-xs font-bold text-slate-600">Total:</td>
                        <td className="px-3 py-2 text-right text-sm font-extrabold text-blue-600">
                          {formatPrice((parseFloat(product.sale_price) || 0) * (parseInt(orderForm.items[0]?.quantity) || 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 shrink-0 flex gap-3 bg-white">
              <button
                type="button"
                onClick={closeAllModals}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600
                  bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={ordering || !orderForm.customer_email.trim() || (emailChecked && !existingCustomer && (!orderForm.customer_name.trim() || !orderForm.customer_phone.trim())) || !emailChecked}
                className="flex-[2] py-3 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                  shadow-lg shadow-blue-500/25
                  disabled:opacity-40 disabled:cursor-not-allowed transition
                  flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
  <div className="bg-white rounded-[1.25rem] border border-slate-200/70 overflow-hidden animate-pulse shadow-sm">
    <div className="aspect-square bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-4 bg-slate-100 rounded-md w-full" />
      <div className="h-4 bg-slate-100 rounded-md w-3/5" />
      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
      <div className="h-9 bg-slate-100 rounded-xl w-full mt-2" />
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

  return (
    <div className="welcome-page min-h-screen min-h-[100dvh] text-slate-900 antialiased" dir="ltr">
      <style>{`
        .welcome-page {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-tap-highlight-color: transparent;
          background:
            radial-gradient(ellipse 100% 80% at 50% -20%, rgba(59, 130, 246, 0.12), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(16, 185, 129, 0.08), transparent 45%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #eef2ff 100%);
          background-attachment: fixed;
        }

        .welcome-card {
          animation: welcomeFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes welcomeFadeUp {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes welcomeModalIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes welcomeOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes welcomeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }

        @keyframes welcomeShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .welcome-modal-overlay {
          animation: welcomeOverlayIn 0.22s ease-out both;
        }

        .welcome-modal-panel {
          animation: welcomeModalIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .welcome-hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .welcome-hide-scrollbar::-webkit-scrollbar { display: none; }

        .welcome-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(60px);
          opacity: 0.55;
          pointer-events: none;
          animation: welcomeFloat 8s ease-in-out infinite;
        }

        .welcome-mesh {
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .welcome-text-shine {
          background: linear-gradient(110deg, #0f172a 0%, #0f172a 35%, #2563eb 50%, #0f172a 65%, #0f172a 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .welcome-gradient-text {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 45%, #059669 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .welcome-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          box-shadow: 0 10px 25px -8px rgba(37, 99, 235, 0.55), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .welcome-btn-primary:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
          box-shadow: 0 14px 30px -8px rgba(37, 99, 235, 0.6), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        @media (prefers-reduced-motion: reduce) {
          .welcome-card,
          .welcome-modal-overlay,
          .welcome-modal-panel,
          .welcome-orb {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] border-b border-slate-200/60'
            : 'bg-white/60 backdrop-blur-xl border-b border-transparent'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-6">
          <div className="h-14 sm:h-[4.25rem] flex items-center justify-between gap-2 sm:gap-4">
            <Link
              to="/welcome"
              className="flex items-center gap-2.5 shrink-0 group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-md group-hover:blur-lg transition" />
                <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600
                  flex items-center justify-center shadow-lg shadow-blue-500/30
                  group-hover:scale-105 transition-transform ring-2 ring-white/50">
                  <span className="text-white font-extrabold text-base sm:text-lg">B</span>
                </div>
              </div>
              <div className="leading-none">
                <span className="block text-slate-900 font-extrabold text-lg sm:text-xl tracking-tight">
                  bazar<span className="text-blue-600">net</span>
                </span>
                <span className="hidden sm:block text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                  Marketplace
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-4
              bg-white/80 hover:bg-white focus-within:bg-white
              border border-slate-200/80 focus-within:border-blue-300
              focus-within:ring-4 focus-within:ring-blue-500/10
              rounded-2xl px-4 h-11 transition-all shadow-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.2} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, categories…"
                className="bg-transparent border-0 outline-none text-sm ml-2.5 w-full text-slate-800 placeholder:text-slate-400"
                aria-label="Search products"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl
                  text-slate-700 bg-white/70 border border-slate-200/70 hover:bg-white transition"
                aria-label="Toggle search"
                aria-expanded={mobileSearchOpen}
              >
                <Search className="w-5 h-5" strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl
                  text-sm font-bold text-blue-600 hover:bg-blue-50 border border-transparent
                  hover:border-blue-100 transition"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="welcome-btn-primary inline-flex items-center justify-center h-9 sm:h-10
                  px-3.5 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white transition
                  hover:-translate-y-0.5 active:translate-y-0"
              >
                Get started
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="md:hidden pb-3">
              <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 h-11 shadow-sm">
                <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.2} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  autoFocus
                  className="bg-transparent border-0 outline-none text-sm ml-2 w-full"
                  aria-label="Search products"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 welcome-mesh pointer-events-none opacity-70" aria-hidden />
        <div className="welcome-orb w-72 h-72 bg-blue-400/40 -top-20 -left-16" style={{ animationDelay: '0s' }} aria-hidden />
        <div className="welcome-orb w-64 h-64 bg-emerald-400/30 top-10 right-0" style={{ animationDelay: '2s' }} aria-hidden />
        <div className="welcome-orb w-48 h-48 bg-indigo-400/25 bottom-0 left-1/3" style={{ animationDelay: '4s' }} aria-hidden />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-6 py-10 sm:py-14 md:py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-14">
            <div className="max-w-xl xl:max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-blue-700
                text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full mb-5
                border border-blue-100 shadow-sm shadow-blue-500/5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Welcome to BazarNet Marketplace
              </div>

              <h1 className="text-[1.85rem] leading-[1.12] sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight">
                <span className="text-slate-900">Discover products from</span>{' '}
                <span className="welcome-gradient-text">local businesses</span>
              </h1>

              <p className="mt-4 sm:mt-5 text-[15px] sm:text-lg text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium">
                Browse featured items, compare prices, like & order online — then run your store
                with one powerful ERP for sales, inventory and accounts.
              </p>

              <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center
                justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="welcome-btn-primary h-12 sm:h-[3.25rem] px-7 rounded-2xl text-white font-bold text-[15px]
                    transition hover:-translate-y-0.5 active:translate-y-0"
                >
                  Log in to your account
                </button>
                <a
                  href="#products"
                  className="h-12 sm:h-[3.25rem] px-7 rounded-2xl bg-white/90 hover:bg-white
                    text-slate-800 font-bold text-[15px] transition inline-flex items-center justify-center
                    border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Browse products ↓
                </a>
              </div>

              {/* Mini stats */}
              <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6">
                {[
                  { n: loading ? '—' : String(products.length), l: 'Products' },
                  { n: loading ? '—' : String(Math.max(categories.length - 1, 0)), l: 'Categories' },
                  { n: '24/7', l: 'Available' },
                ].map((s) => (
                  <div key={s.l} className="text-center lg:text-left min-w-[4.5rem]">
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{s.n}</p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature glass cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-3.5 w-full max-w-md mx-auto lg:mx-0 lg:max-w-sm xl:max-w-md">
              {FEATURES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="group/feat relative bg-white/70 backdrop-blur-xl rounded-2xl p-4 sm:p-5
                      border border-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)]
                      hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] hover:-translate-y-1
                      transition-all duration-300"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${item.bg}
                      flex items-center justify-center text-xl sm:text-2xl mb-3
                      ring-1 ring-black/5 shadow-sm group-hover/feat:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />
                    </div>
                    <p className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-tight">{item.label}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium leading-snug">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────── */}
      <main id="products" className="relative max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-6 py-8 sm:py-10 md:py-12 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Marketplace</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Today&apos;s picks</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {loading
                ? 'Loading products…'
                : `${filtered.length} product${filtered.length === 1 ? '' : 's'}${
                    activeCategory !== 'All' ? ` in ${activeCategory}` : ''
                  }`}
            </p>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-5 welcome-hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 h-9 sm:h-10 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold
                  transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'welcome-btn-primary text-white scale-[1.03]'
                    : 'bg-white/90 text-slate-700 border border-slate-200/80 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/50 shadow-sm'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700
            px-4 py-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={loadProducts}
              className="shrink-0 font-bold text-blue-600 hover:text-blue-700 self-start sm:self-auto"
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
          <div className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200/70
            py-14 sm:py-20 px-6 text-center shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-blue-50
              flex items-center justify-center text-3xl sm:text-4xl mb-5 shadow-inner">
              🔍
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">No products found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed font-medium">
              Try another search or category. Published products will appear here.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
              className="mt-6 inline-flex h-11 px-6 items-center justify-center rounded-xl
                welcome-btn-primary text-white font-bold text-sm transition hover:-translate-y-0.5"
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

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-6 pb-8 sm:pb-12">
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]
          bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900
          px-6 py-10 sm:px-12 sm:py-14 text-center text-white
          shadow-[0_25px_60px_-15px_rgba(30,58,138,0.45)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 20%, rgba(96,165,250,0.5) 0, transparent 40%), radial-gradient(circle at 85% 80%, rgba(52,211,153,0.35) 0, transparent 40%)',
            }}
          />
          <div className="absolute inset-0 welcome-mesh opacity-20 pointer-events-none" aria-hidden />
          <div className="relative">
            <p className="text-xs font-bold text-blue-300 uppercase tracking-[0.2em] mb-3">Get started free</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Ready to run your business?
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 max-w-md mx-auto font-medium leading-relaxed">
              Log in to manage inventory, sales, purchases and accounts across all your branches.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-7 sm:mt-8 h-12 sm:h-14 px-8 rounded-2xl bg-white text-blue-700
                font-extrabold text-sm sm:text-[15px] hover:bg-blue-50 active:bg-blue-100
                transition shadow-xl hover:-translate-y-0.5"
            >
              Go to login →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/70 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-5 lg:px-6 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                flex items-center justify-center shadow-md shadow-blue-500/25">
                <span className="text-white font-extrabold text-sm">B</span>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base leading-none">
                  bazar<span className="text-blue-600">net</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold">ERP for modern businesses</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-400">
              {['Sales', 'Inventory', 'Wallets', 'Branches'].map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && <span className="text-slate-300 hidden sm:inline">·</span>}
                  <span className="hover:text-blue-600 transition cursor-default">{item}</span>
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs font-medium text-slate-400">
              © {new Date().getFullYear()} BazarNet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;