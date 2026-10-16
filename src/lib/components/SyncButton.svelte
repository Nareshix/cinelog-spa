<!-- src/lib/components/SyncButton.svelte -->
<script lang="ts">
	import { syncEngine } from '$lib/sync/syncEngine.svelte';
	import { RefreshCw, Check, AlertCircle } from 'lucide-svelte';

	let justCompleted = $state(false);
	// Reactive clock that ticks every 15 seconds
	let now = $state(Date.now());

	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 15000); // recalculates every 15s

		return () => clearInterval(interval);
	});

	async function handleManualSync() {
		const success = await syncEngine.sync();
		if (success) {
			justCompleted = true;
			setTimeout(() => {
				justCompleted = false;
			}, 2000);
		}
	}

	function getRelativeTime(iso: string | null, currentTime: number) {
		if (!iso) return 'Never';
		const diffSec = Math.floor((currentTime - new Date(iso).getTime()) / 1000);
		if (diffSec < 15) return 'Just now';
		if (diffSec < 60) return `${diffSec}s ago`;
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${Math.floor(diffHours / 24)}d ago`;
	}

	// Now recomputes as real-world time passes!
	const relativeTime = $derived(getRelativeTime(syncEngine.lastSyncTime, now));
</script>

<button
	type="button"
	onclick={handleManualSync}
	disabled={syncEngine.isSyncing}
	class="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 disabled:pointer-events-none select-none"
	title={syncEngine.error ? `Error: ${syncEngine.error}` : syncEngine.lastSyncTime ? `Last synced: ${new Date(syncEngine.lastSyncTime).toLocaleTimeString()}` : 'Sync with cloud'}
>
	{#if syncEngine.isSyncing}
		<RefreshCw class="h-3.5 w-3.5 animate-spin text-primary" />
		<span class="text-[11px] font-semibold text-primary">Syncing...</span>
	{:else if justCompleted}
		<Check class="h-3.5 w-3.5 text-emerald-500" />
		<span class="text-[11px] text-emerald-500 font-semibold">Synced</span>
	{:else if syncEngine.error}
		<AlertCircle class="h-3.5 w-3.5 text-destructive" />
		<span class="text-[11px] text-destructive">Retry Sync</span>
	{:else}
		<RefreshCw class="h-3.5 w-3.5" />
		<span class="text-[11px] font-normal opacity-80 hidden sm:inline">{relativeTime}</span>
	{/if}
</button>