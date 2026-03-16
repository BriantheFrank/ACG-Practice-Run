import { MissionPlanningGraph, OpordJson, PaceEntry, ValueField } from "./schema";

function createValueField<T extends string | string[]>(value: T, source: string, status: ValueField<T>["status"]): ValueField<T> {
  return {
    value,
    source,
    status
  };
}

function createUnknownField(): ValueField {
  return createValueField("", "", "unknown");
}

function createUnknownArrayField(): ValueField<string[]> {
  return createValueField([], "", "unknown");
}

function createUnknownPaceEntry(): PaceEntry {
  return {
    primary: "",
    alternate: "",
    contingency: "",
    emergency: "",
    status: "unknown"
  };
}

function fieldOrTbd(field: ValueField, token: string): string {
  if (field.value.trim()) {
    return field.value;
  }

  return `[TBD: ${token}]`;
}

function arrayOrTbd(field: ValueField<string[]>, token: string): string {
  if (field.value.length > 0) {
    return field.value.join("; ");
  }

  return `[TBD: ${token}]`;
}

function paceLabel(label: string, entry: MissionPlanningGraph["command_signal"]["signal"]["pace"]["command_net"]) {
  return `${label}: P ${entry.primary || "[TBD]"} | A ${entry.alternate || "[TBD]"} | C ${entry.contingency || "[TBD]"} | E ${entry.emergency || "[TBD]"}`;
}

export function buildPlanningGaps(graph: MissionPlanningGraph): MissionPlanningGraph["gaps"] {
  const gaps: MissionPlanningGraph["gaps"] = [];

  const addGap = (path: string, why: string, priority: MissionPlanningGraph["gaps"][number]["priority"], question: string) => {
    gaps.push({ path, why, priority, question });
  };

  const scanField = (
    path: string,
    field: ValueField | ValueField<string[]>,
    why: string,
    priority: MissionPlanningGraph["gaps"][number]["priority"],
    question: string
  ) => {
    const hasValue = Array.isArray(field.value) ? field.value.length > 0 : field.value.trim().length > 0;
    if (!hasValue || field.status === "unknown") {
      addGap(path, why, priority, question);
    }
  };

  scanField("mission.who", graph.mission.who, "Task ownership is required to assign responsibility and reporting.", "critical", "Who is the supported unit or element executing this mission?");
  scanField("mission.what", graph.mission.what, "The specific task defines the operation and informs all subordinate planning.", "critical", "What exact task must the unit accomplish?");
  scanField("mission.where", graph.mission.where, "Location drives terrain, movement, sustainment, and control measures.", "critical", "Where does the mission occur?");
  scanField("mission.when", graph.mission.when, "Timing is required for synchronization, rehearsals, and reporting triggers.", "critical", "When is execution or NLT timing required?");
  scanField("mission.why", graph.mission.why, "Purpose clarifies commander intent and acceptable risk.", "major", "Why is this mission being conducted?");
  scanField("situation.enemy.sit_temp.composition", graph.situation.enemy.sit_temp.composition, "Enemy composition informs force matching and risk assessment.", "major", "What enemy elements are expected?");
  scanField("situation.enemy.sit_temp.disposition", graph.situation.enemy.sit_temp.disposition, "Disposition informs movement and observation planning.", "major", "Where is the enemy assessed to be positioned?");
  scanField("situation.enemy.sit_temp.strength", graph.situation.enemy.sit_temp.strength, "Enemy strength affects support, reserve, and abort criteria.", "major", "What is the estimated enemy strength?");
  scanField("situation.enemy.sit_temp.capabilities", graph.situation.enemy.sit_temp.capabilities, "Capabilities shape protection and communications planning.", "major", "What enemy capabilities are relevant to this mission?");
  scanField("situation.environment.terrain", graph.situation.environment.terrain, "Terrain affects routes, observation, and control measures.", "major", "What terrain features matter to movement or observation?");
  scanField("situation.environment.weather", graph.situation.environment.weather, "Weather affects visibility, sustainment, and comms reliability.", "major", "What weather conditions are expected during execution?");
  scanField("situation.constraints.roe", graph.situation.constraints.roe, "ROE constraints directly affect legal and tactical decision space.", "major", "What rules of engagement or authorities apply?");
  scanField("sustainment.logistics", graph.sustainment.logistics, "Logistics planning prevents mission failure from predictable sustainment shortfalls.", "major", "What resupply, transportation, or class-of-supply considerations apply?");
  scanField("sustainment.medical.casevac", graph.sustainment.medical.casevac, "Casualty movement planning is required before execution.", "major", "What is the CASEVAC plan or placeholder?");
  scanField("command_signal.command.c2_structure", graph.command_signal.command.c2_structure, "Command relationships prevent ambiguity during execution.", "major", "What is the command relationship and control architecture?");
  scanField("command_signal.signal.comms_overview", graph.command_signal.signal.comms_overview, "Communication methods are required to synchronize and report.", "major", "What communications systems or methods are available?");

  const pace = graph.command_signal.signal.pace;
  if (!pace.command_net.primary || !pace.command_net.alternate || !pace.command_net.contingency || !pace.command_net.emergency) {
    addGap(
      "command_signal.signal.pace.command_net",
      "PACE is required to preserve command and control under degraded communications.",
      "major",
      "What are the primary, alternate, contingency, and emergency methods for the command net?"
    );
  }

  if (graph.command_signal.signal.reporting_triggers.value.length === 0) {
    addGap(
      "command_signal.signal.reporting_triggers",
      "Reporting triggers preserve shared understanding and allow decision points.",
      "major",
      "Which report triggers must prompt updates to higher or adjacent units?"
    );
  }

  return gaps;
}

export function buildFallbackMpg(rawInput: string, references = "", answers = ""): MissionPlanningGraph {
  const joined = [rawInput, references, answers].filter(Boolean).join("\n");
  const missionType = /recon/i.test(joined)
    ? "recon"
    : /raid/i.test(joined)
      ? "raid"
      : /escort/i.test(joined)
        ? "escort"
        : /defense|defend/i.test(joined)
          ? "defense"
          : /cordon|search/i.test(joined)
            ? "cordon_search"
            : /neo|evacu/i.test(joined)
              ? "neo"
              : "other";

  const missionStatement = rawInput.trim() ? rawInput.trim().split(/\r?\n/)[0].slice(0, 280) : "";

  const graph: MissionPlanningGraph = {
    meta: {
      mission_type: missionType,
      created_at: new Date().toISOString(),
      version: 1
    },
    mission: {
      statement: missionStatement ? createValueField(missionStatement, "rawInput", "inferred") : createUnknownField(),
      who: createUnknownField(),
      what: createUnknownField(),
      where: createUnknownField(),
      when: createUnknownField(),
      why: createUnknownField()
    },
    situation: {
      enemy: {
        sit_temp: {
          composition: createUnknownField(),
          disposition: createUnknownField(),
          strength: createUnknownField(),
          capabilities: createUnknownField(),
          most_likely_coa: createUnknownField(),
          most_dangerous_coa: createUnknownField()
        }
      },
      environment: {
        terrain: createUnknownField(),
        weather: createUnknownField(),
        civil: createUnknownField()
      },
      friendly: {
        higher_intent: createUnknownField(),
        task_org: createUnknownField(),
        adjacent_units: createUnknownField(),
        attachments: createUnknownField()
      },
      constraints: {
        roe: createUnknownField(),
        limitations: createUnknownField()
      }
    },
    execution: {
      intent: {
        purpose: createUnknownField(),
        method: createUnknownField(),
        endstate: createUnknownField()
      },
      concept: {
        phases: createUnknownArrayField(),
        scheme_of_maneuver: createUnknownField(),
        fires: createUnknownField(),
        control_measures: createUnknownField()
      },
      tasks_to_subordinates: createUnknownArrayField(),
      coordinating_instructions: createUnknownArrayField()
    },
    sustainment: {
      logistics: createUnknownField(),
      medical: {
        ccp: createUnknownField(),
        casevac: createUnknownField(),
        medevac: createUnknownField()
      }
    },
    command_signal: {
      command: {
        c2_structure: createUnknownField(),
        succession: createUnknownField()
      },
      signal: {
        comms_overview: createUnknownField(),
        pace: {
          command_net: createUnknownPaceEntry(),
          fires_net: createUnknownPaceEntry(),
          medical_net: createUnknownPaceEntry()
        },
        reporting_triggers: {
          value:
            missionType === "recon"
              ? ["Initial observation established", "Enemy contact or significant change", "Loss of surveillance"]
              : ["Mission start", "Enemy contact", "Deviation from timeline or control measure", "Casualty or sustainment issue"],
          source: "generic_template",
          status: "inferred"
        }
      }
    },
    assumptions: [],
    gaps: [],
    disclaimer:
      "AI-generated planning support only. This draft uses only provided text and conservative generic placeholders. Verify all details before operational use."
  };

  graph.gaps = buildPlanningGaps(graph);

  return graph;
}

export function buildOpordFromMpg(graph: MissionPlanningGraph): OpordJson {
  const situation = [
    `Enemy: ${fieldOrTbd(graph.situation.enemy.sit_temp.composition, "enemy composition")}; disposition ${fieldOrTbd(graph.situation.enemy.sit_temp.disposition, "enemy disposition")}; strength ${fieldOrTbd(graph.situation.enemy.sit_temp.strength, "enemy strength")}; capabilities ${fieldOrTbd(graph.situation.enemy.sit_temp.capabilities, "enemy capabilities")}.`,
    `Environment: terrain ${fieldOrTbd(graph.situation.environment.terrain, "terrain")}; weather ${fieldOrTbd(graph.situation.environment.weather, "weather")}; civil considerations ${fieldOrTbd(graph.situation.environment.civil, "civil considerations")}.`,
    `Friendly: higher intent ${fieldOrTbd(graph.situation.friendly.higher_intent, "higher intent")}; task organization ${fieldOrTbd(graph.situation.friendly.task_org, "task organization")}; adjacent units ${fieldOrTbd(graph.situation.friendly.adjacent_units, "adjacent units")}; attachments ${fieldOrTbd(graph.situation.friendly.attachments, "attachments")}.`,
    `Constraints: ROE ${fieldOrTbd(graph.situation.constraints.roe, "ROE")}; limitations ${fieldOrTbd(graph.situation.constraints.limitations, "limitations")}.`
  ].join(" ");

  const mission = `${fieldOrTbd(graph.mission.who, "unit")} conducts ${fieldOrTbd(graph.mission.what, "task")} at ${fieldOrTbd(graph.mission.where, "location")} no later than ${fieldOrTbd(graph.mission.when, "time")} in order to ${fieldOrTbd(graph.mission.why, "purpose")}.`;

  const execution = [
    `Commander's intent: purpose ${fieldOrTbd(graph.execution.intent.purpose, "intent purpose")}; method ${fieldOrTbd(graph.execution.intent.method, "intent method")}; end state ${fieldOrTbd(graph.execution.intent.endstate, "intent end state")}.`,
    `Concept of operation: phases ${arrayOrTbd(graph.execution.concept.phases, "phases")}; scheme of maneuver ${fieldOrTbd(graph.execution.concept.scheme_of_maneuver, "scheme of maneuver")}; fires ${fieldOrTbd(graph.execution.concept.fires, "fires guidance")}; control measures ${fieldOrTbd(graph.execution.concept.control_measures, "control measures")}.`,
    `Tasks to subordinates: ${arrayOrTbd(graph.execution.tasks_to_subordinates, "tasks to subordinates")}.`,
    `Coordinating instructions: ${arrayOrTbd(graph.execution.coordinating_instructions, "coordinating instructions")}.`
  ].join(" ");

  const sustainment = [
    `Logistics: ${fieldOrTbd(graph.sustainment.logistics, "logistics plan")}.`,
    `Medical: CCP ${fieldOrTbd(graph.sustainment.medical.ccp, "CCP")}; CASEVAC ${fieldOrTbd(graph.sustainment.medical.casevac, "CASEVAC")}; MEDEVAC ${fieldOrTbd(graph.sustainment.medical.medevac, "MEDEVAC")}.`
  ].join(" ");

  const commandSignal = [
    `Command: C2 structure ${fieldOrTbd(graph.command_signal.command.c2_structure, "C2 structure")}; succession ${fieldOrTbd(graph.command_signal.command.succession, "succession of command")}.`,
    `Signal: ${fieldOrTbd(graph.command_signal.signal.comms_overview, "communications overview")}.`,
    `PACE: ${paceLabel("Command", graph.command_signal.signal.pace.command_net)}; ${paceLabel("Fires", graph.command_signal.signal.pace.fires_net)}; ${paceLabel("Medical", graph.command_signal.signal.pace.medical_net)}.`,
    `Reporting triggers: ${arrayOrTbd(graph.command_signal.signal.reporting_triggers, "reporting triggers")}.`,
    "Battle tracking checklist: current location, phase complete, significant enemy change, casualty status, sustainment shortfall, comms degradation, decision point reached."
  ].join(" ");

  const sections = {
    situation,
    mission,
    execution,
    sustainment,
    command_signal: commandSignal
  };

  const placeholders: OpordJson["placeholders"] = [];
  for (const [section, text] of Object.entries(sections) as Array<[keyof typeof sections, string]>) {
    const matches = text.matchAll(/\[TBD: ([^\]]+)\]/g);
    for (const match of matches) {
      placeholders.push({
        token: match[0],
        section,
        path: match[1]
      });
    }
  }

  const assumptionsBlock =
    graph.assumptions.length > 0
      ? graph.assumptions.map((item) => `- ${item.text} (${item.origin_path})`).join("\n")
      : "- None captured beyond explicit placeholders.";

  const gapsBlock =
    graph.gaps.length > 0
      ? graph.gaps.map((item) => `- [${item.priority}] ${item.path}: ${item.why} Question: ${item.question}`).join("\n")
      : "- No immediate planning gaps detected from the current graph.";

  const opord_md = [
    "# 5-Paragraph OPORD Draft",
    "",
    "## 1. Situation",
    sections.situation,
    "",
    "## 2. Mission",
    sections.mission,
    "",
    "## 3. Execution",
    sections.execution,
    "",
    "## 4. Sustainment",
    sections.sustainment,
    "",
    "## 5. Command and Signal",
    sections.command_signal,
    "",
    "## Assumptions",
    assumptionsBlock,
    "",
    "## Gaps",
    gapsBlock,
    "",
    "## Disclaimer",
    graph.disclaimer
  ].join("\n");

  return {
    opord_md,
    sections,
    placeholders
  };
}
