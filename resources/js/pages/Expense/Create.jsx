// pages/Expenses/ExpenseCreate.jsx - With Searchable Dropdowns
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { 
  Plus, 
  Save, 
  Loader2, 
  Calendar, 
  User, 
  FileText, 
  Tag,
  Trash2,
  ArrowLeft,
  Search,
  ChevronDown,
  X
} from 'lucide-react';

// Searchable Select Component
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  label, 
  required = false,
  error = null,
  placeholder = 'Search...',
  displayKey = 'name',
  valueKey = 'id',
  renderOption = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Ensure options is always an array
  const optionsArray = Array.isArray(options) ? options : [];
  
  // Safely find the selected option
  const selectedOption = optionsArray.find(opt => opt && opt[valueKey] === value);

  // Safely filter options
  const filteredOptions = optionsArray.filter(opt => {
    if (!opt || !opt[displayKey]) return false;
    return opt[displayKey].toLowerCase().includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div
        className={`relative w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} rounded-lg focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {selectedOption ? (
            <div className="flex-1 px-3 py-1.5 text-sm text-gray-800 flex items-center justify-between">
              <span>
                {renderOption ? renderOption(selectedOption) : selectedOption[displayKey]}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex-1 px-3 py-1.5 text-sm text-gray-400">
              {placeholder}
            </div>
          )}
          <ChevronDown className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`Search ${label.toLowerCase()}...`}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {optionsArray.length === 0 ? 'No options available' : 'No options found'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option[valueKey]}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${option[valueKey] === value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {renderOption ? renderOption(option) : option[displayKey]}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

const ExpenseCreate = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [errors, setErrors] = useState({});

  const [masterFields, setMasterFields] = useState({
    account_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenses, setExpenses] = useState([
    {
      expense_type_id: '',
      amount: '',
      description: '',
      paid_to: '',
    }
  ]);

  useEffect(() => {
    fetchExpenseTypes();
    fetchAccounts();
  }, []);

  const fetchExpenseTypes = async () => {
    try {
      const res = await api.get('/expense-types?active_only=true');
      // Fix: Check if res.data is an array or has a data property
      const typesData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setExpenseTypes(typesData);
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
      setExpenseTypes([]); // Set empty array on error
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      // Fix: Check if res.data is an array or has a data property
      const accountsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAccounts(accountsData);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setAccounts([]); // Set empty array on error
    }
  };

  const handleMasterFieldChange = (field, value) => {
    setMasterFields(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addExpenseRow = () => {
    setExpenses([
      ...expenses,
      {
        expense_type_id: '',
        amount: '',
        description: '',
        paid_to: '',
      }
    ]);
  };

  const removeExpenseRow = (index) => {
    if (expenses.length <= 1) {
      Swal.fire('Warning', 'You must have at least one expense', 'warning');
      return;
    }
    const newExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(newExpenses);
  };

  const handleExpenseChange = (index, field, value) => {
    const newExpenses = [...expenses];
    newExpenses[index][field] = value;
    setExpenses(newExpenses);
    if (errors[`${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const allErrors = {};
      let hasError = false;

      if (!masterFields.date) {
        allErrors['date'] = 'Date is required';
        hasError = true;
      }

      if (!masterFields.account_id) {
        allErrors['account_id'] = 'Account is required';
        hasError = true;
      }

      expenses.forEach((exp, index) => {
        if (!exp.expense_type_id) {
          allErrors[`${index}_expense_type_id`] = 'Expense type is required';
          hasError = true;
        }
        const parsedAmount = parseFloat(exp.amount);
        if (!exp.amount || isNaN(parsedAmount) || parsedAmount < 0.01) {
          allErrors[`${index}_amount`] = 'Amount must be at least 0.01';
          hasError = true;
        }
      });

      if (hasError) {
        setErrors(allErrors);
        setSaving(false);
        return;
      }

      const payload = {
        expenses: expenses.map(exp => ({
          expense_type_id: parseInt(exp.expense_type_id),
          account_id: parseInt(masterFields.account_id),
          amount: parseFloat(exp.amount),
          description: exp.description?.trim() || null,
          paid_to: exp.paid_to || null,
          date: masterFields.date,
        }))
      };

      const res = await api.post('/expenses', payload);
      
      const successCount = res.data.success_count || res.data.data?.length || 0;
      const errorCount = res.data.error_count || 0;

      if (successCount > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${successCount} expense(s) created successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        navigate('/expenses');
      } else {
        Swal.fire('Error', 'Failed to create expenses.', 'error');
      }
    } catch (err) {
      console.error('Expense creation error:', err);
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors || {};
        const formattedErrors = {};
        Object.keys(validationErrors).forEach(key => {
          const fieldKey = key.replace(/^expenses\./, '').replace(/\./g, '_');
          formattedErrors[fieldKey] = validationErrors[key][0];
        });
        setErrors(formattedErrors);
        
        const message = err.response.data.message || 'Please check the form for errors.';
        Swal.fire('Error', message, 'error');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to create expenses', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getErrorMessage = (index, field) => {
    return errors[`${index}_${field}`] || errors[field];
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/expenses')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Record Expenses</h1>
                <p className="text-xs text-gray-400 mt-0.5">Record multiple expenses at once</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Amount</p>
                <p className="text-lg font-bold text-gray-800">AFN {totalAmount.toFixed(2)}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {expenses.length} item{expenses.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Master Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Account - Searchable */}
              <div>
                <SearchableSelect
                  options={accounts}
                  value={masterFields.account_id}
                  onChange={(value) => handleMasterFieldChange('account_id', value)}
                  label="Account"
                  required={true}
                  error={errors.account_id}
                  placeholder="Search account..."
                  displayKey="name"
                  valueKey="id"
                  renderOption={(option) => (
                    <div className="flex items-center justify-between">
                      <span>{option.name}</span>
                      <span className="text-xs text-gray-400">AFN {parseFloat(option.balance).toFixed(2)}</span>
                    </div>
                  )}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={masterFields.date}
                    onChange={(e) => handleMasterFieldChange('date', e.target.value)}
                    className={`w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border ${errors.date ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expense Rows */}
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Expense</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(index)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Expense Type - Searchable */}
                  <div>
                    <SearchableSelect
                      options={expenseTypes}
                      value={expense.expense_type_id}
                      onChange={(value) => handleExpenseChange(index, 'expense_type_id', value)}
                      label="Expense Type"
                      required={true}
                      error={getErrorMessage(index, 'expense_type_id')}
                      placeholder="Search expense type..."
                      displayKey="name"
                      valueKey="id"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Amount (AFN) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">AFN</span>
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                        step="0.01"
                        min="0.01"
                        className={`w-full pl-12 pr-3 py-1.5 text-sm bg-gray-50 border ${getErrorMessage(index, 'amount') ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="0.00"
                      />
                    </div>
                    {getErrorMessage(index, 'amount') && (
                      <p className="text-xs text-red-500 mt-1">{getErrorMessage(index, 'amount')}</p>
                    )}
                  </div>

                  {/* Paid To */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      <User className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                      Paid To
                    </label>
                    <input
                      type="text"
                      value={expense.paid_to}
                      onChange={(e) => handleExpenseChange(index, 'paid_to', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Vendor name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <FileText className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Description
                  </label>
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description (optional)"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button
            type="button"
            onClick={addExpenseRow}
            className="w-full mt-3 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Add Another Expense
          </button>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Expenses
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseCreate;