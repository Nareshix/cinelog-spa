<!-- src/routes/list/+page.svelte -->
<script lang="ts">
	import { getAllLists, saveList, deleteList, type CustomList } from '$lib/db/mediaStore';
	import { getTMDBImageUrl } from '$lib/tmdb.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Film, Trash2, Calendar, ListFilter } from 'lucide-svelte';

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

<div class="mx-auto max-w-5xl px-3 py-5 sm:px-6 md:px-8 space-y-5">
	<!-- Top Bar -->
	<div class="flex items-center justify-between gap-4 border-b border-border/40 pb-3.5">
		<div>
			<h1 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Lists</h1>
			<p class="text-xs text-muted-foreground mt-0.5">Your personal film & TV collections</p>
		</div>

		<Button onclick={() => (isCreateOpen = true)} size="sm" class="gap-1.5 rounded-full cursor-pointer h-8 text-xs">
			<Plus class="h-3.5 w-3.5" />
			<span>New List</span>
		</Button>
	</div>

	<!-- Lists Container -->
	{#if isLoading}
		<div class="space-y-3">
			{#each Array(3) as _}
				<div class="h-24 sm:h-28 rounded-xl border border-border/40 bg-muted/20 animate-pulse"></div>
			{/each}
		</div>
	{:else if lists.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<ListFilter class="h-10 w-10 text-muted-foreground/30 mb-2.5" />
			<h2 class="text-sm sm:text-base font-semibold">No lists yet</h2>
			<p class="text-xs text-muted-foreground mt-1 max-w-xs mb-3.5">
				Collect favorites, rankings, or themes into custom Letterboxd-style lists.
			</p>
			<Button onclick={() => (isCreateOpen = true)} variant="outline" size="sm" class="gap-1.5 cursor-pointer h-8 text-xs">
				<Plus class="h-3.5 w-3.5" />
				<span>Create your first list</span>
			</Button>
		</div>
	{:else}
		<div class="divide-y divide-border/30 border-y border-border/30">
			{#each lists as list (list.id)}
				<!-- Strictly limit to a max of 5 posters -->
				{@const previewItems = list.items.slice(0, 5)}

				<!-- ENTIRE ROW CLICKABLE WRAPPER -->
				<div class="group relative flex items-center justify-between gap-3 sm:gap-5 py-3 px-2 sm:px-3 hover:bg-muted/30 active:bg-muted/50 transition-colors rounded-xl cursor-pointer">

					<!-- STRETCHED LINK: Covers entire card area -->
					<a
						href="/list/{list.id}"
						class="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label="View list {list.title}"
					></a>

					<!-- Left Section: Poster Stack + Text (pointer-events-none lets clicks trigger link) -->
					<div class="flex items-center gap-3 sm:gap-5 min-w-0 pointer-events-none">

						<!-- LETTERBOXD POSTER DECK (Max 5, Mobile Scaled) -->
						<div class="shrink-0 flex items-center py-0.5 select-none">
							{#if previewItems.length > 0}
								<div class="flex items-center pl-0.5">
									{#each previewItems as item, idx}
										{@const poster = getTMDBImageUrl(item.poster_path, 'w185')}
										<div
											class="relative h-[4.5rem] w-12 sm:h-24 sm:w-16 shrink-0 rounded-[3px] overflow-hidden border border-white/20 bg-muted shadow-md shadow-black/50 transition-transform duration-200 group-hover:-translate-y-0.5"
											style="margin-left: {idx === 0 ? '0px' : 'clamp(-22px, -4vw, -18px)'}; z-index: {idx + 1};"
										>
											{#if poster}
												<img
													src={poster}
													alt=""
													loading="lazy"
													class="h-full w-full object-cover"
												/>
											{:else}
												<div class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40 text-[8px]">
													No img
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{:else}
								<!-- Empty State Placeholder -->
								<div class="h-[4.5rem] w-12 sm:h-24 sm:w-16 rounded-[3px] border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground/40 gap-1">
									<Film class="h-4 w-4" />
									<span class="text-[8px] uppercase">Empty</span>
								</div>
							{/if}
						</div>

						<!-- List Text Details -->
						<div class="min-w-0 space-y-1">
							<h2 class="text-sm sm:text-base font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
								{list.title}
							</h2>

							<!-- Meta Badges: Item Count + Date -->
							<div class="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
								<span class="font-medium text-foreground/80">
									{list.items.length} {list.items.length === 1 ? 'film' : 'films'}
								</span>
								<span>•</span>
								<span class="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground/60">
									<Calendar class="h-3 w-3" />
									{formatDate(list.updated_at)}
								</span>
							</div>

							{#if list.description}
								<p class="text-xs text-muted-foreground line-clamp-1 max-w-sm sm:max-w-md pt-0.5">
									{list.description}
								</p>
							{/if}
						</div>
					</div>

					<!-- Right Section: Delete Button (relative z-10 makes it independently clickable) -->
					<div class="relative z-10 shrink-0">
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								listToDelete = list;
							}}
							class="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg"
							title="Delete list"
							aria-label="Delete list"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>

				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- CREATE LIST MODAL -->
<Dialog.Root bind:open={isCreateOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Start a new list</Dialog.Title>
			<Dialog.Description>Create a collection to rank, group, or share.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreate} class="space-y-4 pt-2">
			<div class="space-y-1.5">
				<Label for="list-title">Name</Label>
				<Input
					id="list-title"
					bind:value={newTitle}
					placeholder="e.g. Favorite Sci-Fi of all time"
					required
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="list-desc">Description (Optional)</Label>
				<Textarea
					id="list-desc"
					bind:value={newDesc}
					placeholder="What is this list about?"
					rows={3}
				/>
			</div>

			<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
				<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={!newTitle.trim()}>
					Create
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- DELETE CONFIRMATION DIALOG -->
<Dialog.Root open={Boolean(listToDelete)} onOpenChange={(open) => !open && (listToDelete = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete list?</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <span class="font-medium text-foreground">"{listToDelete?.title}"</span>? The titles inside will still remain safe in your library.
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