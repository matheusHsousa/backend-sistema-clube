-- CreateTable
CREATE TABLE "TextoBiblico" (
    "id" SERIAL NOT NULL,
    "atrasadoId" INTEGER NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAprovacao" TIMESTAMP(3),
    "aprovadorId" INTEGER,

    CONSTRAINT "TextoBiblico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TextoBiblico" ADD CONSTRAINT "TextoBiblico_atrasadoId_fkey" FOREIGN KEY ("atrasadoId") REFERENCES "Atrasado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextoBiblico" ADD CONSTRAINT "TextoBiblico_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
