import * as THREE from "three";
import { MODULE_SIZE, BRICK_HEIGHT, STUD_RADIUS, STUD_HEIGHT } from "../constants";

export const createBrickGeometry = (type: string, width: number, depth: number): THREE.BufferGeometry => {
    let geom: THREE.BufferGeometry;
    if (type === "1x1_round_cylinder" || type === "2x2_round_cylinder") {
      const radius = type === "1x1_round_cylinder" ? (MODULE_SIZE / 2) - 0.001 : MODULE_SIZE - 0.001;
      geom = new THREE.CylinderGeometry(radius, radius, BRICK_HEIGHT, 32);
      geom.translate(0, BRICK_HEIGHT / 2, 0);
    } else if (type === "1x1_cone" || type === "2x2_cone" || type === "3x3_cone") {
      let r = (MODULE_SIZE / 2);
      if (type === "2x2_cone") r = MODULE_SIZE;
      if (type === "3x3_cone") r = (MODULE_SIZE * 3) / 2;
      const radius = r - 0.001;
      geom = new THREE.ConeGeometry(radius, BRICK_HEIGHT, 32);
    } else if (type === "2x2_dome" || type === "4x4_dome") {
      const radius = (type === "4x4_dome" ? MODULE_SIZE * 2 : MODULE_SIZE) - 0.001;
      geom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      geom.scale(1, BRICK_HEIGHT / radius, 1);
    } else if (type === "1x2_slope" || type === "2x2_slope") {
      const shape = new THREE.Shape();
      shape.moveTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2);
      const lipHeight = BRICK_HEIGHT * 0.3;
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2 + lipHeight);
      shape.lineTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      const extrudeSettings = {
        depth: width - 0.002,
        bevelEnabled: false,
      };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "quarter_cylinder") {
      const shape = new THREE.Shape();
      const r = Math.min(width, depth) - 0.001;
      shape.moveTo(0, 0);
      shape.lineTo(r, 0);
      shape.absarc(0, 0, r, 0, Math.PI / 2, false);
      shape.lineTo(0, 0);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
    } else if (type === "half_cylinder") {
      const shape = new THREE.Shape();
      const r = depth / 2 - 0.001;
      shape.moveTo(-r, 0);
      shape.lineTo(r, 0);
      shape.absarc(0, 0, r, 0, Math.PI, false);
      shape.lineTo(-r, 0);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
      geom.rotateY(Math.PI / 2);
    } else if (type === "wedge") {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      shape.lineTo(width / 2 - 0.001, -depth / 2 + 0.001);
      shape.lineTo(-width / 2 + 0.001, depth / 2 - 0.001);
      shape.lineTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
    } else if (type === "inverted_slope") {
      const shape = new THREE.Shape();
      shape.moveTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2);
      const lipHeight = BRICK_HEIGHT * 0.3;
      shape.lineTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2 + lipHeight);
      shape.lineTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      const extrudeSettings = { depth: width - 0.002, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "quarter_dome") {
      const radius = Math.min(width, depth) - 0.001;
      geom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI / 2, 0, Math.PI / 2);
      geom.scale(1, BRICK_HEIGHT / radius, 1);
    } else if (type === "2x2_corner_triangle") {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      shape.lineTo(width / 2 - 0.001, -depth / 2 + 0.001);
      shape.lineTo(-width / 2 + 0.001, depth / 2 - 0.001);
      shape.lineTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
    } else {
      geom = new THREE.BoxGeometry(width - 0.002, BRICK_HEIGHT, depth - 0.002);
    }

    geom.computeBoundingBox();
    if (geom.boundingBox) {
      const center = new THREE.Vector3();
      geom.boundingBox.getCenter(center);
      geom.translate(-center.x, -geom.boundingBox.min.y, -center.z);
    }
    return geom;
};

export const createStudGeometry = (): THREE.BufferGeometry => {
    const geom = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12);
    geom.translate(0, BRICK_HEIGHT + STUD_HEIGHT / 2, 0);
    return geom;
};
