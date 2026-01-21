import { createClient } from '@supabase/supabase-js';

// Essas variáveis virão do arquivo .env (que configuraremos na Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);