-- CreateTable
CREATE TABLE "Atrasado" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "desbravadorId" INTEGER,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,

    CONSTRAINT "Atrasado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Atrasado" ADD CONSTRAINT "Atrasado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atrasado" ADD CONSTRAINT "Atrasado_desbravadorId_fkey" FOREIGN KEY ("desbravadorId") REFERENCES "Desbravador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
