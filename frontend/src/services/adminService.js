import api from './api';

export const adminService = {
  getStatistics: () => api.get('/admin/statistics'),
  getDatasets: (params) => api.get('/admin/datasets', { params }),
};
