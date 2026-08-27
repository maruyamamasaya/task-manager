import assert from "node:assert/strict";
import test from "node:test";
import { hasSupabaseSessionCookie } from "../lib/supabase/session-cookie.js";

test("recognizes complete and chunked Supabase auth cookies", () => {
  assert.equal(hasSupabaseSessionCookie([{ name: "sb-project-auth-token", value: "session" }]), true);
  assert.equal(hasSupabaseSessionCookie([{ name: "sb-project-auth-token.0", value: "chunk" }]), true);
});

test("ignores unrelated, verifier, and empty cookies", () => {
  assert.equal(hasSupabaseSessionCookie([{ name: "theme", value: "dark" }]), false);
  assert.equal(hasSupabaseSessionCookie([{ name: "sb-project-auth-token-code-verifier", value: "value" }]), false);
  assert.equal(hasSupabaseSessionCookie([{ name: "sb-project-auth-token", value: "" }]), false);
});
