"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
exports.supabase = (0, supabase_js_1.createClient)(env_1.env.NEXT_PUBLIC_SUPABASE_URL, env_1.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
});
