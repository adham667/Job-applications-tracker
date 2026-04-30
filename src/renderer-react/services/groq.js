const SYSTEM_PROMPT = `You are an expert career coach and resume optimizer.

Your job is to improve resumes to match job descriptions while:
- keeping content truthful
- making bullet points more impactful
- adding measurable achievements when possible
- using strong action verbs
- aligning with ATS keyword matching`;

function parseJsonFromLLM(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const maybeJson = text.match(/\{[\s\S]*\}/);
    if (!maybeJson) throw new Error("LLM did not return valid JSON.");
    return JSON.parse(maybeJson[0]);
  }
}

let cachedApiKey = null;

async function resolveApiKey() {
  if (cachedApiKey) return cachedApiKey;

  const viteKey = import.meta.env.VITE_GROQ_API_KEY;
  if (viteKey) {
    cachedApiKey = viteKey;
    return cachedApiKey;
  }

  try {
    const result = await window.electronAPI?.getGroqApiKey?.();
    if (result?.success && result?.key) {
      cachedApiKey = result.key;
      return cachedApiKey;
    }
  } catch (_) {
    // Ignore and throw standard missing key error below.
  }

  throw new Error("Missing VITE_GROQ_API_KEY.");
}

export async function callLLM(jobDescription, cvContent, retries = 2) {
  const apiKey = await resolveApiKey();

  const userPrompt = `Job Description:
${jobDescription}

CV Content:
${cvContent}

TASK:
1. Suggest improvements to the CV
2. Identify missing keywords
3. Rewrite weak bullet points
4. Keep suggestions concise and actionable

OUTPUT FORMAT (STRICT JSON):
{
  "match_score": number,
  "missing_keywords": [string],
  "improvements": [
    {
      "original": string,
      "suggested": string
    }
  ],
  "general_suggestions": [string]
}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Groq.");
      return parseJsonFromLLM(content);
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw new Error("Unexpected LLM flow.");
}

export async function improveBulletWithAI(jobDescription, bullet) {
  const apiKey = await resolveApiKey();

  const prompt = `Rewrite this resume bullet for better impact and ATS alignment.
Keep it truthful and concise.
Return JSON: {"suggested": "string"}

Job Description:
${jobDescription}

Original Bullet:
${bullet}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = parseJsonFromLLM(content || "{}");
  return parsed.suggested || bullet;
}
