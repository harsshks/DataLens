export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown?.signals?.length) return null;

  const total = breakdown.total_deduction ?? 0;

  return (
    <div className="score-breakdown">
      <div className="score-breakdown-header">
        <div style={{ fontWeight: 600, fontSize: 13 }}>Why this score</div>
        <div className="score-breakdown-formula">
          {breakdown.starting_score} − {total}{breakdown.clamped ? ' (clamped)' : ''} = {breakdown.score}
        </div>
      </div>
      <table className="data-table score-breakdown-table">
        <thead>
          <tr>
            <th>Signal</th>
            <th>How it is measured</th>
            <th>Deduction</th>
            <th>Cap</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.signals.map((signal) => (
            <tr key={signal.key} className={signal.capped ? 'score-signal-capped' : undefined}>
              <td>
                <strong>{signal.label}</strong>
                {signal.capped ? <span className="score-cap-pill">capped</span> : null}
              </td>
              <td style={{ color: '#6b7280', fontSize: 12 }}>{signal.detail}</td>
              <td>−{signal.deduction}</td>
              <td>{signal.cap}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="score-breakdown-note">
        Heuristic demo score: each signal is capped on its own, then the total is clamped to 0–100 and rounded.
      </p>
    </div>
  );
}
