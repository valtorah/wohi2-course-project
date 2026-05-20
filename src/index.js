const app = require("./app");
const logger = require("./lib/logger");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const server = app.listen(PORT, HOST, () => {
  logger.info({ port: PORT, host: HOST }, "server listening");
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
