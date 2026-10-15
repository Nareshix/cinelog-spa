// src/lib/db/mediaStore.ts

export interface TrackedMedia {
	key: string; // e.g. "tv_94605" or "movie_550"
	mediaId: string | number;
	type: 'movie' | 'tv';
	title: string;
	poster_path: string | null;
	duration?: string;
	status: 'watching' | 'watched' | 'watchlist' | 'none';
	liked: boolean;
	rating: number; // 0 to 5 in 0.5 steps
	notes?: string;
	notes_updated_at?: string;
	updated_at: string;
	sync_status?: 'synced' | 'pending';
}

const DB_NAME = 'app_media_db';
const DB_VERSION = 2;
const STORE_NAME = 'tracked_media';

function getDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof window === 'undefined') return;
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = request.result;
			let store: IDBObjectStore;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			} else {
				store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
			}

			if (!store.indexNames.contains('sync_status')) {
				store.createIndex('sync_status', 'sync_status', { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function getTrackedMedia(type: string, id: string | number): Promise<TrackedMedia | null> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(`${type}_${id}`);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

export async function getAllTrackedMedia(): Promise<TrackedMedia[]> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => resolve([]);
		});
	} catch {
		return [];
	}
}

export async function getPendingSyncMedia(): Promise<TrackedMedia[]> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);

			if (store.indexNames.contains('sync_status')) {
				const index = store.index('sync_status');
				const request = index.getAll('pending');
				request.onsuccess = () => resolve(request.result || []);
				request.onerror = () => resolve([]);
			} else {
				// Safe fallback: scan records if index was not yet created
				const request = store.getAll();
				request.onsuccess = () => {
					const all = (request.result || []) as TrackedMedia[];
					resolve(all.filter((item) => item.sync_status === 'pending'));
				};
				request.onerror = () => resolve([]);
			}
		});
	} catch {
		return [];
	}
}

export async function saveTrackedMedia(media: TrackedMedia): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(media);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.error('Failed to save to IndexedDB', e);
	}
}

export async function deleteTrackedMedia(type: string, id: string | number): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.delete(`${type}_${id}`);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.error('Failed to delete from IndexedDB', e);
	}
}