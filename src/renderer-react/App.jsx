import { useCallback, useEffect, useMemo, useState } from "react";
import CVEditor from "./components/CVEditor";
import AIPanel from "./components/AIPanel";
import { cvTemplate } from "./utils/cvTemplate";
import { callLLM, improveBulletWithAI } from "./services/groq";
import { docxTextToTiptapJson } from "./utils/docxToTiptap";
import {
  exportCVToDocxFromStructuredData,
  createStructuredCvFromEditorJson,
} from "./utils/docxExport";

function replaceFirstMatchInJson(node, originalText, replacementText) {
  if (!node) return { node, replaced: false };
  if (node.type === "text" && typeof node.text === "string" && node.text.includes(originalText)) {
    return {
      node: { ...node, text: node.text.replace(originalText, replacementText) },
      replaced: true,
    };
  }
  if (!node.content) return { node, replaced: false };

  let replaced = false;
  const updatedContent = node.content.map((child) => {
    if (replaced) return child;
    const result = replaceFirstMatchInJson(child, originalText, replacementText);
    if (result.replaced) replaced = true;
    return result.node;
  });

  return { node: { ...node, content: updatedContent }, replaced };
}

export default function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [cvContent, setCvContent] = useState("");
  const [cvHtml, setCvHtml] = useState("");
  const [cvJson, setCvJson] = useState(cvTemplate);
  const [cvStructuredData, setCvStructuredData] = useState(createStructuredCvFromEditorJson(cvTemplate));
  const [editorContent, setEditorContent] = useState(cvTemplate);
  const [editor, setEditor] = useState(null);
  const [application, setApplication] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [cvPath, setCvPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState({
    improvements: [],
    general_suggestions: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const ctx = await window.electronAPI?.getEditorContext?.();
        if (ctx?.jobDescription) setJobDescription(ctx.jobDescription);
        if (ctx?.application) setApplication(ctx.application);
        if (ctx?.templateName) setTemplateName(ctx.templateName);
        if (ctx?.cvPath) setCvPath(ctx.cvPath);

        if (ctx?.cvPath) {
          const readResult = await window.electronAPI?.readDocxText?.(ctx.cvPath);
          if (!readResult?.success) {
            throw new Error(readResult?.error || "Failed to import DOCX template.");
          }
          const importedContent = readResult.html?.trim()
            ? readResult.html
            : docxTextToTiptapJson(readResult.text);
          setEditorContent(importedContent);
          setCvContent(readResult.text || "");
          const structuredSource = typeof importedContent === "string"
            ? docxTextToTiptapJson(readResult.text)
            : importedContent;
          setCvStructuredData(createStructuredCvFromEditorJson(structuredSource));
        }
      } catch (initError) {
        const message = initError.message || "Editor initialization failed.";
        setError(message);
        window.electronAPI?.logClientError?.({
          source: "renderer-react.App.init",
          message,
          stack: initError.stack,
        });
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const keywords = useMemo(() => [], []);
  const keywordStatus = useMemo(() => [], []);
  const localMatchScore = useMemo(() => 0, []);
  const matchScore = 0;

  const analyzeCV = useCallback(async () => {
    if (!jobDescription.trim()) {
      setAiSuggestions({
        improvements: [],
        general_suggestions: [],
      });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await callLLM(jobDescription, cvContent);
      setAiSuggestions({
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
        general_suggestions: Array.isArray(result.general_suggestions) ? result.general_suggestions : [],
      });
    } catch (analysisError) {
      setError(analysisError.message || "Failed to run AI analysis.");
      window.electronAPI?.logClientError?.({
        source: "renderer-react.App.analyzeCV",
        message: analysisError.message,
        stack: analysisError.stack,
      });
    } finally {
      setLoading(false);
    }
  }, [jobDescription, cvContent]);

  useEffect(() => {
    if (initializing) return;
    analyzeCV();
  }, [initializing, analyzeCV]); // initial run after import

  const applySuggestion = (original, suggested) => {
    if (!editor || !original || !suggested) return;
    const updated = replaceFirstMatchInJson(cvJson, original, suggested);
    if (updated.replaced) {
      setCvJson(updated.node);
      setEditorContent(updated.node);
      editor.commands.setContent(updated.node);
    }
  };

  const improveSelectedBullet = async (selectedText) => {
    if (!editor || !selectedText) return;
    if (!jobDescription.trim()) {
      setError("Add a job description to use bullet improvement.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const improved = await improveBulletWithAI(jobDescription, selectedText);
      const updated = replaceFirstMatchInJson(cvJson, selectedText, improved);
      if (updated.replaced) {
        setCvJson(updated.node);
        setEditorContent(updated.node);
        editor.commands.setContent(updated.node);
      }
    } catch (improveError) {
      setError(improveError.message || "Failed to improve selected bullet.");
      window.electronAPI?.logClientError?.({
        source: "renderer-react.App.improveSelectedBullet",
        message: improveError.message,
        stack: improveError.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCV = async () => {
    try {
      setError("");
      if (!cvHtml || !cvHtml.trim()) {
        throw new Error("CV content is empty. Please enter your CV before saving.");
      }

      if (application && application.appId && cvPath) {
        const result = await window.electronAPI?.saveDocxToPath({ filePath: cvPath, html: cvHtml });
        if (!result?.success) throw new Error(result?.error || "Could not save CV file.");
      } else if (application) {
        const sanitizedName = templateName
          ? templateName.replace(/[^a-zA-Z0-9_.-]/g, "_")
          : `application_${Date.now()}`;
        const result = await window.electronAPI?.createApplicationWithCv({
          application,
          html: cvHtml,
          fileName: `CV_${sanitizedName}.docx`,
        });
        if (!result?.success) throw new Error(result?.error || "Could not create application and save CV.");
      } else if (cvPath) {
        const result = await window.electronAPI?.saveDocxToPath({ filePath: cvPath, html: cvHtml });
        if (!result?.success) throw new Error(result?.error || "Could not save CV file.");
      } else {
        const result = await window.electronAPI?.saveDocx({ html: cvHtml });
        if (!result?.success) throw new Error(result?.error || "Unable to save CV.");
      }

      await window.electronAPI?.closeTemplateEditor?.();
    } catch (saveError) {
      setError(saveError.message || "Failed to save CV.");
      window.electronAPI?.logClientError?.({
        source: "renderer-react.App.saveCV",
        message: saveError.message,
        stack: saveError.stack,
      });
    }
  };

  return (
    <main className="app-layout">
      <div className="left-pane">
        <div className="header-row">
          <h1>CV Template Editor</h1>
          <div className="header-actions">
            <button onClick={saveCV}>Save CV</button>
            <button className="secondary-btn" onClick={() => window.electronAPI?.closeTemplateEditor?.()}>
              Back
            </button>
          </div>
        </div>
        {error && <p className="error-banner">{error}</p>}
        <CVEditor
          content={editorContent}
          onEditorReady={setEditor}
          onContentChange={(text, json, html) => {
            setCvContent(text);
            setCvJson(json);
            setCvHtml(html);
            setCvStructuredData(createStructuredCvFromEditorJson(json));
          }}
          onImproveSelectedBullet={improveSelectedBullet}
        />
      </div>

      <AIPanel
        jobDescription={jobDescription}
        setJobDescription={setJobDescription}
        aiSuggestions={aiSuggestions}
        loading={loading}
        error={error}
        onAnalyze={analyzeCV}
        onApplySuggestion={applySuggestion}
      />
    </main>
  );
}
