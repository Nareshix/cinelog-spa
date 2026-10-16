<!-- src/routes/list/+page.svelte -->
<script lang="ts">
	import { getAllLists, saveList, deleteList, type CustomList } from '$lib/db/mediaStore';
	import { getTMDBImageUrl } from '$lib/tmdb.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ListPlus, Plus, Film, Trash2, Calendar } from 'lucide-svelte';

	let lists = $state<CustomList[]>([]);
	let isLoading = $state(true);

	// Create list modal
	let isCreateOpen = $state(false);
	let newTitle = $state('');
	let newDesc = $state('');

	// Delete confirmation modal
	let listToDelete = $state<CustomList | null>(null);

	async function load() {
		isLoading = true;
		lists = await getAllLists();
		isLoading = false;
	}

	$effect(() => {
		load();
	});

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		const trimmedTitle = newTitle.trim();
		if (!trimmedTitle) return;

		const newList: CustomList = {
			id: crypto.randomUUID(),
			title: trimmedTitle,
			description: newDesc.trim() || undefined,
			items: [],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		await saveList(newList);
		newTitle = '';
		newDesc = '';
		isCreateOpen = false;
		await load();
	}

	async function confirmDelete() {
		if (!listToDelete) return;
		await deleteList(listToDelete.id);
		listToDelete = null;
		await load();
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
	<!-- Top Bar -->
	<div class="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">My Lists</h1>
			<p class="text-xs text-muted-foreground mt-0.5">Custom collections, themes, and marathons</p>
		</div>

		<Button onclick={() => (isCreateOpen = true)} size="sm" class="gap-1.5 rounded-full cursor-pointer">
			<Plus class="h-4 w-4" />
			<span>New List</span>
		</Button>
	</div>

	<!-- Lists Grid -->
	{#if isLoading}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each Array(3) as _}
				<div class="h-44 rounded-xl border border-border/40 bg-muted/40 animate-pulse"></div>
			{/each}
		</div>
	{:else if lists.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<ListPlus class="h-12 w-12 text-muted-foreground/30 mb-3" />
			<h2 class="text-base font-semibold">No lists yet</h2>
			<p class="text-xs text-muted-foreground mt-1 max-w-xs mb-4">
				Organize movies and shows into themed marathons, watch priorities, or shared recommendations.
			</p>
			<Button onclick={() => (isCreateOpen = true)} variant="outline" size="sm" class="gap-1.5 cursor-pointer">
				<Plus class="h-4 w-4" />
				<span>Create your first list</span>
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each lists as list (list.id)}
				{@const previewPosters = list.items.slice(0, 4).map((i) => i.poster_path).filter(Boolean)}

				<div class="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-card hover:border-border transition-all shadow-xs">
					<!-- Poster Collage / Banner -->
					<a href="/list/{list.id}" class="block relative h-36 bg-muted/40 overflow-hidden border-b border-border/40">
						{#if previewPosters.length > 0}
							<div class="grid h-full w-full {previewPosters.length === 1 ? 'grid-cols-1' : previewPosters.length === 2 ? 'grid-cols-2' : previewPosters.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}">
								{#each previewPosters as poster}
									<img
										src={getTMDBImageUrl(poster, 'w342') || ''}
										alt=""
										class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
										loading="lazy"
									/>
								{/each}
							</div>
							<div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"></div>
						{:else}
							<div class="flex h-full w-full items-center justify-center text-muted-foreground/30">
								<Film class="h-10 w-10" />
							</div>
						{/if}

						<span class="absolute bottom-2.5 right-2.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-xs">
							{list.items.length} {list.items.length === 1 ? 'title' : 'titles'}
						</span>
					</a>

					<!-- Info & Action -->
					<div class="p-3.5 flex flex-col justify-between flex-1 gap-3">
						<div>
							<a href="/list/{list.id}" class="hover:underline">
								<h2 class="text-base font-semibold tracking-tight text-foreground line-clamp-1">
									{list.title}
								</h2>
							</a>
							{#if list.description}
								<p class="text-xs text-muted-foreground mt-1 line-clamp-2">
									{list.description}
								</p>
							{/if}
						</div>

						<div class="flex items-center justify-between text-[11px] text-muted-foreground/60 pt-2 border-t border-border/30">
							<span class="inline-flex items-center gap-1">
								<Calendar class="h-3 w-3" />
								{formatDate(list.updated_at)}
							</span>

							<button
								type="button"
								onclick={() => (listToDelete = list)}
								class="p-1 hover:text-red-400 transition-colors cursor-pointer"
								title="Delete list"
								aria-label="Delete list"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- CREATE LIST DIALOG -->
<Dialog.Root bind:open={isCreateOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create New List</Dialog.Title>
			<Dialog.Description>Group movies and TV series into your own curated collection.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreate} class="space-y-4 pt-2">
			<div class="space-y-1.5">
				<Label for="list-title">List Name</Label>
				<Input
					id="list-title"
					bind:value={newTitle}
					placeholder="e.g. Cyberpunk Classics, Spooky Season..."
					required
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="list-desc">Description (Optional)</Label>
				<Textarea
					id="list-desc"
					bind:value={newDesc}
					placeholder="A brief note about what belongs in this list..."
					rows={3}
				/>
			</div>

			<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
				<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={!newTitle.trim()}>
					Create List
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- DELETE CONFIRMATION DIALOG -->
<Dialog.Root open={Boolean(listToDelete)} onOpenChange={(open) => !open && (listToDelete = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete "{listToDelete?.title}"?</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this list? The titles inside will remain in your library.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button type="button" variant="outline" onclick={() => (listToDelete = null)}>
				Cancel
			</Button>
			<Button type="button" variant="destructive" onclick={confirmDelete}>
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>