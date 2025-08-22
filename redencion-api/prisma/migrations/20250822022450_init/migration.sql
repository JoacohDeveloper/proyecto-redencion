-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'CLIENT');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "adminUserUserId" TEXT,
ADD COLUMN     "clientUserUserId" TEXT,
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "public"."AdminUser" (
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."ClientUser" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_adminUserUserId_fkey" FOREIGN KEY ("adminUserUserId") REFERENCES "public"."AdminUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_clientUserUserId_fkey" FOREIGN KEY ("clientUserUserId") REFERENCES "public"."ClientUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientUser" ADD CONSTRAINT "ClientUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
