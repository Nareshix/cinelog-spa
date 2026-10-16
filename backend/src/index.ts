export interface Env {
	DB: D1Database;
	SYNC_SECRET?: string;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400'
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);
		if (url.pathname !== '/sync' && url.pathname !== '/') {
			return new Response('Not Found', { status: 404, headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
		}

		const secret = env.SYNC_SECRET || 'my-super-secret-sync-key';
		const auth = request.headers.get('Authorization');
		if (!auth || auth !== `Bearer ${secret}`) {
			return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
		}

		try {
			const { last_synced_at = '1970-01-01T00:00:00.000Z', media = [], lists = [] } = (await request.json()) as any;
			const serverTime = new Date().toISOString();

			// 1. PUSH Tracked Media
			for (const item of media) {
				await env.DB.prepare(`
					INSERT INTO tracked_media (
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
						deleted = excluded.deleted
				`).bind(
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
				).run();
			}

			// 2. PUSH Custom Lists
			for (const list of lists) {
				if (list.deleted) {
					await env.DB.prepare(`
						INSERT INTO custom_lists (id, title, description, items_json, created_at, updated_at, deleted)
						VALUES (?, ?, ?, '[]', ?, ?, 1)
						ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1
					`).bind(list.id, list.title, list.description || null, list.created_at, serverTime).run();
					continue;
				}

				const existing: any = await env.DB.prepare('SELECT * FROM custom_lists WHERE id = ?').bind(list.id).first();

				let finalItems = list.items || [];
				let finalTitle = list.title;
				let finalDesc = list.description || null;

				if (existing && !existing.deleted) {
					const conflict = new Date(existing.updated_at).getTime() > new Date(last_synced_at).getTime();
					if (conflict) {
						const existingItems: any[] = JSON.parse(existing.items_json || '[]');
						const map = new Map<string, any>();
						for (const i of existingItems) map.set(i.key, i);
						for (const i of list.items || []) map.set(i.key, i);
						finalItems = Array.from(map.values());
						if (new Date(existing.updated_at).getTime() > new Date(list.updated_at).getTime()) {
							finalTitle = existing.title;
							finalDesc = existing.description;
						}
					}
				}

				await env.DB.prepare(`
					INSERT INTO custom_lists (id, title, description, items_json, created_at, updated_at, deleted)
					VALUES (?, ?, ?, ?, ?, ?, 0)
					ON CONFLICT(id) DO UPDATE SET
						title = excluded.title,
						description = excluded.description,
						items_json = excluded.items_json,
						updated_at = excluded.updated_at,
						deleted = 0
				`).bind(
					list.id,
					finalTitle,
					finalDesc,
					JSON.stringify(finalItems),
					list.created_at,
					serverTime
				).run();
			}

			// 3. PULL Updates
			const remoteMediaRes = await env.DB.prepare('SELECT * FROM tracked_media WHERE updated_at > ?').bind(last_synced_at).all();
			const remoteListsRes = await env.DB.prepare('SELECT * FROM custom_lists WHERE updated_at > ?').bind(last_synced_at).all();

			const remoteMedia = (remoteMediaRes.results || []).map((m: any) => ({
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

			const remoteLists = (remoteListsRes.results || []).map((l: any) => ({
				id: l.id,
				title: l.title,
				description: l.description,
				items: JSON.parse(l.items_json || '[]'),
				created_at: l.created_at,
				updated_at: l.updated_at,
				deleted: Boolean(l.deleted)
			}));

			return Response.json({
				server_time: serverTime,
				media: remoteMedia,
				lists: remoteLists
			}, { headers: corsHeaders });
		} catch (err: any) {
			return Response.json({ error: err?.message || 'Sync failed' }, { status: 500, headers: corsHeaders });
		}
	}
};