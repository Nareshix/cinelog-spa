<!-- src/routes/movie/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import MediaDetailView from '$lib/components/MediaDetailView.svelte';
</script>

<MediaDetailView type="movie" id={page.params.id} />