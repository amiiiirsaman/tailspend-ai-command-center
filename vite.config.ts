import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message as BedrockMessage,
} from "@aws-sdk/client-bedrock-runtime";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

// Load .env into process.env so the Bedrock proxy plugin can read AWS /
// BEDROCK_MODEL_ID without a VITE_ prefix. This is dev only — nothing here
// is shipped to the browser bundle.
for (const [k, v] of Object.entries(
  loadEnv(process.env.NODE_ENV || "development", import.meta.dirname, ""),
)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

// =============================================================================
// Bedrock Proxy - Vite Plugin
// Exposes POST /api/chat that calls AWS Bedrock Converse with the model id
// in BEDROCK_MODEL_ID. Speaks an OpenAI-shaped envelope on the wire so the
// existing 4-agent pipeline client code doesn't need to change.
//
// DEV ONLY. The production build (vite preview / node server/index.ts) does
// NOT expose this route — AI features will be unavailable in prod by design.
// =============================================================================

let bedrockClient: BedrockRuntimeClient | null = null;
function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }
  return bedrockClient;
}

interface ChatRequest {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  max_tokens?: number;
}

function vitePluginBedrockProxy(): Plugin {
  return {
    name: "bedrock-chat-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "POST only" }));
          return;
        }

        const modelId = process.env.BEDROCK_MODEL_ID;
        if (!modelId) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "BEDROCK_MODEL_ID not set in .env" }),
          );
          return;
        }
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "AWS credentials not set in .env" }),
          );
          return;
        }

        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let body: ChatRequest;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "messages[] required" }));
          return;
        }

        const bedrockMessages: BedrockMessage[] = body.messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        }));

        try {
          const out = await getBedrockClient().send(
            new ConverseCommand({
              modelId,
              system: body.system ? [{ text: body.system }] : undefined,
              messages: bedrockMessages,
              inferenceConfig: {
                maxTokens: body.max_tokens ?? 1024,
                temperature: 0,
              },
            }),
          );

          const text =
            out.output?.message?.content
              ?.map((c) => ("text" in c ? c.text : ""))
              .join("") ?? "";

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          });
          res.end(
            JSON.stringify({
              choices: [{ message: { role: "assistant", content: text } }],
              usage: out.usage,
              stopReason: out.stopReason,
            }),
          );
        } catch (err) {
          // Log full error server-side only; surface a short message to client.
          // eslint-disable-next-line no-console
          console.error("[bedrock-chat-proxy]", err);
          const msg = err instanceof Error ? err.message : String(err);
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Bedrock error: ${msg}` }));
        }
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginBedrockProxy()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
