# Ready Sounds — Claude Instructions

## Verification Workflow
After editing code while a preview server is running, verification is complete once a screenshot has been taken via the preview tool and reviewed. No additional steps required.

## Local Preview Server
The Desktop folder is protected by macOS and cannot be served directly. Workaround:
1. Copy files to `/tmp/ready-sounds-preview`
2. Serve from there using Ruby: `ruby -run -e httpd /tmp/ready-sounds-preview -p 8080`
3. After edits, sync the changed file: `cp <file> /tmp/ready-sounds-preview/<file>`

The `.claude/launch.json` is already configured for this.

## Project Overview
- Static HTML site (no build process, no package.json)
- Backend: Supabase (auth + track data)
- File storage: Cloudflare R2
- Main pages: `index.html`, `browse.html`, `pricing.html`, `signup.html`

## Stack & Tools
- No Node, no Bun, no npx available
- Ruby and Python3 available (Python3 has Desktop permission issues)
- Use Ruby for local server (see above)
