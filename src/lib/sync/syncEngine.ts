// src/lib/sync/syncEngine.ts
import { getPendingSyncMedia, saveTrackedMedia, type TrackedMedia } from '$lib/db/mediaStore';

// Change this URL to your Cloudflare Worker, Supabase Edge Function, or Google App Script endpoint
const SYNC_ENDPOINT = '/api_9482/sync';

export async function dispatchSync(item: TrackedMedia) {
	// 1. Mark as pending locally first
	item.sync_status = 'pending';
	await saveTrackedMedia(item);

	// 2. Try Keepalive Fetch (supported across iOS Safari, Android, and Desktop)
	try {
		const res = await fetch(SYNC_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify([item]),
			keepalive: true // Browser keeps this network request alive even if tab closes
		});

		if (res.ok) {
			item.sync_status = 'synced';
			await saveTrackedMedia(item);
			return;
		}
	} catch {
		// Offline or server temporarily down; keeps 'pending' in IndexedDB
	}

	// 3. If on Android/Chromium, register Background Sync with Service Worker
	if ('serviceWorker' in navigator && 'SyncManager' in window) {
		try {
			const reg = await navigator.serviceWorker.ready;
			// @ts-expect-error - SyncManager is Chromium only
			await reg.sync.register('sync-tracked-media');
		} catch {
			// Fallback silently if not allowed
		}
	}
}

// Flush all pending items (used on App Start, Online event, or iOS App Switch)
export async function flushPendingSync(): Promise<void> {
	if (typeof window === 'undefined' || !navigator.onLine) return;

	const pending = await getPendingSyncMedia();
	if (pending.length === 0) return;

	try {
		const res = await fetch(SYNC_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(pending),
			keepalive: true
		});

		if (res.ok) {
			for (const item of pending) {
				item.sync_status = 'synced';
				await saveTrackedMedia(item);
			}
		}
	} catch (e) {
		console.warn('Sync flush postponed: offline or failed', e);
	}
}