import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runSqlFile(filePath) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not defined in .env');
        process.exit(1);
    }

    const client = new Client({ connectionString });
    try {
        await client.connect();
        const fullPath = path.resolve(process.cwd(), filePath);
        const sql = fs.readFileSync(fullPath, 'utf8');
        console.log(`Executing SQL from: ${fullPath}...`);
        await client.query(sql);
        console.log('SQL executed successfully.');
    } catch (err) {
        console.error('Error executing SQL:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Please specify the SQL file to run: node run_db_update.js path/to/file.sql');
    process.exit(1);
}

runSqlFile(sqlFile);
