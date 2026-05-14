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

  // Make the panel face the headset exactly
  const dummy = new THREE.Group();
  dummy.position.copy(position);
  // Look at camera pos, but for UI planes they "face" looking outwards towards the camera usually.
  // Actually, standard mesh geometry faces +Z or -Z. planeGeometry faces +Z and normal is +Z.
  // So dummy.lookAt(camPos) will make the group's -Z face the camera.
  // We want the plane's front (+Z) to face the camera, so we look backwards?
  // Actually lookAt makes the object's local +Z axis face point, if it's a plane facing +Z, we need it to look AT camera.
  // Wait, no. lookAt makes -Z face the target. If plane faces +Z locally, we lookAt(camera) -> plane points away from camera.
  // We actually want the plane to look at the camera, so we can turn it around by multiplying quat by 180 degrees.
  // Or dummy.lookAt(cameraPos); then rotate Y 180?
  // Let's just use dummy.lookAt(camPos);
  
  dummy.lookAt(camPos);

  return { position, quaternion: dummy.quaternion };
}
