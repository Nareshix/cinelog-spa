<!-- src/lib/components/MediaActionCard.svelte -->
<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Play, Eye, EyeClosed, Heart, Bookmark, X, Trash2 } from 'lucide-svelte';
	import {
		getTrackedMedia,
		saveTrackedMedia,
		deleteTrackedMedia,
		type TrackedMedia
	} from '$lib/db/mediaStore';

	let {
		media
	}: {
		media: {
			id: number | string;
			type: 'movie' | 'tv';
			title: string;
			poster_path: string | null;
			duration?: string;
		};
	} = $props();

	let isWatching = $state(false);
	let isWatched = $state(false);
	let isLiked = $state(false);
	let isWatchlist = $state(false);
	let userRating = $state(0);
	let hoverRating = $state(0);
	let isRatingAreaHovered = $state(false);

	// Confirmation modal state
	let isConfirmOpen = $state(false);

	$effect(() => {
		const mediaId = media.id;
		const mediaType = media.type;

		async function load() {
			const saved = await getTrackedMedia(mediaType, mediaId);
			if (saved) {
				isWatching = saved.status === 'watching';
				isWatched = saved.status === 'watched';
				isWatchlist = saved.status === 'watchlist';
				isLiked = saved.liked;
				userRating = saved.rating;
			} else {
				isWatching = false;
				isWatched = false;
				isWatchlist = false;
				isLiked = false;
				userRating = 0;
			}
		}

		load();
	});

	async function persist(
		watching: boolean,
		watched: boolean,
		watchlist: boolean,
		liked: boolean,
		rating: number
	) {
		const existing = await getTrackedMedia(media.type, media.id);
		const status = watchlist ? 'watchlist' : watching ? 'watching' : watched ? 'watched' : 'none';

		// Ghost Record Purge
		if (status === 'none' && !liked && rating === 0 && (!existing?.notes || !existing.notes.trim())) {
			await deleteTrackedMedia(media.type, media.id);
			return;
		}

		const record: TrackedMedia = {
			key: `${media.type}_${media.id}`,
			mediaId: media.id,
			type: media.type,
			title: media.title,
			poster_path: media.poster_path,
			duration: media.duration,
			status,
			liked,
			rating,
			notes: existing?.notes,
			notes_updated_at: existing?.notes_updated_at,
			updated_at: new Date().toISOString()
		};

		await saveTrackedMedia(record);
	}

	function toggleWatching() {
		if (isWatching) {
			isWatching = false;
		} else {
			isWatching = true;
			isWatched = false;
			isWatchlist = false;
			isLiked = false;
			userRating = 0;
		}
		persist(isWatching, isWatched, isWatchlist, isLiked, userRating);
	}

	function toggleWatched() {
		if (isWatched) {
			isWatched = false;
			isLiked = false;
			userRating = 0;
		} else {
			isWatched = true;
			isWatching = false;
			isWatchlist = false;
		}
		persist(isWatching, isWatched, isWatchlist, isLiked, userRating);
	}

	function toggleLiked() {
		if (isLiked) {
			isLiked = false;
		} else {
			isLiked = true;
			isWatched = true;
			isWatching = false;
			isWatchlist = false;
		}
		persist(isWatching, isWatched, isWatchlist, isLiked, userRating);
	}

	function toggleWatchlist() {
		if (isWatchlist) {
			isWatchlist = false;
		} else {
			isWatchlist = true;
			isWatching = false;
			isWatched = false;
			isLiked = false;
			userRating = 0;
		}
		persist(isWatching, isWatched, isWatchlist, isLiked, userRating);
	}

	function setRating(val: number) {
		userRating = val;
		hoverRating = 0;
		isWatched = true;
		isWatching = false;
		isWatchlist = false;
		persist(isWatching, isWatched, isWatchlist, isLiked, userRating);
	}

	function clearRating() {
		userRating = 0;
		hoverRating = 0;
		persist(isWatching, isWatched, isWatchlist, isLiked, 0);
	}

	async function confirmRemove() {
		isWatching = false;
		isWatched = false;
		isWatchlist = false;
		isLiked = false;
		userRating = 0;
		hoverRating = 0;
		await deleteTrackedMedia(media.type, media.id);
		isConfirmOpen = false;
	}

	const isTracked = $derived(isWatching || isWatched || isWatchlist || isLiked || userRating > 0);
	const activeRating = $derived(hoverRating || userRating);
</script>

<svg class="sr-only" aria-hidden="true">
	<defs>
		<clipPath id="sharp-star-half" clipPathUnits="objectBoundingBox">
			<rect x="0" y="0" width="0.5" height="1" />
		</clipPath>
	</defs>
</svg>

<div class="rounded-2xl border border-white/10 bg-[#16171b] p-4 text-white shadow-xl space-y-3.5 select-none w-full">
	<!-- Top Row: Watched, Liked, Watchlist, Watching (Watching is now last) -->
	<div class="grid grid-cols-4 items-center text-center gap-1">
		<!-- 1. Watched -->
		<button
			type="button"
			onclick={toggleWatched}
			class="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
		>
			{#if isWatched}
				<EyeClosed class="h-5 w-5 transition-colors text-primary stroke-primary" />
			{:else}
				<Eye class="h-5 w-5 transition-colors text-muted-foreground hover:text-white" />
			{/if}
			<span
				class="text-[11px] font-medium transition-colors {isWatched
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				Watched
			</span>
		</button>

		<!-- 2. Liked -->
		<button
			type="button"
			onclick={toggleLiked}
			class="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
		>
			<Heart
				class="h-5 w-5 transition-colors {isLiked
					? 'fill-red-500 text-red-500'
					: 'text-muted-foreground hover:text-white'}"
			/>
			<span
				class="text-[11px] font-medium transition-colors {isLiked
					? 'text-red-500'
					: 'text-muted-foreground'}"
			>
				Liked
			</span>
		</button>

		<!-- 3. Watchlist -->
		<button
			type="button"
			onclick={toggleWatchlist}
			class="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
		>
			<Bookmark
				class="h-5 w-5 transition-colors {isWatchlist
					? 'fill-primary text-primary'
					: 'text-muted-foreground hover:text-white'}"
			/>
			<span
				class="text-[11px] font-medium transition-colors {isWatchlist
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				Watchlist
			</span>
		</button>

		<!-- 4. Watching (After Watchlist, at the end) -->
		<button
			type="button"
			onclick={toggleWatching}
			class="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
		>
			<Play
				class="h-5 w-5 transition-colors {isWatching
					? 'fill-primary text-primary'
					: 'text-muted-foreground hover:text-white'}"
			/>
			<span
				class="text-[11px] font-medium transition-colors {isWatching
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				Watching
			</span>
		</button>
	</div>

	<Separator class="bg-white/10" />

	<!-- Middle Section: SHARP STARS (0.5 to 5.0) -->
	<div
		class="flex flex-col items-center space-y-1.5 pt-0.5"
		onmouseenter={() => (isRatingAreaHovered = true)}
		onmouseleave={() => {
			isRatingAreaHovered = false;
			hoverRating = 0;
		}}
	>
		<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 min-h-[15px]">
			{#if hoverRating > 0}
				RATE {hoverRating.toFixed(1)}
			{:else if userRating > 0}
				RATED {userRating.toFixed(1)}
			{:else}
				RATE
			{/if}
		</span>

		<div class="relative flex items-center justify-center w-full min-h-[32px]">
			<div class="relative inline-flex items-center gap-1">
				{#each [1, 2, 3, 4, 5] as starVal}
					{@const isFull = activeRating >= starVal}
					{@const isHalf = !isFull && activeRating >= starVal - 0.5}

					<div class="relative h-6 w-6 select-none">
						<svg
							viewBox="0 0 24 24"
							class="absolute inset-0 h-6 w-6 text-muted-foreground/30 fill-transparent pointer-events-none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linejoin="miter"
							stroke-miterlimit="4"
						>
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
						</svg>

						{#if isFull || isHalf}
							<svg
								viewBox="0 0 24 24"
								class="absolute inset-0 h-6 w-6 text-[#facc15] fill-[#facc15] pointer-events-none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linejoin="miter"
								stroke-miterlimit="4"
								style={isHalf ? 'clip-path: url(#sharp-star-half);' : undefined}
							>
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
							</svg>
						{/if}

						<button
							type="button"
							class="absolute left-0 top-0 h-full w-1/2 z-10 cursor-pointer"
							aria-label="Rate {starVal - 0.5}"
							onmouseenter={() => (hoverRating = starVal - 0.5)}
							onclick={() => setRating(starVal - 0.5)}
						></button>

						<button
							type="button"
							class="absolute right-0 top-0 h-full w-1/2 z-10 cursor-pointer"
							aria-label="Rate {starVal}"
							onmouseenter={() => (hoverRating = starVal)}
							onclick={() => setRating(starVal)}
						></button>
					</div>
				{/each}

				<div
					class="absolute left-full top-1/2 -translate-y-1/2 pl-1.5 flex items-center transition-opacity duration-150 {userRating > 0 && isRatingAreaHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
				>
					<span class="text-white/20 mr-1 text-sm select-none">|</span>
					<button
						type="button"
						onclick={clearRating}
						class="p-0.5 text-muted-foreground/60 hover:text-white transition-colors cursor-pointer"
						title="Clear rating"
						aria-label="Clear rating"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Bottom Section: Remove from Library -->
	{#if isTracked}
		<Separator class="bg-white/10" />
		<button
			type="button"
			onclick={() => (isConfirmOpen = true)}
			class="flex items-center justify-center gap-1.5 w-full py-1 text-xs text-muted-foreground/60 hover:text-red-400 transition-colors cursor-pointer active:scale-95"
		>
			<Trash2 class="h-3.5 w-3.5" />
			<span>Remove from Library</span>
		</button>
	{/if}
</div>

<!-- CONFIRMATION DIALOG -->
<Dialog.Root bind:open={isConfirmOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Remove from Library?</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to remove <span class="font-medium text-foreground">"{media.title}"</span> from your library? Your status, rating, and tracked data will be permanently cleared.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button
				type="button"
				variant="outline"
				onclick={() => (isConfirmOpen = false)}
			>
				Cancel
			</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={confirmRemove}
			>
				Remove
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>