import * as THREE from "three";

export function getSafePanelTransform(camera: THREE.Camera): {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
} {
  const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const camFwd = new THREE.Vector3(0, 0, -1).transformDirection(
    camera.matrixWorld,
  );
  // Flatten forward direction
  camFwd.y = 0;
  if (camFwd.lengthSq() < 0.001) camFwd.set(0, 0, -1);
  camFwd.normalize();

  const distance = 1.35; // 1.35m in front of headset (was 2.6)
  const position = camPos.clone().add(camFwd.multiplyScalar(distance));

  // Allow it to be relative to the headset height, so seated players can reach it.
  position.y = Math.max(0.6, camPos.y - 0.2); // Comfort height (was max(0.8, camPos.y -0.1))

  // Instead of lookAt which can flip depending on height and axis,
  // we just use the camera's Y-rotation so the panel reliably faces the user.
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
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
      quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.PI,
        ),
      );
    }
  }

  return { position, quaternion };
}

export function isQuestControllerReady(
  inputSource?: XRInputSource | null,
): boolean {
  if (!inputSource) return false;
  const isHand =
    inputSource.hand ||
    (inputSource.profiles && inputSource.profiles.includes("generic-hand"));
  if (isHand) return false;

  return !!(
    inputSource.gamepad &&
    inputSource.gamepad.buttons &&
    inputSource.gamepad.buttons.length > 0
  );
}

export interface RayPose {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/**
 * Gets the canonical target ray pose from an XRInputSource.
 * Uses xrFrame.getPose to ensure it's precisely matched to the WebXR targetRaySpace.
 * Falls back to the controller Object3D if the WebXR pose is not available.
 */
export function getVRTargetRay(
  inputSource: XRInputSource,
  xrFrame: XRFrame,
  referenceSpace: XRReferenceSpace,
  controller?: THREE.Object3D | null,
): RayPose | null {
  const pose = xrFrame.getPose(inputSource.targetRaySpace, referenceSpace);
  if (pose) {
    const position = new THREE.Vector3(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z,
    );
    const quaternion = new THREE.Quaternion(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w,
    );
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

    return { position, direction, quaternion };
  }

  // Fallback to the controller Object3D's world transform if pose is null
  if (controller) {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    controller.updateMatrixWorld(true);
    controller.getWorldPosition(position);
    controller.getWorldQuaternion(quaternion);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

    return { position, direction, quaternion };
  }

  return null;
}
