<!-- src/routes/list/[id]/+page.svelte -->
<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import {
        getListById,
        saveList,
        deleteList,
        toggleItemInList,
        type CustomList,
    } from "$lib/db/mediaStore";
    import {
        tmdb,
        getTMDBImageUrl,
        type TMDBMediaItem,
    } from "$lib/tmdb.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import * as Dialog from "$lib/components/ui/dialog";
    import {
        ArrowLeft,
        Plus,
        Trash2,
        Search,
        Film,
        Tv,
        Check,
        X,
    } from "lucide-svelte";

    const listId = page.params.id;

    let list = $state<CustomList | null>(null);
    let isLoading = $state(true);

    // Add items modal search state
    let isAddModalOpen = $state(false);
    let searchQuery = $state("");
    let searchResults = $state<TMDBMediaItem[]>([]);
    let isSearching = $state(false);
    let debounceTimeout: ReturnType<typeof setTimeout>;

    async function load() {
        isLoading = true;
        list = await getListById(listId);
        isLoading = false;
    }

    $effect(() => {
        load();
    });

    // Debounced TMDB search inside the modal
    $effect(() => {
        const q = searchQuery.trim();
        clearTimeout(debounceTimeout);

        if (!q) {
            searchResults = [];
            isSearching = false;
            return;
        }

        debounceTimeout = setTimeout(async () => {
            if (!tmdb.hasKey) return;
            isSearching = true;
            try {
                const res = await tmdb.searchMulti(q);
                searchResults = (res.results || []).filter(
                    (i) => i.media_type === "movie" || i.media_type === "tv",
                );
            } catch {
                searchResults = [];
            } finally {
                isSearching = false;
            }
        }, 300);

        return () => clearTimeout(debounceTimeout);
    });

    async function handleToggle(item: TMDBMediaItem) {
        if (item.media_type !== "movie" && item.media_type !== "tv") return;

        await toggleItemInList(listId, {
            key: `${item.media_type}_${item.id}`,
            mediaId: item.id,
            type: item.media_type,
            title: item.media_type === "movie" ? item.title : item.name,
            poster_path: item.poster_path,
        });

        await load();
    }

    async function removeItem(mediaKey: string) {
        if (!list) return;
        list.items = list.items.filter((i) => i.key !== mediaKey);
        list.updated_at = new Date().toISOString();
        await saveList(list);
        await load();
    }

    async function handleDeleteList() {
        if (!confirm("Are you sure you want to delete this list?")) return;
        await deleteList(listId);
        goto("/list");
    }
</script>

<div class="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
    <!-- Navigation back & actions -->
    <div class="flex items-center justify-between gap-4">
        <Button
            href="/list"
            variant="ghost"
            size="sm"
            class="gap-1.5 cursor-pointer -ml-2"
        >
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Lists</span>
        </Button>

        <div class="flex items-center gap-2">
            <Button
                onclick={() => (isAddModalOpen = true)}
                size="sm"
                class="gap-1.5 rounded-full cursor-pointer"
            >
                <Plus class="h-4 w-4" />
                <span>Add Items</span>
            </Button>

            <Button
                onclick={handleDeleteList}
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground hover:text-red-400"
            >
                <Trash2 class="h-4 w-4" />
            </Button>
        </div>
    </div>

    <!-- Header Information -->
    {#if list}
        <div class="space-y-1.5 border-b border-border/40 pb-5">
            <div class="flex flex-wrap items-center gap-2.5">
                <h1
                    class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                >
                    {list.title}
                </h1>
                <span
                    class="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                >
                    {list.items.length}
                    {list.items.length === 1 ? "item" : "items"}
                </span>
            </div>

            {#if list.description}
                <p
                    class="text-sm text-muted-foreground max-w-2xl leading-relaxed"
                >
                    {list.description}
                </p>
            {/if}
        </div>

        <!-- List Items Grid -->
        {#if list.items.length === 0}
            <div
                class="flex flex-col items-center justify-center py-24 text-center"
            >
                <Film class="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h2 class="text-base font-semibold">This list is empty</h2>
                <p class="text-xs text-muted-foreground mt-1 max-w-xs mb-4">
                    Search and add movies or TV shows to get started.
                </p>
                <Button
                    onclick={() => (isAddModalOpen = true)}
                    variant="outline"
                    size="sm"
                    class="gap-1.5 cursor-pointer"
                >
                    <Plus class="h-4 w-4" />
                    <span>Add your first title</span>
                </Button>
            </div>
        {:else}
            <div
                class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
                {#each list.items as item (item.key)}
                    {@const poster = getTMDBImageUrl(item.poster_path, "w342")}

                    <div
                        class="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card select-none"
                    >
                        <a
                            href="/{item.type}/{item.mediaId}"
                            class="relative aspect-[2/3] w-full bg-muted overflow-hidden"
                        >
                            {#if poster}
                                <img
                                    src={poster}
                                    alt={item.title}
                                    loading="lazy"
                                    class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            {:else}
                                <div
                                    class="flex h-full w-full items-center justify-center text-muted-foreground/40"
                                >
                                    {#if item.type === "movie"}
                                        <Film class="h-8 w-8" />
                                    {:else}
                                        <Tv class="h-8 w-8" />
                                    {/if}
                                </div>
                            {/if}
                        </a>

                        <!-- Remove overlay button -->
                        <button
                            type="button"
                            onclick={() => removeItem(item.key)}
                            class="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-muted-foreground backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all cursor-pointer shadow-xs"
                            title="Remove from list"
                            aria-label="Remove from list"
                        >
                            <X class="h-3.5 w-3.5" />
                        </button>

                        <div class="p-2 sm:p-2.5">
                            <a href="/{item.type}/{item.mediaId}">
                                <h2
                                    class="text-xs sm:text-sm font-semibold tracking-tight text-foreground line-clamp-1 hover:text-primary transition-colors"
                                >
                                    {item.title}
                                </h2>
                            </a>
                            <span
                                class="text-[10px] uppercase font-semibold text-muted-foreground/70"
                            >
                                {item.type}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {:else if !isLoading}
        <div class="py-20 text-center">
            <p class="text-sm text-destructive">List not found.</p>
        </div>
    {/if}
</div>

<!-- SEARCH & ADD MEDIA MODAL -->
<Dialog.Root bind:open={isAddModalOpen}>
    <Dialog.Content
        class="sm:max-w-lg max-h-[85vh] flex flex-col p-4 sm:p-6 gap-3"
    >
        <Dialog.Header>
            <Dialog.Title>Add titles to list</Dialog.Title>
            <Dialog.Description class="sr-only"
                >Search TMDB to add items</Dialog.Description
            >
        </Dialog.Header>

        <!-- Search Input -->
        <div class="relative w-full">
            <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            />
            <Input
                bind:value={searchQuery}
                placeholder="Search movies or TV shows..."
                class="pl-9"
                autocomplete="off"
            />
        </div>

        <!-- Search Results Scroll Box -->
        <div
            class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px] max-h-[50vh]"
        >
            {#if isSearching}
                <div
                    class="flex items-center justify-center py-12 text-xs text-muted-foreground"
                >
                    Searching TMDB...
                </div>
            {:else if searchResults.length > 0}
                {#each searchResults as result}
                    {@const resultTitle =
                        result.media_type === "movie"
                            ? result.title
                            : result.name}
                    {@const resultYear = (
                        result.media_type === "movie"
                            ? result.release_date
                            : result.first_air_date
                    )?.slice(0, 4)}
                    {@const inList = Boolean(
                        list?.items.some(
                            (i) =>
                                i.key === `${result.media_type}_${result.id}`,
                        ),
                    )}
                    {@const poster = getTMDBImageUrl(
                        result.poster_path,
                        "w185",
                    )}

                    <div
                        class="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <div
                                class="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted"
                            >
                                {#if poster}
                                    <img
                                        src={poster}
                                        alt=""
                                        class="h-full w-full object-cover"
                                    />
                                {/if}
                            </div>
                            <div class="min-w-0">
                                <h3
                                    class="text-xs sm:text-sm font-semibold truncate text-foreground"
                                >
                                    {resultTitle}
                                </h3>
                                <div
                                    class="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5"
                                >
                                    <span class="uppercase text-[9px] font-bold"
                                        >{result.media_type}</span
                                    >
                                    {#if resultYear}
                                        <span>• {resultYear}</span>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            variant={inList ? "secondary" : "default"}
                            onclick={() => handleToggle(result)}
                            class="shrink-0 gap-1 rounded-full text-xs cursor-pointer"
                        >
                            {#if inList}
                                <Check class="h-3.5 w-3.5 text-primary" />
                                <span>Added</span>
                            {:else}
                                <Plus class="h-3.5 w-3.5" />
                                <span>Add</span>
                            {/if}
                        </Button>
                    </div>
                {/each}
            {:else if searchQuery.trim()}
                <div
                    class="flex items-center justify-center py-12 text-xs text-muted-foreground"
                >
                    No matching movies or TV shows found.
                </div>
            {:else}
                <div
                    class="flex items-center justify-center py-12 text-xs text-muted-foreground/60"
                >
                    Type a title above to search TMDB
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>
