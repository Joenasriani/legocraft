export enum HapticType {
  UI_HOVER = "ui_hover",
  UI_CLICK = "ui_click",
  BRICK_SELECT = "brick_select",
  BRICK_PLACE = "brick_place",
  BRICK_DELETE = "brick_delete",
  ERROR = "error",
  ROTATE = "rotate",
  SNAP_TURN = "snap_turn",
}

const HAPTIC_PROFILES: Record<
  HapticType,
  { intensity: number; duration: number }
> = {
  [HapticType.UI_HOVER]: { intensity: 0.2, duration: 10 },
  [HapticType.UI_CLICK]: { intensity: 0.4, duration: 30 },
  [HapticType.BRICK_SELECT]: { intensity: 0.4, duration: 30 },
  [HapticType.BRICK_PLACE]: { intensity: 0.8, duration: 30 },
  [HapticType.BRICK_DELETE]: { intensity: 0.7, duration: 40 },
  [HapticType.ERROR]: { intensity: 1.0, duration: 100 },
  [HapticType.ROTATE]: { intensity: 0.2, duration: 20 },
  [HapticType.SNAP_TURN]: { intensity: 0.5, duration: 50 },
};

/**
 * Trigger haptics on an XR controller.
 * @param input The XR input source (controller)
 * @param typeOrIntensity Either a HapticType or a raw intensity number
 * @param duration Duration in milliseconds (ignored if type is HapticType)
 */
export function triggerHaptics(
  input: XRInputSource | null | undefined,
  typeOrIntensity: HapticType | number = 0.5,
  duration: number = 20,
) {
  if (
    !input ||
    !input.gamepad ||
    !input.gamepad.hapticActuators ||
    input.gamepad.hapticActuators.length === 0
  ) {
    return;
  }

  let finalIntensity = 0.5;
  let finalDuration = duration;

  if (
    typeof typeOrIntensity === "string" &&
    typeOrIntensity in HAPTIC_PROFILES
  ) {
    const profile = HAPTIC_PROFILES[typeOrIntensity as HapticType];
    finalIntensity = profile.intensity;
    finalDuration = profile.duration;
  } else if (typeof typeOrIntensity === "number") {
    finalIntensity = typeOrIntensity;
  }

  const actuator = input.gamepad.hapticActuators[0];
  if (actuator && (actuator as any).pulse) {
    try {
      const result = (actuator as any).pulse(finalIntensity, finalDuration);
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          /* Silent catch for haptic failures */
        });
      }
    } catch (e) {
      /* Silent catch for haptic failures */
    }
  }
}
