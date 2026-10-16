<!-- src/lib/components/Navigation.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { House, Search, Library, List, Settings } from 'lucide-svelte';
  import { buttonVariants } from '$lib/components/ui/button';
  import SyncButton from '$lib/components/SyncButton.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  let isSettingsOpen = $state(false);

  const navItems = [
    { label: 'Home', href: '/', icon: House },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'List', href: '/list', icon: List }
  ];
</script>

<!-- DESKTOP TOP BAR -->
<header class="sticky top-0 z-40 hidden w-full border-b border-border/40 bg-background/95 backdrop-blur md:block">
  <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
    <div class="flex items-center gap-6">
      <div class="font-semibold tracking-tight">MyApp</div>

      <nav class="flex items-center gap-1">
        {#each navItems as item}
          {@const isActive = page.url.pathname === item.href}
          {@const Icon = item.icon}
          <a
            href={item.href}
            class={buttonVariants({
              variant: isActive ? 'secondary' : 'ghost',
              size: 'sm'
            })}
          >
            <Icon class="mr-2 h-4 w-4" />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </div>

    <!-- Sync + Settings Button -->
    <div class="flex items-center gap-2">
      <SyncButton />
      <button
        type="button"
        onclick={() => (isSettingsOpen = true)}
        class="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Settings"
      >
        <Settings class="h-4 w-4" />
      </button>
    </div>
  </div>
</header>

<!-- MOBILE TOP HEADER -->
<div class="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur md:hidden">
  <div class="font-bold tracking-tight text-sm">MyApp</div>
  <div class="flex items-center gap-1.5">
    <SyncButton />
    <button
      type="button"
      onclick={() => (isSettingsOpen = true)}
      class="p-1.5 rounded-full text-muted-foreground hover:text-foreground"
      aria-label="Settings"
    >
      <Settings class="h-4 w-4" />
    </button>
  </div>
</div>

<!-- MOBILE BOTTOM BAR -->
<nav
  aria-label="Mobile Navigation"
  class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur md:hidden"
  style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
  <div class="grid h-16 grid-cols-4 items-center">
    {#each navItems as item}
      {@const isActive = page.url.pathname === item.href}
      {@const Icon = item.icon}
      <a
        href={item.href}
        class="flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors
          {isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
      >
        <Icon class="h-5 w-5" />
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<SettingsModal bind:open={isSettingsOpen} />