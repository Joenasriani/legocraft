import * as THREE from "three";

class VRTargetManager {
  targets: THREE.Object3D[] = [];

  register(obj: THREE.Object3D | null) {
    if (!obj) return;
    if (!this.targets.includes(obj)) {
      this.targets.push(obj);
    }
  }

  unregister(obj: THREE.Object3D | null) {
    if (!obj) return;
    const index = this.targets.indexOf(obj);
    if (index !== -1) {
      this.targets.splice(index, 1);
    }
  }

  getValidTargets(): THREE.Object3D[] {
    // Auto-clean removed targets
    this.targets = this.targets.filter((obj) => {
      // Only keep objects that are still in a scene graph
      let inScene = false;
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.type === 'Scene') {
          inScene = true;
          break;
        }
        curr = curr.parent;
      }
      return inScene;
    });
    return this.targets;
  }
}

export const vrTargetManager = new VRTargetManager();
