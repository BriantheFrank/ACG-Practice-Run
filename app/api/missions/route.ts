import { NextRequest, NextResponse } from "next/server";
import { saveMissionVersion } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let payload: {
    missionId?: string;
    rawInput?: string;
    references?: string;
    answers?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.rawInput !== "string") {
    return NextResponse.json({ error: "rawInput is required." }, { status: 400 });
  }

  try {
    const version = await saveMissionVersion({
      missionId: payload.missionId,
      rawInput: payload.rawInput,
      references: payload.references,
      answers: payload.answers
    });

    return NextResponse.json({
      missionId: version.mission_id,
      versionId: version.id,
      versionNumber: version.version_number
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mission draft could not be saved.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
