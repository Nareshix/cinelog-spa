// src/lib/db/mediaStore.ts

export interface TrackedMedia {
	key: string;
	mediaId: string | number;
	type: 'movie' | 'tv';
	title: string;
	poster_path: string | null;
	duration?: string;
	status: 'watching' | 'watched' | 'watchlist' | 'none';
	liked: boolean;
	rating: number;
	notes?: string;
	notes_updated_at?: string;
	updated_at: string;
	sync_status?: 'synced' | 'pending';
	deleted?: boolean;
}

export interface CustomListItem {
	key: string;
	mediaId: string | number;
	type: 'movie' | 'tv';
	title: string;
	poster_path: string | null;
	added_at: string;
}

export interface CustomList {
	id: string;
	title: string;
	description?: string;
	items: CustomListItem[];
	created_at: string;
	updated_at: string;
	sync_status?: 'synced' | 'pending';
	deleted?: boolean;
}

const DB_NAME = 'app_media_db';
const DB_VERSION = 3;
const STORE_NAME = 'tracked_media';
const LISTS_STORE = 'custom_lists';

// Auto-sync change listener
let onDataChangedCallback: (() => void) | null = null;

export function registerSyncCallback(fn: () => void) {
	onDataChangedCallback = fn;
}

function notifyChange() {
	if (onDataChangedCallback) {
		onDataChangedCallback();
	}
}

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

			let listStore: IDBObjectStore;
			if (!db.objectStoreNames.contains(LISTS_STORE)) {
				listStore = db.createObjectStore(LISTS_STORE, { keyPath: 'id' });
			} else {
				listStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(LISTS_STORE);
			}

			if (!listStore.indexNames.contains('sync_status')) {
				listStore.createIndex('sync_status', 'sync_status', { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

// ----------------- TRACKED MEDIA -----------------

export async function getTrackedMedia(type: string, id: string | number): Promise<TrackedMedia | null> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(`${type}_${id}`);
			request.onsuccess = () => {
				const item = request.result as TrackedMedia | undefined;
				resolve(item && !item.deleted ? item : null);
			};
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
			request.onsuccess = () => {
				const all = (request.result || []) as TrackedMedia[];
				resolve(all.filter((i) => !i.deleted));
			};
			request.onerror = () => resolve([]);
		});
	} catch {
		return [];
	}
}

export async function saveTrackedMedia(
	media: TrackedMedia,
	syncStatus: 'pending' | 'synced' = 'pending'
): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			media.sync_status = syncStatus;
			media.deleted = false; // Guarantees tombstone is cleared if re-added
			const request = store.put(media);
			request.onsuccess = () => {
				if (syncStatus === 'pending') notifyChange();
				resolve();
			};
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.error('Failed to save to IndexedDB', e);
	}
}

// Soft delete: writes a tombstone so remote devices know to delete it
export async function deleteTrackedMedia(type: string, id: string | number): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const key = `${type}_${id}`;
			const getReq = store.get(key);

			getReq.onsuccess = () => {
				const existing = getReq.result as TrackedMedia | undefined;
				const tombstone: TrackedMedia = {
					...(existing || {
						key,
						mediaId: id,
						type: type as 'movie' | 'tv',
						title: '',
						poster_path: null,
						status: 'none',
						liked: false,
						rating: 0
					}),
					deleted: true,
					sync_status: 'pending',
					updated_at: new Date().toISOString()
				};
				const putReq = store.put(tombstone);
				putReq.onsuccess = () => {
					notifyChange();
					resolve();
				};
				putReq.onerror = () => resolve();
			};
			getReq.onerror = () => resolve();
		});
	} catch (e) {
		console.error('Failed to tombstone TrackedMedia', e);
	}
}

// ----------------- CUSTOM LISTS -----------------

export async function getAllLists(): Promise<CustomList[]> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(LISTS_STORE, 'readonly');
			const store = tx.objectStore(LISTS_STORE);
			const request = store.getAll();
			request.onsuccess = () => {
				const lists = ((request.result || []) as CustomList[]).filter((l) => !l.deleted);
				lists.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
				resolve(lists);
			};
			request.onerror = () => resolve([]);
		});
	} catch {
		return [];
	}
}

export async function getListById(id: string): Promise<CustomList | null> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(LISTS_STORE, 'readonly');
			const store = tx.objectStore(LISTS_STORE);
			const request = store.get(id);
			request.onsuccess = () => {
				const item = request.result as CustomList | undefined;
				resolve(item && !item.deleted ? item : null);
			};
			request.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

export async function saveList(
	list: CustomList,
	syncStatus: 'pending' | 'synced' = 'pending'
): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(LISTS_STORE, 'readwrite');
			const store = tx.objectStore(LISTS_STORE);
			list.sync_status = syncStatus;
			list.deleted = false; // Guarantees tombstone is cleared if re-added
			const request = store.put(list);
			request.onsuccess = () => {
				if (syncStatus === 'pending') notifyChange();
				resolve();
			};
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.error('Failed to save list to IndexedDB', e);
	}
}

// Soft delete list
export async function deleteList(id: string): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction(LISTS_STORE, 'readwrite');
			const store = tx.objectStore(LISTS_STORE);
			const getReq = store.get(id);

			getReq.onsuccess = () => {
				const existing = getReq.result as CustomList | undefined;
				if (existing) {
					existing.deleted = true;
					existing.sync_status = 'pending';
					existing.updated_at = new Date().toISOString();
					const putReq = store.put(existing);
					putReq.onsuccess = () => {
						notifyChange();
						resolve();
					};
					putReq.onerror = () => resolve();
				} else {
					resolve();
				}
			};
			getReq.onerror = () => resolve();
		});
	} catch (e) {
		console.error('Failed to delete list', e);
	}
}

export async function toggleItemInList(
	listId: string,
	item: Omit<CustomListItem, 'added_at'>
): Promise<boolean> {
	const list = await getListById(listId);
	if (!list) return false;

	const exists = list.items.some((i) => i.key === item.key);
	if (exists) {
		list.items = list.items.filter((i) => i.key !== item.key);
	} else {
		list.items.unshift({
			...item,
			added_at: new Date().toISOString()
		});
	}
	list.updated_at = new Date().toISOString();
	await saveList(list);
	return !exists;
}

// ----------------- SYNC REPLICATION INTERNALS -----------------

export async function getPendingSyncData(): Promise<{ media: TrackedMedia[]; lists: CustomList[] }> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction([STORE_NAME, LISTS_STORE], 'readonly');
			const mediaReq = tx.objectStore(STORE_NAME).getAll();
			const listsReq = tx.objectStore(LISTS_STORE).getAll();

			tx.oncomplete = () => {
				const allMedia = (mediaReq.result || []) as TrackedMedia[];
				const allLists = (listsReq.result || []) as CustomList[];
				resolve({
					media: allMedia.filter((m) => m.sync_status === 'pending'),
					lists: allLists.filter((l) => l.sync_status === 'pending')
				});
			};
			tx.onerror = () => resolve({ media: [], lists: [] });
		});
	} catch {
		return { media: [], lists: [] };
	}
}

export async function applyRemoteSync(remoteMedia: TrackedMedia[], remoteLists: CustomList[]): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([STORE_NAME, LISTS_STORE], 'readwrite');
			const mediaStore = tx.objectStore(STORE_NAME);
			const listStore = tx.objectStore(LISTS_STORE);

			for (const item of remoteMedia) {
				if (item.deleted) {
					mediaStore.delete(item.key);
				} else {
					item.sync_status = 'synced';
					mediaStore.put(item);
				}
			}

			for (const list of remoteLists) {
				if (list.deleted) {
					listStore.delete(list.id);
				} else {
					list.sync_status = 'synced';
					listStore.put(list);
				}
			}

			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch (e) {
		console.error('Failed to apply remote sync', e);
	}
}

export async function markLocalDataSynced(pushedMedia: TrackedMedia[], pushedLists: CustomList[]): Promise<void> {
	try {
		const db = await getDB();
		return new Promise((resolve) => {
			const tx = db.transaction([STORE_NAME, LISTS_STORE], 'readwrite');
			const mediaStore = tx.objectStore(STORE_NAME);
			const listStore = tx.objectStore(LISTS_STORE);

			for (const m of pushedMedia) {
				if (m.deleted) {
					mediaStore.delete(m.key);
				} else {
					m.sync_status = 'synced';
					mediaStore.put(m);
				}
			}

			for (const l of pushedLists) {
				if (l.deleted) {
					listStore.delete(l.id);
				} else {
					l.sync_status = 'synced';
					listStore.put(l);
				}
			}

			tx.oncomplete = () => resolve();
			tx.onerror = () => resolve();
		});
	} catch (e) {
		console.error('Failed marking items synced', e);
	}
}