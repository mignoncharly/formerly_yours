// RLS security suite for trust & safety (Phase 7, §7).
//
//   - a user CANNOT escalate their own role or lift their own suspension
//     (column privileges, not just RLS);
//   - reports: create your own, read only your own (or staff);
//   - blocks: own-only, no self-block, no spoofing;
//   - the moderation functions reject non-staff and work for staff, and staff
//     role is set only by privileged code.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

describe("trust & safety RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB, reportId;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("a user CANNOT escalate their own role", async () => {
    const res = await rest(tokenA, `profiles?id=eq.${userA.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "super_admin" }),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, "42501");
    const check = await rest("service", `profiles?id=eq.${userA.id}&select=role`);
    assert.equal((await check.json())[0].role, "user");
  });

  test("a user CANNOT lift their own suspension", async () => {
    const res = await rest(tokenA, `profiles?id=eq.${userA.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_suspended: false }),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, "42501");
  });

  test("anonymous CANNOT create a report", async () => {
    const res = await rest("anon", "reports", {
      method: "POST",
      body: JSON.stringify({ reporter_id: userA.id, reported_user_id: userB.id, reason: "spam" }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, "42501");
  });

  test("user A CAN file a report", async () => {
    const res = await rest(tokenA, "reports", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ reporter_id: userA.id, reported_user_id: userB.id, reason: "harassment" }),
    });
    assert.equal(res.status, 201);
    reportId = (await res.json())[0].id;
  });

  test("user B CANNOT read user A's report", async () => {
    const res = await rest(tokenB, `reports?id=eq.${reportId}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B must not see A's report");
  });

  test("user A CAN block user B; B cannot see A's blocks", async () => {
    const block = await rest(tokenA, "blocked_users", {
      method: "POST",
      body: JSON.stringify({ blocker_id: userA.id, blocked_id: userB.id }),
    });
    assert.equal(block.status, 201);
    const bReads = await rest(tokenB, `blocked_users?blocker_id=eq.${userA.id}&select=blocked_id`);
    assert.deepEqual(await bReads.json(), [], "B must not read A's blocks");
  });

  test("self-block is rejected by the DB", async () => {
    const res = await rest(tokenA, "blocked_users", {
      method: "POST",
      body: JSON.stringify({ blocker_id: userA.id, blocked_id: userA.id }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, "23514");
  });

  test("user A CANNOT spoof a block as user B", async () => {
    const res = await rest(tokenA, "blocked_users", {
      method: "POST",
      body: JSON.stringify({ blocker_id: userB.id, blocked_id: userA.id }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("a non-staff user CANNOT resolve a report", async () => {
    const res = await rest(tokenB, "rpc/resolve_report", {
      method: "POST",
      body: JSON.stringify({ in_report: reportId, new_status: "dismissed" }),
    });
    assert.ok(res.status >= 400, `expected an error, got ${res.status}`);
    const check = await rest("service", `reports?id=eq.${reportId}&select=status`);
    assert.equal((await check.json())[0].status, "open", "report must remain open");
  });

  test("is_staff() is false for a normal user", async () => {
    const res = await rest(tokenA, "rpc/is_staff", { method: "POST", body: "{}" });
    assert.equal(await res.json(), false);
  });

  test("a staff user (role set by service) CAN resolve a report", async () => {
    // Only privileged code can grant staff.
    await rest("service", `profiles?id=eq.${userA.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "moderator" }),
    });
    const staff = await rest(tokenA, "rpc/is_staff", { method: "POST", body: "{}" });
    assert.equal(await staff.json(), true);

    const res = await rest(tokenA, "rpc/resolve_report", {
      method: "POST",
      body: JSON.stringify({ in_report: reportId, new_status: "resolved", reason: "handled" }),
    });
    assert.ok(res.status >= 200 && res.status < 300, `expected 2xx, got ${res.status}`);
    const check = await rest("service", `reports?id=eq.${reportId}&select=status`);
    assert.equal((await check.json())[0].status, "resolved");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] trust & safety RLS suite targeting ${host}`);
}
