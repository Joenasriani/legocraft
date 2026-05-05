import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const bodyGeom = new THREE.BoxGeometry(0.08, 0.096, 0.08);
const studGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.016, 12);
const merged = mergeGeometries([bodyGeom, studGeom]);
console.log(merged ? 'Merged successfully' : 'Merge failed');
