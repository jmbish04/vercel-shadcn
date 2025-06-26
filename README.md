# Workers Vercel AI Starter


A chat application powered by Google Gemini AI, OpenAI, and Cloudflare Workers AI. It provides a simple interface for interacting with different AI providers, rendered with Shadcn UI components and Tailwind CSS.


## Deploy

First, use the button below to deploy this project to Cloudflare Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kristianfreeman/workers-vercel-ai-starter)




**IMPORTANT:** Once deployed, access the newly deployed application in your dashboard and set the following environment variables:

- `GOOGLE_GENERATIVE_AI_API_KEY` – Gemini API key ([instructions](https://ai.google.dev/gemini-api/docs/api-key))
- `GOOGLE_APPS_SCRIPT_API_KEY` – Google Apps Script API key for project management
- `OPENAI_API_KEY` – OpenAI API key
- `CLOUDFLARE_AI_TOKEN` – API token for Workers AI
- `CLOUDFLARE_ACCOUNT_ID` – your Cloudflare account id

After redeploying the application, the API endpoint will automatically use these keys to interact with the selected provider.

