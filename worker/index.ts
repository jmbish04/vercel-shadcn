import type { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { cloudflare } from '@ai-sdk/cloudflare';
import { streamText } from 'ai';

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
            if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
              return new Response("Gemini API key not configured", { status: 500 });
            }
            const geminiModel = google(model || 'gemini-1.5-pro-latest', {
              apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
              useSearchGrounding: true,
            });
            const result = streamText({ model: geminiModel, messages });
            return result.toDataStreamResponse();
          }
          case "openai": {
            if (!env.OPENAI_API_KEY) {
              return new Response("OpenAI API key not configured", { status: 500 });
            }
            const openaiModel = openai(model, { apiKey: env.OPENAI_API_KEY });
            const result = streamText({ model: openaiModel, messages });
            return result.toDataStreamResponse();
          }
          case "cloudflare": {
            if (!env.CLOUDFLARE_AI_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
              return new Response("Cloudflare AI credentials not configured", { status: 500 });
            }
            const cloudflareModel = cloudflare(model, {
              apiKey: env.CLOUDFLARE_AI_TOKEN,
              accountId: env.CLOUDFLARE_ACCOUNT_ID,
            });
            const result = streamText({ model: cloudflareModel, messages });
            return result.toDataStreamResponse();
          }
          default:
            return new Response("Unknown provider", { status: 400 });
        }
      }
      case "/api/models": {
        const provider = url.searchParams.get("provider");
        switch (provider) {
          case "gemini": {
            if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
              return new Response(JSON.stringify({ error: "Gemini API key not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1/models?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`
            );
            if (!res.ok) {
              return new Response(JSON.stringify({ models: [] }), { headers: { "Content-Type": "application/json" } });
            }
            const data = await res.json() as { models?: { name: string }[] };
            const models = (data.models || [])
              .map(m => m.name)
              .filter(name => name.includes('generateContent'))  // Only models that support chat
              .sort();
            return new Response(JSON.stringify({ models }), { headers: { "Content-Type": "application/json" } });
          }
          case "openai": {
            if (!env.OPENAI_API_KEY) {
              return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
            const res = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
            });
            if (!res.ok) {
              return new Response(JSON.stringify({ models: [] }), { headers: { "Content-Type": "application/json" } });
            }
            const data = await res.json() as { data?: { id: string }[] };
            const models = (data.data || [])
              .map(m => m.id)
              .filter(id => id.startsWith('gpt-'))  // Only GPT models
              .sort();
            return new Response(JSON.stringify({ models }), { headers: { "Content-Type": "application/json" } });
          }
          case "cloudflare": {
            if (!env.CLOUDFLARE_AI_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
              return new Response(JSON.stringify({ error: "Cloudflare AI credentials not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
            const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models`;
            const res = await fetch(cfUrl, {
              headers: { Authorization: `Bearer ${env.CLOUDFLARE_AI_TOKEN}` },
            });
            if (!res.ok) {
              return new Response(JSON.stringify({ models: [] }), { headers: { "Content-Type": "application/json" } });
            }
            const data = await res.json() as { result?: { name: string }[] };
            const models = (data.result || [])
              .map(m => m.name)
              .filter(name => name.includes('llama') || name.includes('mistral'))  // Common chat models
              .sort();
            return new Response(JSON.stringify({ models }), { headers: { "Content-Type": "application/json" } });
          }
          default:
            return new Response(JSON.stringify({ models: [] }), { headers: { "Content-Type": "application/json" } });
        }
      }
      case "/api/projects": {
        // Apps Script integration removed due to security and runtime incompatibility issues
        // This feature would require using the Google Apps Script API instead of clasp CLI
        return new Response(JSON.stringify({ error: "Apps Script integration temporarily disabled" }), {
          status: 501,
          headers: { "Content-Type": "application/json" }
        });
      }
      case "/api/project/files": {
        // Apps Script integration removed due to security and runtime incompatibility issues
        // This feature would require using the Google Apps Script API instead of clasp CLI
        return new Response(JSON.stringify({ error: "Apps Script integration temporarily disabled" }), {
          status: 501,
          headers: { "Content-Type": "application/json" }
        });
      }
      default: {
        return new Response(null, { status: 404 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
