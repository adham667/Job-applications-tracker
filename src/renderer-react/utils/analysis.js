const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "are",
  "our",
  "from",
  "that",
  "will",
  "this",
  "have",
  "has",
  "into",
  "about",
  "able",
  "work",
  "years",
  "experience",
]);

export function extractKeywords(jobDescription) {
  const words = (jobDescription || "").toLowerCase().match(/[a-zA-Z][a-zA-Z0-9+-]{2,}/g);
  if (!words) return [];

  const counts = new Map();
  words.forEach((word) => {
    if (STOP_WORDS.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word]) => word);
}

export function buildKeywordStatus(keywords, cvContent) {
  const cvLower = (cvContent || "").toLowerCase();
  return keywords.map((keyword) => ({
    keyword,
    present: cvLower.includes(keyword.toLowerCase()),
  }));
}

export function computeMatchScore(keywordStatus) {
  if (!keywordStatus.length) return 0;
  const matched = keywordStatus.filter((item) => item.present).length;
  return Math.round((matched / keywordStatus.length) * 100);
}
