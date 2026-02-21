import { PrismaClient, Role, Unidade, Classe } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco...');

  // Limpa tabelas (opcional, garante idempotência)
  // Deletar em ordem respeitando FK: progresso -> requisitos -> classes -> desbravadores -> users
  await (prisma as any).desbravadorRequisito.deleteMany();
  await (prisma as any).classeRequisito.deleteMany();
  await (prisma as any).classeEntity.deleteMany();
  await prisma.desbravador.deleteMany();
  await prisma.user.deleteMany();

  // Usuários fictícios
  const users = [
    {
      firebaseUid: 'uid-admin-1',
      email: 'admin@example.com',
      name: 'Administrador Teste',
      roles: [Role.ADMIN],
      unidade: null,
      classe: null,
    },
    {
      firebaseUid: 'uid-instr-1',
      email: 'instrutor@example.com',
      name: 'Instrutor Silva',
      roles: [Role.INSTRUTOR],
      unidade: Unidade.MANASSES,
      classe: null,
    },
    {
      firebaseUid: 'uid-cons-1',
      email: 'conselheiro@example.com',
      name: 'Conselheiro Souza',
      roles: [Role.CONSELHEIRO],
      unidade: Unidade.DA,
      classe: null,
    },
    {
      firebaseUid: 'uid-multi-roles',
      email: 'multi@example.com',
      name: 'Multi Roles',
      roles: [Role.INSTRUTOR, Role.CONSELHEIRO],
      unidade: Unidade.RUBEN,
      classe: Classe.PIONEIRO,
    },
  ];

  for (const u of users) {
    // upsert via firebaseUid
    await prisma.user.create({ data: u });
  }

  // Desbravadores fictícios
  const desbravadores = [
    { name: 'João Pereira', birthDate: new Date('2012-04-10'), unidade: Unidade.DA, classe: Classe.AMIGO },
    { name: 'Maria Oliveira', birthDate: new Date('2011-09-21'), unidade: Unidade.ASER, classe: Classe.COMPANHEIRO },
    { name: 'Carlos Santos', birthDate: new Date('2010-01-05'), unidade: Unidade.MANASSES, classe: Classe.PESQUISADOR },
    { name: 'Ana Beatriz', birthDate: new Date('2009-07-30'), unidade: Unidade.JUDA, classe: Classe.PIONEIRO },
    { name: 'Pedro Lima', birthDate: new Date('2013-11-12'), unidade: Unidade.BENJAMIN, classe: Classe.EXCURSIONISTA },
    { name: 'Luiza Rocha', birthDate: new Date('2008-02-17'), unidade: Unidade.RUBEN, classe: Classe.GUIA },
  ];

  for (const d of desbravadores) {
    await prisma.desbravador.create({ data: d });
  }

  // Criar Classe e Requisitos exemplo: AMIGO (upsert para idempotência)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'AMIGO' },
    update: {},
    create: {
      nome: 'AMIGO',
      ordem: 1,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 10 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do Clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Memorizar e explicar o Voto e a Lei do Desbravador.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube do livro Juvenil do ano em curso.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "Vaso de barro".' },
          { categoria: 'I - Geral', descricao: 'Participar ativamente da classe bíblica do seu clube.' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento sobre a Criação e os dias correspondentes.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar as 10 pragas do Egito.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Saber os nomes das 12 Tribos de Israel.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Conhecer os 39 livros do Antigo Testamento e demonstrar habilidade para encontrá-los.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar João 3:16; Efésios 6:1-3; II Timóteo 3:16; Salmo 1.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura Bíblica: Gênesis: 1, 2, 3, 4:1-16, 6:11-22, 7, 8, 9:1-19, 11:1-9, 12:1-10, 13, 14:18-24, 15, 17:1-8; 15-22, 18:1-15, 18: 16-33, 19:1-29, 21:1-21, 22:1-19, 23, 24:1-46, 48, 24:52-67, 27, 28, 29, 30:25-31; 31:2-3, 17-18, 32, 33, 37, 40, 41, 42, 43, 44, 45, 47, 50; Êxodo: 1, 2, 3, 4:1-17; 27-31, 5, 7, 8, 9, 10; 11, 12, 13:17-22; 14, 15:22-27; 16, 17, 18, 19, 20, 24, 32, 33, 34:1-14; 29-35, 35:4-29 e 40.` },

          { categoria: 'III - Servindo a Outros', descricao: 'Dedicar duas horas ajudando alguém em sua comunidade em duas atividades propostas.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Mencionar dez qualidades de um bom amigo e apresentar situações onde praticou a Regra Áurea (Mateus 7:12).' },
          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Saber cantar o Hino Nacional e conhecer sua história.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Natação principiante I', grupoOpcao: 1 },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Cultura física', grupoOpcao: 1 },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Nós e amarras', grupoOpcao: 1 },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Segurança básica na água', grupoOpcao: 1 },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Explicar princípios de temperança usando a experiência de Daniel.' },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Memorizar e explicar Daniel 1:8.' },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Escrever compromisso pessoal de seguir um estilo de vida saudável.' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Acompanhar o processo de planejamento até a execução de uma caminhada de 5 quilômetros.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Felinos (especialidade)', grupoOpcao: 2 },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Cães (especialidade)', grupoOpcao: 2 },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Mamíferos (especialidade)', grupoOpcao: 2 },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Sementes (especialidade)', grupoOpcao: 2 },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Aves de Estimação (especialidade)', grupoOpcao: 2 },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Aprender e demonstrar purificação de água e relacionar ao significado espiritual.' },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Aprender e montar três tipos de barracas.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Demonstrar cuidados com corda e executar os nós listados (Simples, Cego, Direito, Cirurgião, Lais de guia, Lais de guia duplo, Escota, Catau, Pescador, Fateixa, Volta da fiel, Nó de gancho, Volta da ribeira, Ordinário).' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Completar a especialidade de Acampamento I.' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Apresentar 10 regras para uma caminhada e explicar o que fazer quando estiver perdido.' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Aprender sinais para seguir uma pista e preparar/seguir uma pista de mínimo 10 sinais.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar uma especialidade na área de Artes e Habilidades Manuais.' },

          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Memorizar, cantar ou tocar o Hino dos Desbravadores e conhecer a história.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Escolher um personagem do Antigo Testamento e conversar com o grupo sobre o amor e cuidado de Deus.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Levar pelo menos dois amigos não adventistas à Escola Sabatina ou ao Clube de Desbravadores.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Conhecer princípios de higiene e boas maneiras à mesa.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Fazer a especialidade de Arte de acampar.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Conhecer e identificar 10 flores silvestres e 10 insetos da região.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Começar uma fogueira com apenas um fósforo usando materiais naturais.' },
          { categoria: 'Classe Avançada - Amigo da Natureza', descricao: 'Usar corretamente faca, facão e machadinha e conhecer regras de segurança.' },
        ]
      }
    }
  });

  // ---- Seed adicional a partir de arquivos JSON em backend/prisma/seed-data ----
  async function seedFromFiles() {
    const dataDir = path.join(__dirname, 'seed-data');
    if (!fs.existsSync(dataDir)) return;
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
        const obj = JSON.parse(raw);
        if (!obj || !obj.nome) {
          console.warn('Arquivo de seed ignorado (formato inválido):', file);
          continue;
        }

        await (prisma as any).classeEntity.upsert({
          where: { nome: obj.nome },
          update: {},
          create: {
            nome: obj.nome,
            ordem: obj.ordem || 99,
            requisitos: {
              create: (obj.requisitos || []).map((r: any) => ({
                categoria: r.categoria || null,
                descricao: r.descricao || '',
                grupoOpcao: r.grupoOpcao || null,
              })),
            },
          },
        });
        console.log('Seed a partir de arquivo aplicado:', file);
      } catch (err) {
        console.error('Erro lendo seed file', file, err);
      }
    }
  }

  await seedFromFiles();

  // Criar Classe e Requisitos: COMPANHEIRO (upsert idempotente)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'COMPANHEIRO' },
    update: {},
    create: {
      nome: 'COMPANHEIRO',
      ordem: 2,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 11 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do Clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Ilustrar de forma criativa o significado do Voto dos Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube do Livro Juvenil do ano em curso e escrever um parágrafo sobre o que mais lhe chamou a atenção ou considerou importante.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "Um simples lanche".' },
          { categoria: 'I - Geral', descricao: 'Participar ativamente da classe bíblica do seu clube.' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar seu conhecimento dos 10 Mandamentos: A Lei de Deus dada a Moisés.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento dos 27 livros do Novo Testamento e demonstrar habilidade para encontrar qualquer um deles.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar Isa. 41:9-10; Heb. 13:5; Prov. 22:6; I João 1:9; Salmo 8.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura Bíblica: Levítico: 11; Números: 9:15-23, 11, 12, 13, 14:1-38, 16, 17, 20:1-13; 22-29, 21:4-9, 22, 23; 24:1-10; Deuteronômio: 1:1-17, 32:1-43, 33, 34; Josué: 1,2,3,4,5:10,6,7,9,24:1-15,29; Juízes: 6,7,13:1-18,14,15,16; Rute:1,2,3,4; 1 Samuel: 1-6,8-10,11:12-15,12,13,15-17,18:1-19,20,21:1-7,22,24-26,31; 2 Samuel:1,5,6,7,9,11,12:1-25,15,18` },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Em consulta com o seu conselheiro, escolher um dos temas (parábola de Jesus / milagre de Jesus / sermão da montanha / sermão sobre a Segunda Vinda de Cristo) e demonstrar conhecimento por troca de ideias, atividade de grupo ou redação.' },

          { categoria: 'III - Servindo a Outros', descricao: 'Planejar e dedicar pelo menos duas horas servindo sua comunidade e demonstrando companheirismo para alguém, de maneira prática.' },
          { categoria: 'III - Servindo a Outros', descricao: 'Dedicar pelo menos cinco horas participando de um projeto que beneficiará sua comunidade ou igreja.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Conversar com seu conselheiro ou unidade sobre como respeitar pessoas de diferentes culturas, raça e sexo.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Memorizar e explicar I Coríntios 9:24-27.' },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Conversar com seu líder sobre a aptidão física e os exercícios físicos regulares que se relacionam com uma vida saudável.' },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Aprender sobre os prejuízos que o cigarro causa à saúde e escrever seu compromisso de não fazer uso do fumo.' },
          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Completar uma das seguintes especialidades: Natação Principiante II ou Acampamento II.' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Dirigir ou colaborar em uma meditação criativa para a sua unidade ou Clube.' },
          { categoria: 'VI - Organização e Liderança', descricao: 'Ajudar no planejamento de uma excursão ou acampamento com sua unidade ou clube, envolvendo pelo menos um pernoite.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Participar de jogos da natureza, ou caminhada ecológica em meio a natureza, pelo período de uma hora.' },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Completar duas das seguintes especialidades: Anfíbios, Aves, Aves domésticas, Pecuária, Répteis, Moluscos, Árvores, Arbustos.' },
          { categoria: 'VII - Estudo da Natureza', descricao: 'Recapitular o estudo da criação e fazer um diário por sete dias registrando suas observações do que foi criado em cada dia correspondente.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Descobrir os pontos cardeais sem a ajuda de uma bússola e desenhar uma Rosa dos Ventos.' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Participar em um acampamento de final de semana, e fazer um relatório destacando o que mais lhe impressionou positivamente.' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Aprender ou recapitular os seguintes nós: Oito, Volta do salteador, Duplo, Caminhoneiro, Direito, Volta do fiel, Escota, Lais de guia, Simples.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar uma especialidade não realizada anteriormente. Na seção de Artes e Habilidades Manuais.' },

          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Aprender e demonstrar a composição, significado e uso correto da Bandeira Nacional.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Ler a primeira visão de Ellen White e discutir como Deus usa os profetas para apresentar Sua mensagem à igreja (ver "Primeiros Escritos", pág. 13-20).' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Participar de uma atividade missionária ou comunitária, envolvendo também um amigo.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Conversar com seu conselheiro ou unidade sobre como demonstrar respeito pelos seus pais ou responsáveis e fazer uma lista mostrando como cuidam de você.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Participar de uma caminhada de 6 quilômetros preparando ao final um relatório de uma página.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Escolher um dos seguintes itens: Assistir à um "curso como deixar de fumar"; Assistir à dois filmes sobre saúde; Elaborar um cartaz sobre o prejuízo das drogas; Ajudar a preparar material para uma exposição ou passeata sobre saúde; Pesquisar na internet informações sobre saúde e escrever uma página sobre os resultados encontrados.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Identificar e descrever 12 aves nativas e 12 árvores nativas.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Participar de uma das seguintes cerimônias e sugerir ideias criativas de como realiza-las: Investidura, Admissão de lenço, Dia do desbravador.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Preparar uma refeição em uma fogueira durante um acampamento de clube ou unidade.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Preparar um quadro com 15 nós diferentes.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Completar a especialidade de Excursionismo pedestre com mochila.' },
          { categoria: 'Classe Avançada - Companheiro de Excursionismo', descricao: 'Completar uma especialidade não realizada anteriormente: Habilidades Domésticas, Ciência e Saúde, Atividades Missionárias ou Atividades Agrícolas.' },
        ]
      }
    }
  });

  // Criar Classe e Requisitos: PESQUISADOR (upsert idempotente)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'PESQUISADOR' },
    update: {},
    create: {
      nome: 'PESQUISADOR',
      ordem: 3,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 12 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do Clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Demonstrar sua compreensão do significado da Lei do Desbravador através de representação, debate ou redação.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube do Livro Juvenil do ano e escrever dois parágrafos sobre o que mais lhe chamou a atenção ou considerou importante.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "Além da Magia".' },
          { categoria: 'I - Geral', descricao: 'Participar ativamente da classe bíblica do seu clube.' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento: Levítico 11: regras para alimentos comestíveis e não comestíveis.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar Ecles. 12:13-14; Rom. 6:23; Apoc. 1:3; Isa. 43:1-2; Salmo 51:10; Salmo 16.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura Bíblica: 1 Reis: 1:28-53, 3, 4:20-34, 5, 6, 8:12-60, 10, 11:6-43, 12, 16:29-33; 17:1-7, 17:8-24, 18, 19, 21; 2 Reis: 2, 4:1-7, 4:8-41, 5, 6:1-23, 6:24-33, 7, 20, 22, 23:36-37, 24, 25:1-7; 2 Crônicas: 24:1-14, 36; Esdras: 1, 3, 6:14-15; Neemias: 1, 2, 4, 8; Ester: 1-8; Jó: 1, 2, 42; Salmos: 1,15,19,23,24,27,37,39,42,46,67,90-92,97,98,100,117,119:1-176,121,125,150; Provérbios: 1,3,4,10,15,20,25; Eclesiastes: 1` },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Escolher uma das histórias (Nicodemos; a mulher samaritana; o bom samaritano; o filho pródigo; Zaqueu) e demonstrar compreensão através de grupo, mensagem, cartazes/maquete ou poesia/hino.' },

          { categoria: 'III - Servindo a Outros', descricao: 'Conhecer projetos comunitários na sua cidade e participar em pelo menos um com sua unidade ou clube.' },
          { categoria: 'III - Servindo a Outros', descricao: 'Participar em três atividades missionárias da igreja.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Participar de um debate ou representação sobre pressão de grupo e visitar um órgão público para descobrir como o clube pode ajudar a comunidade.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Escolher uma atividade e escrever um texto pessoal para um estilo de vida livre do álcool (discussão, vídeo, etc.).' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Dirigir uma cerimônia de abertura da reunião semanal ou programa de Escola Sabatina; ajudar a organizar a classe bíblica.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Identificar a estrela Alfa da constelação do Centauro e a constelação de Órion; completar uma das especialidades: Astronomia, Cactos, Climatologia, Flores, Rastreio de animais.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Apresentar seis segredos para um bom acampamento; participar de acampamento de final de semana planejando e cozinhando duas refeições.' },
          { categoria: 'VIII - Arte de Acampar', descricao: 'Completar as especialidades: Acampamento III, Primeiros Socorros - básico; aprender a usar bússola ou GPS e demonstrar habilidade encontrando endereços.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar uma especialidade não realizada anteriormente, em Artes e Habilidades Manuais.' },

          { categoria: 'Classe Avançada - Pesquisador de Campo e Bosque', descricao: 'Conhecer e saber usar a Bandeira dos Desbravadores, o bandeirim de unidade e os comandos de ordem unida.' },
          { categoria: 'Classe Avançada - Pesquisador de Campo e Bosque', descricao: 'Ler a história de J. N. Andrews ou um pioneiro do país e discutir a importância do trabalho missionário.' },
          { categoria: 'Classe Avançada - Pesquisador de Campo e Bosque', descricao: 'Convidar uma pessoa para assistir Clube, Classe Bíblica ou Pequeno Grupo.' },
          { categoria: 'Classe Avançada - Pesquisador de Campo e Bosque', descricao: 'Completar especialidades como Asseio e Cortesia Cristã ou Vida Familiar; participar de caminhada de 10 km; participar na organização de eventos especiais; identificar pegadas e fazer modelos; aprender amarras básicas e construir móvel de acampamento; planejar cardápio vegetariano de 3 dias; comunicar por sinais (Morse, LIBRAS, Braile).' },
          { categoria: 'Classe Avançada - Pesquisador de Campo e Bosque', descricao: 'Completar duas especialidades não realizadas anteriormente em: Habilidades Domésticas, Ciência e Saúde, Atividades Missionárias ou Atividades Agrícolas.' },
        ]
      }
    }
  });

  // Criar Classe e Requisitos: EXCURSIONISTA (upsert idempotente)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'EXCURSIONISTA' },
    update: {},
    create: {
      nome: 'EXCURSIONISTA',
      ordem: 4,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 14 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do Clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Memorizar e explicar o significado do Objetivo JA.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube do Livro Juvenil do ano em curso e resumi-lo em uma página.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "O Fim do Começo".' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento: 12 Apóstolos e Frutos do Espírito.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar Rom. 8:28; Apoc. 21:1-3; II Ped. 1:20-21; I João 2:14; II Cro. 20:20; Salmo 46.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Estudar a pessoa do Espírito Santo e seu papel no crescimento espiritual; estudar eventos finais e a segunda vinda de Cristo; descobrir o significado da observância do sábado.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura bíblica: Mateus: 24,25,26:1-35,26:36-75,27:1-66,28; Marcos: 7,9,10,11,12,16; Lucas: 1:4-25,1:26-66,2:21-38,2:39-52,7:18-28,8,10:1-37,10:38-42,11:1-13,12,13,14,15,16:1-17,17,18,19,21,22,23,24; João: 1-6,6:1-71,8:1-38,9-21; Atos: 1-8.` },

          { categoria: 'III - Servindo a Outros', descricao: 'Convidar um amigo para participar de atividade social e participar de um projeto comunitário desde o planejamento até a execução.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Examinar atitudes sobre autoestima, relacionamento familiar, finanças pessoais, pressão de grupo; preparar lista de atividades recreativas e colaborar na organização de uma delas.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Completar a especialidade de Temperança.' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Preparar um organograma da igreja local e participar em dois programas envolvendo diferentes departamentos; completar a especialidade Aventuras com Cristo.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Relacionar Nicodemos com o ciclo de vida da lagarta/borboleta e completar uma especialidade de Estudos da Natureza não realizada anteriormente.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Com grupo (>=4) e conselheiro adulto, andar pelo menos 20 km em área rural incluindo uma noite ao ar livre; planejar expedição e documentar observações; completar especialidade de Pioneirias.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar uma especialidade não realizada anteriormente em Atividades missionárias, agrícolas, Ciência e saúde ou Habilidades domésticas.' },

          { categoria: 'Classe Avançada - Excursionista na Mata', descricao: 'Apresentar trabalho sobre respeito à Lei de Deus e autoridades; acompanhar líder em visita missionária; completar especialidades (Testemunho Juvenil, Vida Silvestre, Ordem Unida) e atividades práticas de campo (construção de móveis, identificação de pegadas, primeiros socorros).' },
        ]
      }
    }
  });

  // Criar Classe e Requisitos: GUIA (upsert idempotente)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'GUIA' },
    update: {},
    create: {
      nome: 'GUIA',
      ordem: 6,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 15 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Memorizar e explicar o Voto de Fidelidade à Bíblia.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube de Leitura Juvenil do ano em curso e resumi-lo em uma página.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "O livro amargo".' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento: 3 Mensagens Angélicas (Apoc. 14:6-12), as 7 Igrejas do Apocalipse e as Pedras Preciosas (12 fundamentos da Nova Jerusalém).' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar I Cor. 13; II Cron. 7:14; Apoc. 22:18-20; II Tim. 4:6-7; Rom. 8:38-39; Mateus 6:33-34.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Descrever os dons espirituais mencionados por Paulo e seu propósito para a igreja; estudar a estrutura e serviço do santuário e relacionar com o ministério de Jesus.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e resumir três histórias de pioneiros adventistas e apresentá-las no clube, culto JA ou Escola Sabatina.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura bíblica: Atos: 9:1-31,9:32-43,10-28; Romanos: 12-14; 1 Coríntios:13; 2 Coríntios:5:11-21,11:16-33,12:1-10; Gálatas:5:16-26,6:1-10; Efésios:5:1-21,6; Filipenses:4; Colossenses:3; 1 Tessalonicenses:4:13-18,5; 2 Tessalonicenses:2,3; 1 Timóteo:4:6-16,5:1-16,6:11-21; 2 Timóteo:2,3; Hebreus:11; Tiago:1,3,5:7-20; 1 Pedro:1,5:1-11; 2 Pedro:3; 1 João:2-5; Judas:1:17-25; Apocalipse:1-3,7:9-17,12-14,19-21.` },

          { categoria: 'III - Servindo a Outros', descricao: 'Ajudar a organizar e participar de visita a doente, adotar uma família em necessidade ou executar um projeto aprovado pelo líder; praticar métodos de evangelismo pessoal.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Assistir palestra e examinar atitudes sobre escolha profissional, relacionamento com pais, escolha de parceiro e plano divino para o sexo.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Apresentar os oito remédios naturais para alunos do ensino fundamental; completar atividade relacionada à saúde (poesia, corrida, leitura de Temperança, especialidade de Nutrição ou Cultura Física).' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Preparar organograma da estrutura da Igreja na Divisão; participar em curso para conselheiros/ convenção de liderança; planejar e ensinar requisitos de uma especialidade.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Ler capítulo 7 de "O Desejado de Todas as Nações" e apresentar lições; completar especialidade em Ecologia ou Conservação Ambiental.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Participar de acampamento com estrutura de pioneiria, planejar e cozinhar três refeições ao ar livre; construir e usar um móvel de acampamento.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar especialidade não realizada anteriormente em Atividades agrícolas, Ciência e saúde, Habilidades domésticas ou Atividades profissionais.' },

          { categoria: 'Classe Avançada - Guia de Exploração', descricao: 'Completar especialidade de Mordomia; ler "O maior discurso de Cristo" e escrever sobre o impacto; cumprir requisitos de evangelismo, relatórios sobre atividades dos diáconos, mestrados e especialidades relacionadas.' },
        ]
      }
    }
  });

  // Criar Classe e Requisitos: PIONEIRO (upsert idempotente)
  await (prisma as any).classeEntity.upsert({
    where: { nome: 'PIONEIRO' },
    update: {},
    create: {
      nome: 'PIONEIRO',
      ordem: 5,
      requisitos: {
        create: [
          { categoria: 'I - Geral', descricao: 'Ter, no mínimo, 13 anos de idade.' },
          { categoria: 'I - Geral', descricao: 'Ser membro ativo do Clube de Desbravadores.' },
          { categoria: 'I - Geral', descricao: 'Memorizar e entender o Alvo e o Lema JA.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro do Clube do Livro Juvenil do ano em curso e resumi-lo em uma página.' },
          { categoria: 'I - Geral', descricao: 'Ler o livro "Expedição Galápagos".' },

          { categoria: 'II - Descoberta Espiritual', descricao: 'Memorizar e demonstrar conhecimento das Bem-Aventuranças e o sermão da montanha.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Ler e explicar Isa. 26:3; Rom. 12:12; João 14:1-3; Sal. 37:5; Filip. 3:12-14; Salmo 23; I Sam. 15:22.' },
          { categoria: 'II - Descoberta Espiritual', descricao: 'Conversar no clube sobre o que é o cristianismo, características de um verdadeiro discípulo e como viver como cristão; participar de estudo sobre inspiração da Bíblia.' },
          { categoria: 'II - Descoberta Espiritual', descricao: `Leitura bíblica: Eclesiastes: 3,5,7,11,12; Isaías: 5,11,26:1-12,35,40,43,52:13-15,53,58,60,61; Jeremias: 9:23-26,10:1-16,18:1-6,26,36,52:1-11; Daniel: 1-12; Joel: 2:12-31; Amós: 7:10-16,8:4-11; Jonas:1-4; Miqueias:4; Ageu:2; Zacarias:4; Malaquias:3,4; Mateus:1-23` },

          { categoria: 'III - Servindo a Outros', descricao: 'Participar em dois projetos missionários definidos pelo clube; trabalhar em um projeto comunitário da igreja, escola ou comunidade.' },

          { categoria: 'IV - Desenvolvendo Amizade', descricao: 'Participar de debate e autoavaliação sobre autoestima, amizade, relacionamentos, otimismo/pessimismo.' },

          { categoria: 'V - Saúde e Aptidão Física', descricao: 'Preparar um programa pessoal de exercícios físicos diários e assinar compromisso de realizá-los; discutir vantagens do estilo de vida Adventista.' },

          { categoria: 'VI - Organização e Liderança', descricao: 'Assistir seminário/treinamento em ministério pessoal ou evangelismo; participar de atividade social da igreja.' },

          { categoria: 'VII - Estudo da Natureza', descricao: 'Estudar dilúvio e fossilização; completar uma especialidade em Estudos da Natureza não realizada anteriormente.' },

          { categoria: 'VIII - Arte de Acampar', descricao: 'Fazer fogo refletor e demonstrar uso; participar de acampamento de final de semana organizando mochila; completar especialidade de Resgate básico.' },

          { categoria: 'IX - Estilo de Vida', descricao: 'Completar uma especialidade não realizada anteriormente em Atividades Missionárias, Profissionais ou Agrícolas.' },

          { categoria: 'Classe Avançada - Pioneiro de Novas Fronteiras', descricao: 'Completar especialidade de Cidadania Cristã; encenar o bom samaritano e auxiliar três pessoas; participar de atividade física (escolher e completar uma das opções) e apresentar relatório.' },
          { categoria: 'Classe Avançada - Pioneiro de Novas Fronteiras', descricao: 'Completar especialidade de Mapa e bússola; demonstrar habilidade com machadinha e acender fogo em dia de chuva; pesquisar 10 plantas comestíveis ou demonstrar habilidades de comunicação/velocidade conforme requisitos.' },
          { categoria: 'Classe Avançada - Pioneiro de Novas Fronteiras', descricao: 'Completar especialidade de Fogueiras e cozinha ao ar livre e outras especialidades práticas listadas.' },
        ]
      }
    }
  });

  console.log('Seed finalizado com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
