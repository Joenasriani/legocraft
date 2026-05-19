export const Environments = {};
export class DevUI { constructor() { console.log('XR DevUI disabled'); } render() {} }
export const VERSION = 'shim';
export class SyntheticEnvironmentModule {}
export function emulate() { console.log('XR Emulation disabled'); return null; }
