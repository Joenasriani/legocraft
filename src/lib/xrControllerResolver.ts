import * as THREE from 'three';

export interface ButtonsState {
  trigger: boolean;
  grip: boolean;
  primary: boolean;
  secondary: boolean;
  thumbstickPress: boolean;
  xButton: boolean;
  yButton: boolean;
  aButton: boolean;
  bButton: boolean;
}

export interface AxesState {
  x: number;
  y: number;
  hasThumbstick: boolean;
}

export interface AimRay {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  isValid: boolean;
  source: "targetRay" | "lastValid" | "none";
}

export interface XRControllerState {
  handedness: "left" | "right" | "none";
  inputSource: XRInputSource | null;
  targetRayObject: THREE.Object3D | null;
  gripObject: THREE.Object3D | null;
  gamepad: Gamepad | null;
  isTracked: boolean;
  hasGamepad: boolean;
  lastValidAimRay: AimRay;
  buttonsCurrent: ButtonsState;
  buttonsPrevious: ButtonsState;
  axesCurrent: AxesState;
  disconnectedFrameCount: number;
}

const createEmptyButtons = (): ButtonsState => ({
  trigger: false,
  grip: false,
  primary: false,
  secondary: false,
  thumbstickPress: false,
  xButton: false,
  yButton: false,
  aButton: false,
  bButton: false,
});

const createEmptyAxes = (): AxesState => ({
  x: 0,
  y: 0,
  hasThumbstick: false,
});

export function createInitialXRControllerState(handedness: "left" | "right" | "none"): XRControllerState {
  return {
    handedness,
    inputSource: null,
    targetRayObject: null,
    gripObject: null,
    gamepad: null,
    isTracked: false,
    hasGamepad: false,
    lastValidAimRay: {
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      isValid: false,
      source: "none",
    },
    buttonsCurrent: createEmptyButtons(),
    buttonsPrevious: createEmptyButtons(),
    axesCurrent: createEmptyAxes(),
    disconnectedFrameCount: 0,
  };
}

export function resetControllerButtonState(state: XRControllerState): void {
  // Push current to previous to trigger falling edges if needed
  state.buttonsPrevious = { ...state.buttonsCurrent };
  state.buttonsCurrent = createEmptyButtons();
  state.axesCurrent = createEmptyAxes();
}

export function readQuestControllerButtons(gamepad: Gamepad, handedness: "left" | "right" | "none"): ButtonsState {
  const buttons = createEmptyButtons();
  if (!gamepad || !gamepad.buttons) return buttons;

  const getBtn = (idx: number) => gamepad.buttons.length > idx ? gamepad.buttons[idx].pressed : false;

  buttons.trigger = getBtn(0);
  buttons.grip = getBtn(1);
  
  // Standard WebXR gamepad mapping:
  // 3: thumbstick press
  buttons.thumbstickPress = getBtn(3);

  // 4: primary (A or X)
  // 5: secondary (B or Y)
  const primary = getBtn(4);
  const secondary = getBtn(5);

  buttons.primary = primary;
  buttons.secondary = secondary;

  if (handedness === "left") {
    buttons.xButton = primary;
    buttons.yButton = secondary;
  } else if (handedness === "right") {
    buttons.aButton = primary;
    buttons.bButton = secondary;
  }

  return buttons;
}

export function readQuestControllerAxes(gamepad: Gamepad): AxesState {
  const axes = createEmptyAxes();
  if (!gamepad || !gamepad.axes) return axes;

  const hasThumbstick = gamepad.axes.length >= 4;
  axes.hasThumbstick = hasThumbstick;

  if (hasThumbstick) {
    axes.x = gamepad.axes[2] || 0;
    axes.y = gamepad.axes[3] || 0;
    // Fallback if thumbstick is silent but touchpad is used
    if (Math.abs(axes.x) < 0.01 && Math.abs(axes.y) < 0.01) {
      axes.x = gamepad.axes[0] || 0;
      axes.y = gamepad.axes[1] || 0;
    }
  } else if (gamepad.axes.length >= 2) {
    axes.x = gamepad.axes[0] || 0;
    axes.y = gamepad.axes[1] || 0;
  }

  return axes;
}

export function resolveXRInputSource(
  inputSource: XRInputSource | null | undefined,
  targetRayObject: THREE.Object3D | null | undefined,
  gripObject: THREE.Object3D | null | undefined,
  state: XRControllerState,
  xrFrame?: XRFrame,
  referenceSpace?: XRReferenceSpace
): XRControllerState {
  state.inputSource = inputSource || null;
  state.targetRayObject = targetRayObject || null;
  state.gripObject = gripObject || null;
  state.gamepad = inputSource?.gamepad || null;

  // Save previous
  state.buttonsPrevious = { ...state.buttonsCurrent };

  const hasInput = !!inputSource;

  // We consider tracked if we have the input source.
  state.isTracked = hasInput;
  state.hasGamepad = !!state.gamepad;

  if (!state.isTracked) {
    state.disconnectedFrameCount += 1;
    resetControllerButtonState(state);
    return state;
  }

  state.disconnectedFrameCount = 0;

  if (state.hasGamepad && state.gamepad) {
    state.buttonsCurrent = readQuestControllerButtons(state.gamepad, state.handedness);
    state.axesCurrent = readQuestControllerAxes(state.gamepad);
  } else {
    resetControllerButtonState(state);
  }

  // Update aim ray if tracked
  if (inputSource && xrFrame && referenceSpace && inputSource.targetRaySpace) {
    const pose = xrFrame.getPose(inputSource.targetRaySpace, referenceSpace);
    if (pose) {
      const origin = new THREE.Vector3(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
      
      const quaternion = new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();

      // If grip space is available, use it for origin override
      if (inputSource.gripSpace) {
        const gripPose = xrFrame.getPose(inputSource.gripSpace, referenceSpace);
        if (gripPose) {
          origin.set(
            gripPose.transform.position.x,
            gripPose.transform.position.y,
            gripPose.transform.position.z
          );
        }
      }

      state.lastValidAimRay = {
        origin,
        direction,
        isValid: true,
        source: "targetRay",
      };
    }
  } else if (targetRayObject) {
    const origin = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    
    targetRayObject.getWorldPosition(origin);
    targetRayObject.getWorldQuaternion(quaternion);
    
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();

    state.lastValidAimRay = {
      origin,
      direction,
      isValid: true,
      source: "targetRay",
    };
  }

  return state;
}

export function getControllerAimRay(state: XRControllerState): AimRay {
  if (state.isTracked && state.lastValidAimRay.isValid) {
    return state.lastValidAimRay;
  }
  
  if (state.lastValidAimRay.isValid) {
    return {
      ...state.lastValidAimRay,
      source: "lastValid",
    };
  }

  return {
    origin: new THREE.Vector3(),
    direction: new THREE.Vector3(0, 0, -1),
    isValid: false,
    source: "none",
  };
}

export function isButtonJustPressed(state: XRControllerState, button: keyof ButtonsState): boolean {
  return state.buttonsCurrent[button] && !state.buttonsPrevious[button];
}

export function isButtonJustReleased(state: XRControllerState, button: keyof ButtonsState): boolean {
  return !state.buttonsCurrent[button] && state.buttonsPrevious[button];
}
