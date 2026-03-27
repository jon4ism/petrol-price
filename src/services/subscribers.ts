import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Resolve relative to project root (two levels up from src/services/)
const FILE_PATH = join(import.meta.dir, "..", "..", "subscribers.json");

function readIds(): number[] {
  try {
    const text = readFileSync(FILE_PATH, "utf8");
    return JSON.parse(text) as number[];
  } catch {
    return [];
  }
}

function writeIds(ids: number[]): void {
  writeFileSync(FILE_PATH, JSON.stringify(ids, null, 2));
}

export function subscribe(chatId: number): void {
  const ids = readIds();
  if (!ids.includes(chatId)) {
    ids.push(chatId);
    writeIds(ids);
  }
}

export function unsubscribe(chatId: number): void {
  writeIds(readIds().filter((id) => id !== chatId));
}

export function getSubscribers(): number[] {
  return readIds();
}
