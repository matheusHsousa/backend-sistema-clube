-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SECRETARIA';

-- DropForeignKey
ALTER TABLE "Atrasado" DROP CONSTRAINT "Atrasado_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Atrasado" ADD CONSTRAINT "Atrasado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
