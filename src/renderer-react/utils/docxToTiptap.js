import { cvTemplate } from "./cvTemplate";

function isLikelyHeading(line) {
  if (!line) return false;
  const trimmed = line.trim();
  return /^[A-Z][A-Za-z\s]{2,35}$/.test(trimmed) || trimmed.endsWith(":");
}

export function docxTextToTiptapJson(rawText) {
  if (!rawText || !rawText.trim()) return cvTemplate;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return cvTemplate;

  const content = [];

  lines.forEach((line, index) => {
    const bulletLine = line.match(/^[-*•]\s+(.+)$/);
    if (bulletLine) {
      const text = bulletLine[1].trim();
      const lastNode = content[content.length - 1];
      if (lastNode?.type === "bulletList") {
        lastNode.content.push({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        });
      } else {
        content.push({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text }] }],
            },
          ],
        });
      }
      return;
    }

    if (index === 0 || isLikelyHeading(line)) {
      content.push({
        type: "heading",
        attrs: { level: index === 0 ? 1 : 2 },
        content: [{ type: "text", text: line.replace(/:$/, "") }],
      });
      return;
    }

    content.push({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    });
  });

  return { type: "doc", content };
}
