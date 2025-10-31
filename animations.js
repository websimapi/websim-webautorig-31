import * as THREE from 'three';
import { createWalkAnimation } from './animations/walk.js';

/**
 * Creates a walk animation for the given skeleton.
 * This function now orchestrates calls to individual animation creator modules.
 * @param {THREE.Skeleton} skeleton - The skeleton to animate.
 * @param {THREE.Vector3} hipPos - The initial local position of the hip bone.
 * @param {Map<string, THREE.Vector3>} markerPositions - A map of bone names to their local positions.
 * @returns {Object} An object containing the generated AnimationClips.
 */
export function createAnimations(skeleton, hipPos, markerPositions) {
    const animations = {};
    
    const walkClip = createWalkAnimation(skeleton, hipPos, markerPositions);
    if (walkClip) animations.walk = walkClip;

    return animations;
}