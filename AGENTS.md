# Working with Codex

This repository contains the original Playa PWA source recovered from the ChatGPT Sites project.

## Development
- Read the existing implementation before changing behavior; keep the current React, TypeScript, Vite, and Vitest structure.
- Use the checked-in pnpm lockfile. Install with pnpm install --frozen-lockfile.
- Run relevant checks with pnpm run typecheck, pnpm run test, and pnpm run build before proposing a change.
- Do not commit secrets. Keep local API keys in an untracked .env file; .env.example is safe to edit.

## Production boundary
- This repository is the Playa version published with GitHub Pages.
- The separate original application remains hosted at https://bano-sanlucar.folivares632902.chatgpt.site.
- Changes here must not modify or deploy the separate ChatGPT Sites application.
- GitHub Pages builds with pnpm run build:pages and publishes dist through .github/workflows/deploy.yml on pushes to main.
- Keep .openai/hosting.json unchanged; pnpm run build retains the original Sites packaging for compatibility.
