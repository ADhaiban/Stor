@echo off
echo Setting up Tawseel Store Database...

set DB_NAME=tawseel_db
set DB_USER=postgres

echo Creating database %DB_NAME% (if not exists)...
psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"

echo Running 01_core_schema.sql...
psql -U %DB_USER% -d %DB_NAME% -f 01_core_schema.sql

echo Running 02_financial_schema.sql...
psql -U %DB_USER% -d %DB_NAME% -f 02_financial_schema.sql

echo Running 03_movements_schema.sql...
psql -U %DB_USER% -d %DB_NAME% -f 03_movements_schema.sql

echo Running 04_views_and_procedures.sql...
psql -U %DB_USER% -d %DB_NAME% -f 04_views_and_procedures.sql

echo Running 05_seed_data.sql...
psql -U %DB_USER% -d %DB_NAME% -f 05_seed_data.sql

echo.
echo Database setup complete!
pause
