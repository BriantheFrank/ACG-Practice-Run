type OpenAiJsonRequest = {
  prompt: string;
  schemaName: string;
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 20000;

function getOpenAiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

async function runWithTimeout(input: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(OPENAI_API_URL, {
      ...input,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function requestOpenAiJson<T>({ prompt, schemaName }: OpenAiJsonRequest): Promise<T> {
  const apiKey = getOpenAiKey();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await runWithTimeout({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          input: prompt,
          text: {
            format: {
              type: "json_object"
            }
          },
          metadata: {
            schema_name: schemaName
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as {
        output_text?: string;
      };

      if (!payload.output_text) {
        throw new Error("OpenAI response did not include output_text.");
      }

      return JSON.parse(payload.output_text) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI request failed.");
}
