<script lang="ts">
  import Navigation from '$lib/components/Navigation.svelte';
  import './layout.css';
  import { onMount } from 'svelte';

  onMount(() => {
    const splash = document.getElementById('splash-overlay');
    if (!splash) return;

    // Check if running as an installed PWA on iOS / Mobile
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && navigator.standalone);

    if (isStandalone) {
      // On iOS Home Screen: do the smooth fade
      splash.classList.add('fade-out');
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    } else {
      // On regular web browser: destroy it instantly, zero delay
      splash.remove();
    }
});

  let { children } = $props();
</script>

<div class="relative flex min-h-screen flex-col">
  <Navigation />

  <main class="flex-1 pb-24 md:pb-8">
    {@render children()}
  </main>
</div>