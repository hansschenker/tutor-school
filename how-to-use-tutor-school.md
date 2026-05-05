# How to Use Tutor School

Tutor School is a domain-agnostic AI tutor app. It has no built-in curriculum — you bring your own subject domain by registering it and providing a `curriculum.json`.

## Prerequisites

- Node.js 18+
- An Anthropic API key (`ANTHROPIC_API_KEY`)

## Setup

### 1. Install dependencies

```bash
cd tutor-school
npm install
```

### 2. Set the API key

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Provide a curriculum

There are two ways to get a curriculum into the app.

#### Option A — Copy an existing `curriculum.json`

If you already have a `curriculum.json` (e.g. from rxjs-tutor), copy it into:

```
data/curriculum/<domain-id>/curriculum.json
```

Example for RxJS:

```bash
mkdir -p data/curriculum/rxjs
cp /path/to/rxjs-tutor/data/curriculum/rxjs/curriculum.json data/curriculum/rxjs/
```

#### Option B — Generate from markdown sources

Place `.md` or `.txt` source files in:

```
data/sources/<domain-id>/
```

Then run the pipeline:

```bash
npm run pipeline pipeline/config.json
```

See [Running the Pipeline](#running-the-pipeline) below for the config format.

### 4. Register the domain

Edit `data/domains.json` to register your domain:

```json
{
  "domains": [
    {
      "id": "rxjs",
      "name": "RxJS",
      "description": "Reactive Extensions for JavaScript — operators, observables, and reactive patterns",
      "createdAt": "2026-05-05T00:00:00.000Z",
      "lastRun": null,
      "topicCount": null
    }
  ]
}
```

The `id` must match the folder name under `data/curriculum/`.

### 5. Start the app

```bash
npm run dev
```

This starts both the Vite frontend (`:5173`) and the Express API server (`:3001`) concurrently.

Open your browser at:

```
http://localhost:5173
```

The app will load the first registered domain automatically. To load a specific domain use the `?domain=` query param:

```
http://localhost:5173?domain=rxjs
```

---

## Running the Pipeline

The pipeline reads markdown/text source files, uses Claude to extract structured topics, and writes `curriculum.json`.

### Config file format

Create a JSON config file (e.g. `pipeline/my-domain.config.json`):

```json
{
  "domain": {
    "name": "RxJS",
    "description": "Reactive Extensions for JavaScript",
    "defaultCategory": "Transformation",
    "defaultTopic": "map",
    "labels": {
      "category": "Family",
      "topic": "Operator"
    }
  },
  "extraction": {
    "model": "claude-haiku-4-5-20251001",
    "maxChunkChars": 12000
  },
  "output": {
    "dir": "data/curriculum/rxjs"
  }
}
```

Place your source files in `data/sources/rxjs/` (`.md` or `.txt`), then run:

```bash
npm run pipeline pipeline/my-domain.config.json
```

The output is written to `data/curriculum/rxjs/curriculum.json`.

---

## Adding a Second Domain

1. Create `data/curriculum/<new-domain>/curriculum.json` (copy or generate)
2. Add an entry to `data/domains.json`
3. Navigate to `http://localhost:5173?domain=<new-domain>`

---

## Project Structure

```
tutor-school/
  src/              Frontend — MVU store, views, effects, router
  server/           Express API — chat streaming, domain & pipeline endpoints
  pipeline/         Markdown → curriculum.json extraction (Claude tool_use)
  data/
    domains.json              Domain registry
    curriculum/<domain>/      Generated curriculum.json per domain
    sources/<domain>/         Source markdown files for pipeline input
```
