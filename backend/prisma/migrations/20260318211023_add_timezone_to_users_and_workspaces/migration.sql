-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
