import type { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createWorkerAIClient } from 'workers-ai-provider';
import { Assistants } from '@ai-sdk/assistants';

async function getGeminiModels(apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
  return res.json();
}

async function getOpenAIModels(apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to fetch OpenAI models: ${res.status} ${errorBody}`);
  }
  return res.json();
}

async function getWorkerAIModels(env: Env) {
  const client = createWorkerAIClient(env);
  return client.getModels();
}

interface Env {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  GOOGLE_APPS_SCRIPT_API_KEY: string;
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
              return new Response("Gemini API key is not configured", { status: 500 });
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
              return new Response("OpenAI API key is not configured", { status: 500 });
            }
            const openaiModel = openai(model || 'gpt-4o-mini', {
              apiKey: env.OPENAI_API_KEY,
            });
            const result = streamText({ model: openaiModel, messages });
            return result.toDataStreamResponse();
          }
          case "cloudflare": {
            if (!env.CLOUDFLARE_AI_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
              return new Response("Cloudflare AI credentials are not configured", { status: 500 });
            }
            const cloudflareModel = cloudflare(model || '@cf/meta/llama-3.1-8b-instruct', {
              apiKey: env.CLOUDFLARE_AI_TOKEN,
              accountID: env.CLOUDFLARE_ACCOUNT_ID,
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
        if (!env.GOOGLE_APPS_SCRIPT_API_KEY) {
          return new Response(
            JSON.stringify({ 
              error: "Google Apps Script API key is not configured",
              message: "Please set GOOGLE_APPS_SCRIPT_API_KEY environment variable" 
            }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          // Use Google Apps Script API to list projects
          const response = await fetch(
            `https://script.googleapis.com/v1/projects?key=${env.GOOGLE_APPS_SCRIPT_API_KEY}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return new Response(
              JSON.stringify({ 
                error: "Failed to fetch projects from Google Apps Script API",
                status: response.status 
              }), 
              { status: response.status, headers: { "Content-Type": "application/json" } }
            );
          }

          const data = await response.json();
          const projects = (data.projects || []).map((project: any) => ({
            id: project.scriptId,
            title: project.title,
          }));

          return new Response(
            JSON.stringify(projects), 
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch Apps Script projects",
              message: error instanceof Error ? error.message : "Unknown error"
            }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      case "/api/project/files": {
        const id = url.searchParams.get("id");
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return new Response("Invalid or missing id", { status: 400 });
        }

        if (!env.GOOGLE_APPS_SCRIPT_API_KEY) {
          return new Response(
            JSON.stringify({ 
              error: "Google Apps Script API key is not configured",
              message: "Please set GOOGLE_APPS_SCRIPT_API_KEY environment variable" 
            }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          // Use Google Apps Script API to get project content
          const response = await fetch(
            `https://script.googleapis.com/v1/projects/${id}/content?key=${env.GOOGLE_APPS_SCRIPT_API_KEY}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return new Response(
              JSON.stringify({ 
                error: "Failed to fetch project files from Google Apps Script API",
                status: response.status 
              }), 
              { status: response.status, headers: { "Content-Type": "application/json" } }
            );
          }

          const data = await response.json();
          const files = (data.files || []).map((file: any) => file.name);

          return new Response(
            JSON.stringify({ files }), 
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch Apps Script project files",
              message: error instanceof Error ? error.message : "Unknown error"
            }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      case "/api/models": {
        const provider = url.searchParams.get('provider');
        switch (provider) {
          case 'openai':
          case 'assistant':
            return new Response(JSON.stringify(await getOpenAIModels(env.OPENAI_API_KEY)), {
              headers: { 'Content-Type': 'application/json' },
            });
          case 'workers':
            return new Response(JSON.stringify(await getWorkerAIModels(env)), {
              headers: { 'Content-Type': 'application/json' },
            });
          default:
            return new Response(JSON.stringify(await getGeminiModels(env.GEMINI_API_KEY)), {
              headers: { 'Content-Type': 'application/json' },
            });
        }
      }
      case "/api/github/repos": {
        const username = url.searchParams.get('user');
        const result = await fetch(`https://api.github.com/users/${username}/repos`, {
          headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}` },
        });
        return new Response(await result.text(), { headers: { 'Content-Type': 'application/json' } });
      }
      case "/api/vectorize/search": {
        const { query } = await request.json<{ query: string }>();
        const search = await env.VECTORIZE.search(query);
        return new Response(JSON.stringify(search), { headers: { 'Content-Type': 'application/json' } });
      }
      case "/api/transcribe": {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return new Response('Missing file', { status: 400 });
        const fd = new FormData();
        fd.append('file', file);
        fd.append('model', 'whisper-1');
        const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          body: fd,
        });
        return new Response(await resp.text(), { headers: { 'Content-Type': 'application/json' } });
      }
      case "/api/assistant": {
        const { thread } = await request.json<{ thread: string }>();
        const assistants = new Assistants({ apiKey: env.OPENAI_API_KEY });
        const result = await assistants.run(thread);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      }
      case "/api/session": {
        const id = url.searchParams.get('id');
        if (!id) return new Response('Missing id', { status: 400 });
        const data = await env.CACHE.get(id);
        return new Response(data ?? '[]', { headers: { 'Content-Type': 'application/json' } });
      }
      default: {
        return new Response(null, { status: 404 });
      }
    }
  },
} satisfies ExportedHandler<Env>;

export { SessionDO } from './session';
