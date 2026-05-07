import { test } from 'node:test';
import assert from 'node:assert';
import {
  checkPlacementValid,
  checkStructureValid,
  hasBrickAbove,
  getBrickAABB,
  doAABBsOverlap,
  PresetName,
  BrickData,
  areBricksConnected
} from './Store.ts';

const MODULE_SIZE = 0.08;
const BRICK_HEIGHT = 0.096;

test('AABB Calculation and Overlap', () => {
  const b1: any = { type: '2x2', position: [0, 0, 0], rotation: 0 };
  const b2: any = { type: '2x2', position: [0.16, 0, 0], rotation: 0 };
  const a1 = getBrickAABB(b1);
  const a2 = getBrickAABB(b2);
  
  // 2x2 width is 0.16, so minX = -0.08, maxX = 0.08
  assert.strictEqual(a1.minX, -0.08);
  assert.strictEqual(a1.maxX, 0.08);

  // b2 is shifted by 0.16. minX = 0.08, maxX = 0.24
  assert.strictEqual(a2.minX, 0.08);
  assert.strictEqual(a2.maxX, 0.24);

  // They shouldn't overlap if epsilon is 0.001
  assert.strictEqual(doAABBsOverlap(a1, a2, 0.001), false);
  
  // They are connected if tested via areBricksConnected
  assert.strictEqual(areBricksConnected(b1, b2), true);
});

test('Placement Valid', () => {
  const groundBrick: any = { id: 'g1', type: '2x2', position: [0, 0, 0], rotation: 0 };
  
  // Supported precisely above
  const floatingBrick: any = { id: 'f1', type: '1x1', position: [0, BRICK_HEIGHT, 0], rotation: 0 };
  const res1 = checkPlacementValid([groundBrick], floatingBrick, MODULE_SIZE, BRICK_HEIGHT);
  assert.strictEqual(res1.valid, true);

  // Overlap
  const overlapBrick: any = { id: 'o1', type: '1x2', position: [0, 0, 0], rotation: 0 };
  const res2 = checkPlacementValid([groundBrick], overlapBrick, MODULE_SIZE, BRICK_HEIGHT);
  assert.strictEqual(res2.valid, false);
  assert.strictEqual(res2.reason, 'overlap');

  // Floating entirely
  const freeFloating: any = { id: 'ff1', type: '1x1', position: [1, BRICK_HEIGHT * 2, 1], rotation: 0 };
  const res3 = checkPlacementValid([groundBrick], freeFloating, MODULE_SIZE, BRICK_HEIGHT);
  assert.strictEqual(res3.valid, false);
  assert.strictEqual(res3.reason, 'floating');
});

test('Delete Support Logic', () => {
  const base1: any = { id: 'b1', type: '2x2', position: [0, 0, 0], rotation: 0 };
  const base2: any = { id: 'b2', type: '2x2', position: [0.16, 0, 0], rotation: 0 };
  
  const mid: any = { id: 'm1', type: '2x4', position: [0.08, BRICK_HEIGHT, 0], rotation: 90 };
  
  const world = [base1, base2, mid];

  // Base 1 supports mid, but if removed, base2 still supports mid!
  assert.strictEqual(hasBrickAbove(base1, world, MODULE_SIZE, BRICK_HEIGHT), false);

  // If mid is supported only by base1:
  const onlyBase1World = [base1, mid];
  assert.strictEqual(hasBrickAbove(base1, onlyBase1World, MODULE_SIZE, BRICK_HEIGHT), true);
});

test('Preset Validation', () => {
  // Try empty
  assert.strictEqual(checkStructureValid([], [], MODULE_SIZE, BRICK_HEIGHT).valid, false);

  const presetBricks: any[] = [
    { id: 'p1', type: '1x1', position: [0, 0, 0], rotation: 0 },
    { id: 'p2', type: '1x1', position: [0, BRICK_HEIGHT, 0], rotation: 0 }
  ];

  const res = checkStructureValid([], presetBricks, MODULE_SIZE, BRICK_HEIGHT);
  assert.strictEqual(res.valid, true);

  // Internal Floating Preset
  const floatingPreset: any[] = [
    { id: 'p1', type: '1x1', position: [0, 0, 0], rotation: 0 },
    { id: 'p2', type: '1x1', position: [1, BRICK_HEIGHT, 1], rotation: 0 }
  ];
  
  const resFloat = checkStructureValid([], floatingPreset, MODULE_SIZE, BRICK_HEIGHT);
  assert.strictEqual(resFloat.valid, false);
  assert.strictEqual(resFloat.reason, 'unsupported');
});
