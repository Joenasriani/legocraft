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

  const dummy = new THREE.Group();
  dummy.position.copy(position);
  dummy.lookAt(camPos);
  
  // lookAt makes the object's -Z axis point at the target.
  // Standard PlaneGeometry faces +Z. To make +Z face the camera, we rotate 180 degrees around Y.
  dummy.rotateY(Math.PI);

  return { position, quaternion: dummy.quaternion };
}
