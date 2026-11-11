/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `firebase_uid` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firebaseUid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `displayName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firebaseUid` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- Rename existing snake_case columns to camelCase (preserves data)
ALTER TABLE "users" RENAME COLUMN "display_name" TO "displayName";
ALTER TABLE "users" RENAME COLUMN "firebase_uid" TO "firebaseUid";
ALTER TABLE "users" RENAME COLUMN "avatar_url"    TO "avatarUrl";
ALTER TABLE "users" RENAME COLUMN "created_at"    TO "createdAt";
ALTER TABLE "users" RENAME COLUMN "updated_at"    TO "updatedAt";

-- Rename the existing unique index to match the new column name
ALTER INDEX "users_firebase_uid_key" RENAME TO "users_firebaseUid_key";

-- Add the genuinely new columns (safe — defaults or nullable)
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Index for soft-delete lookups
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");