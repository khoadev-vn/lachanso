const { spawn } = require("child_process");

const backend = spawn("node", ["server/index.js"], { stdio: "inherit", shell: true });
const frontend = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
  process.exit(code ?? 0);
}

backend.on("exit", (code) => {
  console.error(`[dev-all] Backend exited (code ${code})`);
  if (!shuttingDown) shutdown(code);
});
frontend.on("exit", (code) => {
  console.error(`[dev-all] Frontend exited (code ${code})`);
  if (!shuttingDown) shutdown(code);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
