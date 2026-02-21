Coloque aqui arquivos JSON com os cartões de requisitos de cada classe.
Formato esperado (exemplo):

{
  "nome": "NOME_DA_CLASSE",
  "ordem": 1,
  "requisitos": [
    { "categoria": "I - Geral", "descricao": "Descrição do requisito" },
    { "categoria": "V - Saúde e Aptidão Física", "descricao": "Natação I", "grupoOpcao": 1 }
  ]
}

Nomes dos arquivos: `AMIGO.json`, `COMPANHEIRO.json`, etc. O seed fará upsert por `nome`.
