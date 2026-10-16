// src/routes/api_9482/sync/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
	// 1. Single User Token Check (supports Cloudflare env or fallback secret)
	const secret = platform?.env?.SYNC_SECRET || 'my-super-secret-sync-key';
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'D1 Database binding missing on server' }, { status: 500 });
	}

	try {
		const payload = await request.json();
		const { last_synced_at = '1970-01-01T00:00:00.000Z', media = [], lists = [] } = payload;
		const serverTime = new Date().toISOString();

		// -------------------------------------------------------------
		// 2. PUSH: Upsert Tracked Media (Last-Write-Wins)
		// -------------------------------------------------------------
		for (const item of media) {
			await db
				.prepare(
					`INSERT INTO tracked_media (
						key, media_id, type, title, poster_path, duration,
						status, liked, rating, notes, notes_updated_at, updated_at, deleted
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
    title = excluded.title,
    poster_path = excluded.poster_path,
    duration = excluded.duration,
    status = excluded.status,
    liked = excluded.liked,
    rating = excluded.rating,
    notes = excluded.notes,
    notes_updated_at = excluded.notes_updated_at,
    updated_at = excluded.updated_at,
    deleted = excluded.deleted`
				)
				.bind(
					item.key,
					String(item.mediaId),
					item.type,
					item.title,
					item.poster_path || null,
					item.duration || null,
					item.status,
					item.liked ? 1 : 0,
					item.rating || 0,
					item.notes || null,
					item.notes_updated_at || null,
					serverTime,
					item.deleted ? 1 : 0
				)
				.run();
		}

		// -------------------------------------------------------------
		// 3. PUSH: Upsert Custom Lists (With Smart Conflict Merging)
		// -------------------------------------------------------------
		for (const list of lists) {
			// If deleted, mark tombstone
			if (list.deleted) {
				await db
					.prepare(
						`INSERT INTO custom_lists (id, title, description, items_json, created_at, updated_at, deleted)
						VALUES (?, ?, ?, '[]', ?, ?, 1)
						ON CONFLICT(id) DO UPDATE SET
							updated_at = excluded.updated_at,
							deleted = 1
						WHERE excluded.updated_at >= custom_lists.updated_at`
					)
					.bind(list.id, list.title, list.description || null, list.created_at, serverTime)
					.run();
				continue;
			}

			// Check if list already exists in D1
			const existing: any = await db
				.prepare('SELECT * FROM custom_lists WHERE id = ?')
				.bind(list.id)
				.first();

			let finalItems = list.items || [];
			let finalTitle = list.title;
			let finalDesc = list.description || null;
			let finalUpdatedAt = serverTime;

			if (existing && !existing.deleted) {
				// Did another device also edit this list since the client's last sync?
				const conflictOccurred =
					new Date(existing.updated_at).getTime() > new Date(last_synced_at).getTime();

				if (conflictOccurred) {
					// BOTH DEVICES MODIFIED THIS LIST:
					// Merge items by unique mediaKey so neither device loses movies!
					const existingItems: any[] = JSON.parse(existing.items_json || '[]');
					const clientItems: any[] = list.items || [];

					const itemMap = new Map<string, any>();
					for (const item of existingItems) {
						itemMap.set(item.key, item);
					}
					for (const item of clientItems) {
						itemMap.set(item.key, item); // Union by key
					}

					finalItems = Array.from(itemMap.values());

					// If the remote list has a newer title/description, preserve it
					if (new Date(existing.updated_at).getTime() > new Date(list.updated_at).getTime()) {
						finalTitle = existing.title;
						finalDesc = existing.description;
					}
					// Timestamp reflects the new merged state
					finalUpdatedAt = serverTime;
				}
			}

			await db
				.prepare(
					`INSERT INTO custom_lists (
						id, title, description, items_json, created_at, updated_at, deleted
					) VALUES (?, ?, ?, ?, ?, ?, 0)
					ON CONFLICT(id) DO UPDATE SET
						title = excluded.title,
						description = excluded.description,
						items_json = excluded.items_json,
						updated_at = excluded.updated_at,
						deleted = 0`
				)
				.bind(
					list.id,
					finalTitle,
					finalDesc,
					JSON.stringify(finalItems),
					list.created_at,
					finalUpdatedAt
				)
				.run();
		}

		// -------------------------------------------------------------
		// 4. PULL: Fetch all updates modified on other devices
		// -------------------------------------------------------------
		const remoteMediaResult = await db
			.prepare(`SELECT * FROM tracked_media WHERE updated_at > ?`)
			.bind(last_synced_at)
			.all();

		const remoteListsResult = await db
			.prepare(`SELECT * FROM custom_lists WHERE updated_at > ?`)
			.bind(last_synced_at)
			.all();

		const remoteMedia = (remoteMediaResult.results || []).map((m: any) => ({
			key: m.key,
			mediaId: m.media_id,
			type: m.type,
			title: m.title,
			poster_path: m.poster_path,
			duration: m.duration,
			status: m.status,
			liked: Boolean(m.liked),
			rating: m.rating,
			notes: m.notes,
			notes_updated_at: m.notes_updated_at,
			updated_at: m.updated_at,
			deleted: Boolean(m.deleted)
		}));

		const remoteLists = (remoteListsResult.results || []).map((l: any) => ({
			id: l.id,
			title: l.title,
			description: l.description,
			items: JSON.parse(l.items_json || '[]'),
			created_at: l.created_at,
			updated_at: l.updated_at,
			deleted: Boolean(l.deleted)
		}));

		return json({
			server_time: serverTime,
			media: remoteMedia,
			lists: remoteLists
		});
	} catch (err: any) {
		console.error('API Sync Error:', err);
		return json({ error: err?.message || 'Sync failed' }, { status: 500 });
	}
};