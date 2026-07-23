import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  Edit2,
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Store,
  Eye,
  Info,
  Contact,
  UserCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

const BranchShow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [statistics, setStatistics] = useState(null);
  
  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return `/storage/${logoPath}`;
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const fetchBranchDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/branches/${id}`);
      const branchData = response.data.data || response.data.branch;
      
      setBranch(branchData);
      setUsers(branchData.users || []);
      
      // Set statistics if available
      if (response.data.statistics) {
        setStatistics(response.data.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch branch:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load branch details';
      setError(errorMsg);
      Swal.fire('Error', errorMsg, 'error');
      setTimeout(() => {
        navigate('../branches');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBranchDetails();
  }, [id]);
  
  if (loading) {
    return (
      <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-sm">
          <div className="text-center py-12">
            <Loader2 className="inline-block w-8 h-8 text-[#007c89] animate-spin" />
            <p className="mt-3 text-sm text-gray-600">Loading branch details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-sm">
          <div className="p-6 text-center">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <AlertCircle className="inline w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-600 inline">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!branch) return null;

  // Calculate capacity metrics
  const userCount = users.length;
  const userCapacity = branch.allowed_user_count || 1;
  
  // Get product count from statistics or fallback to branch property
  const productCount = statistics?.public_product_count || branch.public_products_count || 0;
  const totalProductCount = statistics?.total_product_count || branch.products_count || 0;
  const productCapacity = branch.allowed_product_publish_count || 10;
  
  const userUsagePercent = Math.min((userCount / userCapacity) * 100, 100);
  const productUsagePercent = Math.min((productCount / productCapacity) * 100, 100);
  const isUserFull = userCount >= userCapacity;
  const isProductFull = productCount >= productCapacity;
  
  return (
    <div className="flex justify-center min-h-screen px-2 py-3 bg-gray-50">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Link
              to="../branches"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Branch Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to={`../branches/${branch.id}/edit`}
              className="text-gray-600 hover:text-gray-800 px-3 py-1.5 bg-gray-100 rounded-md text-sm inline-flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Link>
            <Link
              to="../branches"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        {/* Branch Header */}
        <div className="flex items-start space-x-4 pb-6 mb-4 border-b border-gray-200 px-6 pt-6">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {branch.branch_logo_url ? (
              <img
                src={getLogoUrl(branch.branch_logo_url)}
                alt={branch.branch_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{branch.branch_name}</h2>
                {branch.branch_slogan && (
                  <p className="text-sm text-gray-500 mt-1">{branch.branch_slogan}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium border inline-flex items-center ${
                  branch.is_active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {branch.is_active ? (
                  <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1 text-gray-400" />
                )}
                {branch.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {branch.company && (
              <p className="text-xs text-gray-500 mt-2">
                Company: {branch.company.company_name}
              </p>
            )}
          </div>
        </div>

        {/* Capacity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
          {/* Users Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">Users</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">{userCount}</span>
                  <span className="text-sm text-gray-500 ml-1">/ {userCapacity}</span>
                </div>
              </div>
              {isUserFull && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isUserFull ? 'bg-red-500' : userUsagePercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${userUsagePercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isUserFull ? 'Full capacity' : `${Math.round(userUsagePercent)}% used`}
              </p>
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Products</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">{productCount}</span>
                  <span className="text-sm text-gray-500 ml-1">/ {productCapacity}</span>
                </div>
              </div>
              {isProductFull && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isProductFull ? 'bg-red-500' : productUsagePercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${productUsagePercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isProductFull ? 'Full capacity' : `${Math.round(productUsagePercent)}% used`}
              </p>
            </div>
          </div>

          {/* Created At Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-600">Created</span>
            </div>
            <p className="text-sm text-gray-900 mt-2">{formatDate(branch.created_at)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Updated: {formatDate(branch.updated_at)}
            </p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 px-6">
          <nav className="flex -mb-px space-x-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors inline-flex items-center ${
                activeTab === 'info'
                  ? 'border-[#007c89] text-[#007c89]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Info className="w-4 h-4 mr-2" />
              Branch Info
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors inline-flex items-center ${
                activeTab === 'location'
                  ? 'border-[#007c89] text-[#007c89]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors inline-flex items-center ${
                activeTab === 'contact'
                  ? 'border-[#007c89] text-[#007c89]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Phone className="w-4 h-4 mr-2" />
              Contact
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors inline-flex items-center ${
                activeTab === 'users'
                  ? 'border-[#007c89] text-[#007c89]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Users
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {users.length}
              </span>
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="px-6 pb-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Branch Name
                  </label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{branch.branch_name}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Branch Slogan
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_slogan || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Company
                  </label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {branch.company?.company_name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Status
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      branch.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Capacity Settings Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Capacity Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Allowed Users
                        </label>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {branch.allowed_user_count || 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Current: {userCount}</p>
                        <p className={`text-xs font-medium ${isUserFull ? 'text-red-500' : 'text-green-500'}`}>
                          {isUserFull ? 'Full' : `${Math.round(userUsagePercent)}% used`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50/50 rounded-md p-3 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          Allowed Products
                        </label>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {branch.allowed_product_publish_count || 10}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Current: {productCount}</p>
                        <p className={`text-xs font-medium ${isProductFull ? 'text-red-500' : 'text-green-500'}`}>
                          {isProductFull ? 'Full' : `${Math.round(productUsagePercent)}% used`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Province
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_province || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    District
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_district || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Village
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_village || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Country
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_country || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3 md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Street Address
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{branch.branch_street_address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Phone
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {branch.branch_phone ? (
                      <a href={`tel:${branch.branch_phone}`} className="text-[#007c89] hover:underline">
                        {branch.branch_phone}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {branch.branch_email ? (
                      <a href={`mailto:${branch.branch_email}`} className="text-[#007c89] hover:underline">
                        {branch.branch_email}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-md p-3 md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Website
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {branch.branch_website ? (
                      <a href={branch.branch_website} target="_blank" rel="noopener noreferrer" className="text-[#007c89] hover:underline">
                        {branch.branch_website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Users Header with Capacity Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {users.length} of {branch.allowed_user_count || 1} users
                  </span>
                </div>
                {isUserFull && (
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    User limit reached
                  </span>
                )}
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No users found for this branch</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{user.name}</h4>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 mt-2 ml-10">
                            {user.position && (
                              <span className="text-xs text-gray-600 inline-flex items-center">
                                <Building2 className="w-3 h-3 mr-1" />
                                {user.position?.position || 'No Position'}
                              </span>
                            )}
                            {user.phone && (
                              <span className="text-xs text-gray-600 inline-flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {user.phone}
                              </span>
                            )}
                            <span className="text-xs text-gray-600 inline-flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(user.created_at)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchShow;