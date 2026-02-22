import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres.cctyhheiekmjzurdzvrp:faresdhaiban1234@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const client = new pg.Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function applyPatch() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        const sqlPath = path.join(__dirname, 'database', 'PATCH_UPDATE_OUTBOUND_PROC.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying patch...');
        await client.query(sql);

        console.log('✅ Patch applied successfully!');
    } catch (err) {
        console.error('❌ Error applying patch:');
        console.error(err.message);
    } finally {
        await client.end();
    }
}

applyPatch();
