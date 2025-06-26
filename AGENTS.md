# Codex Guidelines

This project uses Vite with a Cloudflare Worker backend. After modifying code, run `npm run lint` to ensure consistency.

## Suggested Improvements
- Cache model lists server-side to reduce network requests.
- Consider using the official Apps Script API instead of the `clasp` CLI for better portability.
- Add unit tests with Vitest for API endpoints and worker logic.
- Provide error handling for missing environment variables.
