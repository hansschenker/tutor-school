import Anthropic from '@anthropic-ai/sdk'
import { loadSourceDocuments }          from './loader.js'
import { extractTopics }                from './extractor.js'
import { mergeTopics, groupByCategory } from './merger.js'
import { buildTutorConfig }             from './types.js'
import type { PipelineConfig, RawTopic, ExtractionResult } from './types.js'
import type { TutorConfig }             from '../src/curriculum/types.js'

export interface PipelineResult {
	grouped:     Map<string, RawTopic[]>
	tutorConfig: TutorConfig
}

function chunkDocument(doc: SourceDocument, maxChars: number): SourceDocument[] {
	if (doc.content.length <= maxChars) return [doc]

	// Split on ## headings so each chunk is a coherent section
	const sections = doc.content.split(/(?=^## )/m)
	const chunks: SourceDocument[] = []
	let current = ''
	let idx = 0

	for (const section of sections) {
		if (current.length + section.length > maxChars && current.length > 0) {
			chunks.push({ filename: `${doc.filename}#chunk${idx++}`, content: current })
			current = section
		} else {
			current += section
		}
	}
	if (current.length > 0) chunks.push({ filename: `${doc.filename}#chunk${idx}`, content: current })
	return chunks
}

export async function runPipeline(
	config:     PipelineConfig,
	sourcesDir: string,
	client:     Anthropic,
): Promise<PipelineResult> {
	const docs    = loadSourceDocuments(sourcesDir)
	const results: ExtractionResult[] = []
	for (const doc of docs) {
		const chunks = chunkDocument(doc, config.extraction.maxChunkChars)
		console.log(`[pipeline] ${doc.filename}: ${chunks.length} chunk(s)`)
		for (const chunk of chunks) {
			const result = await extractTopics(chunk, config, client)
			console.log(`[pipeline] ${chunk.filename}: ${result.topics.length} topics`)
			results.push(result)
		}
	}
	const merged  = mergeTopics(results)
	const grouped = groupByCategory(merged)
	return { grouped, tutorConfig: buildTutorConfig(config) }
}
