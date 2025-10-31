import * as THREE from 'three';
import { makeArmDownQuaternion } from './utils.js';

/**
 * Creates a walk animation.
 * @param {THREE.Skeleton} skeleton - The skeleton to animate.
 * @param {THREE.Vector3} hipPos - The initial local position of the hip bone.
 * @param {Map<string, THREE.Vector3>} markerPositions - A map of bone names to their local positions.
 * @returns {THREE.AnimationClip|null}
 */
export function createWalkAnimation(skeleton, hipPos, markerPositions) {
    const hips = skeleton.getBoneByName('hips');
    const spine = skeleton.getBoneByName('spine');
    const shoulderL = skeleton.getBoneByName('left_shoulder');
    const shoulderR = skeleton.getBoneByName('right_shoulder');
    const elbowL = skeleton.getBoneByName('left_elbow');
    const elbowR = skeleton.getBoneByName('right_elbow');
    const hipL = skeleton.getBoneByName('left_hip');
    const hipR = skeleton.getBoneByName('right_hip');
    const kneeL = skeleton.getBoneByName('left_knee');
    const kneeR = skeleton.getBoneByName('right_knee');
    const ankleL = skeleton.getBoneByName('left_ankle');
    const ankleR = skeleton.getBoneByName('right_ankle');

    if (!hips || !spine || !shoulderL || !shoulderR || !elbowL || !elbowR || !hipL || !hipR || !kneeL || !kneeR || !ankleL || !ankleR) return null;

    const walkTimes = [0, 0.25, 0.5, 0.75, 1]; // One full cycle
    const walkTracks = [];
    const interpolation = THREE.InterpolateSmooth;

    // --- Hip Movement ---
    const initialHipPos = hipPos.clone();
    const hipVertical = 0.01; // Up/down bob
    walkTracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, walkTimes, [
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z, // Peak height at contact
        initialHipPos.x, initialHipPos.y, initialHipPos.z, // Low point mid-stance
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z, // Peak height at contact
        initialHipPos.x, initialHipPos.y, initialHipPos.z, // Low point mid-stance
        initialHipPos.x, initialHipPos.y + hipVertical, initialHipPos.z,
    ], interpolation));

    // --- Leg Animation (based on gait cycle) ---
    const hipFlexion = Math.PI / 8; // Max forward leg swing (22.5 deg)
    const hipExtension = -Math.PI / 9; // Max backward leg swing (-20 deg)
    const kneeFlexion = Math.PI / 2.5; // Max knee bend during swing (72 deg)
    const ankleFlexion = Math.PI / 18; // Ankle bend up (10 deg)
    const ankleExtension = -Math.PI / 12; // Ankle bend down (-15 deg)
    const hipAbduction = -Math.PI / 72; // Reduced outward hip rotation for a narrower stance

    // Euler angles for key poses
    // Switched rotation from X-axis to Z-axis for forward motion
    const eHipForward = new THREE.Euler(0, 0, hipFlexion);
    const eHipBack = new THREE.Euler(0, 0, hipExtension);
    const eHipNeutral = new THREE.Euler(0, 0, 0);
    
    // For mid-swing pose, we combine forward swing with abduction (outward rotation).
    // This must be done with Quaternions.
    const eHipSwingOnly = new THREE.Euler(0, 0, hipFlexion * 0.5, 'XYZ');
    const qHipSwingOnly = new THREE.Quaternion().setFromEuler(eHipSwingOnly);

    const eHipAbduction = new THREE.Euler(hipAbduction, 0, 0, 'XYZ');
    const qHipAbduction = new THREE.Quaternion().setFromEuler(eHipAbduction);

    // Combine swing and abduction. The order matters: swing first, then abduct.
    const qHipSwing = qHipSwingOnly.multiply(qHipAbduction);

    const eKneeStraight = new THREE.Euler(0, 0, 0);
    const eKneeBent = new THREE.Euler(0, 0, -kneeFlexion);
    const eKneeSlightlyBent = new THREE.Euler(0, 0, -kneeFlexion * 0.2);

    const eAnkleNeutral = new THREE.Euler(0, 0, 0);
    const eAnkleUp = new THREE.Euler(0, 0, -ankleFlexion);
    const eAnkleDown = new THREE.Euler(0, 0, ankleExtension);

    // Quaternions from Eulers
    const qHipFwd = new THREE.Quaternion().setFromEuler(eHipForward);
    const qHipBack = new THREE.Quaternion().setFromEuler(eHipBack);
    const qHipNeutral = new THREE.Quaternion().setFromEuler(eHipNeutral);
    // qHipSwing is already defined above


    const qKneeStraight = new THREE.Quaternion().setFromEuler(eKneeStraight);
    const qKneeBent = new THREE.Quaternion().setFromEuler(eKneeBent);
    const qKneeSlightlyBent = new THREE.Quaternion().setFromEuler(eKneeSlightlyBent);

    const qAnkleNeutral = new THREE.Quaternion().setFromEuler(eAnkleNeutral);
    const qAnkleUp = new THREE.Quaternion().setFromEuler(eAnkleUp);
    const qAnkleDown = new THREE.Quaternion().setFromEuler(eAnkleDown);

    // Left Leg Keyframes (Starts cycle with heel strike)
    // 0.0s: L heel strike (leg fwd, straight) | R push-off (leg back)
    // 0.25s: L mid-stance (supporting) | R mid-swing (knee bent)
    // 0.5s: L push-off (leg back) | R heel strike (leg fwd, straight)
    // 0.75s: L mid-swing (knee bent) | R mid-stance (supporting)
    // 1.0s: L heel strike again
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${hipL.name}.quaternion`, walkTimes, [
        ...qHipFwd.toArray(), ...qHipNeutral.toArray(), ...qHipBack.toArray(), ...qHipSwing.toArray(), ...qHipFwd.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${kneeL.name}.quaternion`, walkTimes, [
        ...qKneeStraight.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeBent.toArray(), ...qKneeStraight.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${ankleL.name}.quaternion`, walkTimes, [
        ...qAnkleUp.toArray(), ...qAnkleNeutral.toArray(), ...qAnkleDown.toArray(), ...qAnkleUp.toArray(), ...qAnkleUp.toArray()
    ], interpolation));

    // Right Leg Keyframes (Offset by 0.5s from left leg)
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${hipR.name}.quaternion`, walkTimes, [
        ...qHipBack.toArray(), ...qHipSwing.toArray(), ...qHipFwd.toArray(), ...qHipNeutral.toArray(), ...qHipBack.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${kneeR.name}.quaternion`, walkTimes, [
        ...qKneeSlightlyBent.toArray(), ...qKneeBent.toArray(), ...qKneeStraight.toArray(), ...qKneeSlightlyBent.toArray(), ...qKneeSlightlyBent.toArray()
    ], interpolation));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${ankleR.name}.quaternion`, walkTimes, [
        ...qAnkleDown.toArray(), ...qAnkleUp.toArray(), ...qAnkleUp.toArray(), ...qAnkleNeutral.toArray(), ...qAnkleDown.toArray()
    ], interpolation));


    // --- Arm Swing ---
    const qDownL = makeArmDownQuaternion(markerPositions, 'left_shoulder', 'left_elbow');
    const qDownR = makeArmDownQuaternion(markerPositions, 'right_shoulder', 'right_elbow');

    const armSwingAngle = Math.PI / 10; // ~18 degrees, a more natural swing

    // Swing rotations are forward/backward. For a T-pose character, this corresponds
    // to rotation around the local Z-axis of the shoulder bone.
    const qSwingFwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, armSwingAngle));
    const qSwingBack = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -armSwingAngle));

    // Right arm swings forward with left leg.
    // The final rotation is: first, swing the arm, then rotate it down to the side.
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderR.name}.quaternion`, walkTimes, [
        ...qDownR.clone().premultiply(qSwingFwd).toArray(),
        ...qDownR.toArray(),
        ...qDownR.clone().premultiply(qSwingBack).toArray(),
        ...qDownR.toArray(),
        ...qDownR.clone().premultiply(qSwingFwd).toArray(),
    ], interpolation));

    // Left arm swings opposite.
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${shoulderL.name}.quaternion`, walkTimes, [
        ...qDownL.clone().premultiply(qSwingBack).toArray(),
        ...qDownL.toArray(),
        ...qDownL.clone().premultiply(qSwingFwd).toArray(),
        ...qDownL.toArray(),
        ...qDownL.clone().premultiply(qSwingBack).toArray(),
    ], interpolation));

    // Slight elbow bends during walk
    const elbowWalkBend = Math.PI / 20;
    const qElbowL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, elbowWalkBend, 0));
    const qElbowR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -elbowWalkBend, 0));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${elbowL.name}.quaternion`, [0], qElbowL.toArray()));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${elbowR.name}.quaternion`, [0], qElbowR.toArray()));

    // Spine counter-rotation for balance
    const spineCounterAngle = Math.PI / 48; // ~3.75 degrees
    const qSpineL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spineCounterAngle, 0));
    const qSpineR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -spineCounterAngle, 0));
    walkTracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, walkTimes, [
        ...qSpineR.toArray(),
        ...new THREE.Quaternion().toArray(),
        ...qSpineL.toArray(),
        ...new THREE.Quaternion().toArray(),
        ...qSpineR.toArray(),
    ], interpolation));

    const walkClip = new THREE.AnimationClip('walk', -1, walkTracks);
    return walkClip;
}