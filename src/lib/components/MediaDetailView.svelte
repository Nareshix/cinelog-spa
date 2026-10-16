<!-- src/lib/components/MediaDetailView.svelte -->
<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import MediaActionCard from '$lib/components/MediaActionCard.svelte';
	import AddToListModal from '$lib/components/AddToListModal.svelte';
	import { tmdb, getTMDBImageUrl, type UnifiedMediaDetail } from '$lib/tmdb.svelte';
	import { getTrackedMedia, saveTrackedMedia } from '$lib/db/mediaStore';
	import { AlertCircle, Film, Tv, Pencil, Plus, ListPlus } from 'lucide-svelte';

	let { type, id }: { type: 'movie' | 'tv'; id: string } = $props();

	let media = $state<UnifiedMediaDetail | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Custom list modal state
	let isAddToListOpen = $state(false);

	// Notes state loaded from IndexedDB
	let notes = $state('');
	let draftNotes = $state('');
	let lastEdited = $state<Date | null>(null);
	let isEditModalOpen = $state(false);

	$effect(() => {
		notes = '';
		draftNotes = '';
		lastEdited = null;

		async function load() {
			isLoading = true;
			error = null;
			try {
				media = await tmdb.getDetails(type, id);

				// Load saved notes from IndexedDB
				const saved = await getTrackedMedia(type, id);
				if (saved?.notes) {
					notes = saved.notes;
					lastEdited = saved.notes_updated_at ? new Date(saved.notes_updated_at) : null;
				}
			} catch (err: any) {
				error = err?.message || 'Could not load details.';
			} finally {
				isLoading = false;
			}
		}

		if (tmdb.hasKey) {
			load();
		}
	});

	function openEditModal() {
		draftNotes = notes;
		isEditModalOpen = true;
	}

	async function saveNotes() {
		const trimmed = draftNotes.trim();
		notes = trimmed;
		lastEdited = trimmed ? new Date() : null;
		isEditModalOpen = false;

		const existing = await getTrackedMedia(type, id);
		await saveTrackedMedia({
			key: `${type}_${id}`,
			mediaId: id,
			type,
			title: media?.title || '',
			poster_path: media?.poster_path || null,
			duration: media?.duration,
			status: existing?.status || 'none',
			liked: existing?.liked || false,
			rating: existing?.rating || 0,
			notes: trimmed,
			notes_updated_at: lastEdited ? lastEdited.toISOString() : undefined,
			updated_at: new Date().toISOString()
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			saveNotes();
		}
	}

	function formatEditedTime(date: Date) {
		return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10 space-y-8">
	{#if isLoading}
		<div class="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
			<Skeleton class="aspect-[2/3] w-44 sm:w-56 rounded-xl shrink-0" />
			<div class="flex-1 space-y-4 w-full flex flex-col items-center lg:items-start">
				<Skeleton class="h-9 w-2/3" />
				<Skeleton class="h-5 w-16 rounded-full" />
				<Skeleton class="h-24 w-full" />
			</div>
			<Skeleton class="h-60 w-full sm:w-72 lg:w-64 xl:w-72 rounded-2xl shrink-0" />
		</div>

	{:else if error}
		<div class="flex flex-col items-center justify-center py-20 text-center space-y-3">
			<AlertCircle class="h-8 w-8 text-destructive" />
			<h2 class="text-lg font-semibold">{error}</h2>
			<p class="text-sm text-muted-foreground">Unable to fetch details from TMDB.</p>
		</div>

	{:else if media}
		{@const posterUrl = getTMDBImageUrl(media.poster_path, 'w500')}

		<div class="flex flex-col lg:flex-row gap-8 items-center lg:items-start">

			<!-- LEFT: POSTER -->
			<div class="w-44 sm:w-56 shrink-0 mx-auto lg:mx-0">
				<div class="aspect-[2/3] w-full rounded-xl overflow-hidden border border-border/40 bg-muted shadow-md">
					{#if posterUrl}
						<img
							src={posterUrl}
							alt={media.title}
							loading="lazy"
							decoding="async"
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
							{#if media.type === 'movie'}
								<Film class="h-10 w-10" />
							{:else}
								<Tv class="h-10 w-10" />
							{/if}
							<span class="text-xs">No Poster</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- CENTER: TITLE + RUNTIME + ADD TO LIST + NOTES -->
			<div class="flex-1 space-y-3 min-w-0 w-full flex flex-col items-center lg:items-start text-center lg:text-left">
				<!-- Title & Duration Badges -->
				<div class="space-y-2 flex flex-col items-center lg:items-start">
					<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground select-text">
						{media.title}
					</h1>

					<div class="flex flex-wrap items-center justify-center lg:justify-start gap-2">
						{#if media.duration}
							<span class="inline-flex items-center rounded-full border border-border/40 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground select-none">
								{media.duration}
							</span>
						{/if}

						<!-- Add to List Button -->
						<button
							type="button"
							onclick={() => (isAddToListOpen = true)}
							class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95"
						>
							<ListPlus class="h-3.5 w-3.5" />
							<span>Add to list</span>
						</button>
					</div>
				</div>

				<!-- Notes Section -->
				{#if notes.trim()}
					<div class="pt-1 space-y-1.5 w-full">
						<p class="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line font-normal select-text text-center lg:text-left">
							{notes}
						</p>

						<div class="flex items-center justify-center lg:justify-end gap-2 pt-0.5">
							{#if lastEdited}
								<span class="text-[11px] text-muted-foreground/50 select-none">
									Edited {formatEditedTime(lastEdited)}
								</span>
								<span class="text-[10px] text-muted-foreground/30 select-none">•</span>
							{/if}

							<button
								type="button"
								onclick={openEditModal}
								class="inline-flex items-center gap-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
								aria-label="Edit notes"
							>
								<Pencil class="h-3 w-3" />
								<span>Edit</span>
							</button>
						</div>
					</div>
				{:else}
					<div class="pt-1 flex justify-center lg:justify-start w-full">
						<button
							type="button"
							onclick={openEditModal}
							class="inline-flex items-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground/60 hover:text-foreground active:text-foreground transition-colors cursor-pointer"
						>
							<Plus class="h-3.5 w-3.5" />
							<span>Add notes...</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- RIGHT: ACTION CARD -->
			<div class="w-full sm:w-72 lg:w-64 xl:w-72 shrink-0 mx-auto lg:mx-0">
				<MediaActionCard
					media={{
						id: media.id,
						type: media.type,
						title: media.title,
						poster_path: media.poster_path,
						duration: media.duration
					}}
				/>
			</div>
		</div>

		<!-- EDIT / ADD NOTES MODAL -->
		<Dialog.Root bind:open={isEditModalOpen}>
			<Dialog.Content class="sm:max-w-lg">
				<Dialog.Header>
					<Dialog.Title>{notes ? 'Edit Notes' : 'Add Notes'}</Dialog.Title>
					<Dialog.Description class="sr-only">Write notes</Dialog.Description>
				</Dialog.Header>

				<form onsubmit={(e) => { e.preventDefault(); saveNotes(); }} class="space-y-4 pt-2">
					<Textarea
						bind:value={draftNotes}
						onkeydown={handleKeydown}
						placeholder="Write thoughts, watch order, or reasons to watch..."
						rows={7}
						class="min-h-[160px] resize-y text-base md:text-sm"
					/>

					<Dialog.Footer class="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onclick={() => (isEditModalOpen = false)}
						>
							Cancel
						</Button>
						<Button type="submit">
							Save
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>

		<!-- ADD TO CUSTOM LIST MODAL -->
		<AddToListModal
			bind:open={isAddToListOpen}
			media={{
				id: media.id,
				type: media.type,
				title: media.title,
				poster_path: media.poster_path
			}}
		/>
	{/if}
</div>