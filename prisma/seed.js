const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "What does HTTP stand for?",
    answer: "Hypertext Transfer Protocol",
    keywords: ["http", "web"]
  },
  {
    question: "Which HTTP method is used to create a new resource?",
    answer: "POST",
    keywords: ["http", "api"]
  },
  {
    question: "What is Express.js?",
    answer: "A web application framework for Node.js",
    keywords: ["javascript", "backend"]
  },
  {
    question: "Which HTTP status code indicates a successful request?",
    answer: "200",
    keywords: ["http", "protocol"]
  }
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
        keywords: {
          connectOrCreate: q.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw }
          }))
        }
      }
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
