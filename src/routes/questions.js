const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name)
  };
}

router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const questions = await prisma.question.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" }
  });

  res.json(questions.map(formatQuestion));
});

router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);
  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: { keywords: true }
  });

  if (!question) {
    return res.status(404).json({
      message: "Question not found"
    });
  }

  res.json(formatQuestion(question));
});

router.post("/", async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      msg: "question and answer are mandatory"
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw }
        }))
      }
    },
    include: { keywords: true }
  });

  res.status(201).json(formatQuestion(newQuestion));
});

router.put("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer, keywords } = req.body;

  const existingQuestion = await prisma.question.findUnique({
    where: { id: qId }
  });

  if (!existingQuestion) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!question || !answer) {
    return res.status(400).json({
      msg: "question and answer are mandatory"
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const updatedQuestion = await prisma.question.update({
    where: { id: qId },
    data: {
      question,
      answer,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw }
        }))
      }
    },
    include: { keywords: true }
  });

  res.json(formatQuestion(updatedQuestion));
});

router.delete("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: { keywords: true }
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.question.delete({ where: { id: qId } });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question)
  });
});

module.exports = router;
