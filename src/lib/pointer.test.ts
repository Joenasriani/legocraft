import { test } from "node:test";
import assert from "node:assert/strict";
import { clientToCanvasNDC } from "./pointer";

test("clientToCanvasNDC converts coordinates correctly", async (t) => {
  const rect = { left: 100, top: 50, width: 800, height: 600 };

  await t.test("center of canvas gives 0,0", () => {
    const ndc = clientToCanvasNDC(500, 350, rect); // 100 + 400, 50 + 300
    assert.equal(ndc.x, 0);
    assert.equal(ndc.y, 0);
  });

  await t.test("top-left gives -1,1", () => {
    const ndc = clientToCanvasNDC(100, 50, rect);
    assert.equal(ndc.x, -1);
    assert.equal(ndc.y, 1);
  });

  await t.test("bottom-right gives 1,-1", () => {
    const ndc = clientToCanvasNDC(900, 650, rect);
    assert.equal(ndc.x, 1);
    assert.equal(ndc.y, -1);
  });

  await t.test("outside boundaries give >1 or <-1", () => {
    const ndcLeft = clientToCanvasNDC(50, 350, rect);
    assert.ok(ndcLeft.x < -1);
    
    const ndcRight = clientToCanvasNDC(1000, 350, rect);
    assert.ok(ndcRight.x > 1);

    const ndcTop = clientToCanvasNDC(500, 0, rect);
    assert.ok(ndcTop.y > 1);

    const ndcBottom = clientToCanvasNDC(500, 800, rect);
    assert.ok(ndcBottom.y < -1);
  });

  await t.test("handles non-integer subpixels correctly", () => {
    const ndc = clientToCanvasNDC(100.5, 50.5, rect);
    assert.ok(ndc.x > -1 && ndc.x < 0);
    assert.ok(ndc.y < 1 && ndc.y > 0);
  });
});
