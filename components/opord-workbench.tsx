"use client";

import { useState, type CSSProperties } from "react";
import type { MissionPlanningGraph, OpordJson } from "@/lib/opord/schema";

type SaveState = {
  missionId: string;
  versionId: string;
  versionNumber: number;
};

type AnalyzeResponse = SaveState & {
  mpg: MissionPlanningGraph;
  error?: string;
  warning?: string;
};

type OpordResponse = SaveState & {
  opord: OpordJson;
  error?: string;
  warning?: string;
};

const panelStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "18px",
  padding: "1rem",
  boxShadow: "0 14px 40px rgba(51, 40, 25, 0.08)"
};

const textAreaStyle: CSSProperties = {
  width: "100%",
  borderRadius: "14px",
  border: "1px solid var(--border)",
  padding: "0.85rem",
  resize: "vertical",
  background: "rgba(255, 255, 255, 0.7)"
};

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: "999px",
  padding: "0.7rem 1.1rem",
  cursor: "pointer",
  background: "var(--accent-strong)",
  color: "white"
};

const preStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  margin: 0,
  maxHeight: "28rem",
  overflow: "auto",
  background: "var(--surface-strong)",
  borderRadius: "14px",
  padding: "0.9rem",
  border: "1px solid var(--border)"
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "1.2rem",
  display: "grid",
  gap: "0.6rem"
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: "var(--muted)"
};

const sectionHeadingStyle: CSSProperties = {
  margin: "0 0 0.75rem"
};

export function OpordWorkbench() {
  const [rawInput, setRawInput] = useState("");
  const [references, setReferences] = useState("");
  const [answers, setAnswers] = useState("");
  const [missionId, setMissionId] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const [mpg, setMpg] = useState<MissionPlanningGraph | null>(null);
  const [opord, setOpord] = useState<OpordJson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function runTask(task: () => Promise<void>) {
    setIsWorking(true);

    try {
      await task();
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : "Unexpected error.";
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSaveDraft() {
    setError(null);
    setWarning(null);

    const response = await fetch("/api/missions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        missionId,
        rawInput,
        references,
        answers
      })
    });

    const data = (await response.json()) as Partial<SaveState> & { error?: string };
    if (!response.ok || !data.missionId || !data.versionId || typeof data.versionNumber !== "number") {
      throw new Error(data.error || "Draft save failed.");
    }

    const nextState = {
      missionId: data.missionId,
      versionId: data.versionId,
      versionNumber: data.versionNumber
    };

    setMissionId(nextState.missionId);
    setSaveState(nextState);
  }

  async function handleAnalyze() {
    if (!rawInput.trim()) {
      setError("Mission input is required before analysis.");
      return;
    }

    setError(null);
    setWarning(null);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        missionId,
        rawInput,
        references,
        answers
      })
    });

    const data = (await response.json()) as Partial<AnalyzeResponse>;
    if (!data.mpg) {
      throw new Error(data.error || "Analysis failed.");
    }

    setMpg(data.mpg);
    setOpord(null);
    setWarning(data.warning || null);

    if (data.missionId && data.versionId && typeof data.versionNumber === "number") {
      setMissionId(data.missionId);
      setSaveState({
        missionId: data.missionId,
        versionId: data.versionId,
        versionNumber: data.versionNumber
      });
    }

    if (data.error) {
      setError(data.error);
    }
  }

  async function handleBuildOpord() {
    if (!mpg) {
      setError("Analyze the mission before generating an OPORD.");
      return;
    }

    setError(null);
    setWarning(null);

    const response = await fetch("/api/opord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        missionId,
        mpg
      })
    });

    const data = (await response.json()) as Partial<OpordResponse>;
    if (!data.opord) {
      throw new Error(data.error || "OPORD generation failed.");
    }

    setOpord(data.opord);
    setWarning(data.warning || null);

    if (data.missionId && data.versionId && typeof data.versionNumber === "number") {
      setMissionId(data.missionId);
      setSaveState({
        missionId: data.missionId,
        versionId: data.versionId,
        versionNumber: data.versionNumber
      });
    }

    if (data.error) {
      setError(data.error);
    }
  }

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem 1rem 4rem"
      }}
    >
      <section
        style={{
          ...panelStyle,
          marginBottom: "1rem",
          background: "linear-gradient(140deg, rgba(255, 250, 240, 0.98), rgba(248, 241, 222, 0.96))"
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)"
          }}
        >
          OPORD5 Workbench
        </p>
        <h1
          style={{
            margin: "0.4rem 0 0.75rem",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.05
          }}
        >
          Conservative mission structuring for planner review.
        </h1>
        <p style={{ margin: 0, maxWidth: "60ch", color: "var(--muted)" }}>
          The AI layer only structures provided information, labels unknowns, and preserves placeholders. It does not invent operational facts.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem"
        }}
      >
        <div style={panelStyle}>
          <label htmlFor="rawInput" style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
            Mission Notes
          </label>
          <textarea
            id="rawInput"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            rows={12}
            placeholder="Paste unstructured mission notes, commander guidance, SIT-TEMP, or constraints."
            style={textAreaStyle}
          />

          <label htmlFor="references" style={{ display: "block", fontWeight: 700, margin: "0.75rem 0 0.5rem" }}>
            Reference Blocks
          </label>
          <textarea
            id="references"
            value={references}
            onChange={(event) => setReferences(event.target.value)}
            rows={6}
            placeholder="Optional doctrinal references or approved source notes."
            style={textAreaStyle}
          />

          <label htmlFor="answers" style={{ display: "block", fontWeight: 700, margin: "0.75rem 0 0.5rem" }}>
            Follow-Up Answers
          </label>
          <textarea
            id="answers"
            value={answers}
            onChange={(event) => setAnswers(event.target.value)}
            rows={6}
            placeholder="Optional planner answers to priority questions."
            style={textAreaStyle}
          />

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button type="button" onClick={() => void runTask(handleSaveDraft)} disabled={isWorking} style={buttonStyle}>
              Save Draft
            </button>
            <button type="button" onClick={() => void runTask(handleAnalyze)} disabled={isWorking} style={buttonStyle}>
              Analyze
            </button>
            <button type="button" onClick={() => void runTask(handleBuildOpord)} disabled={isWorking} style={buttonStyle}>
              Generate OPORD
            </button>
          </div>

          <div style={{ marginTop: "1rem", minHeight: warning ? "3.5rem" : "1.5rem" }}>
            <div style={{ color: error ? "var(--danger)" : "var(--muted)" }}>
              {isWorking ? "Working..." : error ? error : "Ready."}
            </div>
            {!isWorking && warning ? (
              <div style={{ marginTop: "0.35rem", color: "var(--accent)", fontSize: "0.95rem" }}>{warning}</div>
            ) : null}
          </div>
          <div style={{ marginTop: "0.5rem", color: "var(--muted)", fontSize: "0.95rem" }}>
            {saveState
              ? `Mission ${saveState.missionId} | Version ${saveState.versionNumber} (${saveState.versionId})`
              : "No saved version yet."}
          </div>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Mission Planning Graph</h2>
            {!mpg ? (
              <p style={emptyTextStyle}>No analysis yet. Run Analyze to build the mission planning graph.</p>
            ) : (
              <pre style={preStyle}>{JSON.stringify(mpg, null, 2)}</pre>
            )}
          </div>

          <div style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Planning Gaps</h2>
            {!mpg ? (
              <p style={emptyTextStyle}>Gap analysis appears after mission analysis.</p>
            ) : mpg.gaps.length === 0 ? (
              <p style={emptyTextStyle}>No gaps detected from the current graph.</p>
            ) : (
              <ul style={listStyle}>
                {mpg.gaps.map((gap) => (
                  <li key={`${gap.path}-${gap.question}`}>
                    <strong>[{gap.priority}]</strong> {gap.path}: {gap.question}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={panelStyle}>
            <h2 style={sectionHeadingStyle}>OPORD Draft</h2>
            {!opord ? (
              <p style={emptyTextStyle}>No OPORD yet. Generate OPORD after analysis.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(opord.opord_md).catch(() => undefined);
                  }}
                  style={{ ...buttonStyle, marginBottom: "0.75rem" }}
                >
                  Copy Markdown
                </button>
                <pre style={preStyle}>{opord.opord_md}</pre>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
