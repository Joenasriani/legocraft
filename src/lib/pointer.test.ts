import { describe, test, expect } from "vitest";
import { clientToCanvasNDC } from "./pointer";

describe("clientToCanvasNDC converts coordinates correctly", () => {
  const rect = { left: 100, top: 50, width: 800, height: 600 };

  test("center of canvas gives 0,0", () => {
    const ndc = clientToCanvasNDC(500, 350, rect); // 100 + 400, 50 + 300
    expect(ndc.x).toBe(0);
    expect(ndc.y).toBe(0);
  });

  test("top-left gives -1,1", () => {
    const ndc = clientToCanvasNDC(100, 50, rect);
    expect(ndc.x).toBe(-1);
    expect(ndc.y).toBe(1);
  });

  test("bottom-right gives 1,-1", () => {
    const ndc = clientToCanvasNDC(900, 650, rect);
    expect(ndc.x).toBe(1);
    expect(ndc.y).toBe(-1);
  });

  test("outside boundaries give >1 or <-1", () => {
    const ndcLeft = clientToCanvasNDC(50, 350, rect);
    expect(ndcLeft.x < -1).toBe(true);
    
    const ndcRight = clientToCanvasNDC(1000, 350, rect);
    expect(ndcRight.x > 1).toBe(true);

    const ndcTop = clientToCanvasNDC(500, 0, rect);
    expect(ndcTop.y > 1).toBe(true);

    const ndcBottom = clientToCanvasNDC(500, 800, rect);
    expect(ndcBottom.y < -1).toBe(true);
  });

  test("handles non-integer subpixels correctly", () => {
    const ndc = clientToCanvasNDC(100.5, 50.5, rect);
    expect(ndc.x > -1 && ndc.x < 0).toBe(true);
    expect(ndc.y < 1 && ndc.y > 0).toBe(true);
  });
});
