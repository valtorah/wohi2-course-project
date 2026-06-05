const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("questions tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown question", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 400 for invalid body", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "" });
    expect(res.status).toBe(400);
  });

  it("creates a question", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q1", answer: "A1" });
    expect(res.status).toBe(201);
    expect(res.body.question).toBe("Q1");
  });

  it("returns 403 when editing someone else's question", async () => {
    const aliceToken = await registerAndLogin("alice@test.io", "Alice");
    const question = await createQuestion(aliceToken, { question: "Alice's Q" });

    const bobToken = await registerAndLogin("bob@test.io", "Bob");
    const res = await request(app).put(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ question: "hijacked", answer: "x" });

    expect(res.status).toBe(403);

    const after = await prisma.question.findUnique({ where: { id: question.id } });
    expect(after.question).toBe("Alice's Q");
  });

  it("returns 403 when deleting someone else's question", async () => {
    const aliceToken = await registerAndLogin("alice@test.io", "Alice");
    const question = await createQuestion(aliceToken, { question: "Alice's Q" });

    const bobToken = await registerAndLogin("bob@test.io", "Bob");
    const res = await request(app).delete(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${bobToken}`);

    expect(res.status).toBe(403);

    const after = await prisma.question.findUnique({ where: { id: question.id } });
    expect(after).not.toBeNull();
  });

  it("supports difficulty filtering", async () => {
    const token = await registerAndLogin();
    await createQuestion(token, { question: "Q1", answer: "A1", difficulty: 1 });
    await createQuestion(token, { question: "Q2", answer: "A2", difficulty: 5 });

    const res = await request(app).get("/api/questions?difficulty=5").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].difficulty).toBe(5);
  });

  it("returns random quiz questions", async () => {
    const token = await registerAndLogin();
    for (let i = 0; i < 12; i++) {
      await createQuestion(token, { question: `Q${i}`, answer: `A${i}` });
    }

    const res = await request(app).get("/api/questions/quiz").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
  });
});
