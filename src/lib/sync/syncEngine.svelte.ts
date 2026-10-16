// src/lib/sync/syncEngine.svelte.ts
import {
	getPendingSyncData,
	applyRemoteSync,
	markLocalDataSynced,
	registerSyncCallback
} from '$lib/db/mediaStore';

const SYNC_URL_STORAGE = 'sync_endpoint_url';
const SYNC_TOKEN_STORAGE = 'sync_server_token';
const LAST_SYNC_STORAGE = 'last_synced_at';

class SyncEngineState {
	isSyncing = $state(false);
	lastSyncTime = $state<string | null>(null);
	error = $state<string | null>(null);
	endpointUrl = $state('');
	secretToken = $state('');

	private debounceTimer: any = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.lastSyncTime = localStorage.getItem(LAST_SYNC_STORAGE);
			this.endpointUrl = localStorage.getItem(SYNC_URL_STORAGE) || '';
			this.secretToken = localStorage.getItem(SYNC_TOKEN_STORAGE) || '';
		}
	}

	get isConfigured() {
		return Boolean(this.endpointUrl.trim() && this.secretToken.trim());
	}

	saveConfig(url: string, token: string) {
		this.endpointUrl = url.trim();
		this.secretToken = token.trim();
		if (typeof window !== 'undefined') {
			localStorage.setItem(SYNC_URL_STORAGE, this.endpointUrl);
			localStorage.setItem(SYNC_TOKEN_STORAGE, this.secretToken);
		}
	}

	// Tests whether the user's provided backend URL and secret actually respond 200 OK
	async testConnection(url: string, token: string): Promise<{ ok: boolean; error?: string }> {
		try {
			const res = await fetch(url.trim(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token.trim()}`
				},
				body: JSON.stringify({
					last_synced_at: '1970-01-01T00:00:00.000Z',
					media: [],
					lists: []
				})
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				return { ok: false, error: data.error || `HTTP ${res.status} response` };
			}

			return { ok: true };
		} catch (e: any) {
			return { ok: false, error: e?.message || 'Cannot reach endpoint' };
		}
	}

	triggerAutoSync(delayMs = 1500) {
		clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			this.sync();
		}, delayMs);
	}

	async sync(): Promise<boolean> {
		if (!this.isConfigured) return false;
		if (this.isSyncing) return false;
		if (typeof window === 'undefined' || !navigator.onLine) {
			this.error = 'Offline';
			return false;
		}

		this.isSyncing = true;
		this.error = null;

		try {
			const pending = await getPendingSyncData();
			const lastSyncedAt = localStorage.getItem(LAST_SYNC_STORAGE) || '1970-01-01T00:00:00.000Z';

			const response = await fetch(this.endpointUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.secretToken}`
				},
				body: JSON.stringify({
					last_synced_at: lastSyncedAt,
					media: pending.media,
					lists: pending.lists
				}),
				keepalive: true
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || `Sync error ${response.status}`);
			}

			const data = await response.json();

			if (data.media?.length > 0 || data.lists?.length > 0) {
				await applyRemoteSync(data.media || [], data.lists || []);
			}

			if (pending.media.length > 0 || pending.lists.length > 0) {
				await markLocalDataSynced(pending.media, pending.lists);
			}

			this.lastSyncTime = data.server_time;
			localStorage.setItem(LAST_SYNC_STORAGE, data.server_time);

			window.dispatchEvent(new CustomEvent('app:synced'));
			return true;
		} catch (err: any) {
			console.error('Sync error:', err);
			this.error = err.message || 'Sync failed';
			return false;
		} finally {
			this.isSyncing = false;
		}
	}
}

export const syncEngine = new SyncEngineState();

if (typeof window !== 'undefined') {
	registerSyncCallback(() => {
		syncEngine.triggerAutoSync(1500);
	});
}