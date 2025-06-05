/**
 * 3D Math utilities for vectors, matrices, and transformations
 * Optimized mathematical functions for WebGL rendering
 */

/**
 * 3D Vector class
 */
export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Set vector components
     */
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Copy from another vector
     */
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /**
     * Clone this vector
     */
    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Add another vector
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /**
     * Subtract another vector
     */
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * Multiply by scalar
     */
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /**
     * Divide by scalar
     */
    divide(scalar) {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
            this.z /= scalar;
        }
        return this;
    }

    /**
     * Calculate dot product
     */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Calculate cross product
     */
    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        return new Vec3(x, y, z);
    }

    /**
     * Calculate vector length
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Calculate squared length (faster than length)
     */
    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /**
     * Normalize vector to unit length
     */
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.divide(len);
        }
        return this;
    }

    /**
     * Calculate distance to another vector
     */
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Linear interpolation to another vector
     */
    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    /**
     * Convert to array
     */
    toArray() {
        return [this.x, this.y, this.z];
    }

    /**
     * Create vector from array
     */
    static fromArray(arr) {
        return new Vec3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
    }
}

/**
 * 4x4 Matrix class for transformations
 */
export class Mat4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    /**
     * Set matrix to identity
     */
    identity() {
        const e = this.elements;
        e[0] = 1; e[4] = 0; e[8] = 0;  e[12] = 0;
        e[1] = 0; e[5] = 1; e[9] = 0;  e[13] = 0;
        e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
        return this;
    }

    /**
     * Copy from another matrix
     */
    copy(m) {
        this.elements.set(m.elements);
        return this;
    }

    /**
     * Clone this matrix
     */
    clone() {
        const result = new Mat4();
        result.copy(this);
        return result;
    }

    /**
     * Multiply by another matrix
     */
    multiply(m) {
        const a = this.elements;
        const b = m.elements;
        const result = new Float32Array(16);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }

        this.elements.set(result);
        return this;
    }

    /**
     * Create translation matrix
     */
    translate(x, y, z) {
        const e = this.elements;
        e[12] += e[0] * x + e[4] * y + e[8] * z;
        e[13] += e[1] * x + e[5] * y + e[9] * z;
        e[14] += e[2] * x + e[6] * y + e[10] * z;
        e[15] += e[3] * x + e[7] * y + e[11] * z;
        return this;
    }

    /**
     * Create rotation matrix around X axis
     */
    rotateX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const rotation = new Mat4();
        const e = rotation.elements;

        e[5] = c; e[6] = s;
        e[9] = -s; e[10] = c;

        return this.multiply(rotation);
    }

    /**
     * Create rotation matrix around Y axis
     */
    rotateY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const rotation = new Mat4();
        const e = rotation.elements;

        e[0] = c; e[2] = -s;
        e[8] = s; e[10] = c;

        return this.multiply(rotation);
    }

    /**
     * Create rotation matrix around Z axis
     */
    rotateZ(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const rotation = new Mat4();
        const e = rotation.elements;

        e[0] = c; e[1] = s;
        e[4] = -s; e[5] = c;

        return this.multiply(rotation);
    }

    /**
     * Create scale matrix
     */
    scale(x, y, z) {
        const e = this.elements;
        e[0] *= x; e[4] *= y; e[8] *= z;
        e[1] *= x; e[5] *= y; e[9] *= z;
        e[2] *= x; e[6] *= y; e[10] *= z;
        e[3] *= x; e[7] *= y; e[11] *= z;
        return this;
    }

    /**
     * Create perspective projection matrix
     */
    perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);

        this.identity();
        const e = this.elements;

        e[0] = f / aspect;
        e[5] = f;
        e[10] = (far + near) * nf;
        e[11] = -1;
        e[14] = 2 * far * near * nf;
        e[15] = 0;

        return this;
    }

    /**
     * Create orthographic projection matrix
     */
    orthographic(left, right, bottom, top, near, far) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        this.identity();
        const e = this.elements;

        e[0] = -2 * lr;
        e[5] = -2 * bt;
        e[10] = 2 * nf;
        e[12] = (left + right) * lr;
        e[13] = (top + bottom) * bt;
        e[14] = (far + near) * nf;

        return this;
    }

    /**
     * Create look-at view matrix
     */
    lookAt(eye, target, up) {
        const zAxis = new Vec3().copy(eye).subtract(target).normalize();
        const xAxis = new Vec3().copy(up).cross(zAxis).normalize();
        const yAxis = new Vec3().copy(zAxis).cross(xAxis);

        this.identity();
        const e = this.elements;

        e[0] = xAxis.x; e[4] = xAxis.y; e[8] = xAxis.z;   e[12] = -xAxis.dot(eye);
        e[1] = yAxis.x; e[5] = yAxis.y; e[9] = yAxis.z;   e[13] = -yAxis.dot(eye);
        e[2] = zAxis.x; e[6] = zAxis.y; e[10] = zAxis.z;  e[14] = -zAxis.dot(eye);

        return this;
    }

    /**
     * Invert matrix
     */
    invert() {
        const e = this.elements;
        const inv = new Float32Array(16);

        inv[0] = e[5] * e[10] * e[15] - e[5] * e[11] * e[14] - e[9] * e[6] * e[15] +
                 e[9] * e[7] * e[14] + e[13] * e[6] * e[11] - e[13] * e[7] * e[10];

        inv[4] = -e[4] * e[10] * e[15] + e[4] * e[11] * e[14] + e[8] * e[6] * e[15] -
                 e[8] * e[7] * e[14] - e[12] * e[6] * e[11] + e[12] * e[7] * e[10];

        inv[8] = e[4] * e[9] * e[15] - e[4] * e[11] * e[13] - e[8] * e[5] * e[15] +
                 e[8] * e[7] * e[13] + e[12] * e[5] * e[11] - e[12] * e[7] * e[9];

        inv[12] = -e[4] * e[9] * e[14] + e[4] * e[10] * e[13] + e[8] * e[5] * e[14] -
                  e[8] * e[6] * e[13] - e[12] * e[5] * e[10] + e[12] * e[6] * e[9];

        inv[1] = -e[1] * e[10] * e[15] + e[1] * e[11] * e[14] + e[9] * e[2] * e[15] -
                 e[9] * e[3] * e[14] - e[13] * e[2] * e[11] + e[13] * e[3] * e[10];

        inv[5] = e[0] * e[10] * e[15] - e[0] * e[11] * e[14] - e[8] * e[2] * e[15] +
                 e[8] * e[3] * e[14] + e[12] * e[2] * e[11] - e[12] * e[3] * e[10];

        inv[9] = -e[0] * e[9] * e[15] + e[0] * e[11] * e[13] + e[8] * e[1] * e[15] -
                 e[8] * e[3] * e[13] - e[12] * e[1] * e[11] + e[12] * e[3] * e[9];

        inv[13] = e[0] * e[9] * e[14] - e[0] * e[10] * e[13] - e[8] * e[1] * e[14] +
                  e[8] * e[2] * e[13] + e[12] * e[1] * e[10] - e[12] * e[2] * e[9];

        inv[2] = e[1] * e[6] * e[15] - e[1] * e[7] * e[14] - e[5] * e[2] * e[15] +
                 e[5] * e[3] * e[14] + e[13] * e[2] * e[7] - e[13] * e[3] * e[6];

        inv[6] = -e[0] * e[6] * e[15] + e[0] * e[7] * e[14] + e[4] * e[2] * e[15] -
                 e[4] * e[3] * e[14] - e[12] * e[2] * e[7] + e[12] * e[3] * e[6];

        inv[10] = e[0] * e[5] * e[15] - e[0] * e[7] * e[13] - e[4] * e[1] * e[15] +
                  e[4] * e[3] * e[13] + e[12] * e[1] * e[7] - e[12] * e[3] * e[5];

        inv[14] = -e[0] * e[5] * e[14] + e[0] * e[6] * e[13] + e[4] * e[1] * e[14] -
                  e[4] * e[2] * e[13] - e[12] * e[1] * e[6] + e[12] * e[2] * e[5];

        inv[3] = -e[1] * e[6] * e[11] + e[1] * e[7] * e[10] + e[5] * e[2] * e[11] -
                 e[5] * e[3] * e[10] - e[9] * e[2] * e[7] + e[9] * e[3] * e[6];

        inv[7] = e[0] * e[6] * e[11] - e[0] * e[7] * e[10] - e[4] * e[2] * e[11] +
                 e[4] * e[3] * e[10] + e[8] * e[2] * e[7] - e[8] * e[3] * e[6];

        inv[11] = -e[0] * e[5] * e[11] + e[0] * e[7] * e[9] + e[4] * e[1] * e[11] -
                  e[4] * e[3] * e[9] - e[8] * e[1] * e[7] + e[8] * e[3] * e[5];

        inv[15] = e[0] * e[5] * e[10] - e[0] * e[6] * e[9] - e[4] * e[1] * e[10] +
                  e[4] * e[2] * e[9] + e[8] * e[1] * e[6] - e[8] * e[2] * e[5];

        let det = e[0] * inv[0] + e[1] * inv[4] + e[2] * inv[8] + e[3] * inv[12];

        if (det === 0) return this;

        det = 1.0 / det;
        for (let i = 0; i < 16; i++) {
            this.elements[i] = inv[i] * det;
        }

        return this;
    }
}

/**
 * Math utility functions
 */
export const MathUtils = {
    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees
     */
    radToDeg(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Smooth step interpolation
     */
    smoothstep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    },

    /**
     * Generate random number between min and max
     */
    random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    },

    /**
     * Generate random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    },

    /**
     * Check if number is power of 2
     */
    isPowerOfTwo(value) {
        return (value & (value - 1)) === 0;
    },

    /**
     * Get next power of 2
     */
    nextPowerOfTwo(value) {
        value--;
        value |= value >> 1;
        value |= value >> 2;
        value |= value >> 4;
        value |= value >> 8;
        value |= value >> 16;
        value++;
        return value;
    }
};
