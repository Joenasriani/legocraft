import * as THREE from "three";

class VRTargetManager {
  private targets: THREE.Object3D[] = [];
  private dirty = false;
  private validCache: THREE.Object3D[] = [];

  register(obj: THREE.Object3D | null) {
    if (!obj || this.targets.includes(obj)) return;
    this.targets.push(obj);
    this.dirty = true;
    if ((import.meta as any).env.DEV) {
      if (obj.name === "VRFloorCollider") {
        console.log("[VR] VRFloorCollider registered");
      }
    }
  }

  unregister(obj: THREE.Object3D | null) {
    if (!obj) return;
    this.targets = this.targets.filter(t => t !== obj);
    this.dirty = true;
  }

  getValidTargets(): THREE.Object3D[] {
    if (!this.dirty) return this.validCache;
    this.validCache = this.targets.filter(obj => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.type === 'Scene') return true;
        curr = curr.parent;
      }
      return false;
    });
    this.dirty = false;
    
    // Periodically or when targets change drastically we could log.
    // For now we just return cache. We'll add logging of counts somewhere else if needed, or here:
    // This runs smoothly, logging every dirtied frame might spam.
    return this.validCache;
  }
}

export const vrTargetManager = new VRTargetManager();
