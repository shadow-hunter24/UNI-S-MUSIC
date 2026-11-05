/*
  Warnings:

  - The primary key for the `Follow` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `followingId` on the `Follow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Track` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `followingArtistId` to the `Follow` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followingId_fkey";

-- AlterTable
ALTER TABLE "ArtistProfile" ADD COLUMN     "country" TEXT,
ADD COLUMN     "headerImageUrl" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "totalFollowers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTracks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMPTZ,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_pkey",
DROP COLUMN "followingId",
ADD COLUMN     "followingArtistId" TEXT NOT NULL,
ADD CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId", "followingArtistId");

-- AlterTable
ALTER TABLE "Genre" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "trackCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TrackCredit" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");

-- AddForeignKey
ALTER TABLE "TrackCredit" ADD CONSTRAINT "TrackCredit_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackCredit" ADD CONSTRAINT "TrackCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingArtistId_fkey" FOREIGN KEY ("followingArtistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
