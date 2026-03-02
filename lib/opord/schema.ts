export type FieldStatus = "confirmed" | "inferred" | "unknown";
export type GapPriority = "critical" | "major" | "minor";
export type MissionType =
  | "raid"
  | "recon"
  | "defense"
  | "escort"
  | "cordon_search"
  | "neo"
  | "other";

export type ValueField<T = string> = {
  value: T;
  status: FieldStatus;
  source: string;
};

export type PaceEntry = {
  primary: string;
  alternate: string;
  contingency: string;
  emergency: string;
  status: FieldStatus;
};

export type Assumption = {
  text: string;
  origin_path: string;
};

export type Gap = {
  path: string;
  why: string;
  priority: GapPriority;
  question: string;
};

export type MissionPlanningGraph = {
  meta: {
    mission_type: MissionType;
    created_at: string;
    version: number;
  };
  mission: {
    statement: ValueField;
    who: ValueField;
    what: ValueField;
    where: ValueField;
    when: ValueField;
    why: ValueField;
  };
  situation: {
    enemy: {
      sit_temp: {
        composition: ValueField;
        disposition: ValueField;
        strength: ValueField;
        capabilities: ValueField;
        most_likely_coa: ValueField;
        most_dangerous_coa: ValueField;
      };
    };
    environment: {
      terrain: ValueField;
      weather: ValueField;
      civil: ValueField;
    };
    friendly: {
      higher_intent: ValueField;
      task_org: ValueField;
      adjacent_units: ValueField;
      attachments: ValueField;
    };
    constraints: {
      roe: ValueField;
      limitations: ValueField;
    };
  };
  execution: {
    intent: {
      purpose: ValueField;
      method: ValueField;
      endstate: ValueField;
    };
    concept: {
      phases: ValueField<string[]>;
      scheme_of_maneuver: ValueField;
      fires: ValueField;
      control_measures: ValueField;
    };
    tasks_to_subordinates: ValueField<string[]>;
    coordinating_instructions: ValueField<string[]>;
  };
  sustainment: {
    logistics: ValueField;
    medical: {
      ccp: ValueField;
      casevac: ValueField;
      medevac: ValueField;
    };
  };
  command_signal: {
    command: {
      c2_structure: ValueField;
      succession: ValueField;
    };
    signal: {
      comms_overview: ValueField;
      pace: {
        command_net: PaceEntry;
        fires_net: PaceEntry;
        medical_net: PaceEntry;
      };
      reporting_triggers: ValueField<string[]>;
    };
  };
  assumptions: Assumption[];
  gaps: Gap[];
  disclaimer: string;
};

export type OpordJson = {
  opord_md: string;
  sections: {
    situation: string;
    mission: string;
    execution: string;
    sustainment: string;
    command_signal: string;
  };
  placeholders: Array<{
    token: string;
    section: string;
    path: string;
  }>;
};

export type AnalyzeRequest = {
  rawInput: string;
  references?: string;
  answers?: string;
  missionId?: string;
  lockedSections?: string[];
};

export type OpordRequest = {
  missionId?: string;
  mpg: MissionPlanningGraph;
  lockedSections?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStatus(value: unknown): value is FieldStatus {
  return value === "confirmed" || value === "inferred" || value === "unknown";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValueField(value: unknown, arrayValue = false): boolean {
  if (!isRecord(value) || !isStatus(value.status) || typeof value.source !== "string") {
    return false;
  }

  return arrayValue ? isStringArray(value.value) : typeof value.value === "string";
}

function isPaceEntry(value: unknown): value is PaceEntry {
  return (
    isRecord(value) &&
    typeof value.primary === "string" &&
    typeof value.alternate === "string" &&
    typeof value.contingency === "string" &&
    typeof value.emergency === "string" &&
    isStatus(value.status)
  );
}

export function isAnalyzeRequest(value: unknown): value is AnalyzeRequest {
  return (
    isRecord(value) &&
    typeof value.rawInput === "string" &&
    (!("references" in value) || typeof value.references === "string") &&
    (!("answers" in value) || typeof value.answers === "string") &&
    (!("missionId" in value) || typeof value.missionId === "string") &&
    (!("lockedSections" in value) || isStringArray(value.lockedSections))
  );
}

export function isMissionPlanningGraph(value: unknown): value is MissionPlanningGraph {
  if (!isRecord(value)) {
    return false;
  }

  const graph = value as Record<string, unknown>;
  const mission = graph.mission;
  const situation = graph.situation;
  const execution = graph.execution;
  const sustainment = graph.sustainment;
  const commandSignal = graph.command_signal;

  if (
    !isRecord(graph.meta) ||
    typeof graph.meta.created_at !== "string" ||
    typeof graph.meta.version !== "number" ||
    !["raid", "recon", "defense", "escort", "cordon_search", "neo", "other"].includes(String(graph.meta.mission_type)) ||
    !isRecord(mission) ||
    !isValueField(mission.statement) ||
    !isValueField(mission.who) ||
    !isValueField(mission.what) ||
    !isValueField(mission.where) ||
    !isValueField(mission.when) ||
    !isValueField(mission.why) ||
    !isRecord(situation) ||
    !isRecord(situation.enemy) ||
    !isRecord(situation.enemy.sit_temp) ||
    !isValueField(situation.enemy.sit_temp.composition) ||
    !isValueField(situation.enemy.sit_temp.disposition) ||
    !isValueField(situation.enemy.sit_temp.strength) ||
    !isValueField(situation.enemy.sit_temp.capabilities) ||
    !isValueField(situation.enemy.sit_temp.most_likely_coa) ||
    !isValueField(situation.enemy.sit_temp.most_dangerous_coa) ||
    !isRecord(situation.environment) ||
    !isValueField(situation.environment.terrain) ||
    !isValueField(situation.environment.weather) ||
    !isValueField(situation.environment.civil) ||
    !isRecord(situation.friendly) ||
    !isValueField(situation.friendly.higher_intent) ||
    !isValueField(situation.friendly.task_org) ||
    !isValueField(situation.friendly.adjacent_units) ||
    !isValueField(situation.friendly.attachments) ||
    !isRecord(situation.constraints) ||
    !isValueField(situation.constraints.roe) ||
    !isValueField(situation.constraints.limitations) ||
    !isRecord(execution) ||
    !isRecord(execution.intent) ||
    !isValueField(execution.intent.purpose) ||
    !isValueField(execution.intent.method) ||
    !isValueField(execution.intent.endstate) ||
    !isRecord(execution.concept) ||
    !isValueField(execution.concept.phases, true) ||
    !isValueField(execution.concept.scheme_of_maneuver) ||
    !isValueField(execution.concept.fires) ||
    !isValueField(execution.concept.control_measures) ||
    !isValueField(execution.tasks_to_subordinates, true) ||
    !isValueField(execution.coordinating_instructions, true) ||
    !isRecord(sustainment) ||
    !isValueField(sustainment.logistics) ||
    !isRecord(sustainment.medical) ||
    !isValueField(sustainment.medical.ccp) ||
    !isValueField(sustainment.medical.casevac) ||
    !isValueField(sustainment.medical.medevac) ||
    !isRecord(commandSignal) ||
    !isRecord(commandSignal.command) ||
    !isValueField(commandSignal.command.c2_structure) ||
    !isValueField(commandSignal.command.succession) ||
    !isRecord(commandSignal.signal) ||
    !isValueField(commandSignal.signal.comms_overview) ||
    !isRecord(commandSignal.signal.pace) ||
    !isPaceEntry(commandSignal.signal.pace.command_net) ||
    !isPaceEntry(commandSignal.signal.pace.fires_net) ||
    !isPaceEntry(commandSignal.signal.pace.medical_net) ||
    !isValueField(commandSignal.signal.reporting_triggers, true) ||
    !Array.isArray(graph.assumptions) ||
    !graph.assumptions.every((item) => isRecord(item) && typeof item.text === "string" && typeof item.origin_path === "string") ||
    !Array.isArray(graph.gaps) ||
    !graph.gaps.every(
      (item) =>
        isRecord(item) &&
        typeof item.path === "string" &&
        typeof item.why === "string" &&
        (item.priority === "critical" || item.priority === "major" || item.priority === "minor") &&
        typeof item.question === "string"
    ) ||
    typeof graph.disclaimer !== "string"
  ) {
    return false;
  }

  return true;
}

export function isOpordRequest(value: unknown): value is OpordRequest {
  return (
    isRecord(value) &&
    isMissionPlanningGraph(value.mpg) &&
    (!("missionId" in value) || typeof value.missionId === "string") &&
    (!("lockedSections" in value) || isStringArray(value.lockedSections))
  );
}

export function isOpordJson(value: unknown): value is OpordJson {
  return (
    isRecord(value) &&
    typeof value.opord_md === "string" &&
    isRecord(value.sections) &&
    typeof value.sections.situation === "string" &&
    typeof value.sections.mission === "string" &&
    typeof value.sections.execution === "string" &&
    typeof value.sections.sustainment === "string" &&
    typeof value.sections.command_signal === "string" &&
    Array.isArray(value.placeholders) &&
    value.placeholders.every(
      (item) =>
        isRecord(item) &&
        typeof item.token === "string" &&
        typeof item.section === "string" &&
        typeof item.path === "string"
    )
  );
}
