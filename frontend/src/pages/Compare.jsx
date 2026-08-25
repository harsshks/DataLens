import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { datasetService } from '../services/datasetService';

export default function Compare() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [versions, setVersions] = useState([]);
  const [v1, setV1] = useState('');
  const [v2, setV2] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    datasetService
      .getVersions(id)
      .then((res) => {
        const vers = res.data.data;
        setVersions(vers);
        if (vers.length >= 2) {
          setV1(String(vers[vers.length - 2].version_number));
          setV2(String(vers[vers.length - 1].version_number));
        }
      })
      .catch(() => setError('Failed to load versions.'))
      .finally(() => setVersionsLoading(false));
  }, [id]);

  async function handleCompare() {
    if (!v1 || !v2 || v1 === v2) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await datasetService.compareVersions(id, v1, v2);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  const changeCls = (val) => {
    if (val === null || val === undefined) return 'change-neutral';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (n > 0) return 'change-positive';
    if (n < 0) return 'change-negative';
    return 'change-neutral';
  };

  const fmt = (val) => {
    if (val === null || val === undefined) return '0';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (n > 0) return `+${n}`;
    return String(n);
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-ghost" style={{ marginBottom: 6 }} onClick={() => navigate(`/datasets/${id}`)}>
            ← Back to Dataset
          </button>
          <h2>Compare Versions</h2>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {versionsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          {/* Version picker */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group">
                <label>Base Version</label>
                <select value={v1} onChange={(e) => setV1(e.target.value)}>
                  {versions.map((v) => (
                    <option key={v.version_number} value={v.version_number}>
                      Version {v.version_number} — score {v.quality_score ?? '?'}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ paddingBottom: 2, color: '#6b7280', fontSize: 18 }}>→</div>
              <div className="form-group">
                <label>Compare With</label>
                <select value={v2} onChange={(e) => setV2(e.target.value)}>
                  {versions.map((v) => (
                    <option key={v.version_number} value={v.version_number}>
                      Version {v.version_number} — score {v.quality_score ?? '?'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCompare}
                disabled={loading || !v1 || !v2 || v1 === v2}
                style={{ marginBottom: 2 }}
              >
                {loading ? 'Comparing…' : 'Compare'}
              </button>
            </div>
            {v1 === v2 && <p style={{ fontSize: 12, color: '#d97706', marginTop: 8 }}>Select two different versions to compare.</p>}
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size={28} />
            </div>
          )}

          {result && (
            <>
              {/* Score comparison */}
              <div className="compare-header" style={{ marginBottom: 20 }}>
                <div className="compare-version-box">
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Version {result.version1}</div>
                  <div style={{ fontSize: 36, fontWeight: 800 }}>{result.quality_score.from ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>/ 100</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className={`compare-change ${changeCls(result.quality_change)}`}>
                    {fmt(result.quality_change)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>quality change</div>
                </div>
                <div className="compare-version-box">
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Version {result.version2}</div>
                  <div style={{ fontSize: 36, fontWeight: 800 }}>{result.quality_score.to ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>/ 100</div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="stat-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className={`stat-value ${result.resolved_issues > 0 ? 'change-positive' : ''}`} style={{ color: result.resolved_issues > 0 ? '#16a34a' : undefined }}>
                    {result.resolved_issues}
                  </div>
                  <div className="stat-label">Resolved Issues</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: result.new_issues > 0 ? '#dc2626' : undefined }}>
                    {result.new_issues}
                  </div>
                  <div className="stat-label">New Issues</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: result.improved_columns > 0 ? '#16a34a' : undefined }}>
                    {result.improved_columns}
                  </div>
                  <div className="stat-label">Improved Columns</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: result.worsened_columns > 0 ? '#dc2626' : undefined }}>
                    {result.worsened_columns}
                  </div>
                  <div className="stat-label">Worsened Columns</div>
                </div>
                <div className="stat-card">
                  <div className={`stat-value ${changeCls(result.row_count_change)}`}>
                    {fmt(result.row_count_change)}
                  </div>
                  <div className="stat-label">Row Count Change</div>
                </div>
                <div className="stat-card">
                  <div className={`stat-value ${changeCls(result.column_count_change)}`}>
                    {fmt(result.column_count_change)}
                  </div>
                  <div className="stat-label">Column Count Change</div>
                </div>
              </div>

              {/* Interpretation */}
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Interpretation</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.resolved_issues > 0 && (
                    <div className="info-message" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                      ✓ {result.resolved_issues} issue{result.resolved_issues !== 1 ? 's' : ''} resolved in v{result.version2} compared to v{result.version1}.
                    </div>
                  )}
                  {result.new_issues > 0 && (
                    <div className="error-message">
                      ✗ {result.new_issues} new issue{result.new_issues !== 1 ? 's' : ''} appeared in v{result.version2}.
                    </div>
                  )}
                  {result.improved_columns > 0 && (
                    <div className="info-message" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                      ↑ {result.improved_columns} column{result.improved_columns !== 1 ? 's' : ''} improved.
                    </div>
                  )}
                  {result.worsened_columns > 0 && (
                    <div className="error-message">
                      ↓ {result.worsened_columns} column{result.worsened_columns !== 1 ? 's' : ''} got worse.
                    </div>
                  )}
                  {result.resolved_issues === 0 && result.new_issues === 0 && (
                    <div className="info-message">No change in issues between these two versions.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
