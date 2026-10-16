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

<!-- DESKTOP TOP BAR (Edge-to-Edge) -->
<header class="sticky top-0 z-40 hidden w-full border-b border-border/40 bg-background/95 backdrop-blur md:block">
  <div class="flex h-14 w-full items-center justify-between px-4 md:px-6">

    <!-- FAR LEFT: CineLog Brand + Nav links -->
    <div class="flex items-center gap-6">
      <a href="/" class="font-bold tracking-tight text-lg text-foreground hover:opacity-90 transition-opacity">
        CineLog
      </a>

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

    <!-- FAR RIGHT: Desktop Sync + Settings -->
    <div class="flex items-center gap-2">
      <SyncButton />
      <button
        type="button"
        onclick={() => (isSettingsOpen = true)}
        class="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Settings"
        title="Settings"
      >
        <Settings class="h-4 w-4" />
      </button>
    </div>
  </div>
</header>

<!-- MOBILE BOTTOM BAR (Clean 5 Tabs: HIG & Material Standard) -->
<nav
  aria-label="Mobile Navigation"
  class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur md:hidden"
  style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
  <div class="grid h-16 grid-cols-5 items-center">
    {#each navItems as item}
      {@const isActive = page.url.pathname === item.href}
      {@const Icon = item.icon}
      <a
        href={item.href}
        class="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors
          {isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
      >
        <Icon class="h-5 w-5" />
        <span>{item.label}</span>
      </a>
    {/each}

    <!-- 5. Settings Tab -->
    <button
      type="button"
      onclick={() => (isSettingsOpen = true)}
      class="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
    >
      <Settings class="h-5 w-5" />
      <span>Settings</span>
    </button>
  </div>
</nav>

<SettingsModal bind:open={isSettingsOpen} />