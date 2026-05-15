import * as THREE from "three";

export function getSafePanelTransform(camera: THREE.Camera): { position: THREE.Vector3, quaternion: THREE.Quaternion } {
  const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const camFwd = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
  // Flatten forward direction
  camFwd.y = 0;
  if (camFwd.lengthSq() < 0.001) camFwd.set(0, 0, -1);
  camFwd.normalize();

  const distance = 1.35; // 1.35m in front of headset
  const position = camPos.clone().add(camFwd.multiplyScalar(distance));
  
  // Clamp Y between 1.1m and 1.7m (chest to eye level constraint)
  position.y = Math.max(1.1, Math.min(1.7, camPos.y - 0.2)); 

  // Instead of lookAt which can flip depending on height and axis,
  // we just use the camera's Y-rotation so the panel reliably faces the user.
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  euler.x = 0; // Remove pitch (so it stands vertically straight)
  euler.z = 0; // Remove roll
  const quaternion = new THREE.Quaternion().setFromEuler(euler);

  // Safety check: ensure panel Z-axis (front) faces towards the headset
  const panelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const toCamera = new THREE.Vector3().subVectors(camPos, position);
  toCamera.y = 0;
  if (toCamera.lengthSq() > 0.001) {
    toCamera.normalize();
    if (panelForward.dot(toCamera) < 0) {
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    }
  }

  return { position, quaternion };
}
