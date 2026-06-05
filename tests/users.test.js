const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("leaderboard tests", () => {
  it("returns top users by correct attempts", async () => {
    const t1 = await registerAndLogin("a@a.io", "A");
    const t2 = await registerAndLogin("b@b.io", "B");
    
    const q1 = await createQuestion(t1, { question: "Q1", answer: "A1" });
    const q2 = await createQuestion(t2, { question: "Q2", answer: "A2" });

    // User A plays q1 correct, q2 correct (2 points)
    await request(app).post(`/api/questions/${q1.id}/play`).set("Authorization", `Bearer ${t1}`).send({ answer: "A1" });
    await request(app).post(`/api/questions/${q2.id}/play`).set("Authorization", `Bearer ${t1}`).send({ answer: "A2" });

    // User B plays q1 correct (1 point)
    await request(app).post(`/api/questions/${q1.id}/play`).set("Authorization", `Bearer ${t2}`).send({ answer: "A1" });

    const res = await request(app).get("/api/users/leaderboard");
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe("A");
    expect(res.body[0].score).toBe(2);
    expect(res.body[1].name).toBe("B");
    expect(res.body[1].score).toBe(1);
  });
});
