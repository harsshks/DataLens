import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../layouts/AppLayout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { adminService } from '../services/adminService';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await adminService.getStatistics();
      setStats(res.data.data);
    } catch {
      // non-fatal, show what we can
    }
  }, []);

  const loadDatasets = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminService.getDatasets(params);
      setDatasets(res.data.data.items);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load datasets.');
    }
  }, [page, statusFilter]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([loadStats(), loadDatasets()]).finally(() => setLoading(false));
  }, [loadStats, loadDatasets]);

  const scoreColor = (s) =>
    s == null ? '#9ca3af' : s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626';

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="page-sub">System-wide statistics and dataset overview.</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading && !stats ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          {stats && (
            <div className="stat-grid" style={{ marginBottom: 28 }}>
              <StatCard label="Total Users" value={stats.total_users} />
              <StatCard label="Total Datasets" value={stats.total_datasets} />
              <StatCard label="Completed Analyses" value={stats.completed_analyses} />
              <StatCard label="Failed Analyses" value={stats.failed_analyses} />
              <StatCard
                label="Avg Quality Score"
                value={stats.average_quality_score != null ? `${stats.average_quality_score}` : '—'}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>All Datasets</div>
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                {['COMPLETED', 'PROCESSING', 'UPLOADED', 'FAILED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id}>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{d.id}</td>
                    <td>
                      <div className="dataset-name">{d.name}</div>
                      <div className="dataset-filename">{d.original_filename}</div>
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <span style={{ fontWeight: 700, color: scoreColor(d.quality_score) }}>
                        {d.quality_score ?? '—'}
                      </span>
                    </td>
                    <td>{d.row_count?.toLocaleString() ?? '—'}</td>
                    <td>{d.column_count ?? '—'}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {datasets.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                      No datasets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <span className="pagination-info">Page {pagination.page} of {pagination.total_pages}</span>
              <button className="btn btn-sm btn-ghost" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
