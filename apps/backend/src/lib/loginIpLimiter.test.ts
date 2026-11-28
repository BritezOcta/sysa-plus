import assert from "node:assert/strict";
import { test } from "node:test";
import { afterFailure, remainingBlockMs, type ThrottleState } from "./loginIpLimiter.js";

const MINUTE = 60_000;
const opts = { maxFailures: 3, blockMs: 15 * MINUTE };

/** Registra n fallos seguidos en el instante `now`, partiendo de `state`. */
function fail(state: ThrottleState | null, now: number, n = 1): ThrottleState {
  let s = state;
  for (let i = 0; i < n; i++) s = afterFailure(s, now, opts);
  return s!;
}

test("bloquea la IP al llegar a 3 intentos fallidos y la libera al vencer el bloqueo", () => {
  const two = fail(null, 0, 2);
  assert.equal(remainingBlockMs(two, 0), 0);

  const three = fail(two, 0);
  assert.equal(remainingBlockMs(three, 0), 15 * MINUTE);
  assert.equal(remainingBlockMs(three, 15 * MINUTE), 0);
});

test("sin registro previo la IP no está bloqueada", () => {
  assert.equal(remainingBlockMs(null, 0), 0);
});

test("después de un bloqueo vencido, el conteo arranca de cero", () => {
  const blocked = fail(null, 0, 3);
  const afterBlock = fail(blocked, 15 * MINUTE);
  assert.equal(afterBlock.failures, 1);
  assert.equal(remainingBlockMs(afterBlock, 15 * MINUTE), 0);
});

test("los fallos viejos vencen: solo cuentan los de la ventana del bloqueo", () => {
  const two = fail(null, 0, 2);
  const third = fail(two, 15 * MINUTE);
  assert.equal(remainingBlockMs(third, 15 * MINUTE), 0);
  assert.equal(third.failures, 1);
});
