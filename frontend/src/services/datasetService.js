import api from './api';

export const datasetService = {
  getDatasets: (params) => api.get('/datasets', { params }),
  getDataset: (id) => api.get(`/datasets/${id}`),
  uploadDataset: (formData, onUploadProgress) =>
    api.post('/datasets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  getQuality: (id) => api.get(`/datasets/${id}/quality`),
  getIssues: (id, filters) => api.get(`/datasets/${id}/issues`, { params: filters }),
  getColumns: (id) => api.get(`/datasets/${id}/columns`),
  deleteDataset: (id) => api.delete(`/datasets/${id}`),
  getVersions: (id) => api.get(`/datasets/${id}/versions`),
  getVersion: (id, version) => api.get(`/datasets/${id}/versions/${version}`),
  uploadVersion: (id, formData, onUploadProgress) =>
    api.post(`/datasets/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  compareVersions: (id, v1, v2) => api.get(`/datasets/${id}/compare/${v1}/${v2}`),
};
