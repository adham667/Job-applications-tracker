export default function KeywordList({ keywordStatus }) {
  return (
    <div className="panel-block">
      <h3>Keywords</h3>
      <ul className="keyword-list">
        {keywordStatus.map((item) => (
          <li key={item.keyword} className={item.present ? "present" : "missing"}>
            <span>{item.keyword}</span>
            <strong>{item.present ? "Matched" : "Missing"}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
