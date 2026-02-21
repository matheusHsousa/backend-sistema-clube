-- CreateTable
CREATE TABLE "ClasseEntity" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER,

    CONSTRAINT "ClasseEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClasseRequisito" (
    "id" SERIAL NOT NULL,
    "classeId" INTEGER NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CHECK',
    "grupoOpcao" INTEGER,
    "ordem" INTEGER,

    CONSTRAINT "ClasseRequisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesbravadorRequisito" (
    "id" SERIAL NOT NULL,
    "desbravadorId" INTEGER NOT NULL,
    "requisitoId" INTEGER NOT NULL,
    "instrutorId" INTEGER,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DesbravadorRequisito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClasseEntity_nome_key" ON "ClasseEntity"("nome");

-- AddForeignKey
ALTER TABLE "ClasseRequisito" ADD CONSTRAINT "ClasseRequisito_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "ClasseEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesbravadorRequisito" ADD CONSTRAINT "DesbravadorRequisito_desbravadorId_fkey" FOREIGN KEY ("desbravadorId") REFERENCES "Desbravador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesbravadorRequisito" ADD CONSTRAINT "DesbravadorRequisito_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "ClasseRequisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesbravadorRequisito" ADD CONSTRAINT "DesbravadorRequisito_instrutorId_fkey" FOREIGN KEY ("instrutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
