import { NextRequest, NextResponse } from "next/server";
import { requestOpenAiJson } from "@/lib/ai/openai";
import { buildFallbackMpg, buildPlanningGaps } from "@/lib/opord/templates";
import { isAnalyzeRequest, isMissionPlanningGraph } from "@/lib/opord/schema";
import { isSupabaseConfigured, saveMissionVersion } from "@/lib/supabase/server";

const SUPABASE_WARNING =
  "Mission analysis completed, but draft persistence is unavailable. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to save versions.";

function buildPrompt(rawInput: string, references: string, answers: string): string {
  return [
    "You are generating a strict JSON Mission Planning Graph for an OPORD drafting tool.",
    "Use only the provided user text. Never fabricate facts, numbers, enemy details, locations, or communications specifics.",
    "When data is missing, set value to an empty string or empty array, status to unknown, and source to an empty string.",
    "Only mark status as inferred when a cautious inference is directly supported by the text.",
    "Leave PACE values blank if not provided. Include conservative gaps and a disclaimer.",
    "Return JSON only in the exact Mission Planning Graph shape.",
    "",
    "USER RAW INPUT:",
    rawInput || "(none)",
    "",
    "REFERENCE BLOCKS:",
    references || "(none)",
    "",
    "FOLLOW-UP ANSWERS:",
    answers || "(none)"
  ].join("\n");
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isAnalyzeRequest(payload)) {
    return NextResponse.json({ error: "Request body does not match the required schema." }, { status: 400 });
  }

  const references = payload.references || "";
  const answers = payload.answers || "";

  let graph = buildFallbackMpg(payload.rawInput, references, answers);

  if (process.env.OPENAI_API_KEY) {
    try {
      const aiGraph = await requestOpenAiJson<unknown>({
        prompt: buildPrompt(payload.rawInput, references, answers),
        schemaName: "mission_planning_graph"
      });

      if (isMissionPlanningGraph(aiGraph)) {
        graph = {
          ...aiGraph,
          gaps: buildPlanningGaps(aiGraph)
        };
      }
    } catch {
      graph = {
        ...graph,
        disclaimer: `${graph.disclaimer} OpenAI analysis was unavailable, so a local conservative fallback was used.`
      };
    }
  } else {
    graph = {
      ...graph,
      disclaimer: `${graph.disclaimer} OpenAI analysis is not configured, so a local conservative fallback was used.`
    };
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mpg: graph,
      warning: SUPABASE_WARNING
    });
  }

  try {
    const version = await saveMissionVersion({
      missionId: payload.missionId,
      rawInput: payload.rawInput,
      references,
      answers,
      mpg: graph
    });

    return NextResponse.json({
      missionId: version.mission_id,
      versionId: version.id,
      versionNumber: version.version_number,
      mpg: graph
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mission version could not be saved.";
    return NextResponse.json({
      mpg: graph,
      warning: `Mission analysis completed, but the version could not be saved. ${message}`
    });
  }
}
