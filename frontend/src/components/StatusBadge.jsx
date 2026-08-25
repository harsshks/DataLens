const colors = {
  COMPLETED: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  PROCESSING: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  UPLOADED: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  FAILED: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}
