import api from '../plugins/axios';

const accountService = {
    // ─── Chart of Accounts ───────────────────────────────────

    /**
     * Get paginated list of accounts
     */
    getAccounts(params = {}) {
        return api.get('/chart-of-accounts', { params });
    },

    /**
     * Get accounts as tree structure
     */
    getAccountsTree(params = {}) {
        return api.get('/chart-of-accounts/tree', { params });
    },

    /**
     * Get a single account by ID
     */
    getAccount(id) {
        return api.get(`/chart-of-accounts/${id}`);
    },

    /**
     * Create a new account
     */
    createAccount(data) {
        return api.post('/chart-of-accounts', data);
    },

    /**
     * Update an existing account
     */
    updateAccount(id, data) {
        return api.put(`/chart-of-accounts/${id}`, data);
    },

    /**
     * Delete an account
     */
    deleteAccount(id) {
        return api.delete(`/chart-of-accounts/${id}`);
    },

    /**
     * Toggle deprecated status
     */
    toggleDeprecated(id) {
        return api.post(`/chart-of-accounts/${id}/toggle-deprecated`);
    },

    /**
     * Toggle active status
     */
    toggleActive(id) {
        return api.post(`/chart-of-accounts/${id}/toggle-active`);
    },

    /**
     * Get account types for dropdowns
     */
    getAccountTypes(params = {}) {
        return api.get('/chart-of-accounts/types', { params });
    },

    /**
     * Get account groups for dropdowns
     */
    getAccountGroups(params = {}) {
        return api.get('/chart-of-accounts/groups', { params });
    },

    /**
     * Get parent account options (for dropdown, excludes self + descendants)
     */
    getParentOptions(params = {}) {
        return api.get('/chart-of-accounts/parent-options', { params });
    },

    /**
     * Get summary / statistics
     */
    getSummary() {
        return api.get('/chart-of-accounts/summary');
    },

    /**
     * Bulk import accounts
     */
    importAccounts(data) {
        return api.post('/chart-of-accounts/import', data);
    },

    // ─── Account Groups ──────────────────────────────────────

    /**
     * Get all account groups (flat)
     */
    getGroups(params = {}) {
        return api.get('/account-groups', { params });
    },

    /**
     * Get account groups as tree
     */
    getGroupsTree() {
        return api.get('/account-groups/tree');
    },

    /**
     * Get a single group
     */
    getGroup(id) {
        return api.get(`/account-groups/${id}`);
    },

    /**
     * Create a group
     */
    createGroup(data) {
        return api.post('/account-groups', data);
    },

    /**
     * Update a group
     */
    updateGroup(id, data) {
        return api.put(`/account-groups/${id}`, data);
    },

    /**
     * Delete a group
     */
    deleteGroup(id) {
        return api.delete(`/account-groups/${id}`);
    },
};

export default accountService;
