import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lchtxsnwmiqsmgrgclhz.supabase.co';
const supabaseKey = 'sb_publishable_0lI8hlPu-wC8T2q6luhp7g_rf0JYPOe';

export const supabase = createClient(supabaseUrl, supabaseKey);
