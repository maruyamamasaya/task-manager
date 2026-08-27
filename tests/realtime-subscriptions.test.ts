import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const productionRoots = ["app", "components", "lib"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx)$/.test(entry) ? [path] : [];
  });
}

test("production code does not create Supabase Realtime subscriptions", () => {
  const subscriptionApi = /\.(?:channel|subscribe)\s*\(|postgres_changes|removeChannel\s*\(|\.unsubscribe\s*\(/;
  const offenders = productionRoots
    .flatMap(sourceFiles)
    .filter((path) => subscriptionApi.test(readFileSync(path, "utf8")));

  assert.deepEqual(offenders, [], `Unexpected Realtime API usage: ${offenders.join(", ")}`);
});
