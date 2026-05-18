import * as THREE from "three";

export type VRTargetCategory = "brick" | "floor" | "ui" | "menu" | "misc";

class VRTargetManager {
  private targets: Map<THREE.Object3D, VRTargetCategory> = new Map();

  register(obj: THREE.Object3D | null, category: VRTargetCategory = "misc") {
    if (!obj) return;
    this.targets.set(obj, category);
    
    if ((import.meta as any).env.DEV) {
      if (category === "floor") {
        console.log("[VR] Floor target registered");
      }
    }
  }

  unregister(obj: THREE.Object3D | null) {
    if (!obj) return;
    this.targets.delete(obj);
  }

  clearBrickTargets() {
    for (const [obj, category] of this.targets.entries()) {
      if (category === "brick") {
        this.targets.delete(obj);
      }
    }
  }

  getValidTargets(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const obj of this.targets.keys()) {
      let curr: THREE.Object3D | null = obj;
      let inScene = false;
      while (curr) {
        if (curr.type === "Scene") {
          inScene = true;
          break;
        }
        curr = curr.parent;
      }
      if (inScene) {
        list.push(obj);
      }
    }
    return list;
  }
}

export const vrTargetManager = new VRTargetManager();
