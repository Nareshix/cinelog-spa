<script lang="ts">
  import Navigation from '$lib/components/Navigation.svelte';
  import ApiKeyModal from '$lib/components/ApiKeyModal.svelte';
  import './layout.css';

  let { children } = $props();
</script>

<div class="relative flex min-h-screen flex-col">
  <Navigation />

  <main class="flex-1 pb-24 md:pb-8">
    {@render children()}
  </main>

  <ApiKeyModal />
</div>