import { Mat4, Vec3, MathUtils } from '../utils/Math.js';

/**
 * 3D Camera with projection and view matrices
 * Supports perspective projection and gentle swaying motion
 */
export class Camera {
    constructor(options = {}) {
        // Camera position and orientation
        this.position = new Vec3(options.position?.[0] || 0, options.position?.[1] || 0, options.position?.[2] || 5);
        this.target = new Vec3(options.target?.[0] || 0, options.target?.[1] || 0, options.target?.[2] || 0);
        this.up = new Vec3(options.up?.[0] || 0, options.up?.[1] || 1, options.up?.[2] || 0);

        // Projection parameters
        this.fov = options.fov || MathUtils.degToRad(45);
        this.aspect = options.aspect || 1.0;
        this.near = options.near || 0.1;
        this.far = options.far || 1000.0;

        // Matrices
        this.viewMatrix = new Mat4();
        this.projectionMatrix = new Mat4();
        this.viewProjectionMatrix = new Mat4();

        // Animation properties for gentle swaying
        this.swayEnabled = options.swayEnabled !== undefined ? options.swayEnabled : true;
        this.swayAmplitude = options.swayAmplitude || 0.02;
        this.swaySpeed = options.swaySpeed || 0.5;
        this.swayTime = 0;
        this.basePosition = this.position.clone();
        this.baseTarget = this.target.clone();

        // Camera controls
        this.controlsEnabled = options.controlsEnabled || false;
        this.rotationSpeed = options.rotationSpeed || 0.005;
        this.zoomSpeed = options.zoomSpeed || 0.1;

        // Update matrices
        this.updateProjectionMatrix();
        this.updateViewMatrix();
    }

    /**
     * Set camera position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Set camera target
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setTarget(x, y, z) {
        this.target.set(x, y, z);
        this.baseTarget.copy(this.target);
        this.updateViewMatrix();
    }

    /**
     * Set field of view
     * @param {number} fov - Field of view in radians
     */
    setFOV(fov) {
        this.fov = fov;
        this.updateProjectionMatrix();
    }

    /**
     * Set aspect ratio
     * @param {number} aspect - Aspect ratio (width/height)
     */
    setAspectRatio(aspect) {
        this.aspect = aspect;
        this.updateProjectionMatrix();
    }

    /**
     * Set near and far clipping planes
     * @param {number} near - Near clipping plane
     * @param {number} far - Far clipping plane
     */
    setClippingPlanes(near, far) {
        this.near = near;
        this.far = far;
        this.updateProjectionMatrix();
    }

    /**
     * Update projection matrix
     */
    updateProjectionMatrix() {
        this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far);
        this.updateViewProjectionMatrix();
    }

    /**
     * Update view matrix
     */
    updateViewMatrix() {
        this.viewMatrix.lookAt(this.position, this.target, this.up);
        this.updateViewProjectionMatrix();
    }

    /**
     * Update combined view-projection matrix
     */
    updateViewProjectionMatrix() {
        this.viewProjectionMatrix.copy(this.projectionMatrix).multiply(this.viewMatrix);
    }

    /**
     * Update camera animation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (this.swayEnabled) {
            this.updateSway(deltaTime);
        }
    }

    /**
     * Update gentle swaying motion
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateSway(deltaTime) {
        this.swayTime += deltaTime * this.swaySpeed;

        // Calculate sway offsets using sine waves
        const swayX = Math.sin(this.swayTime) * this.swayAmplitude;
        const swayY = Math.sin(this.swayTime * 0.7) * this.swayAmplitude * 0.5;
        const swayZ = Math.cos(this.swayTime * 0.3) * this.swayAmplitude * 0.3;

        // Apply sway to position
        this.position.copy(this.basePosition);
        this.position.x += swayX;
        this.position.y += swayY;
        this.position.z += swayZ;

        // Slight target sway for more natural movement
        this.target.copy(this.baseTarget);
        this.target.x += swayX * 0.2;
        this.target.y += swayY * 0.3;

        this.updateViewMatrix();
    }

    /**
     * Enable or disable swaying motion
     * @param {boolean} enabled - Whether to enable swaying
     */
    setSwayEnabled(enabled) {
        this.swayEnabled = enabled;
        if (!enabled) {
            // Reset to base position
            this.position.copy(this.basePosition);
            this.target.copy(this.baseTarget);
            this.updateViewMatrix();
        }
    }

    /**
     * Set sway parameters
     * @param {number} amplitude - Sway amplitude
     * @param {number} speed - Sway speed
     */
    setSwayParameters(amplitude, speed) {
        this.swayAmplitude = amplitude;
        this.swaySpeed = speed;
    }

    /**
     * Look at a specific point
     * @param {Vec3|number[]} target - Target position
     */
    lookAt(target) {
        if (Array.isArray(target)) {
            this.target.set(target[0], target[1], target[2]);
        } else {
            this.target.copy(target);
        }
        this.baseTarget.copy(this.target);
        this.updateViewMatrix();
    }

    /**
     * Move camera forward/backward
     * @param {number} distance - Distance to move (positive = forward)
     */
    moveForward(distance) {
        const direction = new Vec3().copy(this.target).subtract(this.position).normalize();
        this.position.add(direction.multiply(distance));
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Move camera right/left
     * @param {number} distance - Distance to move (positive = right)
     */
    moveRight(distance) {
        const forward = new Vec3().copy(this.target).subtract(this.position).normalize();
        const right = forward.cross(this.up).normalize();
        this.position.add(right.multiply(distance));
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Move camera up/down
     * @param {number} distance - Distance to move (positive = up)
     */
    moveUp(distance) {
        this.position.add(new Vec3().copy(this.up).multiply(distance));
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Orbit around target
     * @param {number} deltaX - Horizontal rotation
     * @param {number} deltaY - Vertical rotation
     */
    orbit(deltaX, deltaY) {
        const offset = new Vec3().copy(this.position).subtract(this.target);
        const distance = offset.length();

        // Convert to spherical coordinates
        let theta = Math.atan2(offset.x, offset.z);
        let phi = Math.acos(offset.y / distance);

        // Apply rotation
        theta += deltaX * this.rotationSpeed;
        phi += deltaY * this.rotationSpeed;

        // Clamp phi to prevent flipping
        phi = MathUtils.clamp(phi, 0.1, Math.PI - 0.1);

        // Convert back to cartesian
        offset.x = distance * Math.sin(phi) * Math.sin(theta);
        offset.y = distance * Math.cos(phi);
        offset.z = distance * Math.sin(phi) * Math.cos(theta);

        this.position.copy(this.target).add(offset);
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Zoom in/out by moving closer/farther from target
     * @param {number} delta - Zoom delta (positive = zoom in)
     */
    zoom(delta) {
        const direction = new Vec3().copy(this.target).subtract(this.position).normalize();
        const distance = this.position.distanceTo(this.target);
        const newDistance = Math.max(0.1, distance - delta * this.zoomSpeed);

        this.position.copy(this.target).subtract(direction.multiply(newDistance));
        this.basePosition.copy(this.position);
        this.updateViewMatrix();
    }

    /**
     * Get camera direction vector
     * @returns {Vec3} Normalized direction vector
     */
    getDirection() {
        return new Vec3().copy(this.target).subtract(this.position).normalize();
    }

    /**
     * Get camera right vector
     * @returns {Vec3} Normalized right vector
     */
    getRight() {
        return this.getDirection().cross(this.up).normalize();
    }

    /**
     * Get camera up vector
     * @returns {Vec3} Normalized up vector
     */
    getUp() {
        const right = this.getRight();
        return right.cross(this.getDirection()).normalize();
    }

    /**
     * Convert screen coordinates to world ray
     * @param {number} x - Screen X coordinate (0-1)
     * @param {number} y - Screen Y coordinate (0-1)
     * @returns {Object} Ray with origin and direction
     */
    screenToWorldRay(x, y) {
        // Convert screen coordinates to NDC
        const ndcX = x * 2 - 1;
        const ndcY = -(y * 2 - 1); // Flip Y axis

        // Create ray in clip space
        const clipNear = [ndcX, ndcY, -1, 1];
        const clipFar = [ndcX, ndcY, 1, 1];

        // Transform to world space
        const invViewProj = this.viewProjectionMatrix.clone().invert();

        // Transform points
        const worldNear = this.transformPoint(clipNear, invViewProj);
        const worldFar = this.transformPoint(clipFar, invViewProj);

        // Create ray
        const origin = new Vec3(worldNear[0], worldNear[1], worldNear[2]);
        const direction = new Vec3(worldFar[0] - worldNear[0], worldFar[1] - worldNear[1], worldFar[2] - worldNear[2]).normalize();

        return { origin, direction };
    }

    /**
     * Transform a point by a matrix
     * @param {number[]} point - Point to transform [x, y, z, w]
     * @param {Mat4} matrix - Transformation matrix
     * @returns {number[]} Transformed point
     */
    transformPoint(point, matrix) {
        const m = matrix.elements;
        const x = point[0], y = point[1], z = point[2], w = point[3];

        const resultW = m[3] * x + m[7] * y + m[11] * z + m[15] * w;

        return [
            (m[0] * x + m[4] * y + m[8] * z + m[12] * w) / resultW,
            (m[1] * x + m[5] * y + m[9] * z + m[13] * w) / resultW,
            (m[2] * x + m[6] * y + m[10] * z + m[14] * w) / resultW
        ];
    }

    /**
     * Get camera frustum planes for culling
     * @returns {Object[]} Array of frustum planes
     */
    getFrustumPlanes() {
        const m = this.viewProjectionMatrix.elements;

        return [
            // Left plane
            { normal: [m[3] + m[0], m[7] + m[4], m[11] + m[8]], distance: m[15] + m[12] },
            // Right plane
            { normal: [m[3] - m[0], m[7] - m[4], m[11] - m[8]], distance: m[15] - m[12] },
            // Bottom plane
            { normal: [m[3] + m[1], m[7] + m[5], m[11] + m[9]], distance: m[15] + m[13] },
            // Top plane
            { normal: [m[3] - m[1], m[7] - m[5], m[11] - m[9]], distance: m[15] - m[13] },
            // Near plane
            { normal: [m[3] + m[2], m[7] + m[6], m[11] + m[10]], distance: m[15] + m[14] },
            // Far plane
            { normal: [m[3] - m[2], m[7] - m[6], m[11] - m[10]], distance: m[15] - m[14] }
        ];
    }

    /**
     * Clone this camera
     * @returns {Camera} Cloned camera
     */
    clone() {
        return new Camera({
            position: this.position.toArray(),
            target: this.target.toArray(),
            up: this.up.toArray(),
            fov: this.fov,
            aspect: this.aspect,
            near: this.near,
            far: this.far,
            swayEnabled: this.swayEnabled,
            swayAmplitude: this.swayAmplitude,
            swaySpeed: this.swaySpeed,
            controlsEnabled: this.controlsEnabled,
            rotationSpeed: this.rotationSpeed,
            zoomSpeed: this.zoomSpeed
        });
    }
}
