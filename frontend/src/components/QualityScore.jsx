export default function QualityScore({ score }) {
  const color =
    score === null || score === undefined
      ? '#9ca3af'
      : score >= 80
      ? '#16a34a'
      : score >= 60
      ? '#d97706'
      : '#dc2626';

  return (
    <div className="quality-score-block">
      <div className="quality-score-number" style={{ color }}>
        {score ?? '—'}
      </div>
      <div className="quality-score-label">/ 100</div>
    </div>
  );
}
