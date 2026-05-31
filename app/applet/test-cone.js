const THREE = require("three");
const camPos = new THREE.Vector3(0, 0, 0);
const targetPos = new THREE.Vector3(0, 0, -10); // panel is at -10 Z
const m = new THREE.Matrix4().lookAt(targetPos, camPos, new THREE.Vector3(0, 1, 0));
const lookAtQuat = new THREE.Quaternion().setFromRotationMatrix(m);
lookAtQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));

const vZ = new THREE.Vector3(0, 0, 1).applyQuaternion(lookAtQuat);
const vX = new THREE.Vector3(1, 0, 0).applyQuaternion(lookAtQuat);
console.log("Z points to:", vZ);
console.log("X points to:", vX);
