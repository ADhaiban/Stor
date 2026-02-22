
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*, roles(name, display_name)');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Users found:', JSON.stringify(data, null, 2));
    }
}

checkUsers();
