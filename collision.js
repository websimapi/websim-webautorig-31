import * as THREE from 'three';

// --- Math Helpers for Collision ---

// Helper function to find the closest point on a line segment to a given point.
function closestPointOnSegment(point, segStart, segEnd) {
    const segmentVector = new THREE.Vector3().subVectors(segEnd, segStart);
    const l2 = segmentVector.lengthSq();
    if (l2 === 0) return segStart.clone();

    const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(point, segStart).dot(segmentVector) / l2));
    return segStart.clone().add(segmentVector.multiplyScalar(t));
}

// Calculates the shortest distance and closest points between two line segments.
function closestPointsSegmentSegment(s1p1, s1p2, s2p1, s2p2) {
    const u = s1p2.clone().sub(s1p1);
    const v = s2p2.clone().sub(s2p1);
    const w = s1p1.clone().sub(s2p1);

    const a = u.dot(u); // Always >= 0
    const b = u.dot(v);
    const c = v.dot(v); // Always >= 0
    const d = u.dot(w);
    const e = v.dot(w);
    const D = a * c - b * b; // Always >= 0

    let sc, sN, sD = D;
    let tc, tN, tD = D;

    // Compute the line parameters of the two closest points
    if (D < 1e-7) { // The lines are almost parallel
        sN = 0.0; // Force using point P0 on segment S1
        sD = 1.0;
        tN = e;
        tD = c;
    } else {
        sN = (b * e - c * d);
        tN = (a * e - b * d);
        if (sN < 0.0) {
            sN = 0.0;
            tN = e;
            tD = c;
        } else if (sN > sD) {
            sN = sD;
            tN = e + b;
            tD = c;
        }
    }

    if (tN < 0.0) {
        tN = 0.0;
        if (-d < 0.0) sN = 0.0;
        else if (-d > a) sN = sD;
        else {
            sN = -d;
            sD = a;
        }
    } else if (tN > tD) {
        tN = tD;
        if ((-d + b) < 0.0) sN = 0;
        else if ((-d + b) > a) sN = sD;
        else {
            sN = (-d + b);
            sD = a;
        }
    }

    sc = (Math.abs(sN) < 1e-7 ? 0.0 : sN / sD);
    tc = (Math.abs(tN) < 1e-7 ? 0.0 : tN / tD);
    
    const closestPoint1 = s1p1.clone().add(u.multiplyScalar(sc));
    const closestPoint2 = s2p1.clone().add(v.multiplyScalar(tc));

    return { closestPoint1, closestPoint2 };
}


// --- Collision Manager ---

export class CollisionManager {
    constructor(rootBone) {
        this.rootBone = rootBone;
        this.colliders = [];
        this.collisionPairs = [];

        // Temporary objects to avoid garbage collection in the update loop
        this.temp = {
            p1: new THREE.Vector3(), p2: new THREE.Vector3(),
            p3: new THREE.Vector3(), p4: new THREE.Vector3(),
            closestPoint1: new THREE.Vector3(), closestPoint2: new THREE.Vector3(),
            collisionNormal: new THREE.Vector3(),
            correctionAxis: new THREE.Vector3(),
            correctionQuat: new THREE.Quaternion(),
            parentInverse: new THREE.Matrix4(),
        };

        this.buildColliders();
        this.defineCollisionPairs();
    }

    buildColliders() {
        // Define capsules for major body parts.
        const bodyParts = {
            torso: { start: 'hips', end: 'neck' },
            head: { start: 'neck', end: 'head' },
            upperArmL: { start: 'left_shoulder', end: 'left_elbow', parent: 'left_shoulder' },
            forearmL: { start: 'left_elbow', end: 'left_wrist', parent: 'left_shoulder' },
            upperArmR: { start: 'right_shoulder', end: 'right_elbow', parent: 'right_shoulder' },
            forearmR: { start: 'right_elbow', end: 'right_wrist', parent: 'right_shoulder' },
            thighL: { start: 'left_hip', end: 'left_knee', parent: 'left_hip' },
            lowerLegL: { start: 'left_knee', end: 'left_ankle', parent: 'left_hip' },
            thighR: { start: 'right_hip', end: 'right_knee', parent: 'right_hip' },
            lowerLegR: { start: 'right_knee', end: 'right_ankle', parent: 'right_hip' },
        };

        for (const [name, part] of Object.entries(bodyParts)) {
            const startBone = this.rootBone.getObjectByName(part.start);
            const endBone = this.rootBone.getObjectByName(part.end);
            const parentBone = part.parent ? this.rootBone.getObjectByName(part.parent) : null;

            if (startBone && endBone) {
                // The capsule radius is the average of the start and end bones' mesh radii.
                const radius = (startBone.userData.meshRadius + endBone.userData.meshRadius) / 2;
                this.colliders.push({
                    name,
                    startBone,
                    endBone,
                    parentBone,
                    radius
                });
            }
        }
    }

    defineCollisionPairs() {
        // Define which colliders should check against which other colliders.
        const pairs = [
            // Arms vs Torso
            ['upperArmL', 'torso'], ['forearmL', 'torso'],
            ['upperArmR', 'torso'], ['forearmR', 'torso'],
            // Arms vs Head
            ['upperArmL', 'head'], ['forearmL', 'head'],
            ['upperArmR', 'head'], ['forearmR', 'head'],
            // Legs vs Torso/Head (less common, but can happen)
            ['thighL', 'torso'], ['thighR', 'torso'],
             // Arm self-collision (e.g. crossing arms)
            ['forearmL', 'upperArmR'], ['forearmR', 'upperArmL'],
            ['forearmL', 'forearmR'],
        ];

        for (const [nameA, nameB] of pairs) {
            const colliderA = this.colliders.find(c => c.name === nameA);
            const colliderB = this.colliders.find(c => c.name === nameB);
            if (colliderA && colliderB) {
                this.collisionPairs.push({ a: colliderA, b: colliderB });
            }
        }
    }

    resolveCollider(parentBone, collisionPoint, normal, penetration) {
        const parentPos = parentBone.getWorldPosition(new THREE.Vector3());
        const parentToCollision = collisionPoint.clone().sub(parentPos);
        const parentToCollisionLength = parentToCollision.length();

        // --- SAFETY CHECKS ---
        if (parentToCollisionLength < 1e-5) return; // Avoid division by zero if collision is at the joint.

        this.temp.correctionAxis.crossVectors(parentToCollision, normal);
        
        // Avoid normalizing a zero vector if the vectors are parallel.
        if (this.temp.correctionAxis.lengthSq() < 1e-8) return;
        
        this.temp.correctionAxis.normalize();
        
        // --- STABILITY IMPROVEMENTS ---
        const DAMPING_FACTOR = 0.08; // Apply only a fraction of the correction to smooth it out.
        const MAX_CORRECTION_ANGLE = THREE.MathUtils.degToRad(0.8); // Clamp max rotation to 0.8 degrees per frame.

        let angle = penetration / parentToCollisionLength;
        angle = Math.min(angle * DAMPING_FACTOR, MAX_CORRECTION_ANGLE); // Apply damping and clamping.

        if (angle > 1e-5 && Number.isFinite(angle)) {
             this.temp.correctionQuat.setFromAxisAngle(this.temp.correctionAxis, angle);
             parentBone.quaternion.premultiply(this.temp.correctionQuat);
             parentBone.updateWorldMatrix(false, true); // Update children matrices
        }
    }

    update() {
        if (!this.rootBone.parent || !this.rootBone.parent.visible) return;

        for (const pair of this.collisionPairs) {
            const colA = pair.a;
            const colB = pair.b;

            colA.startBone.getWorldPosition(this.temp.p1);
            colA.endBone.getWorldPosition(this.temp.p2);
            colB.startBone.getWorldPosition(this.temp.p3);
            colB.endBone.getWorldPosition(this.temp.p4);

            const { closestPoint1, closestPoint2 } = closestPointsSegmentSegment(this.temp.p1, this.temp.p2, this.temp.p3, this.temp.p4);
            this.temp.closestPoint1.copy(closestPoint1);
            this.temp.closestPoint2.copy(closestPoint2);

            const distance = this.temp.closestPoint1.distanceTo(this.temp.closestPoint2);
            const minDistance = colA.radius + colB.radius;

            if (distance < minDistance) {
                const penetration = minDistance - distance;
                if (penetration <= 1e-5) continue; // Ignore tiny penetrations

                // The normal points from collider B's closest point to collider A's closest point.
                this.temp.collisionNormal.subVectors(this.temp.closestPoint1, this.temp.closestPoint2).normalize();

                const parentA = colA.parentBone;
                const parentB = colB.parentBone;

                // Distribute correction. If both are limbs, each takes half. If one is static (e.g., torso), the limb takes the full correction.
                let weightA = 0;
                let weightB = 0;

                if (parentA && parentB) { // Both are movable limbs
                    weightA = 0.5;
                    weightB = 0.5;
                } else if (parentA) { // Only A is a limb
                    weightA = 1.0;
                } else if (parentB) { // Only B is a limb
                    weightB = 1.0;
                }

                // Apply correction to collider A if it's a movable limb.
                // The correction should push it along the collision normal.
                if (weightA > 0) {
                    this.resolveCollider(parentA, this.temp.closestPoint1, this.temp.collisionNormal, penetration * weightA);
                }
                
                // Apply correction to collider B if it's a movable limb.
                // The correction should push it in the opposite direction of the normal.
                if (weightB > 0) {
                    const normalForB = this.temp.collisionNormal.clone().negate();
                    this.resolveCollider(parentB, this.temp.closestPoint2, normalForB, penetration * weightB);
                }
            }
        }
    }
}