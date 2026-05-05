import { Observable, of, from } from 'rxjs'
import { switchMap, map }       from 'rxjs'
import type { Action }          from '../mvu/actions'
import type { CurriculumJson }  from '../curriculum/types'

function fetchCurriculumJson(domain: string): Observable<Action> {
	return new Observable<Action>(observer => {
		const controller = new AbortController()

		fetch(`/api/domains/${domain}/curriculum`, { signal: controller.signal })
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.json() as Promise<CurriculumJson>
			})
			.then(data => {
				observer.next({
					type:        'CURRICULUM_LOADED',
					topics:      data.topics,
					families:    data.families,
					tutorConfig: data.tutorConfig,
				})
				observer.complete()
			})
			.catch(err => {
				if ((err as { name?: string }).name === 'AbortError') return
				observer.next({ type: 'CURRICULUM_FAILED', error: String(err) })
				observer.complete()
			})

		return () => controller.abort()
	})
}

function resolveDomain(): Observable<string> {
	const params   = new URLSearchParams(window.location.search)
	const explicit = params.get('domain')
	if (explicit) return of(explicit)

	return from(
		fetch('/api/domains')
			.then(r => r.json() as Promise<{ domains: Array<{ id: string }> }>)
			.then(data => {
				const first = data.domains[0]
				if (!first) throw new Error('No domains registered — run the pipeline first.')
				return first.id
			})
	)
}

export function fetchCurriculum(): Observable<Action> {
	return resolveDomain().pipe(
		switchMap(domain => fetchCurriculumJson(domain)),
		map((a): Action => a),
	)
}
