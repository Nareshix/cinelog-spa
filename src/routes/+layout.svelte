<script lang="ts">
  import Navigation from '$lib/components/Navigation.svelte';
  import './layout.css';
  import { onMount } from 'svelte';

    onMount(() => {
    const splash = document.getElementById('splash-overlay');
    if (splash) {
      splash.classList.add('fade-out');

      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
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