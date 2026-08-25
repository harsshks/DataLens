import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import UploadModal from '../components/UploadModal';
import { datasetService } from '../services/datasetService';

const STATUSES = ['', 'COMPLETED', 'PROCESSING', 'UPLOADED', 'FAILED'];
const SORTS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'name', label: 'Name' },
  { value: 'quality_score', label: 'Quality Score' },
  { value: 'status', label: 'Status' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [, setDeleting] = useState(false);

  const [filters, setFilters] = useState({ page: 1, limit: 10, status: '', sort: 'created_at', order: 'DESC' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters };
      if (!params.status) delete params.status;
      const res = await datasetService.getDatasets(params);
      setDatasets(res.data.data.items);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load datasets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await datasetService.deleteDataset(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Delete failed.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleUploadSuccess(data) {
    setShowUpload(false);
    // data could be the dataset object
    const id = data?.id;
    if (id) navigate(`/datasets/${id}`);
    else load();
  }

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  const scoreColor = (s) =>
    s === null || s === undefined ? '#9ca3af' : s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626';

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h2>Datasets</h2>
          <p className="page-sub">Your uploaded CSV datasets and their quality reports.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          + Upload Dataset
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={filters.order} onChange={(e) => setFilter('order', e.target.value)}>
          <option value="DESC">Newest first</option>
          <option value="ASC">Oldest first</option>
        </select>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={32} />
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && datasets.length === 0 && (
        <EmptyState
          title="No datasets yet"
          description="Upload a CSV dataset to generate your first quality report."
          action={
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              Upload Dataset
            </button>
          }
        />
      )}

      {!loading && !error && datasets.length > 0 && (
        <>
          <div className="dataset-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Version</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} className="clickable-row" onClick={() => navigate(`/datasets/${d.id}`)}>
                    <td>
                      <div className="dataset-name">{d.name}</div>
                      <div className="dataset-filename">{d.original_filename}</div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: scoreColor(d.quality_score), fontSize: 15 }}>
                        {d.quality_score ?? '—'}
                      </span>
                    </td>
                    <td>{d.row_count?.toLocaleString() ?? '—'}</td>
                    <td>{d.column_count ?? '—'}</td>
                    <td>v{d.latest_version}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/datasets/${d.id}`)}>
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-danger-ghost"
                          onClick={() => setDeleteTarget(d)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm btn-ghost"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                className="btn btn-sm btn-ghost"
                disabled={filters.page >= pagination.total_pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"? This will permanently remove the dataset and all its analysis records.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
