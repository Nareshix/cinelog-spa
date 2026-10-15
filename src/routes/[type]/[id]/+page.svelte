<script lang="ts">
    import { page } from "$app/state";
    import MediaDetailView from "$lib/components/MediaDetailView.svelte";

    const type = page.params.type as "movie" | "tv";
    const id = page.params.id;
</script>

<MediaDetailView {type} {id} />
