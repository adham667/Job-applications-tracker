import { Document, Packer, Paragraph, TextRun, HeadingLevel, convertInchesToTwip, UnderlineType, LevelFormat, AlignmentType } from "docx";

const DEFAULT_MARGINS = {
  top: convertInchesToTwip(0.75),
  bottom: convertInchesToTwip(0.75),
  left: convertInchesToTwip(0.75),
  right: convertInchesToTwip(0.75),
};

export async function exportCVToDocxFromHtml(editorHtml) {
  const safeHtml = (editorHtml || "").trim();
  if (!safeHtml) {
    throw new Error("Editor content is empty; cannot export DOCX.");
  }

  const paragraphs = parseHtmlContent(safeHtml);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "ordered-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: paragraphs,
        margins: DEFAULT_MARGINS,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

function parseHtmlContent(html) {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild;
  if (!root) return [new Paragraph({ text: "" })];

  const paragraphs = [];
  Array.from(root.childNodes).forEach((node) => {
    paragraphs.push(...convertHtmlBlock(node));
  });

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: "" })];
}

function convertHtmlBlock(node) {
  const paragraphs = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || "").trim();
    if (text) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text })],
          spacing: { after: 100, line: 360, lineRule: "auto" },
        })
      );
    }
    return paragraphs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return paragraphs;
  }

  const tag = node.nodeName;

  switch (tag) {
    case "P":
      paragraphs.push(
        new Paragraph({
          children: convertInlineNodes(node),
          spacing: { after: 100, line: 360, lineRule: "auto" },
        })
      );
      break;
    case "H1":
    case "H2":
    case "H3":
      paragraphs.push(
        new Paragraph({
          heading: {
            H1: HeadingLevel.HEADING_1,
            H2: HeadingLevel.HEADING_2,
            H3: HeadingLevel.HEADING_3,
          }[tag],
          children: convertInlineNodes(node),
          spacing: { before: 200, after: 100, line: 360, lineRule: "auto" },
        })
      );
      break;
    case "UL":
      paragraphs.push(...convertHtmlList(node, false));
      break;
    case "OL":
      paragraphs.push(...convertHtmlList(node, true));
      break;
    case "DIV":
    case "SECTION":
    case "ARTICLE":
      Array.from(node.childNodes).forEach((child) => {
        paragraphs.push(...convertHtmlBlock(child));
      });
      break;
    default:
      if (node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach((child) => {
          paragraphs.push(...convertHtmlBlock(child));
        });
      }
      break;
  }

  return paragraphs;
}

function convertHtmlList(listNode, ordered) {
  const paragraphs = [];
  Array.from(listNode.children).forEach((item) => {
    if (item.nodeName !== "LI") return;

    const listRuns = convertInlineNodes(item, { allowNestedList: true });
    paragraphs.push(
      new Paragraph({
        children: listRuns,
        bullet: ordered ? undefined : { level: 0 },
        numbering: ordered
          ? {
              reference: "ordered-numbering",
              level: 0,
            }
          : undefined,
        spacing: { after: 80, line: 360, lineRule: "auto" },
      })
    );

    const nestedLists = Array.from(item.children).filter((child) => child.nodeName === "UL" || child.nodeName === "OL");
    nestedLists.forEach((nested) => {
      paragraphs.push(...convertHtmlList(nested, nested.nodeName === "OL"));
    });
  });
  return paragraphs;
}

function convertInlineNodes(node, inheritedStyles = {}) {
  const runs = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text === "") return;
      runs.push(
        new TextRun({
          text,
          bold: inheritedStyles.bold,
          italic: inheritedStyles.italic,
          underline: inheritedStyles.underline,
          color: inheritedStyles.color,
        })
      );
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    let styles = { ...inheritedStyles };

    switch (child.nodeName) {
      case "STRONG":
      case "B":
        styles.bold = true;
        break;
      case "EM":
      case "I":
        styles.italic = true;
        break;
      case "U":
        styles.underline = { type: UnderlineType.SINGLE };
        break;
      case "SPAN":
        if (child.style && child.style.color) {
          const colorValue = child.style.color.trim();
          const hex = colorValue.replace(/^#/, "").split(";")[0];
          if (/^[0-9A-Fa-f]{3,6}$/.test(hex)) {
            styles.color = hex;
          }
        }
        break;
      case "A":
        // Keep link text but drop href for DOCX export
        break;
      case "BR":
        runs.push(new TextRun({ text: "", break: 1, ...styles }));
        return;
      default:
        break;
    }

    runs.push(...convertInlineNodes(child, styles));
  });

  return runs;
}

export async function exportCVToDocxFromJson(editorJson) {
  if (!editorJson || !editorJson.content || !Array.isArray(editorJson.content)) {
    throw new Error("Invalid editor content; cannot export DOCX.");
  }

  const sections = [];
  editorJson.content.forEach((node) => {
    const paragraphs = convertNodeToParagraphs(node);
    sections.push(...paragraphs);
  });

  if (sections.length === 0) {
    sections.push(new Paragraph({ text: "No content" }));
  }

  const doc = new Document({
    sections: [
      {
        children: sections,
        margins: DEFAULT_MARGINS,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

function convertNodeToParagraphs(node) {
  const paragraphs = [];

  if (!node) return paragraphs;

  if (node.type === "heading") {
    const level = node.attrs?.level || 1;
    const runs = createTextRuns(node);
    paragraphs.push(
      new Paragraph({
        heading: {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
        }[level] || HeadingLevel.HEADING_1,
        children: runs.length > 0 ? runs : [new TextRun("")],
        spacing: { before: level === 1 ? 200 : 100, after: 100, line: 360, lineRule: "auto" },
      })
    );
  } else if (node.type === "paragraph") {
    const runs = createTextRuns(node);
    paragraphs.push(
      new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun("")],
        spacing: { after: 100, line: 360, lineRule: "auto" },
      })
    );
  } else if (node.type === "bulletList") {
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((listItem) => {
        if (listItem.type === "listItem") {
          paragraphs.push(...processBulletListItem(listItem));
        }
      });
    }
  }

  return paragraphs;
}

function processBulletListItem(listItem) {
  const paragraphs = [];
  if (!listItem.content || !Array.isArray(listItem.content)) return paragraphs;

  listItem.content.forEach((contentNode) => {
    if (contentNode.type === "paragraph") {
      const runs = createTextRuns(contentNode);
      paragraphs.push(
        new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun("")],
          bullet: { level: 0 },
          spacing: { after: 80, line: 360, lineRule: "auto" },
        })
      );
    }
  });

  return paragraphs;
}

function createTextRuns(node) {
  if (!node.content || !Array.isArray(node.content)) return [];

  return node.content
    .filter((child) => child.type === "text")
    .map((child) => {
      const marks = child.marks || [];
      const isBold = marks.some((m) => m.type === "bold");
      const isItalic = marks.some((m) => m.type === "italic");
      const isUnderline = marks.some((m) => m.type === "underline");
      const colorMark = marks.find((m) => m.type === "textStyle");
      const color = colorMark?.attrs?.color;

      return new TextRun({
        text: child.text || "",
        bold: isBold || undefined,
        italic: isItalic || undefined,
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        color: color?.replace("#", "") || undefined,
      });
    });
}
