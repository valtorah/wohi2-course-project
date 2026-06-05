const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const { z } = require("zod");
const { ValidationError, NotFoundError } = require("../lib/errors");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new ValidationError("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticate);

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords ? question.keywords.map((k) => k.name) : [],
    userName: question.user?.name || null,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined
  };
}

const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
  difficulty: z.preprocess((val) => Number(val), z.number().min(1).max(5)).optional(),
});

router.get("/", async (req, res) => {
  const { keyword, difficulty } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const where = {};
  if (keyword) where.keywords = { some: { name: keyword } };
  if (difficulty) where.difficulty = parseInt(difficulty);

  const [filteredQuestions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { 
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: filteredQuestions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/quiz", async (req, res) => {
  const allIds = await prisma.question.findMany({ select: { id: true } });
  const ids = allIds.map(q => q.id).sort(() => 0.5 - Math.random()).slice(0, 10);
  
  const randomQuestions = await prisma.question.findMany({
    where: { id: { in: ids } },
    include: {
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
    }
  });
  
  res.json(randomQuestions.map(formatQuestion));
});

router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);
  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: { 
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
    }
  });

  if (!question) throw new NotFoundError("Question not found");

  res.json(formatQuestion(question));
});

router.post("/", upload.single("image"), async (req, res) => {
  const data = QuestionInput.parse(req.body);

  const keywordsArray = parseKeywords(data.keywords);
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newQuestion = await prisma.question.create({
    data: {
      question: data.question,
      answer: data.answer,
      difficulty: data.difficulty || 1,
      imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw }
        }))
      }
    },
    include: { 
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
    }
  });

  res.status(201).json(formatQuestion(newQuestion));
});

router.put("/:qId", upload.single("image"), isOwner, async (req, res) => {
  const qId = Number(req.params.qId);
  const dataPayload = QuestionInput.parse(req.body);

  const keywordsArray = parseKeywords(dataPayload.keywords);

  const data = {
    question: dataPayload.question,
    answer: dataPayload.answer,
    difficulty: dataPayload.difficulty || 1,
    keywords: {
      set: [],
      connectOrCreate: keywordsArray.map((kw) => ({
        where: { name: kw },
        create: { name: kw }
      }))
    }
  };

  if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;

  const updatedQuestion = await prisma.question.update({
    where: { id: qId },
    data,
    include: { 
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
    }
  });

  res.json(formatQuestion(updatedQuestion));
});

router.delete("/:qId", isOwner, async (req, res) => {
  const qId = Number(req.params.qId);
  const question = req.question;

  await prisma.question.delete({ where: { id: qId } });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question)
  });
});

router.post("/:qId/play", async (req, res) => {
  const qId = Number(req.params.qId);
  const { answer } = req.body;

  if (!answer) {
    throw new ValidationError("answer is required");
  }

  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) {
    throw new NotFoundError("Question not found");
  }

  const correct = question.answer.trim().toLowerCase() === answer.trim().toLowerCase();

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user.userId,
      questionId: qId,
      correct,
      submittedAnswer: answer,
      correctAnswer: question.answer
    }
  });

  res.status(201).json({
    id: attempt.id,
    correct: attempt.correct,
    submittedAnswer: attempt.submittedAnswer,
    correctAnswer: attempt.correctAnswer,
    createdAt: attempt.createdAt
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError ||
      err?.message === "Only image files are allowed") {
    return res.status(400).json({ msg: err.message });
  }
  next(err);
});

module.exports = router;
