import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  Loader2,
  FolderTree,
  List,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Circle,
  Tag,
  Wallet,
  CreditCard,
  MoreVertical
} from 'lucide-react';

const ExpenseTypeIndex = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState('tree');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({
    parent_id: '',
    name: '',
    description: '',
    is_active: true,
  });

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expense-types/tree');
      setTypes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch types:', err);
      try {
        const fallbackRes = await api.get('/expense-types');
        setTypes(fallbackRes.data?.data || []);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  // ─── Modal Handlers ─────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedType(null);
    setForm({
      parent_id: '',
      name: '',
      description: '',
      is_active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (type) => {
    setIsEditing(true);
    setSelectedType(type);
    setForm({
      parent_id: type.parent_id || '',
      name: type.name || '',
      description: type.description || '',
      is_active: type.is_active ?? true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = { ...form };
      if (!payload.parent_id) delete payload.parent_id;
      if (!payload.description) delete payload.description;

      let res;
      if (isEditing && selectedType) {
        res = await api.put(`/expense-types/${selectedType.id}`, payload);
      } else {
        res = await api.post('/expense-types', payload);
      }

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Updated!' : 'Created!',
        text: res.data?.message || 'Success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      closeModal();
      fetchTypes();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type) => {
    const hasChildren = type.children_recursive && type.children_recursive.length > 0;
    
    const result = await Swal.fire({
      title: 'Delete Expense Type?',
      html: hasChildren 
        ? `This will delete "<strong>${type.name}</strong>" and all its child types.`
        : `Delete "<strong>${type.name}</strong>"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/expense-types/${type.id}`);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        fetchTypes();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
      }
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allIds = {};
    const walk = (nodes) => {
      nodes.forEach(n => {
        if (n.children_recursive && n.children_recursive.length > 0) {
          allIds[n.id] = true;
          walk(n.children_recursive);
        }
      });
    };
    walk(types);
    setExpanded(allIds);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  // ─── Recursive Tree Row Component ──────────────────────────
  
  const TypeTreeRow = ({ type, level = 0 }) => {
    const hasChildren = type.children_recursive && type.children_recursive.length > 0;
    const isExpanded = expanded[type.id];
    const indent = level * 24;

    return (
      <React.Fragment key={type.id}>
        <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!type.is_active ? 'opacity-50' : ''}`}>
          <td className="px-3 py-2.5">
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(type.id)}
                  className="mr-1.5 p-0.5 rounded hover:bg-gray-200 transition-colors focus:outline-none flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              
              <div className="flex items-center gap-2 min-w-0">
                <Circle className={`w-2 h-2 flex-shrink-0 ${type.is_active ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} />
                <span className="text-sm font-medium text-gray-800 truncate">{type.name}</span>
                {!type.is_active && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                    Inactive
                  </span>
                )}
                {hasChildren && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full flex-shrink-0">
                    {type.children_recursive.length}
                  </span>
                )}
              </div>
            </div>
            {type.description && (
              <div className="text-xs text-gray-400 mt-0.5 ml-7 truncate">{type.description}</div>
            )}
          </td>
          <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
            {type.id}
          </td>
          <td className="px-3 py-2.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <button 
                onClick={() => openEditModal(type)} 
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" 
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleDelete(type)} 
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" 
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && type.children_recursive.map((child) => (
          <TypeTreeRow key={child.id} type={child} level={level + 1} />
        ))}
      </React.Fragment>
    );
  };

  // ─── Get Parent Options ─────────────────────────────────────

  const getParentOptions = (typesList, excludeId = null, level = 0) => {
    let options = [];
    const prefix = '— '.repeat(level);
    
    for (const type of typesList) {
      if (type.id !== excludeId) {
        options.push({ 
          id: type.id, 
          name: `${prefix}${type.name}`,
        });
        if (type.children_recursive && type.children_recursive.length > 0) {
          options = [...options, ...getParentOptions(type.children_recursive, excludeId, level + 1)];
        }
      }
    }
    return options;
  };

  const parentOptions = getParentOptions(types, selectedType?.id);

  // ─── Filter Types ───────────────────────────────────────────

  const filteredTypes = types.filter(type => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const matchName = type.name.toLowerCase().includes(search);
    const matchDesc = type.description?.toLowerCase().includes(search) || false;
    return matchName || matchDesc;
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Expense Types
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Manage expense categories</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Type
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search types..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`p-1.5 ${viewMode === 'tree' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                  title="Tree View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Expand/Collapse */}
              {viewMode === 'tree' && types.length > 0 && (
                <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
                  <button 
                    onClick={expandAll} 
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                    title="Expand All"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={collapseAll} 
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                    title="Collapse All"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-3 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <FolderTree className="w-10 h-10 text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">No expense types found</p>
                          <button
                            onClick={openCreateModal}
                            className="mt-3 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create your first type
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewMode === 'tree' ? (
                      filteredTypes.map((type) => (
                        <TypeTreeRow key={type.id} type={type} level={0} />
                      ))
                    ) : (
                      // Flat List View
                      filteredTypes.map((type) => (
                        <tr key={type.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!type.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Circle className={`w-2 h-2 flex-shrink-0 ${type.is_active ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} />
                              <span className="text-sm font-medium text-gray-800">{type.name}</span>
                              {!type.is_active && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Inactive</span>
                              )}
                            </div>
                            {type.description && (
                              <div className="text-xs text-gray-400 mt-0.5 ml-6">{type.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">{type.id}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openEditModal(type)} 
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" 
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(type)} 
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" 
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto z-10 animate-fadeIn">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                {isEditing ? 'Edit Expense Type' : 'New Expense Type'}
              </h2>
              <button 
                onClick={closeModal} 
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-3.5">
                {/* Parent Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Parent Category</label>
                  <select 
                    name="parent_id" 
                    value={form.parent_id} 
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Parent (Root)</option>
                    {parentOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    value={form.name} 
                    onChange={handleInputChange}
                    className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`} 
                    required 
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea 
                    name="description" 
                    value={form.description} 
                    onChange={handleInputChange} 
                    rows="2"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none" 
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    name="is_active" 
                    checked={form.is_active} 
                    onChange={handleInputChange}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <label className="text-xs text-gray-600 cursor-pointer">Active</label>
                </div>
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {isEditing ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTypeIndex;