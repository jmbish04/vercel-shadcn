import type { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

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
          return new Response(JSON.stringify({ error: "Google Apps Script API key not configured" }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          });
        }
        
        try {
          const res = await fetch(
            `https://script.googleapis.com/v1/projects?key=${env.GOOGLE_APPS_SCRIPT_API_KEY}`,
            {
              headers: {
                "Accept": "application/json",
              },
            }
          );
          
          if (!res.ok) {
            return new Response(JSON.stringify({ error: "Failed to fetch projects" }), { 
              status: res.status,
              headers: { "Content-Type": "application/json" } 
            });
          }
          
          const data = await res.json();
          return new Response(JSON.stringify(data), { 
            headers: { "Content-Type": "application/json" } 
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Failed to connect to Google Apps Script API" }), { 
            status: 500,
            headers: { "Content-Type": "application/json" } 
          });
        }
      }
      case "/api/project/files": {
        const id = url.searchParams.get("id");
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return new Response("Invalid or missing id", { status: 400 });
        }
        
        if (!env.GOOGLE_APPS_SCRIPT_API_KEY) {
          return new Response(JSON.stringify({ error: "Google Apps Script API key not configured" }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          });
        }
        
        try {
          const res = await fetch(
            `https://script.googleapis.com/v1/projects/${id}/content?key=${env.GOOGLE_APPS_SCRIPT_API_KEY}`,
            {
              headers: {
                "Accept": "application/json",
              },
            }
          );
          
          if (!res.ok) {
            return new Response(JSON.stringify({ error: "Failed to fetch project files" }), { 
              status: res.status,
              headers: { "Content-Type": "application/json" } 
            });
          }
          
          const data = await res.json();
          
          // Extract file names from the Apps Script project content
          const files = data.files ? data.files.map((file: any) => file.name) : [];
          
          return new Response(JSON.stringify({ files }), { 
            headers: { "Content-Type": "application/json" } 
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Failed to connect to Google Apps Script API" }), { 
            status: 500,
            headers: { "Content-Type": "application/json" } 
          });
        }
      }
      default: {
        return new Response(null, { status: 404 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
