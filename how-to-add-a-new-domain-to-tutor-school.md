# How to Add a New Domain to tutor-school

> Adding a domain means registering a subject area and running the AI pipeline to extract structured topics from your source documents into a navigable, chat-augmented curriculum.

---

## Why It Exists

tutor-school is domain-agnostic by design: there is no hardcoded curriculum. Instead, domains are registered at runtime and their curricula are produced on demand by an AI extraction pipeline. This means the same app instance can serve as an RxJS tutor, a TypeScript tutor, a Docker tutor — anything you can write down in a markdown file.

---

## Core Idea

Think of a domain as a course. You provide the raw knowledge (markdown files), the pipeline reads them, calls Claude to extract structured topics, and writes a `curriculum.json` that the frontend loads when the domain is selected. The three-panel UI (sidebar / reference / chat) is wired entirely from that JSON — no code changes needed.

---

## Key Properties

- A domain has a unique `id` (slug), a `name`, and a `description` — registered in `data/domains.json`
- Source documents live in `data/sources/<domain-id>/` (gitignored — local only)
- Extracted curriculum lives in `data/curriculum/<domain-id>/curriculum.json` (gitignored — local only)
- The pipeline splits large documents into chunks (by `##` headings) and merges duplicate topics automatically
- The frontend auto-discovers the first registered domain if no `?domain=` query param is given
- Any number of domains can coexist in one running instance

---

## Visual / Diagram

```
Your markdown files
  data/sources/<domain>/
  └── 01-intro.md
  └── 02-advanced.md
          │
          ▼
  POST /api/pipeline/run/<domain>
          │
          ▼ (Claude tool_use extraction, chunked)
  data/curriculum/<domain>/curriculum.json
      { domain, topics[], families[], tutorConfig }
          │
          ▼
  GET /api/domains/<domain>/curriculum   ← frontend fetches on load
          │
          ▼
  Sidebar     Reference     Chat
  (families)  (topic def)  (Claude, topic-aware)
```

---

## Comparison With Related Approaches

| Approach | Key difference | Choose when |
|----------|---------------|-------------|
| Static curriculum (rxjs-tutor style) | TypeScript files in `src/curriculum/data/` — committed to git, no pipeline | Domain is fixed, content is hand-curated, no AI extraction needed |
| tutor-school domain | JSON output from pipeline — not committed, regenerated anytime | Domain is dynamic, sourced from markdown docs, may evolve |
| Multi-instance deployment | Separate running app per domain | Domains need isolated infrastructure or different API keys |

---

## Code Example

```typescript
// The three HTTP calls needed to add a domain end-to-end

// Step 1 — register the domain
await fetch('/api/domains', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		id:          'docker',
		name:        'Docker & Containers',
		description: 'Container concepts, Dockerfile patterns, Compose, and orchestration basics',
	}),
})

// Step 2 — upload source files (multer field name: "sources")
const form = new FormData()
form.append('sources', markdownBlob, 'docker-basics.md')
await fetch('/api/pipeline/upload/docker', { method: 'POST', body: form })

// Step 3 — run extraction pipeline
const result = await fetch('/api/pipeline/run/docker', { method: 'POST' })
const { topicCount, familyCount, durationMs } = await result.json()
// → { topicCount: 34, familyCount: 6, durationMs: 45000 }

// Now navigate to the domain
window.location.href = '/?domain=docker'
```

---

## Common Misconceptions

1. **"I need to restart the server after adding a domain"** — No. The domain store reads and writes `data/domains.json` on every call. Registering a domain and running the pipeline take effect immediately with no restart required.

2. **"The pipeline only handles one file"** — No. The loader reads all `.md` and `.txt` files in `data/sources/<domain>/` sorted alphabetically. You can split your knowledge across multiple files and they will all be processed and merged.

3. **"I have to use the API — can't I just drop the JSON manually?"** — You can. If you already have a `curriculum.json` in the correct format, just place it at `data/curriculum/<domain-id>/curriculum.json` and register the domain in `data/domains.json` by hand. The pipeline is only needed to *generate* that JSON from raw text.

4. **"Large documents will fail the pipeline"** — No longer. Documents are automatically split on `##` section headings into chunks ≤ 8000 characters before being sent to Claude, so arbitrarily large markdown files are supported.

---

## Summary

- Register the domain via `POST /api/domains` with `id`, `name`, `description`
- Place `.md`/`.txt` source files in `data/sources/<domain-id>/` (or upload via `POST /api/pipeline/upload/<domain>`)
- Run `POST /api/pipeline/run/<domain>` — Claude extracts topics, writes `curriculum.json`
- Navigate to `/?domain=<domain-id>` — the frontend resolves the domain, loads the curriculum, and the full three-panel tutor is ready
- No code changes, no rebuild, no restart needed at any step
