import { NextRequest, NextResponse } from "next/server";
import { requestOpenAiJson } from "@/lib/ai/openai";
import { buildOpordFromMpg } from "@/lib/opord/templates";
import { isMissionPlanningGraph, isOpordJson, isOpordRequest } from "@/lib/opord/schema";
import { isSupabaseConfigured, saveMissionVersion } from "@/lib/supabase/server";

const SUPABASE_WARNING =
  "OPORD generation completed, but draft persistence is unavailable. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to save versions.";

function buildPrompt(graphJson: string): string {
  return [
    "You are rendering a strict JSON OPORD object from a Mission Planning Graph.",
    "Use only the provided graph. Never invent facts, frequencies, call signs, sensitive details, or unit specifics.",
    "Preserve unknowns as [TBD: ...] placeholders. Keep language conservative and explicit about assumptions.",
    "Return JSON only in the exact OPORD JSON shape.",
    "",
    "MISSION PLANNING GRAPH:",
    graphJson
  ].join("\n");
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isOpordRequest(payload) || !isMissionPlanningGraph(payload.mpg)) {
    return NextResponse.json({ error: "Request body does not match the required schema." }, { status: 400 });
  }

  let opord = buildOpordFromMpg(payload.mpg);

  if (process.env.OPENAI_API_KEY) {
    try {
      const aiOpord = await requestOpenAiJson<unknown>({
        prompt: buildPrompt(JSON.stringify(payload.mpg)),
        schemaName: "opord_json"
      });

      if (isOpordJson(aiOpord)) {
        opord = aiOpord;
      }
    } catch {
      opord = buildOpordFromMpg(payload.mpg);
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      opord,
      warning: SUPABASE_WARNING
    });
  }

  try {
    const version = await saveMissionVersion({
      missionId: payload.missionId,
      rawInput: payload.mpg.mission.statement.value || "Mission draft",
      mpg: payload.mpg,
      opord
    });

    return NextResponse.json({
      missionId: version.mission_id,
      versionId: version.id,
      versionNumber: version.version_number,
      opord
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mission version could not be saved.";
    return NextResponse.json({
      opord,
      warning: `OPORD generation completed, but the version could not be saved. ${message}`
    });
  }
}
