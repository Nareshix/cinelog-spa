<!-- src/routes/library/+page.svelte -->
<script lang="ts">
	import { getAllTrackedMedia, type TrackedMedia } from '$lib/db/mediaStore';
	import { getTMDBImageUrl } from '$lib/tmdb.svelte';
	import {
		Play,
		EyeClosed,
		Heart,
		Bookmark,
		Search,
		ArrowUpDown,
		ChevronDown,
		Check,
		Film,
		Tv
	} from 'lucide-svelte';

	let items = $state<TrackedMedia[]>([]);
	let isLoading = $state(true);

	// Filtering & Sorting State
	let searchQuery = $state('');
	let activeTab = $state<'all' | 'watched' | 'watchlist' | 'watching'>('all');
	let typeFilter = $state<'all' | 'movie' | 'tv'>('all');
	let onlyLiked = $state(false);

	// Sort Dropdown State
	type SortOption = 'recent' | 'rating-desc' | 'rating-asc';
	let sortBy = $state<SortOption>('recent');
	let isSortOpen = $state(false);

	const sortOptions = [
		{ value: 'recent', label: 'Recent' },
		{ value: 'rating-desc', label: 'Rating: High to Low' },
		{ value: 'rating-asc', label: 'Rating: Low to High' }
	] as const;

	const currentSortLabel = $derived(
		sortOptions.find((o) => o.value === sortBy)?.label || 'Recent'
	);

	$effect(() => {
		async function load() {
			isLoading = true;
			const data = await getAllTrackedMedia();
			items = data.filter(
				(i) => i.status !== 'none' || i.rating > 0 || i.liked || Boolean(i.notes?.trim())
			);
			isLoading = false;
		}
		load();
	});

	// Items filtered by Type (used for dynamic tab counts)
	const baseTypedItems = $derived.by(() => {
		if (typeFilter === 'all') return items;
		return items.filter((item) => item.type === typeFilter);
	});

	// Final Filtered & Sorted items
	const displayedItems = $derived.by(() => {
		let list = [...items];

		// 1. Text Search Filter
		const query = searchQuery.trim().toLowerCase();
		if (query) {
			list = list.filter((item) => item.title.toLowerCase().includes(query));
		}

		// 2. Media Type Filter (All / Movies / TV)
		if (typeFilter !== 'all') {
			list = list.filter((item) => item.type === typeFilter);
		}

		// 3. Status Tab Filter
		if (activeTab === 'watched') list = list.filter((i) => i.status === 'watched');
		else if (activeTab === 'watchlist') list = list.filter((i) => i.status === 'watchlist');
		else if (activeTab === 'watching') list = list.filter((i) => i.status === 'watching');

		// 4. Liked Filter
		if (onlyLiked) {
			list = list.filter((i) => i.liked);
		}

		// 5. Sorting
		return list.sort((a, b) => {
			if (sortBy === 'rating-desc') {
				const diff = (b.rating || 0) - (a.rating || 0);
				if (diff !== 0) return diff;
			} else if (sortBy === 'rating-asc') {
				const rA = a.rating || 0;
				const rB = b.rating || 0;
				if (rA > 0 && rB === 0) return -1;
				if (rA === 0 && rB > 0) return 1;
				if (rA !== rB) return rA - rB;
			}
			return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
		});
	});

	// Tabs counts dynamically adjust if Movies or TV is selected
	const tabs = [
		{ id: 'all', label: 'All', count: () => baseTypedItems.length },
		{ id: 'watched', label: 'Watched', count: () => baseTypedItems.filter((i) => i.status === 'watched').length },
		{ id: 'watchlist', label: 'Watchlist', count: () => baseTypedItems.filter((i) => i.status === 'watchlist').length },
		{ id: 'watching', label: 'Watching', count: () => baseTypedItems.filter((i) => i.status === 'watching').length }
	] as const;
</script>

<div class="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-5">
	<!-- Header & Search Input -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Library</h1>
			<p class="text-xs text-muted-foreground mt-0.5">Your personal watch tracking & logs</p>
		</div>

		<!-- Search Bar -->
		<div class="relative w-full sm:w-64">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search your library..."
				class="w-full rounded-full border border-border/60 bg-muted/30 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-ring"
			/>
		</div>
	</div>

	<!-- Controls Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/40 pb-3.5">
		<!-- Status Tabs -->
		<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
			{#each tabs as tab}
				{@const isSelected = activeTab === tab.id}
				{@const count = tab.count()}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer active:scale-95
						{isSelected
							? 'bg-primary text-primary-foreground shadow-xs'
							: 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}"
				>
					<span>{tab.label}</span>
					{#if count > 0}
						<span class="text-[10px] opacity-70">({count})</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Secondary Controls: Type Segment (All/Movies/TV) + Liked + Sort Dropdown -->
		<div class="flex flex-wrap items-center gap-2 self-start md:self-auto">
			<!-- Media Type Segmented Control -->
			<div class="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5 select-none text-xs">
				<button
					type="button"
					onclick={() => (typeFilter = 'all')}
					class="rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer
						{typeFilter === 'all'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'}"
				>
					All
				</button>
				<button
					type="button"
					onclick={() => (typeFilter = 'movie')}
					class="rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer
						{typeFilter === 'movie'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'}"
				>
					Movies
				</button>
				<button
					type="button"
					onclick={() => (typeFilter = 'tv')}
					class="rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer
						{typeFilter === 'tv'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'}"
				>
					TV
				</button>
			</div>

			<!-- Liked Toggle Pill -->
			<button
				type="button"
				onclick={() => (onlyLiked = !onlyLiked)}
				class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer active:scale-95
					{onlyLiked
						? 'border-red-500/50 bg-red-500/15 text-red-500'
						: 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80'}"
				title="Show liked only"
			>
				<Heart class="h-3 w-3 {onlyLiked ? 'fill-red-500 text-red-500' : ''}" />
				<span>Liked</span>
			</button>

			<!-- Sort Dropdown -->
			<div class="relative inline-block">
				<button
					type="button"
					onclick={() => (isSortOpen = !isSortOpen)}
					class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-all cursor-pointer active:scale-95"
				>
					<ArrowUpDown class="h-3 w-3 text-muted-foreground" />
					<span>{currentSortLabel}</span>
					<ChevronDown class="h-3 w-3 text-muted-foreground transition-transform {isSortOpen ? 'rotate-180' : ''}" />
				</button>

				{#if isSortOpen}
					<button
						type="button"
						class="fixed inset-0 z-20 cursor-default"
						onclick={() => (isSortOpen = false)}
						tabindex="-1"
						aria-label="Close menu"
					></button>

					<div class="absolute right-0 top-full mt-1.5 z-30 min-w-[170px] rounded-xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-xl backdrop-blur-md">
						{#each sortOptions as option}
							{@const isSelected = sortBy === option.value}
							<button
								type="button"
								onclick={() => {
									sortBy = option.value;
									isSortOpen = false;
								}}
								class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer
									{isSelected
										? 'bg-muted text-foreground'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
							>
								<span>{option.label}</span>
								{#if isSelected}
									<Check class="h-3 w-3 text-primary" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Library Grid -->
	{#if isLoading}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each Array(6) as _}
				<div class="space-y-2">
					<div class="aspect-[2/3] w-full rounded-xl bg-muted animate-pulse"></div>
					<div class="h-3.5 w-3/4 rounded bg-muted animate-pulse"></div>
				</div>
			{/each}
		</div>
	{:else if displayedItems.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<Bookmark class="h-10 w-10 text-muted-foreground/30 mb-3" />
			<h2 class="text-base font-semibold">No titles found</h2>
			<p class="text-xs text-muted-foreground mt-1 max-w-xs">
				{#if searchQuery.trim()}
					No matches found for "{searchQuery}".
				{:else}
					No items matching the selected filters.
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each displayedItems as item (item.key)}
				{@const poster = getTMDBImageUrl(item.poster_path, 'w342')}

				<a
					href="/{item.type}/{item.mediaId}"
					class="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card active:scale-[0.98] transition-transform select-none"
				>
					<!-- 100% CLEAN POSTER -->
					<div class="relative aspect-[2/3] w-full bg-muted overflow-hidden">
						{#if poster}
							<img
								src={poster}
								alt={item.title}
								loading="lazy"
								decoding="async"
								class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
							/>
						{:else}
							<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
								{#if item.type === 'movie'}
									<Film class="h-8 w-8" />
								{:else}
									<Tv class="h-8 w-8" />
								{/if}
							</div>
						{/if}
					</div>

					<!-- METADATA CANVAS (ICONS ONLY) -->
					<div class="p-2 sm:p-2.5 space-y-1.5">
						<h3 class="text-xs sm:text-sm font-semibold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors" title={item.title}>
							{item.title}
						</h3>

						<div class="flex items-center justify-between text-[11px] text-muted-foreground">
							<span class="uppercase tracking-wider font-semibold text-[9px]">{item.type}</span>
							{#if item.duration}
								<span>{item.duration}</span>
							{/if}
						</div>

						<!-- Clean Icons Only Row -->
						<div class="flex items-center justify-between pt-1 border-t border-border/30 text-xs min-h-[22px]">
							<div class="flex items-center gap-1.5">
								{#if item.status === 'watched'}
									<EyeClosed class="h-3.5 w-3.5 stroke-primary text-primary" title="Watched" />
								{:else if item.status === 'watchlist'}
									<Bookmark class="h-3.5 w-3.5 fill-primary text-primary" title="Watchlist" />
								{:else if item.status === 'watching'}
									<Play class="h-3.5 w-3.5 fill-primary text-primary" title="Watching" />
								{/if}

								{#if item.liked}
									<Heart class="h-3.5 w-3.5 fill-red-500 text-red-500" title="Liked" />
								{/if}
							</div>

							<!-- Sharp Star Rating -->
							{#if item.rating > 0}
								<span class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#facc15]">
									<svg
										viewBox="0 0 24 24"
										class="h-3 w-3 fill-[#facc15] text-[#facc15]"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linejoin="miter"
									>
										<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
									</svg>
									{item.rating.toFixed(1)}
								</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>