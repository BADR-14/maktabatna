-- CreateEnum
CREATE TYPE "WallSide" AS ENUM ('back', 'left', 'right');

-- CreateEnum
CREATE TYPE "Finish" AS ENUM ('wood', 'aluminum');

-- AlterTable
ALTER TABLE "bookcases" ADD COLUMN     "finish" "Finish" NOT NULL DEFAULT 'wood',
ADD COLUMN     "wall_side" "WallSide";

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "openings" JSONB NOT NULL DEFAULT '[]';
