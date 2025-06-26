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

type JsonBody = {
  id: string;
  provider: 'gemini' | 'openai' | 'workers' | 'assistant';
  model: string;
  messages: Message[];
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/api/chat": {
        const { id, provider, model, messages } = await request.json<JsonBody>();
        let chatModel;
        let chatMessages = messages;
        switch (provider) {
          case 'openai':
            chatModel = openai(model, { apiKey: env.OPENAI_API_KEY });
            break;
          case 'assistant': {
            const query = messages[messages.length - 1]?.content || '';
            const search = await env.VECTORIZE.search(query);
            const context = search.matches?.map((m: any) => m.metadata.text).join('\n') || '';
            chatModel = openai(model, { apiKey: env.OPENAI_API_KEY });
            chatMessages = [{ role: 'system', content: context }, ...messages];
            break;
          }
          case 'workers':
            chatModel = createWorkerAIClient(env).model(model);
            break;
          default:
            chatModel = google(model || 'gemini-1.5-pro-latest', {
              apiKey: env.GEMINI_API_KEY,
              useSearchGrounding: true,
            });
            break;
        }
        const result = streamText({ model: chatModel, messages: chatMessages });
        await env.CACHE.put(id, JSON.stringify(messages));
        return result.toDataStreamResponse();
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
