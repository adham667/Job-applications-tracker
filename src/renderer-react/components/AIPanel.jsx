import SuggestionsList from "./SuggestionsList";

export default function AIPanel({
  jobDescription,
  setJobDescription,
  aiSuggestions,
  loading,
  error,
  onAnalyze,
  onApplySuggestion,
}) {
  return (
    <aside className="ai-panel">
      <h2>AI Assistant</h2>
      <label htmlFor="job-description">Job Description</label>
      <textarea
        id="job-description"
        rows={8}
        value={jobDescription}
        onChange={(event) => setJobDescription(event.target.value)}
        placeholder="Paste the job description here..."
      />

      <div className="panel-actions">
        <button onClick={onAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Re-analyze"}
        </button>
      </div>

      {loading && <div className="spinner" aria-label="Loading AI analysis" />}
      {error && <p className="error">{error}</p>}

      <div className="panel-block">
        <h3>General Suggestions</h3>
        <ul>
          {(aiSuggestions.general_suggestions || []).map((suggestion, index) => (
            <li key={`${suggestion}-${index}`}>{suggestion}</li>
          ))}
        </ul>
      </div>

      <SuggestionsList improvements={aiSuggestions.improvements} onApplySuggestion={onApplySuggestion} />
    </aside>
  );
}
