export default function SuggestionsList({ improvements, onApplySuggestion }) {
  return (
    <div className="panel-block">
      <h3>AI Improvements</h3>
      {!improvements?.length && <p className="muted">No suggestions yet.</p>}
      {(improvements || []).map((item, index) => (
        <div className="suggestion-card" key={`${item.original}-${index}`}>
          <p>
            <strong>Original:</strong> {item.original}
          </p>
          <p>
            <strong>Suggested:</strong> {item.suggested}
          </p>
          <button onClick={() => onApplySuggestion(item.original, item.suggested)}>Apply suggestion</button>
        </div>
      ))}
    </div>
  );
}
