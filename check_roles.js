
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Roles found:', JSON.stringify(data, null, 2));
    }
}

checkRoles();
