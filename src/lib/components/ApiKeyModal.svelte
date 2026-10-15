<!-- src/lib/components/ApiKeyModal.svelte -->
<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import { tmdb } from "$lib/tmdb.svelte";
    import { Key, Loader2, ExternalLink } from "lucide-svelte";

    let inputKey = $state("");
    let isValidating = $state(false);
    let errorMessage = $state<string | null>(null);

    // Pre-fill current key whenever the modal opens
    $effect(() => {
        if (tmdb.isOpenModal) {
            inputKey = tmdb.apiKey;
            errorMessage = null;
        }
    });

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = inputKey.trim();
        if (!trimmed) {
            errorMessage = "Please enter an API key or Read Access Token.";
            return;
        }

        isValidating = true;
        errorMessage = null;

        const isValid = await tmdb.validateKey(trimmed);
        isValidating = false;

        if (!isValid) {
            errorMessage = "Invalid TMDB API Key. Please verify and try again.";
            return;
        }

        tmdb.setApiKey(trimmed);
        tmdb.isOpenModal = false;
    }
</script>

<Dialog.Root
    open={tmdb.isOpenModal}
    onOpenChange={(open) => {
        // Prevent closing if no valid key is set yet
        if (!open && !tmdb.hasKey) return;
        tmdb.isOpenModal = open;
    }}
>
    <Dialog.Content class="sm:max-w-md" hideClose={!tmdb.hasKey}>
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Key class="h-5 w-5 text-primary" />
                TMDB API Key Required
            </Dialog.Title>
            <Dialog.Description>
                This app is entirely client-side and requires your own TMDB API
                key or API Read Access Token (v4).
            </Dialog.Description>
        </Dialog.Header>

        <form onsubmit={handleSubmit} class="space-y-4 pt-2">
            <div class="space-y-2">
                <Label for="api-key">API Key or Read Access Token</Label>
                <Input
                    id="api-key"
                    type="password"
                    placeholder="Paste your key or token here..."
                    bind:value={inputKey}
                    disabled={isValidating}
                    autocomplete="off"
                />
                {#if errorMessage}
                    <p class="text-xs text-destructive">{errorMessage}</p>
                {/if}
            </div>

            <div
                class="rounded-md border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground"
            >
                <div class="flex items-center justify-between">
                    <span>Need a TMDB API key?</span>
                    <a
                        href="https://www.themoviedb.org/settings/api"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center text-primary hover:underline font-medium gap-1"
                    >
                        Get API Key
                        <ExternalLink class="h-3 w-3" />
                    </a>
                </div>
            </div>

            <Dialog.Footer class="gap-2 sm:gap-0">
                {#if tmdb.hasKey}
                    <Button
                        type="button"
                        variant="outline"
                        onclick={() => (tmdb.isOpenModal = false)}
                        disabled={isValidating}
                    >
                        Cancel
                    </Button>
                {/if}
                <Button
                    type="submit"
                    disabled={isValidating || !inputKey.trim()}
                >
                    {#if isValidating}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                    {:else}

                        Save API Key
                    {/if}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
