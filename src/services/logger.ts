import { appendFileSync } from "fs";
import { join } from "path";

const LOG_PATH = join(import.meta.dir, "..", "..", "bot.log");

export function log(message: string): void {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  appendFileSync(LOG_PATH, line + "\n");
}
