// Dice roll styles. Each dice_<id> variable type (see vartypes-3d.js, DICE_STYLES) rolls the way registered here under its id.
// The default 'dice_tumble' / 'diceroll' roll is `throwDie` in vartypes-3d.js, registered as M.rolls.tumble: READ IT FIRST, it is the reference.
// Contract: function (cell, faceIdx, sides, delay, D, amp, rm, x0) returns [flyAnim, shadowAnim, cubeAnim]
//   cell  : the .vd3-cell for one die. Inside it: .vd3-fly (moves the die, translate and squash), .vd3-shadow, .vd3-cube (3D pose).
//   faceIdx : the face that must be facing the camera at the end: its final cube transform is facing(geom(sides).faces[faceIdx].fr).
//   delay : ms this die starts late (several dice). D : base duration ms. Every animation lasts D + delay in total, fill 'both'.
//   amp   : intensity 0 to 1. rm : room { R, L0, Hm, xmin, xmax, row }: R die radius px, L0 touchdown height, Hm the top of the arc, xmin/xmax x limits.
//   x0    : sideways travel the die is allowed (from sweeps(); 0 can happen: stay put). Keep x within [rm.xmin, rm.xmax] and heights within L0..Hm
//           so the whole die stays inside the stage in every frame (it is clipped by the stage).
// The FIRST keyframe of each animation must be exactly the resting pose (the cube's current computed transform, `getComputedStyle(cube).transform`,
// or IDLE if none) so nothing jumps at the click. The LAST keyframe: fly at rest (translate(0,0) scale(1,1)), shadow at rest, cube = facing pose.
// Randomise the spin axis so rolls differ. Use Web Animations API only. The vartypes roll() picks the result BEFORE any animation; you only land it.
// Helpers from PL_MOTION.dice: geom, facing, IDLE, unit, f4, rand, clamp, room, sweeps. Set nothing else global.
(function () {
  'use strict';
  const M = window.PL_MOTION;
  if (!M || !M.dice || !M.rolls) return;
  const { geom, facing, IDLE, unit, f4, rand, clamp } = M.dice;
  const reg = (id, fn) => { M.rolls[id] = fn; };


// ===== ROLL drop (agent A) =====
// (empty: falls back to the tumble until written)
// ===== END drop =====



// ===== ROLL flip (agent A) =====
// (empty: falls back to the tumble until written)
// ===== END flip =====





// ================ agent boundary ================





// ===== ROLL cup (agent B) =====
// (empty: falls back to the tumble until written)
// ===== END cup =====



// ===== ROLL float (agent B) =====
// (empty: falls back to the tumble until written)
// ===== END float =====





// ================ agent boundary ================





// ===== ROLL spin (agent C) =====
// (empty: falls back to the tumble until written)
// ===== END spin =====



// ===== ROLL tray (agent C) =====
// (empty: falls back to the tumble until written)
// ===== END tray =====





// ================ agent boundary ================





// ===== ROLL throw (agent D) =====
// (empty: falls back to the tumble until written)
// ===== END throw =====


})();
