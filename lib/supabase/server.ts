type SaveMissionVersionInput = {
  missionId?: string;
  rawInput: string;
  references?: string;
  answers?: string;
  mpg?: unknown;
  opord?: unknown;
};

type MissionVersionRecord = {
  id: string;
  mission_id: string;
  version_number: number;
  created_at: string;
};

type VersionNumberRow = {
  version_number: number;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase persistence is not configured. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable draft and version saving."
    );
  }

  return {
    url: process.env.SUPABASE_URL as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string
  };
}

async function supabaseRequest<T>(path: string, init: RequestInit): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase request failed: ${message}`);
  }

  return (await response.json()) as T;
}

export async function saveMissionVersion(input: SaveMissionVersionInput): Promise<MissionVersionRecord> {
  const missionId = input.missionId || crypto.randomUUID();

  const missionRows = await supabaseRequest<Array<{ id: string }>>("missions?select=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([
      {
        id: missionId,
        title: input.rawInput.trim().split(/\r?\n/)[0]?.slice(0, 120) || "Untitled mission draft",
        raw_input: input.rawInput
      }
    ])
  });

  const previousVersionRows = await supabaseRequest<VersionNumberRow[]>(
    `mission_versions?mission_id=eq.${encodeURIComponent(missionRows[0]?.id || missionId)}&select=version_number&order=version_number.desc&limit=1`,
    {
      method: "GET"
    }
  );

  const nextVersionNumber = (previousVersionRows[0]?.version_number || 0) + 1;

  const versionRows = await supabaseRequest<MissionVersionRecord[]>("mission_versions", {
    method: "POST",
    body: JSON.stringify([
      {
        mission_id: missionRows[0]?.id || missionId,
        version_number: nextVersionNumber,
        raw_input: input.rawInput,
        references: input.references || null,
        answers: input.answers || null,
        mpg_json: input.mpg || null,
        opord_json: input.opord || null
      }
    ])
  });

  if (!versionRows[0]) {
    throw new Error("Mission version could not be saved.");
  }

  return versionRows[0];
}
