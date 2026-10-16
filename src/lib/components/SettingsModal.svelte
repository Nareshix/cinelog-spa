<!-- src/lib/components/SettingsModal.svelte -->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { tmdb } from '$lib/tmdb.svelte';
	import { syncEngine } from '$lib/sync/syncEngine.svelte';
	import { getAllTrackedMedia, getAllLists } from '$lib/db/mediaStore';
	import {
		Key,
		Cloud,
		HardDrive,
		Download,
		Trash2,
		Loader2,
		ExternalLink,
		Check,
		Lock,
		RefreshCw
	} from 'lucide-svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	// Guard: Both TMDB and Backend are configured
	const isFullyConfigured = $derived(tmdb.hasKey && syncEngine.isConfigured);

	// Tabs: tmdb | sync | storage
	let activeTab = $state<'tmdb' | 'sync' | 'storage'>('tmdb');

	// TMDB Tab State
	let inputTmdbKey = $state(tmdb.apiKey);
	let isValidatingTmdb = $state(false);
	let tmdbError = $state<string | null>(null);

	// Cloud Sync Tab State
	let inputSyncUrl = $state(syncEngine.endpointUrl);
	let inputSyncSecret = $state(syncEngine.secretToken);
	let isTestingSync = $state(false);
	let syncError = $state<string | null>(null);

	// Storage & Data State
	let storageUsed = $state('Calculating...');
	let mediaCount = $state(0);
	let listsCount = $state(0);
	let isExporting = $state(false);
	let exportSuccess = $state(false);

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function getRelativeTime(iso: string | null) {
		if (!iso) return 'Never';
		const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (diffSec < 15) return 'Just now';
		if (diffSec < 60) return `${diffSec}s ago`;
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${Math.floor(diffHours / 24)}d ago`;
	}

	async function loadStorageStats() {
		try {
			if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
				const estimate = await navigator.storage.estimate();
				storageUsed = formatBytes(estimate.usage || 0);
			}

			const [media, lists] = await Promise.all([
				getAllTrackedMedia(),
				getAllLists()
			]);
			mediaCount = media.length;
			listsCount = lists.length;
		} catch (e) {
			console.error('Could not load storage stats:', e);
		}
	}

	$effect(() => {
		if (open) {
			inputTmdbKey = tmdb.apiKey;
			inputSyncUrl = syncEngine.endpointUrl;
			inputSyncSecret = syncEngine.secretToken;
			tmdbError = null;
			syncError = null;

			if (!tmdb.hasKey) {
				activeTab = 'tmdb';
			} else if (!syncEngine.isConfigured) {
				activeTab = 'sync';
			}

			loadStorageStats();
		}
	});

	async function handleSaveTmdb() {
		const trimmed = inputTmdbKey.trim();
		if (!trimmed) {
			tmdbError = 'Please enter a TMDB key.';
			return;
		}

		isValidatingTmdb = true;
		tmdbError = null;

		const valid = await tmdb.validateKey(trimmed);
		isValidatingTmdb = false;

		if (!valid) {
			tmdbError = 'Invalid TMDB API Key. Please verify.';
			return;
		}

		tmdb.setApiKey(trimmed);

		if (!syncEngine.isConfigured) {
			activeTab = 'sync';
		} else if (isFullyConfigured) {
			open = false;
		}
	}

	async function handleSaveSync() {
		const trimmedUrl = inputSyncUrl.trim();
		const trimmedSecret = inputSyncSecret.trim();

		if (!trimmedUrl) {
			syncError = 'Sync Endpoint URL is compulsory.';
			return;
		}
		if (!trimmedSecret) {
			syncError = 'Secret Token is compulsory.';
			return;
		}

		isTestingSync = true;
		syncError = null;

		const res = await syncEngine.testConnection(trimmedUrl, trimmedSecret);
		isTestingSync = false;

		if (!res.ok) {
			syncError = `Failed to connect: ${res.error || 'Check URL & Secret'}`;
			return;
		}

		syncEngine.saveConfig(trimmedUrl, trimmedSecret);
		await syncEngine.sync();

		if (tmdb.hasKey) {
			open = false;
		} else {
			activeTab = 'tmdb';
		}
	}

	async function handleExport() {
		isExporting = true;
		try {
			const [media, lists] = await Promise.all([
				getAllTrackedMedia(),
				getAllLists()
			]);

			const backup = {
				app: 'CineLog',
				version: 1,
				exported_at: new Date().toISOString(),
				tracked_media: media,
				custom_lists: lists
			};

			const blob = new Blob([JSON.stringify(backup, null, 2)], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `cinelog-backup-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);

			exportSuccess = true;
			setTimeout(() => (exportSuccess = false), 2500);
		} catch (err) {
			console.error('Export failed:', err);
		} finally {
			isExporting = false;
		}
	}

	async function handleWipeData() {
		const confirmed = confirm(
			'Are you sure you want to wipe local data? This deletes your local IndexedDB cache and resets your credentials.'
		);
		if (!confirmed) return;

		localStorage.clear();
		const dbs = (await window.indexedDB.databases?.()) || [];
		for (const db of dbs) {
			if (db.name) window.indexedDB.deleteDatabase(db.name);
		}
		window.location.reload();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md" showCloseButton={true}>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if !isFullyConfigured}
					<Lock class="h-4 w-4 text-primary" />
					<span>Setup Required</span>
				{:else}
					<span>Settings</span>
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				Manage your credentials, sync status, and storage.
			</Dialog.Description>
		</Dialog.Header>

		<!-- QUICK SYNC CARD (Live status + Sync Now button) -->
		{#if syncEngine.isConfigured}
			<div class="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs">
				<div class="flex items-center gap-2 min-w-0">
					<span class="relative flex h-2 w-2 shrink-0">
						{#if syncEngine.isSyncing}
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
						{:else if syncEngine.error}
							<span class="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
						{:else}
							<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
						{/if}
					</span>
					<div class="truncate">
						<span class="font-medium text-foreground">
							{#if syncEngine.isSyncing}
								Syncing in progress...
							{:else if syncEngine.error}
								Sync error: {syncEngine.error}
							{:else}
								Cloud: {getRelativeTime(syncEngine.lastSyncTime)}
							{/if}
						</span>
					</div>
				</div>

				<Button
					variant="outline"
					size="xs"
					onclick={() => syncEngine.sync()}
					disabled={syncEngine.isSyncing}
					class="gap-1.5 h-7 cursor-pointer shrink-0 text-xs"
				>
					<RefreshCw class="h-3 w-3 {syncEngine.isSyncing ? 'animate-spin text-primary' : ''}" />
					<span>{syncEngine.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
				</Button>
			</div>
		{/if}

		<Tabs.Root bind:value={activeTab} class="w-full pt-1">
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="tmdb" class="gap-1 text-xs">
					<Key class="h-3 w-3" />
					<span>TMDB</span>
					{#if tmdb.hasKey}
						<Check class="h-3 w-3 text-emerald-500" />
					{/if}
				</Tabs.Trigger>

				<Tabs.Trigger value="sync" class="gap-1 text-xs">
					<Cloud class="h-3 w-3" />
					<span>Sync</span>
					{#if syncEngine.isConfigured}
						<Check class="h-3 w-3 text-emerald-500" />
					{/if}
				</Tabs.Trigger>

				<Tabs.Trigger value="storage" class="gap-1 text-xs">
					<HardDrive class="h-3 w-3" />
					<span>Storage</span>
				</Tabs.Trigger>
			</Tabs.List>

			<!-- TAB 1: TMDB API KEY -->
			<Tabs.Content value="tmdb" class="space-y-4 pt-3">
				<div class="space-y-1.5">
					<Label for="tmdb-key" class="text-xs">TMDB API Key or Read Access Token</Label>
					<Input
						id="tmdb-key"
						type="password"
						placeholder="Paste your TMDB key..."
						bind:value={inputTmdbKey}
						autocomplete="off"
					/>
					{#if tmdbError}
						<p class="text-xs text-destructive">{tmdbError}</p>
					{/if}
				</div>

				<div class="rounded-md border border-border/50 bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
					<span>Need a TMDB key?</span>
					<a
						href="https://www.themoviedb.org/settings/api"
						target="_blank"
						rel="noreferrer"
						class="text-primary hover:underline inline-flex items-center gap-1 font-medium"
					>
						Get key <ExternalLink class="h-3 w-3" />
					</a>
				</div>

				<Button
					onclick={handleSaveTmdb}
					disabled={isValidatingTmdb || !inputTmdbKey.trim()}
					class="w-full cursor-pointer h-9 text-xs"
				>
					{#if isValidatingTmdb}
						<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />
						Validating...
					{:else if tmdb.hasKey}
						<Check class="mr-2 h-3.5 w-3.5 text-emerald-400" />
						TMDB Saved
					{:else}
						Save TMDB Key
					{/if}
				</Button>
			</Tabs.Content>

			<!-- TAB 2: CLOUD SYNC -->
			<Tabs.Content value="sync" class="space-y-4 pt-3">
				<div class="space-y-1.5">
					<Label for="sync-url" class="text-xs">Cloudflare Worker Sync URL</Label>
					<Input
						id="sync-url"
						placeholder="https://myapp-sync-backend.yourname.workers.dev/sync"
						bind:value={inputSyncUrl}
						autocomplete="off"
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="sync-secret" class="text-xs">SYNC_SECRET Password</Label>
					<Input
						id="sync-secret"
						type="password"
						placeholder="Secret password from wrangler.toml..."
						bind:value={inputSyncSecret}
						autocomplete="off"
					/>
					{#if syncError}
						<p class="text-xs text-destructive">{syncError}</p>
					{/if}
				</div>

				<Button
					onclick={handleSaveSync}
					disabled={isTestingSync || !inputSyncUrl.trim() || !inputSyncSecret.trim()}
					class="w-full cursor-pointer h-9 text-xs"
				>
					{#if isTestingSync}
						<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />
						Testing Connection...
					{:else}
						Connect & Save
					{/if}
				</Button>
			</Tabs.Content>

			<!-- TAB 3: STORAGE & DATA -->
			<Tabs.Content value="storage" class="space-y-4 pt-3">
				<div class="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2.5">
					<div class="flex items-center justify-between text-xs">
						<span class="text-muted-foreground font-medium">Local Database Size:</span>
						<span class="font-bold text-foreground">{storageUsed}</span>
					</div>

					<div class="flex items-center justify-between text-xs pt-1 border-t border-border/40">
						<span class="text-muted-foreground">Tracked Titles:</span>
						<span class="font-semibold text-foreground">{mediaCount}</span>
					</div>

					<div class="flex items-center justify-between text-xs">
						<span class="text-muted-foreground">Custom Lists:</span>
						<span class="font-semibold text-foreground">{listsCount}</span>
					</div>
				</div>

				<div class="space-y-1.5">
					<Label class="text-xs">Backup & Portability</Label>
					<Button
						variant="outline"
						onclick={handleExport}
						disabled={isExporting}
						class="w-full justify-center gap-2 cursor-pointer h-9 text-xs"
					>
						{#if isExporting}
							<Loader2 class="h-3.5 w-3.5 animate-spin" />
							Exporting...
						{:else if exportSuccess}
							<Check class="h-3.5 w-3.5 text-emerald-500" />
							<span>Backup Downloaded!</span>
						{:else}
							<Download class="h-3.5 w-3.5" />
							<span>Export Library (.json)</span>
						{/if}
					</Button>
				</div>

				<div class="space-y-1.5 pt-2 border-t border-border/40">
					<Label class="text-xs text-destructive">Danger Zone</Label>
					<Button
						variant="destructive"
						onclick={handleWipeData}
						class="w-full justify-center gap-2 cursor-pointer h-9 text-xs"
					>
						<Trash2 class="h-3.5 w-3.5" />
						<span>Wipe Local Data & Reset</span>
					</Button>
				</div>
			</Tabs.Content>
		</Tabs.Root>

		<!-- Skip button for dev / testing -->
		<div class="pt-2 border-t border-border/30 flex justify-center">
			<button
				type="button"
				onclick={() => (open = false)}
				class="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer py-1"
			>
				Skip for now (Continue in Local Mode)
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>