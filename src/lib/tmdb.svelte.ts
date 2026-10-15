// src/lib/tmdb.svelte.ts

export interface TMDBMovie {
	id: number;
	media_type: 'movie';
	title: string;
	poster_path: string | null;
	release_date?: string;
	vote_average?: number;
}

export interface TMDBTV {
	id: number;
	media_type: 'tv';
	name: string;
	poster_path: string | null;
	first_air_date?: string;
	vote_average?: number;
}

export interface TMDBPerson {
	id: number;
	media_type: 'person';
	name: string;
	profile_path: string | null;
	known_for_department?: string;
}

export type TMDBMediaItem = TMDBMovie | TMDBTV | TMDBPerson;

export interface TMDBSearchResponse {
	page: number;
	results: TMDBMediaItem[];
	total_pages: number;
	total_results: number;
}

export interface UnifiedMediaDetail {
	id: number;
	type: 'movie' | 'tv';
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	duration?: string;
}

class TMDBStore {
	apiKey = $state<string>('');
	isOpenModal = $state<boolean>(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.apiKey = localStorage.getItem('tmdb_api_key') || '';
			if (!this.apiKey) {
				this.isOpenModal = true;
			}
		}
	}

	setApiKey(key: string) {
		this.apiKey = key.trim();
		if (typeof window !== 'undefined') {
			localStorage.setItem('tmdb_api_key', this.apiKey);
		}
	}

	clearApiKey() {
		this.apiKey = '';
		if (typeof window !== 'undefined') {
			localStorage.removeItem('tmdb_api_key');
		}
		this.isOpenModal = true;
	}

	get hasKey() {
		return Boolean(this.apiKey);
	}

	getHeaders() {
		if (this.apiKey.startsWith('ey')) {
			return {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			};
		}
		return { 'Content-Type': 'application/json' };
	}

	buildUrl(path: string, params: Record<string, string> = {}) {
		const url = new URL(`https://api.themoviedb.org/3${path}`);
		if (!this.apiKey.startsWith('ey')) {
			url.searchParams.set('api_key', this.apiKey);
		}
		for (const [key, val] of Object.entries(params)) {
			url.searchParams.set(key, val);
		}
		return url.toString();
	}

	async validateKey(testKey?: string): Promise<boolean> {
		const keyToTest = (testKey ?? this.apiKey).trim();
		if (!keyToTest) return false;

		const isBearer = keyToTest.startsWith('ey');
		const url = new URL('https://api.themoviedb.org/3/authentication');
		if (!isBearer) url.searchParams.set('api_key', keyToTest);

		try {
			const res = await fetch(url.toString(), {
				headers: isBearer
					? { Authorization: `Bearer ${keyToTest}`, 'Content-Type': 'application/json' }
					: { 'Content-Type': 'application/json' }
			});
			const data = await res.json();
			return Boolean(data.success);
		} catch {
			return false;
		}
	}

	async searchMulti(query: string, page = 1): Promise<TMDBSearchResponse> {
		if (!this.apiKey) {
			throw new Error('TMDB API Key missing. Please provide your API key first.');
		}

		const url = this.buildUrl('/search/multi', {
			query,
			page: page.toString(),
			include_adult: 'false',
			language: 'en-US'
		});

		const res = await fetch(url, { headers: this.getHeaders() });
		if (!res.ok) {
			const error = await res.json().catch(() => ({}));
			throw new Error(error.status_message || `Search failed with status ${res.status}`);
		}

		return res.json();
	}

	async getDetails(type: 'movie' | 'tv', id: string | number): Promise<UnifiedMediaDetail> {
		if (!this.apiKey) {
			throw new Error('TMDB API Key missing. Please provide your API key first.');
		}

		const url = this.buildUrl(`/${type}/${id}`, { language: 'en-US' });
		const res = await fetch(url, { headers: this.getHeaders() });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.status_message || `Failed to load details`);
		}

		const data = await res.json();

		// Calculate average episode runtime for TV
		const tvRuntime =
			Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0
				? Math.round(
						data.episode_run_time.reduce((acc: number, val: number) => acc + val, 0) /
							data.episode_run_time.length
					)
				: data.last_episode_to_air?.runtime || undefined;

		const duration =
			type === 'movie'
				? data.runtime
					? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`.replace(/^0h /, '')
					: undefined
				: tvRuntime
					? `${tvRuntime}m`
					: undefined;

		return {
			id: data.id,
			type,
			title: type === 'movie' ? data.title : data.name,
			poster_path: data.poster_path,
			backdrop_path: data.backdrop_path,
			duration
		};
	}
}

export const tmdb = new TMDBStore();

export function getTMDBImageUrl(
	path: string | null | undefined,
	size: 'w185' | 'w342' | 'w500' | 'original' = 'w500'
): string | null {
	if (!path) return null;
	return `https://image.tmdb.org/t/p/${size}${path}`;
}