import { useState, useRef, useCallback } from 'react';
import { datasetService } from '../services/datasetService';

export default function UploadModal({ onClose, onSuccess, datasetId = null }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const isVersion = datasetId !== null;

  function pickFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported.');
      return;
    }
    setError('');
    setFile(f);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (!isVersion && name.trim()) formData.append('name', name.trim());

      const onProgress = (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      let res;
      if (isVersion) {
        res = await datasetService.uploadVersion(datasetId, formData, onProgress);
      } else {
        res = await datasetService.uploadDataset(formData, onProgress);
      }
      onSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  }

  const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isVersion ? 'Upload New Version' : 'Upload Dataset'}</h3>
          {!uploading && (
            <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
          )}
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {!file ? (
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="drop-icon">⬆</div>
            <div className="drop-text">Drag & drop a CSV file here</div>
            <div className="drop-subtext">or click to browse</div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="file-preview">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{fmtSize(file.size)}</div>
            </div>
            {!uploading && (
              <button className="btn-icon" onClick={() => setFile(null)} aria-label="Remove">✕</button>
            )}
          </div>
        )}

        {!isVersion && file && !uploading && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Dataset name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={file.name.replace(/\.csv$/i, '')}
            />
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: '1rem' }}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' }}>
              {progress < 100 ? `Uploading… ${progress}%` : 'Analysing dataset…'}
            </div>
          </div>
        )}

        {!uploading && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file}>
              {isVersion ? 'Upload Version' : 'Upload & Analyse'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
