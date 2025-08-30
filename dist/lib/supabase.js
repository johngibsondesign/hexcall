"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
let cachedClient = null;
function getSupabase() {
    if (cachedClient)
        return cachedClient;
    const url = env_1.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env_1.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key)
        return null;
    cachedClient = (0, supabase_js_1.createClient)(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
    return cachedClient;
}
