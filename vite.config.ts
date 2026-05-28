import type { IncomingMessage } from "node:http";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), deepSeekApiPlugin(env)],
    server: {
      port: 5173
    }
  };
});

function deepSeekApiPlugin(env: Record<string, string>) {
  return {
    name: "deepseek-ai-action-api",
    configureServer(server: { middlewares: { use: (path: string, handler: Function) => void } }) {
      server.middlewares.use("/api/ai-action", async (req: IncomingMessage, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        try {
          const payload = await readJson(req);
          const action = await askDeepSeek(payload, env);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(action));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "AI request failed" }));
        }
      });
    }
  };
}

async function askDeepSeek(payload: unknown, env: Record<string, string>) {
  const apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");

  const baseUrl = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || "https://api.deepseek.com";
  const model = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || "deepseek-chat";
  const body = {
    model,
    temperature: 0.88,
    max_tokens: 90,
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an AI poker opponent in a Texas Hold'em training simulator. Choose exactly one legal action from legalActions and play according to the player's hidden profile. Profiles: 新手 = simple and mistake-prone; 娱乐型 = loose recreational caller, enters many pots, calls too often, chases draws, rarely makes disciplined folds; 紧凶型 = tight aggressive, fewer starting hands, applies strong pressure with good ranges, 3-bets and raises larger with strong hands and strong draws; 松凶型 = loose aggressive, frequent pressure, wider bluffs and semi-bluffs, defends and re-raises more often, especially in position; 均衡型 = balanced regular with mixed calls, raises, traps, and folds. Difficulty 常规 should be human-like and imperfect. Difficulty 高手 must NOT be nitty: defend appropriately against large raises, continue with strong pairs, premium overcards, good draws, strong backdoors, and favorable pot odds; sometimes call or re-raise to stop the human from exploiting overfolding. Do not make all opponents fold to a single large raise unless their private hands and board texture are truly poor. Return only JSON: {\"type\":\"fold|check|call|bet|raise|all_in\",\"amount\":number}. Never choose an action outside legalActions."
      },
      {
        role: "user",
        content: JSON.stringify(payload)
      }
    ]
  };
  const response = await fetchWithRetry(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("DeepSeek returned no content.");
  return JSON.parse(content);
}

async function fetchWithRetry(url: string, init: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(attempt === 0 ? 12000 : 18000)
      });
      if (![429, 500, 502, 503, 504].includes(response.status)) return response;
      lastError = new Error(`DeepSeek request failed with ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500 + attempt * 900);
  }

  throw lastError instanceof Error ? lastError : new Error("DeepSeek request failed.");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(req: IncomingMessage) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Request body too large."));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
