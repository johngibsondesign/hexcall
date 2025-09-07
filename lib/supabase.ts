import { createClient } from '@supabase/supabase-js';
import { env } from './env';

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
	if (cachedClient) return cachedClient;
	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return null;
	cachedClient = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
	
	// Sign in anonymously to enable presence tracking (RLS requirement)
	cachedClient.auth.signInAnonymously().then(({ error }) => {
		if (error) {
			console.warn('[Supabase] Anonymous auth failed, presence might not work:', error);
		} else {
			console.log('[Supabase] Anonymous authentication successful');
		}
	});
	
	return cachedClient;
}


