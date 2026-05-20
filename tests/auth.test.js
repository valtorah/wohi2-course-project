const bcrypt = require("bcryptjs");
const { resetDb, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("auth tests", () => {
  it("registers, hashes the password, returns a token", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345", name: "A" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));

    const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
    expect(user.password).not.toBe("pw12345");
    expect(await bcrypt.compare("pw12345", user.password)).toBe(true);
  });

  it("returns 400 for missing fields during registration", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "a@test.io" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    await request(app).post("/api/auth/register").send({ email: "a@test.io", password: "123", name: "A" });
    const res = await request(app).post("/api/auth/register").send({ email: "a@test.io", password: "123", name: "B" });
    expect(res.status).toBe(409);
  });

  it("logs in with valid credentials", async () => {
    await request(app).post("/api/auth/register").send({ email: "a@test.io", password: "123", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "a@test.io", password: "123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("returns 401 for wrong credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@test.io", password: "123" });
    expect(res.status).toBe(401);
  });
});
