import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcdqszdosvvhxcxczgzt.supabase.co';
const supabaseAnonKey = 'sb_publishable_4v4O8f8tHLAx0Ep2HYbvcA_xv2t5kgv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
