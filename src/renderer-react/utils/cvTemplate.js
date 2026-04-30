export const cvTemplate = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Your Name" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Email | Phone | LinkedIn | Location" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Summary" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Results-driven professional with experience delivering measurable outcomes.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Experience" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Led initiatives that improved KPI by 20%." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Partnered cross-functionally to reduce cycle time by 30%." }],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Skills" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "React, JavaScript, Problem Solving, Communication" }],
    },
  ],
};
