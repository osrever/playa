# Working with Codex

This repository contains the original SofiPlaya PWA source recovered from the ChatGPT Sites project.

## Development
- Read the existing implementation before changing behavior; keep the current React, TypeScript, Vite, and Vitest structure.
- Use the checked-in pnpm lockfile. Install with pnpm install --frozen-lockfile.
- Run relevant checks with pnpm run typecheck, pnpm run test, and pnpm run build before proposing a change.
- Do not commit secrets. Keep local API keys in an untracked .env file; .env.example is safe to edit.

## Production boundary
- The live application is hosted in ChatGPT Sites at https://bano-sanlucar.folivares632902.chatgpt.site.
- Treat this repository as a development copy. Do not publish, deploy, change the live Site, or modify its access settings unless the user explicitly asks for that action.
- Do not edit .openai/hosting.json or trigger a production release as part of routine development.
