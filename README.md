# Workers Vercel AI Starter

A chat application powered by multiple AI providers using the Vercel AI SDK and Cloudflare Workers. It now supports Gemini, OpenAI, OpenAI Assistant, and Cloudflare Workers AI with model discovery, session persistence, GitHub repo lookup, Vectorize semantic search, and Whisper transcription. Weather cards can be generated in chat.

## Deploy

First, use the button below to deploy this project to Cloudflare Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kristianfreeman/workers-vercel-ai-starter)

**IMPORTANT:** Once deployed, access the newly deployed application in your dashboard and set the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable to your Gemini API key ([instructions](https://ai.google.dev/gemini-api/docs/api-key)). After redeploying the application, the API endpoint will automatically use this key and interact with the Gemini API.

To use OpenAI or Workers AI, also configure `OPENAI_API_KEY` and the necessary Workers AI bindings in `wrangler.jsonc`.
