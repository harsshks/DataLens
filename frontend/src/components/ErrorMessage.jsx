export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-message">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-sm btn-ghost">
          Retry
        </button>
      )}
    </div>
  );
}
