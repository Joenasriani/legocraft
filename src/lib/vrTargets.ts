import * as THREE from "three";

class VRTargetManager {
  private targets: THREE.Object3D[] = [];

  register(obj: THREE.Object3D | null) {
    if (!obj || this.targets.includes(obj)) return;
    this.targets.push(obj);
    if ((import.meta as any).env.DEV) {
      if (obj.name === "VRFloorCollider") {
        console.log("[VR] VRFloorCollider registered");
      }
    }
  }

  unregister(obj: THREE.Object3D | null) {
    if (!obj) return;
    this.targets = this.targets.filter((t) => t !== obj);
  }

  clearBrickTargets() {
    this.targets = this.targets.filter(
      (t) => t.name === "VRFloorCollider"
    );
  }

  getValidTargets(): THREE.Object3D[] {
    // Filter every frame to ensure we only raycast objects that are actually in the scene graph.
    // This avoids caching bugs where objects are temporarily detached during React renders.
    return this.targets.filter((obj) => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.type === "Scene") return true;
        curr = curr.parent;
      }
      return false;
    });
  }
}

export const vrTargetManager = new VRTargetManager();
