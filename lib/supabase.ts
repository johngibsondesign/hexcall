import { createClient } from '@supabase/supabase-js';
import { env } from './env';

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
	if (cachedClient) return cachedClient;
	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return null;
	cachedClient = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
	return cachedClient;
}


