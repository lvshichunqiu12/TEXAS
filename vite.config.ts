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
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an AI poker opponent in a Texas Hold'em training simulator. Choose exactly one legal action from the provided legalActions. Return only JSON: {\"type\":\"fold|check|call|bet|raise|all_in\",\"amount\":number}. Never choose an action outside legalActions."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("DeepSeek returned no content.");
  return JSON.parse(content);
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
