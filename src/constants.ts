export const MODULE_SIZE = 0.08;
export const BRICK_HEIGHT = 0.096;
export const STUD_RADIUS = 0.024;
export const STUD_HEIGHT = 0.016;
export const HALF_MODULE = MODULE_SIZE / 2;

export const getInitialCameraPosition = (): [number, number, number] => {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  return isDesktop ? [0.6, 0.6, 0.8] : [1.4, 1.4, 1.8];
};
