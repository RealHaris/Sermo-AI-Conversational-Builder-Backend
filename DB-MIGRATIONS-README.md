# Database Migrations

This project uses [sequelize-auto-migrations](https://github.com/scimonster/sequelize-auto-migrations) to automatically generate migration files from your Sequelize models.

## Setup

The configuration is already set up in the `.sequelizerc` file, and the necessary scripts are added to `package.json`.

## How to Use

### Initial Setup (One-time)

If you have an existing database that you've been syncing with `sequelize.sync()`, follow these steps to transition to migrations:

1. Make sure your models accurately reflect your current database structure.
2. Generate a baseline migration (this will be the starting point):
   ```bash
   npm run db:recreate-migrations
   ```
   This creates:
   - A migration file in the `src/db/migrations` directory.
   - A `_current.json` file that tracks your model state.

3. Since your database already has the tables, mark this migration as "applied" by inserting it into the `SequelizeMeta` table:
   ```sql
   INSERT INTO SequelizeMeta VALUES ('XXXXXXXXXXXXXX-initial-migration.js');
   ```
   (Replace `XXXXXXXXXXXXXX` with the timestamp in your migration filename.)

### Regular Workflow

1. When you make changes to your models:
   ```bash
   npm run db:makemigrations -- --name describe-your-changes
   ```

2. Preview migration changes before applying:
   ```bash
   npm run db:makemigrations:preview
   ```

3. Check if tables exist and will be created by migrations:
   ```bash
   npm run db:check-tables
   ```

4. Apply migrations to the database:
   ```bash
   npm run db:migrate
   ```

5. Undo the most recent migration:
   ```bash
   npm run db:migrate:undo
   ```

6. Undo all migrations:
   ```bash
   npm run db:migrate:undo:all
   ```

## Important Notes

1. **Renaming Columns**: The auto-migration tool will interpret column renames as a drop and add operation, which can lead to data loss. You'll need to manually edit the migration file to use `renameColumn` instead.

2. **Foreign Keys**: Make sure the models define relationships correctly for proper foreign key generation.

3. **_current.json**: This file tracks your model state - don't delete it!

4. **Execution Order**: Sometimes the migrations might have order issues with foreign keys. Use the `--preview` option to check before applying.

5. **Database Backups**: Always back up your database before running migrations in production. 
