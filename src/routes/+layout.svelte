<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import Navigation from '$lib/components/Navigation.svelte';
  import ApiKeyModal from '$lib/components/ApiKeyModal.svelte';
  import { flushPendingSync } from '$lib/sync/syncEngine';
  import './layout.css';

  let { children } = $props();

  $effect(() => {
    // Flush on boot
    flushPendingSync();

    // Flush when device reconnects to Wi-Fi/cellular
    window.addEventListener('online', flushPendingSync);

    // Flush when user switches back to the app on iOS / Android
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        flushPendingSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('online', flushPendingSync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
</script>

<div class="relative flex min-h-screen flex-col">
  <Navigation />

  <main class="flex-1 pb-24 md:pb-8">
    {@render children()}
  </main>

  <ApiKeyModal />
</div>