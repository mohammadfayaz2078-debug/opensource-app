import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const BranchShow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  
  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return `/storage/${logoPath}`;
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };
  
  const fetchBranchDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/branches/${id}`);
      const branchData = response.data.data || response.data.branch;
      
      setBranch(branchData);
      setUsers(branchData.users || []);
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
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
              <svg className="inline w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 inline">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!branch) return null;
  
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Branch Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to={`../branches/${branch.id}/edit`}
              className="text-gray-600 hover:text-gray-800 px-3 py-1.5 bg-gray-100 rounded-md text-sm inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
            <Link
              to="../branches"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
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
                <svg
                  className={`w-3 h-3 mr-1 ${branch.is_active ? 'text-green-600' : 'text-gray-400'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="10" cy="10" r="5" />
                </svg>
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
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
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(branch.created_at)}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Updated At
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(branch.updated_at)}</p>
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
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
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
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{user.name}</h4>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 mt-2 ml-10">
                            {user.position && (
                              <span className="text-xs text-gray-600 inline-flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-4 0h4" />
                                </svg>
                                {user.position?.position || 'No Position'}
                              </span>
                            )}
                            {user.phone && (
                              <span className="text-xs text-gray-600 inline-flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {user.phone}
                              </span>
                            )}
                            <span className="text-xs text-gray-600 inline-flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
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