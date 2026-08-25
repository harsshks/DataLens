const colors = {
  LOW: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  MEDIUM: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  HIGH: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

export default function SeverityBadge({ severity }) {
  const c = colors[severity] || colors.LOW;
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
        letterSpacing: '0.02em',
      }}
    >
      {severity}
    </span>
  );
}
