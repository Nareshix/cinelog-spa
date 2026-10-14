<script lang="ts">
    import { page } from "$app/state";
    import { House, Search, Library, List } from "lucide-svelte";

    const navItems = [
        { label: "Home", href: "/", icon: House },
        { label: "Search", href: "/search", icon: Search },
        { label: "Library", href: "/library", icon: Library },
        { label: "List", href: "/list", icon: List },
    ];
</script>

<!-- DESKTOP TOP BAR (Hidden on mobile) -->
<header
    class="sticky top-0 z-40 hidden w-full border-b border-border/40 bg-background/95 backdrop-blur md:block"
>
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div class="font-semibold tracking-tight">MyApp</div>

        <nav class="flex items-center gap-1">
            {#each navItems as item}
                {@const isActive = page.url.pathname === item.href}
                <a
                    href={item.href}
                    class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
            {isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
                >
                    <svelte:component this={item.icon} class="h-4 w-4" />
                    <span>{item.label}</span>
                </a>
            {/each}
        </nav>
    </div>
</header>

<!-- MOBILE BOTTOM BAR (Hidden on desktop, padded for phone notches) -->
<nav
    aria-label="Mobile Navigation"
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
    <div class="grid h-16 grid-cols-4 items-center">
        {#each navItems as item}
            {@const isActive = page.url.pathname === item.href}
            <a
                href={item.href}
                class="flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors
          {isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'}"
            >
                <svelte:component this={item.icon} class="h-5 w-5" />
                <span>{item.label}</span>
            </a>
        {/each}
    </div>
</nav>
