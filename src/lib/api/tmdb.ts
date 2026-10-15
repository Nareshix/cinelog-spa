import type { TMDBSearchResponse, UnifiedMediaDetail } from '$lib/types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';

function getHeaders(apiKey: string) {
	if (apiKey.startsWith('ey')) {
		return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
	}
	return { 'Content-Type': 'application/json' };
}

function buildUrl(path: string, apiKey: string, params: Record<string, string> = {}) {
	const url = new URL(`${BASE_URL}${path}`);
	if (!apiKey.startsWith('ey')) {
		url.searchParams.set('api_key', apiKey);
	}
	for (const [key, val] of Object.entries(params)) {
		url.searchParams.set(key, val);
	}
	return url.toString();
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
	const key = apiKey.trim();
	if (!key) return false;
	try {
		const res = await fetch(buildUrl('/authentication', key), { headers: getHeaders(key) });
		const data = await res.json();
		return Boolean(data.success);
	} catch {
		return false;
	}
}

export async function searchMulti(apiKey: string, query: string, page = 1): Promise<TMDBSearchResponse> {
	const url = buildUrl('/search/multi', apiKey, {
		query,
		page: page.toString(),
		include_adult: 'false',
		language: 'en-US'
	});
	const res = await fetch(url, { headers: getHeaders(apiKey) });
	if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
	return res.json();
}

export async function getMediaDetails(apiKey: string, type: 'movie' | 'tv', id: string | number): Promise<UnifiedMediaDetail> {
	const url = buildUrl(`/${type}/${id}`, apiKey, { language: 'en-US' });
	const res = await fetch(url, { headers: getHeaders(apiKey) });
	if (!res.ok) throw new Error(`Failed to load details: ${res.statusText}`);
	const data = await res.json();

	return {
		id: data.id,
		type,
		title: type === 'movie' ? data.title : data.name,
		tagline: data.tagline || '',
		overview: data.overview || '',
		poster_path: data.poster_path,
		backdrop_path: data.backdrop_path,
		release_date: type === 'movie' ? data.release_date : data.first_air_date,
		genres: data.genres || [],
		vote_average: data.vote_average,
		vote_count: data.vote_count,
		status: data.status
	};
}

export function getTMDBImageUrl(
	path: string | null | undefined,
	size: 'w185' | 'w342' | 'w500' | 'original' = 'w500'
): string | null {
	if (!path) return null;
	return `https://image.tmdb.org/t/p/${size}${path}`;
}