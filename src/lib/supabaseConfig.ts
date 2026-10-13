/**
 * Leaderboard database connection (Supabase).
 *
 * These are PUBLIC values: the publishable key is meant to ship in the website, and the
 * database rules (supabase/schema.sql) only let it read scores and add new ones.
 * NEVER put the service_role / secret key here or anywhere in this repo.
 *
 * Build-time env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY override these if set.
 */
export const SUPABASE_URL = 'https://hexgnownercoarnnfkir.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kbQY6l8CU_Yp0_rM4U0IrQ_gXA1u7FX'
