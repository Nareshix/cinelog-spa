<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import Navigation from '$lib/components/Navigation.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import { tmdb } from '$lib/tmdb.svelte';
  import { syncEngine } from '$lib/sync/syncEngine.svelte';
  import { untrack } from 'svelte';
  import './layout.css';

  let { children } = $props();
  let isSettingsOpen = $state(false);

  $effect(() => {
    // Lock screen on startup if either credential is missing
    if (!tmdb.hasKey || !syncEngine.isConfigured) {
      isSettingsOpen = true;
    }

    // 1. untrack prevents Svelte 5 from infinite-looping on $state changes
    untrack(() => {
      syncEngine.sync();
    });

    // 2. Re-sync when coming back online
    const onOnline = () => {
      untrack(() => syncEngine.sync());
    };
    window.addEventListener('online', onOnline);

    // 3. Re-sync when switching tabs / returning to app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        untrack(() => syncEngine.sync());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
</script>

<div class="relative flex min-h-screen flex-col">
  <Navigation />

  <main class="flex-1 pb-24 md:pb-8">
    {@render children()}
  </main>

  <!-- Compulsory Setup Modal -->
  <SettingsModal bind:open={isSettingsOpen} />
</div>