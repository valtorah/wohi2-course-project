const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

router.get("/leaderboard", async (req, res) => {
  const topAttempts = await prisma.attempt.groupBy({
    by: ['userId'],
    where: { correct: true },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    },
    take: 5
  });

  const userIds = topAttempts.map(t => t.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true }
  });

  const leaderboard = topAttempts.map(attempt => {
    const user = users.find(u => u.id === attempt.userId);
    return {
      userId: attempt.userId,
      name: user ? user.name : "Unknown",
      email: user ? user.email : "unknown",
      score: attempt._count.id
    };
  });

  res.json(leaderboard);
});

module.exports = router;
