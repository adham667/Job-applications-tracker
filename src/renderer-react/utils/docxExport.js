import { Document, Packer, Paragraph, TextRun, HeadingLevel, convertInchesToTwip, UnderlineType, LevelFormat, AlignmentType } from "docx";

const DEFAULT_MARGINS = {
  top: convertInchesToTwip(0.75),
  bottom: convertInchesToTwip(0.75),
  left: convertInchesToTwip(0.75),
  right: convertInchesToTwip(0.75),
};

const DEFAULT_CV_STYLE = {
  fontFamily: "Calibri",
  fontSize: 24,
  heading1Size: 40,
  heading2Size: 28,
  heading3Size: 24,
  textColor: "333333",
  headingColor: "111111",
  normalSpacing: { after: 120, line: 360, lineRule: "auto" },
  sectionSpacing: { before: 240, after: 120 },
  bulletSpacing: { after: 80, line: 360, lineRule: "auto" },
};

export function createStructuredCvFromEditorJson(editorJson) {
  const structured = {
    personalInfo: {
      fullName: "",
      contact: "",
      summary: "",
    },
    sections: [],
  };

  if (!editorJson || !Array.isArray(editorJson.content)) {
    return structured;
  }

  let currentSection = { title: "Summary", blocks: [] };
  let sawName = false;
  let sawContact = false;

  editorJson.content.forEach((node) => {
    if (!node) return;

    if (node.type === "heading") {
      const headingText = getTextFromNode(node).trim();
      if (!sawName && node.attrs?.level === 1) {
        structured.personalInfo.fullName = headingText;
        sawName = true;
        return;
      }

      if (sawName && !sawContact && currentSection.blocks.length === 0 && currentSection.title === "Summary") {
        structured.personalInfo.contact = headingText;
        sawContact = true;
        return;
      }

      if (currentSection.blocks.length > 0 || currentSection.title !== "Summary") {
        structured.sections.push(currentSection);
      }
      currentSection = { title: headingText || "Section", blocks: [] };
      return;
    }

    if (node.type === "paragraph") {
      const paragraphText = getTextFromNode(node).trim();
      if (!paragraphText) return;

      if (!sawName) {
        structured.personalInfo.fullName = paragraphText;
        sawName = true;
        return;
      }

      if (sawName && !sawContact && currentSection.blocks.length === 0 && currentSection.title === "Summary") {
        structured.personalInfo.contact = paragraphText;
        sawContact = true;
        return;
      }

      if (currentSection.title === "Summary" && currentSection.blocks.length === 0 && !structured.personalInfo.summary) {
        structured.personalInfo.summary = paragraphText;
        return;
      }

      currentSection.blocks.push({ type: "paragraph", content: node.content || [] });
      return;
    }

    if (node.type === "bulletList") {
      const items = [];
      if (Array.isArray(node.content)) {
        node.content.forEach((listItem) => {
          if (!listItem || listItem.type !== "listItem" || !Array.isArray(listItem.content)) return;
          const itemContent = [];
          listItem.content.forEach((child) => {
            if (child.type === "paragraph" && Array.isArray(child.content)) {
              itemContent.push(...child.content);
            } else if (child.content) {
              itemContent.push(...child.content);
            }
          });
          items.push({ content: itemContent });
        });
      }
      if (items.length > 0) {
        currentSection.blocks.push({ type: "bulletList", items });
      }
      return;
    }

    // Ignore unsupported or nested nodes to keep the export source strictly structured.
  });

  if (currentSection.blocks.length > 0 || currentSection.title !== "Summary") {
    structured.sections.push(currentSection);
  }

  return structured;
}

export async function exportCVToDocxFromStructuredData(structuredCv, style = DEFAULT_CV_STYLE) {
  if (!structuredCv) {
    throw new Error("Structured CV data is missing.");
  }

  const children = buildDocumentChildrenFromStructuredCv(structuredCv, style);
  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No CV content available.",
            font: style.fontFamily,
            size: style.fontSize,
            color: style.textColor,
          }),
        ],
        spacing: style.normalSpacing,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children,
        margins: DEFAULT_MARGINS,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

function buildDocumentChildrenFromStructuredCv(structuredCv, style) {
  const children = [];
  const info = structuredCv.personalInfo || {};

  if (info.fullName) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: info.fullName,
            bold: true,
            font: style.fontFamily,
            size: style.heading1Size,
            color: style.headingColor,
          }),
        ],
        spacing: { before: style.sectionSpacing.before, after: style.sectionSpacing.after, lineRule: "auto" },
      })
    );
  }

  if (info.contact) {
    children.push(
      new Paragraph({
        children: createTextRunsFromNodes([{ type: "text", text: info.contact }], style),
        spacing: style.normalSpacing,
      })
    );
  }

  if (info.summary) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "Summary",
            bold: true,
            font: style.fontFamily,
            size: style.heading2Size,
            color: style.headingColor,
          }),
        ],
        spacing: { before: style.sectionSpacing.before, after: style.normalSpacing.after, lineRule: "auto" },
      })
    );
    children.push(
      new Paragraph({
        children: createTextRunsFromNodes([{ type: "text", text: info.summary }], style),
        spacing: style.normalSpacing,
      })
    );
  }

  if (Array.isArray(structuredCv.sections)) {
    structuredCv.sections.forEach((section) => {
      if (!section || !section.title) return;

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              font: style.fontFamily,
              size: style.heading2Size,
              color: style.headingColor,
            }),
          ],
          spacing: { before: style.sectionSpacing.before, after: style.normalSpacing.after, lineRule: "auto" },
        })
      );

      if (Array.isArray(section.blocks)) {
        section.blocks.forEach((block) => {
          if (block.type === "paragraph") {
            children.push(
              new Paragraph({
                children: createTextRunsFromNodes(block.content || [], style),
                spacing: style.normalSpacing,
              })
            );
          }

          if (block.type === "bulletList" && Array.isArray(block.items)) {
            block.items.forEach((item) => {
              children.push(
                new Paragraph({
                  children: createTextRunsFromNodes(item.content || [], style),
                  bullet: { level: 0 },
                  spacing: style.bulletSpacing,
                })
              );
            });
          }
        });
      }
    });
  }

  return children;
}

function createTextRunsFromNodes(nodes, style) {
  const runs = [];
  if (!Array.isArray(nodes)) {
    return [
      new TextRun({
        text: "",
        font: style.fontFamily,
        size: style.fontSize,
        color: style.textColor,
      }),
    ];
  }

  nodes.forEach((node) => {
    if (!node) return;

    if (node.type === "text") {
      const marks = Array.isArray(node.marks) ? node.marks : [];
      const isBold = marks.some((m) => m.type === "bold");
      const isItalic = marks.some((m) => m.type === "italic");
      const isUnderline = marks.some((m) => m.type === "underline");
      const colorMark = marks.find((m) => m.type === "textStyle");
      const color = colorMark?.attrs?.color?.replace("#", "") || style.textColor;

      runs.push(
        new TextRun({
          text: node.text || "",
          bold: isBold || undefined,
          italic: isItalic || undefined,
          underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
          color,
          font: style.fontFamily,
          size: style.fontSize,
        })
      );
      return;
    }

    if (node.type === "hardBreak" || node.type === "lineBreak" || node.type === "break") {
      runs.push(new TextRun({ text: "", break: 1 }));
      return;
    }

    if (node.content && Array.isArray(node.content)) {
      runs.push(...createTextRunsFromNodes(node.content, style));
      return;
    }

    if (typeof node.text === "string") {
      runs.push(
        new TextRun({
          text: node.text,
          font: style.fontFamily,
          size: style.fontSize,
          color: style.textColor,
        })
      );
    }
  });

  return runs;
}

function getTextFromNode(node) {
  if (!node) return "";
  if (node.type === "text") {
    return node.text || "";
  }

  if (Array.isArray(node.content)) {
    return node.content.map(getTextFromNode).join("");
  }

  return "";
}

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
