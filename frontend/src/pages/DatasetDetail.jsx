import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import AppLayout from '../layouts/AppLayout';
import QualityScore from '../components/QualityScore';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import UploadModal from '../components/UploadModal';
import { datasetService } from '../services/datasetService';

const SEVERITY_COLORS = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' };
const POLL_INTERVAL = 3000;

export default function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dataset, setDataset] = useState(null);
  const [quality, setQuality] = useState(null);
  const [columns, setColumns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('issues');
  const [showUploadVersion, setShowUploadVersion] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [issueFilters, setIssueFilters] = useState({ severity: '', issue_type: '' });
  const pollRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const dsRes = await datasetService.getDataset(id);
      const ds = dsRes.data.data;
      setDataset(ds);

      if (ds.status === 'COMPLETED') {
        const [qRes, colRes, issRes, verRes] = await Promise.all([
          datasetService.getQuality(id),
          datasetService.getColumns(id),
          datasetService.getIssues(id, {}),
          datasetService.getVersions(id),
        ]);
        setQuality(qRes.data.data);
        setColumns(colRes.data.data);
        setIssues(issRes.data.data);
        setVersions(verRes.data.data);
      } else if (ds.status !== 'FAILED') {
        pollRef.current = setTimeout(loadAll, POLL_INTERVAL);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load dataset.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
    return () => clearTimeout(pollRef.current);
  }, [loadAll]);

  async function loadIssues(filters) {
    try {
      const params = {};
      if (filters.severity) params.severity = filters.severity;
      if (filters.issue_type) params.issue_type = filters.issue_type;
      const res = await datasetService.getIssues(id, params);
      setIssues(res.data.data);
    } catch { /* keep existing */ }
  }

  function handleIssueFilter(key, value) {
    const next = { ...issueFilters, [key]: value };
    setIssueFilters(next);
    loadIssues(next);
  }

  async function handleDelete() {
    try {
      await datasetService.deleteDataset(id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Delete failed.');
      setShowDeleteConfirm(false);
    }
  }

  function handleVersionUploadSuccess() {
    setShowUploadVersion(false);
    setLoading(true);
    loadAll();
  }

  if (loading && !dataset) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <LoadingSpinner size={36} />
        </div>
      </AppLayout>
    );
  }

  if (!dataset) {
    return (
      <AppLayout>
        <ErrorMessage message={error || 'Dataset not found.'} />
      </AppLayout>
    );
  }

  const isProcessing = dataset.status === 'PROCESSING' || dataset.status === 'UPLOADED';

  const severityData = Object.entries(
    issues.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const missingData = issues
    .filter((i) => i.type === 'MISSING_VALUES' && i.column)
    .slice(0, 8)
    .map((i) => ({ name: i.column, count: i.count }));

  const versionScoreData = versions.map((v) => ({
    name: `v${v.version_number}`,
    score: v.quality_score,
  }));

  return (
    <AppLayout>
      {/* Header */}
      <div className="dataset-detail-header">
        <div>
          <button className="btn btn-sm btn-ghost" style={{ marginBottom: 6 }} onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <div className="dataset-detail-title">{dataset.name}</div>
          <div className="dataset-detail-sub">
            <span>{dataset.original_filename}</span>
            <StatusBadge status={dataset.status} />
            <span>v{dataset.latest_version}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowUploadVersion(true)}>
            Upload New Version
          </button>
          {versions.length >= 2 && (
            <Link to={`/datasets/${id}/compare`} className="btn btn-sm btn-ghost">
              Compare Versions
            </Link>
          )}
          <button className="btn btn-sm btn-danger-ghost" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {isProcessing && (
        <div className="processing-banner">
          <LoadingSpinner size={20} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Analysing dataset…</div>
            <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>
              This usually takes a few seconds. The page updates automatically.
            </div>
          </div>
        </div>
      )}

      {dataset.status === 'FAILED' && (
        <div className="error-message" style={{ marginBottom: 20 }}>
          Dataset analysis failed. Please try uploading the file again.
        </div>
      )}

      {/* Quality summary */}
      {quality && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 28px' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 4 }}>
                  Quality Score
                </div>
                <QualityScore score={quality.quality_score} />
              </div>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <StatCard label="Rows" value={quality.summary.rows?.toLocaleString()} />
            <StatCard label="Columns" value={quality.summary.columns} />
            <StatCard label="Missing Cells" value={quality.summary.missing_cells?.toLocaleString()} />
            <StatCard label="Duplicate Rows" value={quality.summary.duplicate_rows?.toLocaleString()} />
            <StatCard label="Outliers" value={quality.summary.outlier_values?.toLocaleString()} />
          </div>

          {/* Charts */}
          {(severityData.length > 0 || missingData.length > 0 || versionScoreData.length > 1) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
              {severityData.length > 0 && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Issues by Severity</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                        {severityData.map((entry) => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {missingData.length > 0 && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Missing Values by Column</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={missingData} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {versionScoreData.length > 1 && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Quality Score Over Versions</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={versionScoreData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Tabs */}
      {dataset.status === 'COMPLETED' && (
        <>
          <div className="tabs">
            {[
              { key: 'issues', label: `Issues (${issues.length})` },
              { key: 'columns', label: `Columns (${columns.length})` },
              { key: 'versions', label: `Versions (${versions.length})` },
            ].map((t) => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Issues */}
          {activeTab === 'issues' && (
            <>
              <div className="filter-bar" style={{ marginBottom: 12 }}>
                <select value={issueFilters.severity} onChange={(e) => handleIssueFilter('severity', e.target.value)}>
                  <option value="">All severities</option>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={issueFilters.issue_type} onChange={(e) => handleIssueFilter('issue_type', e.target.value)}>
                  <option value="">All types</option>
                  {['MISSING_VALUES', 'DUPLICATES', 'OUTLIER', 'INVALID_TYPE', 'INVALID_DATE', 'EMPTY_COLUMN', 'CONSTANT_COLUMN', 'INCONSISTENT_CATEGORY'].map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              {issues.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✓</div>
                  <div className="empty-state-title">No issues found</div>
                  <div className="empty-state-desc">This dataset looks clean for the selected filters.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Type</th>
                        <th>Column</th>
                        <th>Count</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, i) => (
                        <tr key={i}>
                          <td><SeverityBadge severity={issue.severity} /></td>
                          <td><code style={{ fontSize: 12 }}>{issue.type}</code></td>
                          <td>{issue.column || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                          <td>{issue.count?.toLocaleString()}</td>
                          <td style={{ color: '#6b7280', fontSize: 12 }}>{issue.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Columns */}
          {activeTab === 'columns' && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Nulls</th>
                    <th>Unique</th>
                    <th>Dupes</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                    <th>Median</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, i) => (
                    <tr key={i}>
                      <td><strong>{col.column_name}</strong></td>
                      <td><code style={{ fontSize: 12 }}>{col.detected_type}</code></td>
                      <td>{col.null_count}</td>
                      <td>{col.unique_count}</td>
                      <td>{col.duplicate_count}</td>
                      <td>{col.min_value ?? '—'}</td>
                      <td>{col.max_value ?? '—'}</td>
                      <td>{col.mean_value != null ? Number(col.mean_value).toFixed(2) : '—'}</td>
                      <td>{col.median_value != null ? Number(col.median_value).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Versions */}
          {activeTab === 'versions' && (
            <div className="version-list">
              {versions.map((v) => (
                <div
                  key={v.version_number}
                  className={`version-item ${v.version_number === dataset.latest_version ? 'active-version' : ''}`}
                >
                  <div>
                    <div className="version-label">Version {v.version_number}</div>
                    <div className="version-meta">
                      {v.original_filename} · {v.row_count?.toLocaleString()} rows · {v.column_count} cols
                      {v.uploaded_at && ` · ${new Date(v.uploaded_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 700, fontSize: 16,
                        color: v.quality_score >= 80 ? '#16a34a' : v.quality_score >= 60 ? '#d97706' : '#dc2626',
                      }}>
                        {v.quality_score ?? '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>score</div>
                    </div>
                    {v.version_number === dataset.latest_version && (
                      <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        Latest
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {versions.length >= 2 && (
                <div style={{ marginTop: 8 }}>
                  <Link to={`/datasets/${id}/compare`} className="btn btn-ghost btn-sm">
                    Compare Versions →
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showUploadVersion && (
        <UploadModal
          datasetId={id}
          onClose={() => setShowUploadVersion(false)}
          onSuccess={handleVersionUploadSuccess}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Delete "${dataset.name}"? This will permanently remove all versions and analysis records.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </AppLayout>
  );
}
