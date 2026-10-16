<!-- src/lib/components/AddToListModal.svelte -->
<script lang="ts">
    import {
        getAllLists,
        saveList,
        toggleItemInList,
        type CustomList,
    } from "$lib/db/mediaStore";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Check, Plus, ListPlus } from "lucide-svelte";

    let {
        open = $bindable(false),
        media,
    }: {
        open: boolean;
        media: {
            id: number | string;
            type: "movie" | "tv";
            title: string;
            poster_path: string | null;
        };
    } = $props();

    let lists = $state<CustomList[]>([]);
    let isCreating = $state(false);
    let newTitle = $state("");

    const mediaKey = $derived(`${media.type}_${media.id}`);

    async function refresh() {
        lists = await getAllLists();
    }

    $effect(() => {
        if (open) {
            refresh();
            isCreating = false;
            newTitle = "";
        }
    });

    async function handleToggle(listId: string) {
        await toggleItemInList(listId, {
            key: mediaKey,
            mediaId: media.id,
            type: media.type,
            title: media.title,
            poster_path: media.poster_path,
        });
        await refresh();
    }

    async function handleCreateQuick() {
        const trimmed = newTitle.trim();
        if (!trimmed) return;

        const newList: CustomList = {
            id: crypto.randomUUID(),
            title: trimmed,
            items: [
                {
                    key: mediaKey,
                    mediaId: media.id,
                    type: media.type,
                    title: media.title,
                    poster_path: media.poster_path,
                    added_at: new Date().toISOString(),
                },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await saveList(newList);
        newTitle = "";
        isCreating = false;
        await refresh();
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <ListPlus class="h-4 w-4 text-primary" />
                Add to List
            </Dialog.Title>
            <Dialog.Description class="line-clamp-1">
                Choose lists for "{media.title}"
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-2 max-h-60 overflow-y-auto py-1 pr-1">
            {#if lists.length === 0 && !isCreating}
                <p class="text-xs text-muted-foreground text-center py-4">
                    No lists created yet.
                </p>
            {:else}
                {#each lists as list}
                    {@const isIncluded = list.items.some(
                        (i) => i.key === mediaKey,
                    )}
                    <button
                        type="button"
                        onclick={() => handleToggle(list.id)}
                        class="flex w-full items-center justify-between rounded-lg border border-border/40 p-2.5 text-xs font-medium hover:bg-muted/50 transition-colors cursor-pointer text-left {isIncluded
                            ? 'bg-primary/10 border-primary/40'
                            : ''}"
                    >
                        <span class="truncate">{list.title}</span>
                        {#if isIncluded}
                            <Check class="h-4 w-4 text-primary shrink-0" />
                        {/if}
                    </button>
                {/each}
            {/if}
        </div>

        <!-- Quick create row -->
        <div class="pt-2 border-t border-border/40">
            {#if isCreating}
                <form
                    onsubmit={(e) => {
                        e.preventDefault();
                        handleCreateQuick();
                    }}
                    class="flex gap-2"
                >
                    <Input
                        bind:value={newTitle}
                        placeholder="New list name..."
                        class="h-8 text-xs"
                        autofocus
                    />
                    <Button
                        type="submit"
                        size="xs"
                        disabled={!newTitle.trim()}
                        class="cursor-pointer"
                    >
                        Create
                    </Button>
                </form>
            {:else}
                <button
                    type="button"
                    onclick={() => (isCreating = true)}
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    <Plus class="h-3.5 w-3.5" />
                    <span>Create new list</span>
                </button>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>
