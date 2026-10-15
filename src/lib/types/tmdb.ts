export type MediaType = 'movie' | 'tv' | 'person';

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
	tagline?: string;
	overview?: string;
	poster_path: string | null;
	backdrop_path: string | null;
	release_date?: string;
	genres: { id: number; name: string }[];
	vote_average?: number;
	vote_count?: number;
	status?: string;
}