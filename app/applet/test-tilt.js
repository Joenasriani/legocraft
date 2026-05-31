const THREE = require("three");

const camPos = new THREE.Vector3(0, 1.7, 0); // user standing
const targetPos = new THREE.Vector3(0, 1.0, -1.4); // panel below user
const m = new THREE.Matrix4().lookAt(targetPos, camPos, new THREE.Vector3(0, 1, 0));
const lookAtQuat = new THREE.Quaternion().setFromRotationMatrix(m);
lookAtQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));

const vZ = new THREE.Vector3(0, 0, 1).applyQuaternion(lookAtQuat);
const vY = new THREE.Vector3(0, 1, 0).applyQuaternion(lookAtQuat);

console.log("Z points to:", vZ);
console.log("Y points to:", vY);
