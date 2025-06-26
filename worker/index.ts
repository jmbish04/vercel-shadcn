import type { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { exec } from 'node:child_process';

interface Env {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
  CLOUDFLARE_AI_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

type JsonBody = {
  id?: string;
  provider: string;
  model: string;
  messages: Message[];
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/api/chat": {
        const { provider, model, messages } = await request.json<JsonBody>();
        switch (provider) {
          case "gemini": {
            const gemini = google(model || 'gemini-1.5-pro-latest', {
              apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
              useSearchGrounding: true,
            });
            const result = streamText({ model: gemini, messages });
            return result.toDataStreamResponse();
          }
          case "openai": {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model,
                messages,
                stream: true,
              }),
            });
            return new Response(res.body, {
              headers: { "Content-Type": "text/event-stream" },
            });
          }
          case "cloudflare": {
            const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
            const cfRes = await fetch(cfUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.CLOUDFLARE_AI_TOKEN}`,
              },
              body: JSON.stringify({ messages }),
            });
            return new Response(cfRes.body, {
              headers: { "Content-Type": "text/event-stream" },
            });
          }
          default:
            return new Response("Unknown provider", { status: 400 });
        }
      }
      case "/api/models": {
        const provider = url.searchParams.get("provider");
        switch (provider) {
          case "gemini": {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1/models?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`
            );
            return new Response(await res.text(), { headers: { "Content-Type": "application/json" } });
          }
          case "openai": {
            const res = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
            });
            return new Response(await res.text(), { headers: { "Content-Type": "application/json" } });
          }
          case "cloudflare": {
            const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models`;
            const res = await fetch(cfUrl, {
              headers: { Authorization: `Bearer ${env.CLOUDFLARE_AI_TOKEN}` },
            });
            return new Response(await res.text(), { headers: { "Content-Type": "application/json" } });
          }
          default:
            return new Response(JSON.stringify({ models: [] }), { headers: { "Content-Type": "application/json" } });
        }
      }
      case "/api/projects": {
        return new Promise((resolve) => {
          exec("clasp list --json", (err, stdout, stderr) => {
            if (err) {
              resolve(new Response(stderr, { status: 500 }));
            } else {
              resolve(new Response(stdout, { headers: { "Content-Type": "application/json" } }));
            }
          });
        });
      }
      case "/api/project/files": {
        const id = url.searchParams.get("id");
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return new Response("Invalid or missing id", { status: 400 });
        }
        return new Promise((resolve) => {
          execFile("clasp", ["pull", "--scriptId", id, "--rootDir", `/tmp/${id}`], (err) => {
            if (err) {
              resolve(new Response("pull failed", { status: 500 }));
              return;
            }
            execFile("ls", [`/tmp/${id}`], (err2, out) => {
              if (err2) {
                resolve(new Response("list failed", { status: 500 }));
              } else {
                const files = out.split("\n").filter(Boolean);
                resolve(new Response(JSON.stringify({ files }), { headers: { "Content-Type": "application/json" } }));
              }
            });
          });
        });
      }
      default: {
        return new Response(null, { status: 404 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
