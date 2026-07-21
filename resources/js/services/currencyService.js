import api from '../plugins/axios';

const currencyService = {
    // ─── Currencies CRUD ─────────────────────────────────────

    getCurrencies(params = {}) {
        return api.get('/currencies', { params });
    },

    getCurrency(id) {
        return api.get(`/currencies/${id}`);
    },

    createCurrency(data) {
        return api.post('/currencies', data);
    },

    updateCurrency(id, data) {
        return api.put(`/currencies/${id}`, data);
    },

    deleteCurrency(id, params = {}) {
        return api.delete(`/currencies/${id}`, { params });
    },

    // ─── Base Currency & Status ──────────────────────────────

    setBaseCurrency(id, data = {}) {
        return api.post(`/currencies/${id}/set-base`, data);
    },

    toggleActive(id, data = {}) {
        return api.post(`/currencies/${id}/toggle-active`, data);
    },

    getActiveList(params = {}) {
        return api.get('/currencies/active-list', { params });
    },

    // ─── Exchange Rates ──────────────────────────────────────

    getRates(currencyId, params = {}) {
        return api.get(`/currencies/${currencyId}/rates`, { params });
    },

    saveRate(currencyId, data) {
        return api.post(`/currencies/${currencyId}/rates`, data);
    },

    deleteRate(currencyId, rateId, params = {}) {
        return api.delete(`/currencies/${currencyId}/rates/${rateId}`, { params });
    },

    // ─── Conversion ──────────────────────────────────────────

    convert(data) {
        return api.post('/currencies/convert', data);
    },
};

export default currencyService;
