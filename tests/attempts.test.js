const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("attempts tests", () => {
  it("correct attempt is recorded", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token, { question: "Q", answer: "A" });

    const res = await request(app).post(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "A" });

    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);

    const attempt = await prisma.attempt.findUnique({ where: { id: res.body.id } });
    expect(attempt.correct).toBe(true);
  });

  it("incorrect attempt is recorded", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token, { question: "Q", answer: "A" });

    const res = await request(app).post(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "B" });

    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(false);

    const attempt = await prisma.attempt.findUnique({ where: { id: res.body.id } });
    expect(attempt.correct).toBe(false);
  });
});
