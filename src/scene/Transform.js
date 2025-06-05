import { Vec3, Mat4, MathUtils } from '../utils/Math.js';

/**
 * Transform component for position, rotation, and scale
 * Handles 3D transformations and matrix calculations
 */
export class Transform {
    constructor(options = {}) {
        // Position
        this.position = new Vec3(
            options.position?.[0] || 0,
            options.position?.[1] || 0,
            options.position?.[2] || 0
        );

        // Rotation (Euler angles in radians)
        this.rotation = new Vec3(
            options.rotation?.[0] || 0,
            options.rotation?.[1] || 0,
            options.rotation?.[2] || 0
        );

        // Scale
        this.scale = new Vec3(
            options.scale?.[0] || 1,
            options.scale?.[1] || 1,
            options.scale?.[2] || 1
        );

        // Cached matrices
        this.localMatrix = new Mat4();
        this.worldMatrix = new Mat4();
        this.needsUpdate = true;

        // Hierarchy
        this.parent = null;
        this.children = [];

        // Update matrix
        this.updateMatrix();
    }

    /**
     * Set position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.markNeedsUpdate();
    }

    /**
     * Set rotation
     * @param {number} x - X rotation in radians
     * @param {number} y - Y rotation in radians
     * @param {number} z - Z rotation in radians
     */
    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        this.markNeedsUpdate();
    }

    /**
     * Set rotation in degrees
     * @param {number} x - X rotation in degrees
     * @param {number} y - Y rotation in degrees
     * @param {number} z - Z rotation in degrees
     */
    setRotationDegrees(x, y, z) {
        this.rotation.set(
            MathUtils.degToRad(x),
            MathUtils.degToRad(y),
            MathUtils.degToRad(z)
        );
        this.markNeedsUpdate();
    }

    /**
     * Set scale
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     */
    setScale(x, y, z) {
        if (y === undefined && z === undefined) {
            // Uniform scale
            this.scale.set(x, x, x);
        } else {
            this.scale.set(x, y || x, z || x);
        }
        this.markNeedsUpdate();
    }

    /**
     * Translate by offset
     * @param {number} x - X offset
     * @param {number} y - Y offset
     * @param {number} z - Z offset
     */
    translate(x, y, z) {
        this.position.x += x;
        this.position.y += y;
        this.position.z += z;
        this.markNeedsUpdate();
    }

    /**
     * Rotate by offset
     * @param {number} x - X rotation offset in radians
     * @param {number} y - Y rotation offset in radians
     * @param {number} z - Z rotation offset in radians
     */
    rotate(x, y, z) {
        this.rotation.x += x;
        this.rotation.y += y;
        this.rotation.z += z;
        this.markNeedsUpdate();
    }

    /**
     * Rotate by offset in degrees
     * @param {number} x - X rotation offset in degrees
     * @param {number} y - Y rotation offset in degrees
     * @param {number} z - Z rotation offset in degrees
     */
    rotateDegrees(x, y, z) {
        this.rotation.x += MathUtils.degToRad(x);
        this.rotation.y += MathUtils.degToRad(y);
        this.rotation.z += MathUtils.degToRad(z);
        this.markNeedsUpdate();
    }

    /**
     * Scale by factor
     * @param {number} x - X scale factor
     * @param {number} y - Y scale factor
     * @param {number} z - Z scale factor
     */
    scaleBy(x, y, z) {
        if (y === undefined && z === undefined) {
            // Uniform scale
            this.scale.multiply(x);
        } else {
            this.scale.x *= x;
            this.scale.y *= y || x;
            this.scale.z *= z || x;
        }
        this.markNeedsUpdate();
    }

    /**
     * Look at target position
     * @param {Vec3|number[]} target - Target position
     * @param {Vec3|number[]} up - Up vector (default: [0, 1, 0])
     */
    lookAt(target, up = [0, 1, 0]) {
        const targetVec = Array.isArray(target) ? new Vec3(...target) : target;
        const upVec = Array.isArray(up) ? new Vec3(...up) : up;

        // Calculate direction
        const direction = new Vec3().copy(targetVec).subtract(this.position).normalize();

        // Calculate rotation from direction
        this.rotation.y = Math.atan2(direction.x, direction.z);
        this.rotation.x = Math.asin(-direction.y);
        this.rotation.z = 0; // No roll

        this.markNeedsUpdate();
    }

    /**
     * Get forward direction vector
     * @returns {Vec3} Forward direction
     */
    getForward() {
        const forward = new Vec3(0, 0, -1);
        this.transformDirection(forward);
        return forward;
    }

    /**
     * Get right direction vector
     * @returns {Vec3} Right direction
     */
    getRight() {
        const right = new Vec3(1, 0, 0);
        this.transformDirection(right);
        return right;
    }

    /**
     * Get up direction vector
     * @returns {Vec3} Up direction
     */
    getUp() {
        const up = new Vec3(0, 1, 0);
        this.transformDirection(up);
        return up;
    }

    /**
     * Transform a direction vector by this transform's rotation
     * @param {Vec3} direction - Direction to transform
     * @returns {Vec3} Transformed direction
     */
    transformDirection(direction) {
        const rotationMatrix = new Mat4()
            .rotateX(this.rotation.x)
            .rotateY(this.rotation.y)
            .rotateZ(this.rotation.z);

        // Transform direction (ignore translation)
        const x = direction.x;
        const y = direction.y;
        const z = direction.z;
        const m = rotationMatrix.elements;

        direction.x = m[0] * x + m[4] * y + m[8] * z;
        direction.y = m[1] * x + m[5] * y + m[9] * z;
        direction.z = m[2] * x + m[6] * y + m[10] * z;

        return direction;
    }

    /**
     * Transform a point by this transform
     * @param {Vec3} point - Point to transform
     * @returns {Vec3} Transformed point
     */
    transformPoint(point) {
        this.updateMatrix();

        const x = point.x;
        const y = point.y;
        const z = point.z;
        const m = this.worldMatrix.elements;

        point.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        point.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        point.z = m[2] * x + m[6] * y + m[10] * z + m[14];

        return point;
    }

    /**
     * Add child transform
     * @param {Transform} child - Child transform
     */
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }

        child.parent = this;
        this.children.push(child);
        child.markNeedsUpdate();
    }

    /**
     * Remove child transform
     * @param {Transform} child - Child transform
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.markNeedsUpdate();
        }
    }

    /**
     * Mark this transform and all children as needing update
     */
    markNeedsUpdate() {
        this.needsUpdate = true;

        // Mark all children as needing update
        for (const child of this.children) {
            child.markNeedsUpdate();
        }
    }

    /**
     * Update transformation matrix
     */
    updateMatrix() {
        if (!this.needsUpdate) return;

        // Build local transformation matrix
        this.localMatrix.identity()
            .translate(this.position.x, this.position.y, this.position.z)
            .rotateX(this.rotation.x)
            .rotateY(this.rotation.y)
            .rotateZ(this.rotation.z)
            .scale(this.scale.x, this.scale.y, this.scale.z);

        // Calculate world matrix
        if (this.parent) {
            this.parent.updateMatrix();
            this.worldMatrix.copy(this.parent.worldMatrix).multiply(this.localMatrix);
        } else {
            this.worldMatrix.copy(this.localMatrix);
        }

        this.needsUpdate = false;
    }

    /**
     * Get local transformation matrix
     * @param {Mat4} target - Target matrix to store result
     * @returns {Mat4} Local transformation matrix
     */
    getLocalMatrix(target = null) {
        this.updateMatrix();
        if (target) {
            target.copy(this.localMatrix);
            return target;
        }
        return this.localMatrix;
    }

    /**
     * Get world transformation matrix
     * @param {Mat4} target - Target matrix to store result
     * @returns {Mat4} World transformation matrix
     */
    getMatrix(target = null) {
        this.updateMatrix();
        if (target) {
            target.copy(this.worldMatrix);
            return target;
        }
        return this.worldMatrix;
    }

    /**
     * Get world position
     * @returns {Vec3} World position
     */
    getWorldPosition() {
        this.updateMatrix();
        const m = this.worldMatrix.elements;
        return new Vec3(m[12], m[13], m[14]);
    }

    /**
     * Get world rotation (Euler angles)
     * @returns {Vec3} World rotation in radians
     */
    getWorldRotation() {
        this.updateMatrix();
        const m = this.worldMatrix.elements;

        // Extract rotation from matrix
        const sy = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
        const singular = sy < 1e-6;

        let x, y, z;

        if (!singular) {
            x = Math.atan2(m[6], m[10]);
            y = Math.atan2(-m[2], sy);
            z = Math.atan2(m[1], m[0]);
        } else {
            x = Math.atan2(-m[9], m[5]);
            y = Math.atan2(-m[2], sy);
            z = 0;
        }

        return new Vec3(x, y, z);
    }

    /**
     * Get world scale
     * @returns {Vec3} World scale
     */
    getWorldScale() {
        this.updateMatrix();
        const m = this.worldMatrix.elements;

        const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
        const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
        const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);

        return new Vec3(sx, sy, sz);
    }

    /**
     * Clone this transform
     * @returns {Transform} Cloned transform
     */
    clone() {
        return new Transform({
            position: this.position.toArray(),
            rotation: this.rotation.toArray(),
            scale: this.scale.toArray()
        });
    }

    /**
     * Copy values from another transform
     * @param {Transform} other - Transform to copy from
     */
    copy(other) {
        this.position.copy(other.position);
        this.rotation.copy(other.rotation);
        this.scale.copy(other.scale);
        this.markNeedsUpdate();
    }

    /**
     * Reset transform to identity
     */
    reset() {
        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.scale.set(1, 1, 1);
        this.markNeedsUpdate();
    }
}
