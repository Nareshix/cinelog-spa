<!-- src/lib/components/SettingsModal.svelte -->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { tmdb } from '$lib/tmdb.svelte';
	import { syncEngine } from '$lib/sync/syncEngine.svelte';
	import { Key, Cloud, Loader2, ExternalLink, Check, Lock } from 'lucide-svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	// Guard: Both TMDB and Backend are mandatory
	const isFullyConfigured = $derived(tmdb.hasKey && syncEngine.isConfigured);

	// Tabs
	let activeTab = $state<'tmdb' | 'sync'>('tmdb');

	// TMDB Tab State
	let inputTmdbKey = $state(tmdb.apiKey);
	let isValidatingTmdb = $state(false);
	let tmdbError = $state<string | null>(null);

	// Cloud Sync Tab State
	let inputSyncUrl = $state(syncEngine.endpointUrl);
	let inputSyncSecret = $state(syncEngine.secretToken);
	let isTestingSync = $state(false);
	let syncError = $state<string | null>(null);

	$effect(() => {
		if (open) {
			inputTmdbKey = tmdb.apiKey;
			inputSyncUrl = syncEngine.endpointUrl;
			inputSyncSecret = syncEngine.secretToken;
			tmdbError = null;
			syncError = null;

			// If TMDB is already set, jump straight to Sync tab
			if (tmdb.hasKey && !syncEngine.isConfigured) {
				activeTab = 'sync';
			} else {
				activeTab = 'tmdb';
			}
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

		// Auto advance to sync tab if backend isn't set yet
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

		// Test connection with user's Cloudflare Worker
		const res = await syncEngine.testConnection(trimmedUrl, trimmedSecret);
		isTestingSync = false;

		if (!res.ok) {
			syncError = `Failed to connect: ${res.error || 'Check URL & Secret'}`;
			return;
		}

		// Save and run first sync
		syncEngine.saveConfig(trimmedUrl, trimmedSecret);
		await syncEngine.sync();

		// If everything is satisfied, unlock the app!
		if (tmdb.hasKey) {
			open = false;
		} else {
			activeTab = 'tmdb';
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(nextOpen) => {
		// Prevent closing if not fully configured
		if (!nextOpen && !isFullyConfigured) return;
		open = nextOpen;
	}}
>
	<Dialog.Content class="sm:max-w-md" showCloseButton={isFullyConfigured}>
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
				{#if !isFullyConfigured}
					Both TMDB API and your Cloudflare Sync Backend are compulsory to use this app.
				{:else}
					Manage your client-side credentials.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root bind:value={activeTab} class="w-full pt-1">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="tmdb" class="gap-1.5 text-xs">
					<Key class="h-3.5 w-3.5" />
					<span>1. TMDB Key</span>
					{#if tmdb.hasKey}
						<Check class="h-3 w-3 text-emerald-500 ml-1" />
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger value="sync" class="gap-1.5 text-xs">
					<Cloud class="h-3.5 w-3.5" />
					<span>2. Cloud Sync</span>
					{#if syncEngine.isConfigured}
						<Check class="h-3 w-3 text-emerald-500 ml-1" />
					{/if}
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
					<Label for="sync-url" class="text-xs">Your Cloudflare Worker Sync URL</Label>
					<Input
						id="sync-url"
						placeholder="https://myapp-sync-backend.yourname.workers.dev/sync"
						bind:value={inputSyncUrl}
						autocomplete="off"
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="sync-secret" class="text-xs">Your SYNC_SECRET Password</Label>
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
						Testing Cloudflare Connection...
					{:else}
						Connect & Unlock App
					{/if}
				</Button>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>