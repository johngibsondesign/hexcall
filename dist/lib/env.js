"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    METERED_TURN_URL: process.env.METERED_TURN_URL || '',
    METERED_TURN_USERNAME: process.env.METERED_TURN_USERNAME || '',
    METERED_TURN_CREDENTIAL: process.env.METERED_TURN_CREDENTIAL || '',
};
