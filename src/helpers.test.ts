import { test } from "node:test";
import * as assert from "node:assert";
import {
  doAABBsOverlap,
  checkPlacementValid,
  hasBrickAbove,
  isValidBrickData,
  checkStructureValid,
  getBrickAABB,
  getActivePresetBricks,
} from "./Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "./constants";

test("validates brick data correctly", () => {
  assert.ok(
    isValidBrickData({
      id: "b1",
      type: "2x4",
      color: "#ff0000",
      position: [0, 0, 0],
      rotation: 0,
    }),
  );

  assert.ok(
    !isValidBrickData({
      id: "b1",
      type: "unknown-type",
      color: "#ff0000",
      position: [0, 0, 0],
      rotation: 0,
    }),
    "should reject invalid type",
  );

  assert.ok(
    !isValidBrickData({
      id: "b1",
      type: "2x4",
      color: "#ff0000",
      position: [0, "0", 0], // string instead of number
      rotation: 0,
    }),
    "should reject invalid position array",
  );
});

test("AABB overlap detection", () => {
  const aabb1 = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
  const aabb2 = { minX: 1, maxX: 3, minZ: 1, maxZ: 3 }; // overlaps aabb1
  const aabb3 = { minX: 3, maxX: 5, minZ: 3, maxZ: 5 }; // no overlap

  assert.ok(doAABBsOverlap(aabb1, aabb2, 0.002));
  assert.ok(!doAABBsOverlap(aabb1, aabb3, 0.002));
});

test("valid and invalid brick placement", () => {
  const bricks = [
    {
      id: "b1",
      type: "2x4" as const,
      position: [0, 0, 0] as [number, number, number],
      rotation: 0,
    },
  ];

  // Ground placement
  const groundRet = checkPlacementValid(
    bricks,
    { id: "g1", type: "2x4", position: [0.16, 0, 0], rotation: 0 },
    MODULE_SIZE,
    BRICK_HEIGHT,
  );
  assert.strictEqual(groundRet.valid, true);

  // Overlapping existing
  const overlapRet = checkPlacementValid(
    bricks,
    { id: "g2", type: "2x4", position: [0, 0, 0], rotation: 0 },
    MODULE_SIZE,
    BRICK_HEIGHT,
  );
  assert.strictEqual(overlapRet.valid, false);
  assert.strictEqual(overlapRet.reason, "overlap");

  // Supported above existing
  const supportedRet = checkPlacementValid(
    bricks,
    { id: "g3", type: "2x2", position: [0, BRICK_HEIGHT, 0], rotation: 0 },
    MODULE_SIZE,
    BRICK_HEIGHT,
  );
  assert.strictEqual(supportedRet.valid, true);

  // Floating placement
  const floatRet = checkPlacementValid(
    bricks,
    { id: "g4", type: "2x2", position: [0.32, BRICK_HEIGHT, 0], rotation: 0 },
    MODULE_SIZE,
    BRICK_HEIGHT,
  );
  assert.strictEqual(floatRet.valid, false);
  assert.strictEqual(floatRet.reason, "floating");
});

test("hasBrickAbove detection", () => {
  const b1: any = { id: "b1", type: "2x4", position: [0, 0, 0], rotation: 0 };
  const b2: any = {
    id: "b2",
    type: "2x4",
    position: [0, BRICK_HEIGHT, 0],
    rotation: 0,
  };

  const bricks = [b1, b2];

  // b1 has b2 above it
  assert.ok(hasBrickAbove(b1, bricks, MODULE_SIZE, BRICK_HEIGHT));

  // b2 has nothing above it
  assert.ok(!hasBrickAbove(b2, bricks, MODULE_SIZE, BRICK_HEIGHT));
});

test("clipboard preset helper", () => {
  const clipboardMock: any[] = [
    { id: "c1", type: "2x2", position: [0, 0, 0], rotation: 0, color: "#123" },
  ];
  const bricks = getActivePresetBricks("clipboard", clipboardMock);

  assert.strictEqual(bricks, clipboardMock);
});

test("structure support check", () => {
  const base = [
    {
      id: "base1",
      type: "2x4" as const,
      position: [0, 0, 0] as [number, number, number],
      rotation: 0,
    },
  ];
  const newBricks = [
    {
      id: "new1",
      type: "2x4" as const,
      position: [0, BRICK_HEIGHT, 0] as [number, number, number],
      rotation: 0,
    },
  ];

  const res = checkStructureValid(base, newBricks, MODULE_SIZE, BRICK_HEIGHT);
  assert.ok(res.valid);

  const floatingBricks = [
    {
      id: "new2",
      type: "2x4" as const,
      position: [0.5, BRICK_HEIGHT, 0] as [number, number, number],
      rotation: 0,
    },
  ];
  const floatRes = checkStructureValid(
    base,
    floatingBricks,
    MODULE_SIZE,
    BRICK_HEIGHT,
  );
  assert.ok(!floatRes.valid);
});
