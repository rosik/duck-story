/**
 * 3D mesh representation with vertices, indices, and WebGL buffers
 * Handles geometry data and buffer management
 */
export class Mesh {
    constructor(gl, geometry = null) {
        this.gl = gl;

        // Geometry data
        this.vertices = [];
        this.indices = [];
        this.normals = [];
        this.texCoords = [];
        this.colors = [];

        // WebGL buffers
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.normalBuffer = null;
        this.texCoordBuffer = null;
        this.colorBuffer = null;

        // Mesh properties
        this.vertexCount = 0;
        this.indexCount = 0;
        this.primitiveType = gl.TRIANGLES;
        this.needsUpdate = true;

        // Bounding information
        this.boundingBox = {
            min: [0, 0, 0],
            max: [0, 0, 0]
        };
        this.boundingSphere = {
            center: [0, 0, 0],
            radius: 0
        };

        if (geometry) {
            this.setGeometry(geometry);
        }
    }

    /**
     * Set geometry data
     * @param {Object} geometry - Geometry object with vertices, indices, etc.
     */
    setGeometry(geometry) {
        this.vertices = geometry.vertices || [];
        this.indices = geometry.indices || [];
        this.normals = geometry.normals || [];
        this.texCoords = geometry.texCoords || [];
        this.colors = geometry.colors || [];

        this.vertexCount = this.vertices.length / 3;
        this.indexCount = this.indices.length;
        this.primitiveType = geometry.primitiveType || this.gl.TRIANGLES;

        // Generate missing data
        if (this.normals.length === 0 && this.indices.length > 0) {
            this.generateNormals();
        }

        if (this.texCoords.length === 0) {
            this.generateTexCoords();
        }

        if (this.colors.length === 0) {
            this.generateColors();
        }

        this.calculateBounds();
        this.needsUpdate = true;
    }

    /**
     * Generate vertex normals
     */
    generateNormals() {
        this.normals = new Array(this.vertices.length).fill(0);

        // Calculate face normals and accumulate
        for (let i = 0; i < this.indices.length; i += 3) {
            const i1 = this.indices[i] * 3;
            const i2 = this.indices[i + 1] * 3;
            const i3 = this.indices[i + 2] * 3;

            // Get triangle vertices
            const v1 = [this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]];
            const v2 = [this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]];
            const v3 = [this.vertices[i3], this.vertices[i3 + 1], this.vertices[i3 + 2]];

            // Calculate face normal
            const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];

            // Accumulate normal for each vertex
            for (let j = 0; j < 3; j++) {
                const idx = this.indices[i + j] * 3;
                this.normals[idx] += normal[0];
                this.normals[idx + 1] += normal[1];
                this.normals[idx + 2] += normal[2];
            }
        }

        // Normalize all normals
        for (let i = 0; i < this.normals.length; i += 3) {
            const length = Math.sqrt(
                this.normals[i] * this.normals[i] +
                this.normals[i + 1] * this.normals[i + 1] +
                this.normals[i + 2] * this.normals[i + 2]
            );

            if (length > 0) {
                this.normals[i] /= length;
                this.normals[i + 1] /= length;
                this.normals[i + 2] /= length;
            }
        }
    }

    /**
     * Generate texture coordinates
     */
    generateTexCoords() {
        this.texCoords = [];

        for (let i = 0; i < this.vertexCount; i++) {
            // Simple planar mapping
            const x = this.vertices[i * 3];
            const z = this.vertices[i * 3 + 2];

            this.texCoords.push(x * 0.5 + 0.5);
            this.texCoords.push(z * 0.5 + 0.5);
        }
    }

    /**
     * Generate vertex colors (default white)
     */
    generateColors() {
        this.colors = [];

        for (let i = 0; i < this.vertexCount; i++) {
            this.colors.push(1, 1, 1); // White
        }
    }

    /**
     * Calculate bounding box and sphere
     */
    calculateBounds() {
        if (this.vertices.length === 0) return;

        // Initialize bounds
        this.boundingBox.min = [this.vertices[0], this.vertices[1], this.vertices[2]];
        this.boundingBox.max = [this.vertices[0], this.vertices[1], this.vertices[2]];

        // Find min/max
        for (let i = 3; i < this.vertices.length; i += 3) {
            const x = this.vertices[i];
            const y = this.vertices[i + 1];
            const z = this.vertices[i + 2];

            this.boundingBox.min[0] = Math.min(this.boundingBox.min[0], x);
            this.boundingBox.min[1] = Math.min(this.boundingBox.min[1], y);
            this.boundingBox.min[2] = Math.min(this.boundingBox.min[2], z);

            this.boundingBox.max[0] = Math.max(this.boundingBox.max[0], x);
            this.boundingBox.max[1] = Math.max(this.boundingBox.max[1], y);
            this.boundingBox.max[2] = Math.max(this.boundingBox.max[2], z);
        }

        // Calculate bounding sphere
        this.boundingSphere.center = [
            (this.boundingBox.min[0] + this.boundingBox.max[0]) * 0.5,
            (this.boundingBox.min[1] + this.boundingBox.max[1]) * 0.5,
            (this.boundingBox.min[2] + this.boundingBox.max[2]) * 0.5
        ];

        let maxDistSq = 0;
        for (let i = 0; i < this.vertices.length; i += 3) {
            const dx = this.vertices[i] - this.boundingSphere.center[0];
            const dy = this.vertices[i + 1] - this.boundingSphere.center[1];
            const dz = this.vertices[i + 2] - this.boundingSphere.center[2];
            const distSq = dx * dx + dy * dy + dz * dz;
            maxDistSq = Math.max(maxDistSq, distSq);
        }

        this.boundingSphere.radius = Math.sqrt(maxDistSq);
    }

    /**
     * Update WebGL buffers
     */
    updateBuffers() {
        if (!this.needsUpdate) return;

        const gl = this.gl;

        // Vertex buffer
        if (!this.vertexBuffer) {
            this.vertexBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        // Index buffer
        if (this.indices.length > 0) {
            if (!this.indexBuffer) {
                this.indexBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        }

        // Normal buffer
        if (this.normals.length > 0) {
            if (!this.normalBuffer) {
                this.normalBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        }

        // Texture coordinate buffer
        if (this.texCoords.length > 0) {
            if (!this.texCoordBuffer) {
                this.texCoordBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords), gl.STATIC_DRAW);
        }

        // Color buffer
        if (this.colors.length > 0) {
            if (!this.colorBuffer) {
                this.colorBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
        }

        this.needsUpdate = false;
    }

    /**
     * Bind mesh attributes to shader
     * @param {Shader} shader - Shader to bind attributes to
     */
    bindAttributes(shader) {
        this.updateBuffers();

        // Bind vertex positions
        if (this.vertexBuffer && shader.hasAttribute('a_position')) {
            shader.bindAttribute('a_position', this.vertexBuffer, 3);
        }

        // Bind normals
        if (this.normalBuffer && shader.hasAttribute('a_normal')) {
            shader.bindAttribute('a_normal', this.normalBuffer, 3);
        }

        // Bind texture coordinates
        if (this.texCoordBuffer && shader.hasAttribute('a_texCoord')) {
            shader.bindAttribute('a_texCoord', this.texCoordBuffer, 2);
        }

        // Bind colors
        if (this.colorBuffer && shader.hasAttribute('a_color')) {
            shader.bindAttribute('a_color', this.colorBuffer, 3);
        }
    }

    /**
     * Render the mesh
     */
    render() {
        const gl = this.gl;

        if (this.indexBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(this.primitiveType, this.indexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawArrays(this.primitiveType, 0, this.vertexCount);
        }
    }

    /**
     * Dispose of mesh resources
     */
    dispose() {
        const gl = this.gl;

        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }

        if (this.indexBuffer) {
            gl.deleteBuffer(this.indexBuffer);
            this.indexBuffer = null;
        }

        if (this.normalBuffer) {
            gl.deleteBuffer(this.normalBuffer);
            this.normalBuffer = null;
        }

        if (this.texCoordBuffer) {
            gl.deleteBuffer(this.texCoordBuffer);
            this.texCoordBuffer = null;
        }

        if (this.colorBuffer) {
            gl.deleteBuffer(this.colorBuffer);
            this.colorBuffer = null;
        }
    }
}

/**
 * Geometry generators for common shapes
 */
export class GeometryGenerator {
    /**
     * Create box geometry
     * @param {number} width - Box width
     * @param {number} height - Box height
     * @param {number} depth - Box depth
     * @returns {Object} Box geometry
     */
    static createBox(width = 1, height = 1, depth = 1) {
        const w = width * 0.5;
        const h = height * 0.5;
        const d = depth * 0.5;

        const vertices = [
            // Front face
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
            // Back face
            -w, -h, -d,  -w,  h, -d,   w,  h, -d,   w, -h, -d,
            // Top face
            -w,  h, -d,  -w,  h,  d,   w,  h,  d,   w,  h, -d,
            // Bottom face
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
            // Right face
             w, -h, -d,   w,  h, -d,   w,  h,  d,   w, -h,  d,
            // Left face
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
        ];

        const indices = [
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9,  10,   8,  10, 11,   // top
            12, 13, 14,   12, 14, 15,   // bottom
            16, 17, 18,   16, 18, 19,   // right
            20, 21, 22,   20, 22, 23    // left
        ];

        const texCoords = [
            // Front face
            0, 0,  1, 0,  1, 1,  0, 1,
            // Back face
            1, 0,  1, 1,  0, 1,  0, 0,
            // Top face
            0, 1,  0, 0,  1, 0,  1, 1,
            // Bottom face
            1, 1,  0, 1,  0, 0,  1, 0,
            // Right face
            1, 0,  1, 1,  0, 1,  0, 0,
            // Left face
            0, 0,  1, 0,  1, 1,  0, 1
        ];

        return { vertices, indices, texCoords };
    }

    /**
     * Create plane geometry
     * @param {number} width - Plane width
     * @param {number} height - Plane height
     * @param {number} widthSegments - Width segments
     * @param {number} heightSegments - Height segments
     * @returns {Object} Plane geometry
     */
    static createPlane(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
        const vertices = [];
        const indices = [];
        const texCoords = [];

        const w = width * 0.5;
        const h = height * 0.5;

        for (let iy = 0; iy <= heightSegments; iy++) {
            const y = -h + (iy / heightSegments) * height;
            const v = iy / heightSegments;

            for (let ix = 0; ix <= widthSegments; ix++) {
                const x = -w + (ix / widthSegments) * width;
                const u = ix / widthSegments;

                vertices.push(x, y, 0);
                texCoords.push(u, v);
            }
        }

        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < widthSegments; ix++) {
                const a = ix + (widthSegments + 1) * iy;
                const b = ix + (widthSegments + 1) * (iy + 1);
                const c = (ix + 1) + (widthSegments + 1) * (iy + 1);
                const d = (ix + 1) + (widthSegments + 1) * iy;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        return { vertices, indices, texCoords };
    }

    /**
     * Create sphere geometry
     * @param {number} radius - Sphere radius
     * @param {number} widthSegments - Width segments
     * @param {number} heightSegments - Height segments
     * @returns {Object} Sphere geometry
     */
    static createSphere(radius = 1, widthSegments = 32, heightSegments = 16) {
        const vertices = [];
        const indices = [];
        const texCoords = [];

        for (let iy = 0; iy <= heightSegments; iy++) {
            const v = iy / heightSegments;
            const phi = v * Math.PI;

            for (let ix = 0; ix <= widthSegments; ix++) {
                const u = ix / widthSegments;
                const theta = u * Math.PI * 2;

                const x = -radius * Math.cos(theta) * Math.sin(phi);
                const y = radius * Math.cos(phi);
                const z = radius * Math.sin(theta) * Math.sin(phi);

                vertices.push(x, y, z);
                texCoords.push(u, 1 - v);
            }
        }

        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < widthSegments; ix++) {
                const a = ix + (widthSegments + 1) * iy;
                const b = ix + (widthSegments + 1) * (iy + 1);
                const c = (ix + 1) + (widthSegments + 1) * (iy + 1);
                const d = (ix + 1) + (widthSegments + 1) * iy;

                if (iy !== 0) indices.push(a, b, d);
                if (iy !== heightSegments - 1) indices.push(b, c, d);
            }
        }

        return { vertices, indices, texCoords };
    }
}
