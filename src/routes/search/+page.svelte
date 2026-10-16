<!-- src/routes/search/+page.svelte -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { tmdb, getTMDBImageUrl, type TMDBMediaItem } from '$lib/tmdb.svelte';
	import { Search, Film, Tv, User, Star, X, AlertCircle } from 'lucide-svelte';

	let query = $state('');
	let activeTab = $state<'all' | 'movie' | 'tv' | 'person'>('all');
	let results = $state<TMDBMediaItem[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	let inputRef = $state<HTMLInputElement | null>(null);
	let debounceTimeout: ReturnType<typeof setTimeout>;

	async function performSearch(searchTerm: string) {
		const trimmed = searchTerm.trim();
		if (!trimmed) {
			results = [];
			error = null;
			isLoading = false;
			return;
		}

		if (!tmdb.hasKey) return;

		isLoading = true;
		error = null;

		try {
			const response = await tmdb.searchMulti(trimmed);
			results = response.results || [];
		} catch (err: any) {
			error = err?.message || 'Failed to search items.';
			results = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const current = query;
		clearTimeout(debounceTimeout);

		if (!current.trim()) {
			results = [];
			error = null;
			isLoading = false;
			return;
		}

		debounceTimeout = setTimeout(() => {
			performSearch(current);
		}, 350);

		return () => clearTimeout(debounceTimeout);
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		clearTimeout(debounceTimeout);
		inputRef?.blur();
		performSearch(query);
	}

	function handleScroll() {
		if (document.activeElement === inputRef) {
			inputRef?.blur();
		}
	}

	function handleClear() {
		query = '';
		results = [];
		inputRef?.focus();
	}

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'movie', label: 'Movies' },
		{ id: 'tv', label: 'TV Shows' },
		{ id: 'person', label: 'People' }
	] as const;

	const filteredResults = $derived(
		activeTab === 'all'
			? results
			: results.filter((item) => item.media_type === activeTab)
	);

	function getTitle(item: TMDBMediaItem) {
		return item.media_type === 'movie' ? item.title : item.name;
	}

	function getYearOrDetail(item: TMDBMediaItem) {
		if (item.media_type === 'movie') return item.release_date?.slice(0, 4) || '—';
		if (item.media_type === 'tv') return item.first_air_date?.slice(0, 4) || '—';
		return item.known_for_department || 'Person';
	}

	function getImagePath(item: TMDBMediaItem) {
		return item.media_type === 'person' ? item.profile_path : item.poster_path;
	}
</script>

<svelte:window ontouchmove={handleScroll} />

<!-- STICKY TOP SEARCH HEADER -->
<div class="sticky top-0 md:top-14 z-30 bg-background/95 backdrop-blur-md px-4 py-2.5 md:px-6">
	<div class="mx-auto max-w-7xl flex flex-col items-center space-y-2.5">
		<!-- Search Input Bar -->
		<form onsubmit={handleSubmit} class="relative flex items-center w-full max-w-xl mx-auto">
			<Search class="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />

			<input
				bind:this={inputRef}
				bind:value={query}
				type="text"
				inputmode="search"
				enterkeyhint="search"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				placeholder="Search movies, TV, cast..."
				class="flex h-10 w-full rounded-xl border border-input bg-muted/40 px-3 pl-10 pr-10 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background transition-all [&::-webkit-search-cancel-button]:hidden"
			/>

			{#if query}
				<button
					type="button"
					onclick={handleClear}
					class="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground active:scale-95"
					aria-label="Clear search"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</form>

		<!-- Category Filter Pills -->
		{#if results.length > 0 || isLoading}
			<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full md:justify-center -mx-4 px-4 md:mx-0 md:px-0">
				{#each tabs as tab}
					{@const isSelected = activeTab === tab.id}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium transition-colors select-none active:scale-95
							{isSelected
								? 'bg-primary text-primary-foreground shadow-xs'
								: 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}"
					>
						{tab.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- RESULTS CONTAINER -->
<div class="mx-auto max-w-7xl px-3 pt-3 pb-6 md:px-6 md:pt-4">
	<!-- Error state -->
	{#if error}
		<div class="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm max-w-xl mx-auto">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<p>{error}</p>
		</div>
	{/if}

	<!-- Skeleton Loading Grid -->
	{#if isLoading}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
			{#each Array(12) as _}
				<div class="space-y-1.5">
					<Skeleton class="aspect-[2/3] w-full rounded-lg" />
					<Skeleton class="h-3.5 w-3/4 rounded-sm" />
					<Skeleton class="h-3 w-1/2 rounded-sm" />
				</div>
			{/each}
		</div>

	<!-- Empty Results -->
	{:else if query.trim() && filteredResults.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center px-4">
			<Search class="h-10 w-10 text-muted-foreground/30 mb-3" />
			<h3 class="text-base font-semibold">No results found</h3>
			<p class="text-xs text-muted-foreground mt-1 max-w-xs">
				No matches found for "{query}". Check spelling or try another title.
			</p>
		</div>

	<!-- Initial State -->
	{:else if !query.trim()}
		<div class="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
			<Film class="h-12 w-12 text-muted-foreground/25 mb-3" />
			<p class="text-sm font-medium">Search for movies, TV series, or people</p>
		</div>

	<!-- Poster Grid -->
	{:else}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
			{#each filteredResults as item (item.id + item.media_type)}
				{@const imageSrc = getTMDBImageUrl(getImagePath(item), 'w342')}
				{@const title = getTitle(item)}
				{@const meta = getYearOrDetail(item)}

<!-- CLICKABLE MOVIE OR TV SHOW -->
{#if item.media_type === 'movie' || item.media_type === 'tv'}
	<a
		href="/{item.media_type}/{item.id}"
		class="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card active:scale-[0.98] transition-transform select-none"
	>
		<!-- 100% CLEAN POSTER (No Badges) -->
		<div class="relative aspect-[2/3] w-full bg-muted overflow-hidden">
			{#if imageSrc}
				<img
					src={imageSrc}
					alt={title}
					loading="lazy"
					decoding="async"
					class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
				/>
			{:else}
				<div class="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground/40">
					{#if item.media_type === 'movie'}
						<Film class="h-8 w-8" />
					{:else}
						<Tv class="h-8 w-8" />
					{/if}
					<span class="text-[10px]">No Poster</span>
				</div>
			{/if}
		</div>

		<!-- METADATA BELOW POSTER -->
		<div class="p-2 sm:p-2.5 space-y-1">
			<h2 class="text-xs sm:text-sm font-semibold tracking-tight line-clamp-1 group-hover:text-primary transition-colors" title={title}>
				{title}
			</h2>

			<!-- Bottom Row: Release Year on Left, Media Type on Right -->
			<div class="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
				<span>{meta}</span>
				<span class="uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
					{item.media_type === 'tv' ? 'TV' : 'Movie'}
				</span>
			</div>
		</div>
	</a>
					<!-- PERSON ITEM (Non-clickable for now) -->
				{:else}
					<div class="group relative flex flex-col overflow-hidden rounded-lg border border-border/40 bg-card select-none">
						<div class="relative aspect-[2/3] w-full bg-muted overflow-hidden">
							{#if imageSrc}
								<img
									src={imageSrc}
									alt={title}
									loading="lazy"
									decoding="async"
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground/40">
									<User class="h-8 w-8" />
									<span class="text-[10px]">No Photo</span>
								</div>
							{/if}

							<div class="absolute top-1.5 left-1.5">
								<Badge
									variant="secondary"
									class="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-background/80 backdrop-blur-xs border-border/30"
								>
									Person
								</Badge>
							</div>
						</div>

						<div class="p-2 sm:p-2.5">
							<h2 class="text-xs sm:text-sm font-semibold tracking-tight line-clamp-1" title={title}>
								{title}
							</h2>
							<p class="text-[11px] text-muted-foreground mt-0.5">
								{meta}
							</p>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>