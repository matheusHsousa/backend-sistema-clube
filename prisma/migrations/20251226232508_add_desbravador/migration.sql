-- CreateEnum
CREATE TYPE "Unidade" AS ENUM ('DA', 'ASER', 'MANASSES', 'JUDA', 'BENJAMIN', 'RUBEN');

-- CreateEnum
CREATE TYPE "Classe" AS ENUM ('AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA');

-- CreateTable
CREATE TABLE "Desbravador" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "unidade" "Unidade" NOT NULL,
    "classe" "Classe" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Desbravador_pkey" PRIMARY KEY ("id")
);
