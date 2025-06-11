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
     * @param {string} axis - Plane orientation: 'xy', 'xz', or 'yz'
     * @returns {Object} Plane geometry
     */
    static createPlane(width = 1, height = 1, widthSegments = 1, heightSegments = 1, axis = 'xy') {
        const vertices = [];
        const indices = [];
        const texCoords = [];
        const normals = [];

        const w = width * 0.5;
        const h = height * 0.5;

        for (let iy = 0; iy <= heightSegments; iy++) {
            const y = -h + (iy / heightSegments) * height;
            const v = iy / heightSegments;

            for (let ix = 0; ix <= widthSegments; ix++) {
                const x = -w + (ix / widthSegments) * width;
                const u = ix / widthSegments;

                // Generate vertices based on axis orientation
                switch (axis) {
                    case 'xy':
                        vertices.push(x, y, 0);
                        normals.push(0, 0, 1);
                        break;
                    case 'xz':
                        vertices.push(x, 0, y);
                        normals.push(0, 1, 0);
                        break;
                    case 'yz':
                        vertices.push(0, x, y);
                        normals.push(1, 0, 0);
                        break;
                    default:
                        vertices.push(x, y, 0);
                        normals.push(0, 0, 1);
                }

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

        return { vertices, indices, texCoords, normals };
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

    /**
     * Create geometry from loaded model data
     * @param {Object} modelData - Processed model data from ModelLoader
     * @param {Object} options - Creation options
     * @returns {Object} Mesh geometry compatible with existing system
     */
    static createFromModel(modelData, options = {}) {
        const {
            meshIndex = 0,
            primitiveIndex = 0,
            flipY = false,
            scale = [1, 1, 1],
            center = false
        } = options;

        if (!modelData.meshes || meshIndex >= modelData.meshes.length) {
            throw new Error(`Mesh index ${meshIndex} not found in model`);
        }

        const mesh = modelData.meshes[meshIndex];
        if (!mesh.primitives || primitiveIndex >= mesh.primitives.length) {
            throw new Error(`Primitive index ${primitiveIndex} not found in mesh`);
        }

        const primitive = mesh.primitives[primitiveIndex];
        const geometry = {
            vertices: [],
            indices: [],
            normals: [],
            texCoords: [],
            colors: [],
            materialIndex: primitive.material
        };

        // Extract vertex positions
        if (primitive.attributes.POSITION) {
            const positions = primitive.attributes.POSITION;
            geometry.vertices = Array.from(positions);
        }

        // Extract normals
        if (primitive.attributes.NORMAL) {
            const normals = primitive.attributes.NORMAL;
            geometry.normals = Array.from(normals);
        }

        // Extract texture coordinates
        if (primitive.attributes.TEXCOORD_0) {
            const texCoords = primitive.attributes.TEXCOORD_0;
            geometry.texCoords = Array.from(texCoords);
        }

        // Extract vertex colors
        if (primitive.attributes.COLOR_0) {
            const colors = primitive.attributes.COLOR_0;
            geometry.colors = Array.from(colors);
        }

        // Extract indices
        if (primitive.indices) {
            geometry.indices = Array.from(primitive.indices);
        }

        // Apply transformations
        if (scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) {
            this.scaleGeometry(geometry, scale);
        }

        if (flipY) {
            this.flipGeometryY(geometry);
        }

        if (center) {
            this.centerGeometry(geometry);
        }

        // Set primitive type based on glTF mode
        switch (primitive.mode) {
            case 0: geometry.primitiveType = 'POINTS'; break;
            case 1: geometry.primitiveType = 'LINES'; break;
            case 2: geometry.primitiveType = 'LINE_LOOP'; break;
            case 3: geometry.primitiveType = 'LINE_STRIP'; break;
            case 4: geometry.primitiveType = 'TRIANGLES'; break;
            case 5: geometry.primitiveType = 'TRIANGLE_STRIP'; break;
            case 6: geometry.primitiveType = 'TRIANGLE_FAN'; break;
            default: geometry.primitiveType = 'TRIANGLES';
        }

        return geometry;
    }

    /**
     * Create multiple geometries from all meshes in model
     * @param {Object} modelData - Processed model data from ModelLoader
     * @param {Object} options - Creation options
     * @returns {Array} Array of mesh geometries
     */
    static createAllFromModel(modelData, options = {}) {
        const geometries = [];

        for (let meshIndex = 0; meshIndex < modelData.meshes.length; meshIndex++) {
            const mesh = modelData.meshes[meshIndex];

            for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++) {
                const geometry = this.createFromModel(modelData, {
                    ...options,
                    meshIndex,
                    primitiveIndex
                });

                geometry.meshName = mesh.name;
                geometry.meshIndex = meshIndex;
                geometry.primitiveIndex = primitiveIndex;

                geometries.push(geometry);
            }
        }

        return geometries;
    }

    /**
     * Scale geometry vertices
     * @param {Object} geometry - Geometry to scale
     * @param {number[]} scale - Scale factors [x, y, z]
     */
    static scaleGeometry(geometry, scale) {
        for (let i = 0; i < geometry.vertices.length; i += 3) {
            geometry.vertices[i] *= scale[0];
            geometry.vertices[i + 1] *= scale[1];
            geometry.vertices[i + 2] *= scale[2];
        }
    }

    /**
     * Flip geometry Y coordinates
     * @param {Object} geometry - Geometry to flip
     */
    static flipGeometryY(geometry) {
        for (let i = 1; i < geometry.vertices.length; i += 3) {
            geometry.vertices[i] = -geometry.vertices[i];
        }

        // Also flip normals if present
        for (let i = 1; i < geometry.normals.length; i += 3) {
            geometry.normals[i] = -geometry.normals[i];
        }
    }

    /**
     * Center geometry around origin
     * @param {Object} geometry - Geometry to center
     */
    static centerGeometry(geometry) {
        if (geometry.vertices.length === 0) return;

        // Calculate bounding box
        let minX = geometry.vertices[0], maxX = geometry.vertices[0];
        let minY = geometry.vertices[1], maxY = geometry.vertices[1];
        let minZ = geometry.vertices[2], maxZ = geometry.vertices[2];

        for (let i = 3; i < geometry.vertices.length; i += 3) {
            minX = Math.min(minX, geometry.vertices[i]);
            maxX = Math.max(maxX, geometry.vertices[i]);
            minY = Math.min(minY, geometry.vertices[i + 1]);
            maxY = Math.max(maxY, geometry.vertices[i + 1]);
            minZ = Math.min(minZ, geometry.vertices[i + 2]);
            maxZ = Math.max(maxZ, geometry.vertices[i + 2]);
        }

        // Calculate center offset
        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;

        // Apply offset
        for (let i = 0; i < geometry.vertices.length; i += 3) {
            geometry.vertices[i] -= centerX;
            geometry.vertices[i + 1] -= centerY;
            geometry.vertices[i + 2] -= centerZ;
        }
    }

    /**
     * Create geometry from model node (with transformations)
     * @param {Object} modelData - Processed model data from ModelLoader
     * @param {number} nodeIndex - Node index to process
     * @param {Object} options - Creation options
     * @returns {Object} Transformed geometry
     */
    static createFromModelNode(modelData, nodeIndex, options = {}) {
        if (!modelData.nodes || nodeIndex >= modelData.nodes.length) {
            throw new Error(`Node index ${nodeIndex} not found in model`);
        }

        const node = modelData.nodes[nodeIndex];
        if (node.mesh === null || node.mesh === undefined) {
            throw new Error(`Node ${nodeIndex} has no mesh`);
        }

        // Get base geometry from mesh
        const geometry = this.createFromModel(modelData, {
            ...options,
            meshIndex: node.mesh
        });

        // Apply node transformations
        this.applyNodeTransform(geometry, node);

        return geometry;
    }

    /**
     * Apply node transformation to geometry
     * @param {Object} geometry - Geometry to transform
     * @param {Object} node - glTF node with transformation data
     */
    static applyNodeTransform(geometry, node) {
        // Create transformation matrix
        let matrix;

        if (node.matrix) {
            matrix = node.matrix;
        } else {
            // Build matrix from TRS
            matrix = this.createTRSMatrix(
                node.translation,
                node.rotation,
                node.scale
            );
        }

        // Apply transformation to vertices
        for (let i = 0; i < geometry.vertices.length; i += 3) {
            const vertex = [
                geometry.vertices[i],
                geometry.vertices[i + 1],
                geometry.vertices[i + 2],
                1
            ];

            const transformed = this.multiplyMatrixVector(matrix, vertex);

            geometry.vertices[i] = transformed[0];
            geometry.vertices[i + 1] = transformed[1];
            geometry.vertices[i + 2] = transformed[2];
        }

        // Apply transformation to normals (use inverse transpose)
        if (geometry.normals.length > 0) {
            const normalMatrix = this.invertMatrix3x3(matrix);

            for (let i = 0; i < geometry.normals.length; i += 3) {
                const normal = [
                    geometry.normals[i],
                    geometry.normals[i + 1],
                    geometry.normals[i + 2]
                ];

                const transformed = this.multiplyMatrix3Vector(normalMatrix, normal);

                geometry.normals[i] = transformed[0];
                geometry.normals[i + 1] = transformed[1];
                geometry.normals[i + 2] = transformed[2];
            }
        }
    }

    /**
     * Create transformation matrix from translation, rotation, scale
     * @param {number[]} translation - Translation [x, y, z]
     * @param {number[]} rotation - Rotation quaternion [x, y, z, w]
     * @param {number[]} scale - Scale [x, y, z]
     * @returns {number[]} 4x4 transformation matrix
     */
    static createTRSMatrix(translation, rotation, scale) {
        const [tx, ty, tz] = translation;
        const [qx, qy, qz, qw] = rotation;
        const [sx, sy, sz] = scale;

        // Convert quaternion to rotation matrix
        const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
        const xx = qx * x2, xy = qx * y2, xz = qx * z2;
        const yy = qy * y2, yz = qy * z2, zz = qz * z2;
        const wx = qw * x2, wy = qw * y2, wz = qw * z2;

        return [
            (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, tx,
            (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, ty,
            (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, tz,
            0, 0, 0, 1
        ];
    }

    /**
     * Multiply 4x4 matrix by 4D vector
     * @param {number[]} matrix - 4x4 matrix (column-major)
     * @param {number[]} vector - 4D vector
     * @returns {number[]} Transformed vector
     */
    static multiplyMatrixVector(matrix, vector) {
        return [
            matrix[0] * vector[0] + matrix[4] * vector[1] + matrix[8] * vector[2] + matrix[12] * vector[3],
            matrix[1] * vector[0] + matrix[5] * vector[1] + matrix[9] * vector[2] + matrix[13] * vector[3],
            matrix[2] * vector[0] + matrix[6] * vector[1] + matrix[10] * vector[2] + matrix[14] * vector[3],
            matrix[3] * vector[0] + matrix[7] * vector[1] + matrix[11] * vector[2] + matrix[15] * vector[3]
        ];
    }

    /**
     * Multiply 3x3 matrix by 3D vector
     * @param {number[]} matrix - 3x3 matrix
     * @param {number[]} vector - 3D vector
     * @returns {number[]} Transformed vector
     */
    static multiplyMatrix3Vector(matrix, vector) {
        return [
            matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
            matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
            matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]
        ];
    }

    /**
     * Invert 3x3 matrix (for normal transformation)
     * @param {number[]} matrix - 4x4 matrix
     * @returns {number[]} Inverted 3x3 matrix
     */
    static invertMatrix3x3(matrix) {
        // Extract 3x3 part from 4x4 matrix
        const m = [
            matrix[0], matrix[1], matrix[2],
            matrix[4], matrix[5], matrix[6],
            matrix[8], matrix[9], matrix[10]
        ];

        const det = m[0] * (m[4] * m[8] - m[7] * m[5]) -
                   m[1] * (m[3] * m[8] - m[6] * m[5]) +
                   m[2] * (m[3] * m[7] - m[6] * m[4]);

        if (Math.abs(det) < 1e-10) {
            // Return identity if matrix is not invertible
            return [1, 0, 0, 0, 1, 0, 0, 0, 1];
        }

        const invDet = 1 / det;

        return [
            (m[4] * m[8] - m[7] * m[5]) * invDet,
            (m[2] * m[7] - m[1] * m[8]) * invDet,
            (m[1] * m[5] - m[2] * m[4]) * invDet,
            (m[6] * m[5] - m[3] * m[8]) * invDet,
            (m[0] * m[8] - m[2] * m[6]) * invDet,
            (m[2] * m[3] - m[0] * m[5]) * invDet,
            (m[3] * m[7] - m[6] * m[4]) * invDet,
            (m[1] * m[6] - m[0] * m[7]) * invDet,
            (m[0] * m[4] - m[1] * m[3]) * invDet
        ];
    }
}
