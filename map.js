import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadMap1(scene) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('parking.glb', (gltf) => {
        const model = gltf.scene;
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        
        model.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        scene.add(model);
    }, undefined, (error) => {
        console.error('An error occurred loading the model:', error);
    });
}
