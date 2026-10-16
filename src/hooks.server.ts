// src/hooks.server.ts
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

let platformProxy: any = null;

export const handle: Handle = async ({ event, resolve }) => {
	// Only in local development: bridge wrangler D1 emulator to event.platform
	if (dev && !event.platform?.env?.DB) {
		try {
			if (!platformProxy) {
				const { getPlatformProxy } = await import('wrangler');
				platformProxy = await getPlatformProxy({ configPath: 'wrangler.toml' });
			}
			event.platform = {
				...event.platform,
				...platformProxy
			};
		} catch (e) {
			console.error('Could not load local Wrangler D1 proxy:', e);
		}
	}

	return resolve(event);
};