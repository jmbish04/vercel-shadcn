import type { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { cloudflare as cfai } from '@ai-sdk/cloudflare';
import { streamText } from 'ai';

let cachedAssistant: { id: string } | undefined;
import {
  experimental_createAssistant,
  experimental_createThread,
  experimental_addMessage,
  experimental_getResponse,
} from '@ai-sdk/assistants';

interface AssistBody {
  threadId?: string;
  messages: Message[];
}

interface OpenAIModelList {
  data: { id: string }[];
}

interface CloudflareModelList {
  result: { id: string }[];
}

interface GeminiModelList {
  models: { name: string }[];
}

interface GoogleProjectsResponse {
  projects?: { scriptId: string; title: string }[];
}

interface GoogleProjectFilesResponse {
  files?: { name: string; type: string; source: string }[];
}

export default {
async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    switch (url.pathname) {
    case "/api/chat": {
      const provider = url.searchParams.get('provider') || 'gemini';
      const { messages } = await request.json<AssistBody>();
      let model;
      if (provider === 'openai') {
        if (!env.OPENAI_API_KEY)
          return new Response('OpenAI API key is not configured', { status: 500 });
        model = openai('gpt-4o', { apiKey: env.OPENAI_API_KEY });
      } else if (provider === 'cloudflare') {
        if (!env.CLOUDFLARE_API_TOKEN)
          return new Response('Cloudflare AI token is not configured', { status: 500 });
        model = cfai('@cf/meta/llama-3-8b-instruct', { apiKey: env.CLOUDFLARE_API_TOKEN });
      } else {
        if (!env.GEMINI_API_KEY)
          return new Response('Gemini API key is not configured', { status: 500 });
        model = google('gemini-1.5-pro-latest', { apiKey: env.GEMINI_API_KEY, useSearchGrounding: true });
      }
      const result = streamText({ model, messages });
      return result.toDataStreamResponse();
    }
    case "/api/assistants": {
      const { threadId, messages } = await request.json<AssistBody>();
      if (!cachedAssistant) {
        cachedAssistant = await experimental_createAssistant({ model: 'openai/gpt-4o' });
      }
      const thread = threadId ? { id: threadId } : await experimental_createThread();
      await experimental_addMessage({ threadId: thread.id, content: messages[messages.length - 1].content, role: 'user' });
      const result = await experimental_getResponse({ assistantId: cachedAssistant.id, threadId: thread.id });
      return new Response(
        JSON.stringify({ ...result, threadId: thread.id, assistantId: cachedAssistant.id }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    case "/api/github": {
      const path = url.searchParams.get('path') || '';
      const res = await fetch(`https://api.github.com/${path}`, {
        headers: {
          'User-Agent': 'vercel-shadcn',
          'Authorization': request.headers.get('Authorization') || ''
        }
      });
      if (!res.ok) {
        const body = await res.text();
        return new Response(body, { status: res.status, headers: res.headers });
      }
      return new Response(res.body, { status: res.status, headers: res.headers });
    }
    case "/api/models": {
      const provider = url.searchParams.get('provider') || 'gemini';
      let models: string[] = [];
      if (provider === 'openai') {
        if (!env.OPENAI_API_KEY)
          return new Response('OpenAI API key is not configured', { status: 500 });
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ message: 'Failed to fetch models from OpenAI' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        const data = await res.json<OpenAIModelList>();
        models = (data.data || []).map((m) => m.id);
      } else if (provider === 'cloudflare') {
        if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
          return new Response('Cloudflare credentials are not configured', { status: 500 });
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models`, {
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'User-Agent': 'vercel-shadcn'
          }
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ message: 'Failed to fetch models from Cloudflare' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        const data = await res.json<CloudflareModelList>();
        models = (data.result || []).map((m) => m.id);
      } else {
        if (!env.GEMINI_API_KEY)
          return new Response('Gemini API key is not configured', { status: 500 });
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models');
        if (!res.ok) {
          return new Response(JSON.stringify({ message: 'Failed to fetch models from Google' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        const data = await res.json<GeminiModelList>();
        models = (data.models || []).map((m) => m.name);
      }
      return new Response(JSON.stringify({ models }), { headers: { 'Content-Type': 'application/json' } });
    }
    case "/api/projects": {
      if (!env.GOOGLE_API_TOKEN)
        return new Response('Google API token is not configured', { status: 500 });
      const res = await fetch('https://script.googleapis.com/v1/projects', {
        headers: { Authorization: `Bearer ${env.GOOGLE_API_TOKEN}` }
      });
      if (!res.ok) {
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/plain' }
        });
      }
      const data = await res.json<GoogleProjectsResponse>();
      return new Response(JSON.stringify({ projects: data.projects || [] }), { headers: { 'Content-Type': 'application/json' } });
    }
    case "/api/project/files": {
      if (!env.GOOGLE_API_TOKEN)
        return new Response('Google API token is not configured', { status: 500 });
      const scriptId = url.searchParams.get('scriptId');
      if (!scriptId) {
        return new Response(JSON.stringify({ error: 'Missing scriptId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const res = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
        headers: { Authorization: `Bearer ${env.GOOGLE_API_TOKEN}` }
      });
      if (!res.ok) {
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/plain' }
        });
      }
      const data = await res.json<GoogleProjectFilesResponse>();
      return new Response(JSON.stringify({ files: data.files || [] }), { headers: { 'Content-Type': 'application/json' } });
    }
    case "/api/vectorize": {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    }
    default: {
      return new Response(null, { status: 404 });
    }
  }
  },
} satisfies ExportedHandler<Env>;
