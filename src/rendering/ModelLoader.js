/**
 * 3D Model Loader for glTF/GLB files
 * Handles asynchronous loading, parsing, and conversion to engine-compatible format
 */
export class ModelLoader {
    constructor() {
        this.loadingProgress = new Map();
        this.cache = new Map();
    }

    /**
     * Load a glTF/GLB model asynchronously
     * @param {string} url - URL to the model file
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loaded model data
     */
    async loadModel(url, options = {}) {
        // Check cache first
        if (this.cache.has(url) && !options.forceReload) {
            return this.cache.get(url);
        }

        try {
            this.loadingProgress.set(url, { loaded: 0, total: 0, status: 'loading' });

            let modelData;
            if (url.endsWith('.glb')) {
                modelData = await this.loadGLB(url, options);
            } else if (url.endsWith('.gltf')) {
                modelData = await this.loadGLTF(url, options);
            } else {
                throw new Error(`Unsupported model format: ${url}`);
            }

            // Process the loaded data
            const processedModel = await this.processModel(modelData, options);

            // Cache the result
            this.cache.set(url, processedModel);
            this.loadingProgress.set(url, { loaded: 1, total: 1, status: 'complete' });

            return processedModel;
        } catch (error) {
            this.loadingProgress.set(url, { loaded: 0, total: 1, status: 'error', error });
            throw new Error(`Failed to load model ${url}: ${error.message}`);
        }
    }

    /**
     * Load glTF file
     * @param {string} url - URL to the glTF file
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Raw glTF data
     */
    async loadGLTF(url, options) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const gltf = await response.json();
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

        // Load external resources
        await this.loadExternalResources(gltf, baseUrl, options);

        return gltf;
    }

    /**
     * Load GLB file (binary glTF)
     * @param {string} url - URL to the GLB file
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Raw glTF data
     */
    async loadGLB(url, options) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return this.parseGLB(arrayBuffer);
    }

    /**
     * Parse GLB binary format
     * @param {ArrayBuffer} arrayBuffer - GLB file data
     * @returns {Object} Parsed glTF data
     */
    parseGLB(arrayBuffer) {
        const view = new DataView(arrayBuffer);

        // Read GLB header
        const magic = view.getUint32(0, true);
        if (magic !== 0x46546C67) { // 'glTF'
            throw new Error('Invalid GLB file: wrong magic number');
        }

        const version = view.getUint32(4, true);
        if (version !== 2) {
            throw new Error(`Unsupported GLB version: ${version}`);
        }

        const length = view.getUint32(8, true);
        let offset = 12;

        let gltf = null;
        const buffers = [];

        // Read chunks
        while (offset < length) {
            const chunkLength = view.getUint32(offset, true);
            const chunkType = view.getUint32(offset + 4, true);
            offset += 8;

            if (chunkType === 0x4E4F534A) { // 'JSON'
                const jsonData = new Uint8Array(arrayBuffer, offset, chunkLength);
                const jsonString = new TextDecoder().decode(jsonData);
                gltf = JSON.parse(jsonString);
            } else if (chunkType === 0x004E4942) { // 'BIN\0'
                const binaryData = arrayBuffer.slice(offset, offset + chunkLength);
                buffers.push(binaryData);
            }

            offset += chunkLength;
        }

        if (!gltf) {
            throw new Error('Invalid GLB file: no JSON chunk found');
        }

        // Attach binary buffers
        if (gltf.buffers && buffers.length > 0) {
            gltf.buffers.forEach((buffer, index) => {
                if (index < buffers.length) {
                    buffer.data = buffers[index];
                }
            });
        }

        return gltf;
    }

    /**
     * Load external resources (buffers, images, etc.)
     * @param {Object} gltf - glTF data
     * @param {string} baseUrl - Base URL for relative paths
     * @param {Object} options - Loading options
     */
    async loadExternalResources(gltf, baseUrl, options) {
        const promises = [];

        // Load buffers
        if (gltf.buffers) {
            for (const buffer of gltf.buffers) {
                if (buffer.uri && !buffer.uri.startsWith('data:')) {
                    promises.push(this.loadBuffer(buffer, baseUrl));
                }
            }
        }

        // Load images
        if (gltf.images) {
            for (const image of gltf.images) {
                if (image.uri && !image.uri.startsWith('data:')) {
                    promises.push(this.loadImage(image, baseUrl));
                }
            }
        }

        await Promise.all(promises);
    }

    /**
     * Load external buffer
     * @param {Object} buffer - Buffer descriptor
     * @param {string} baseUrl - Base URL
     */
    async loadBuffer(buffer, baseUrl) {
        const response = await fetch(baseUrl + buffer.uri);
        if (!response.ok) {
            throw new Error(`Failed to load buffer: ${buffer.uri}`);
        }
        buffer.data = await response.arrayBuffer();
    }

    /**
     * Load external image
     * @param {Object} image - Image descriptor
     * @param {string} baseUrl - Base URL
     */
    async loadImage(image, baseUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                image.data = img;
                resolve();
            };
            img.onerror = () => {
                // Don't reject - just resolve without image data so model can still load
                console.warn(`Failed to load texture: ${image.uri} (non-critical)`);
                resolve();
            };
            img.src = baseUrl + image.uri;
        });
    }

    /**
     * Process loaded glTF data into engine-compatible format
     * @param {Object} gltf - Raw glTF data
     * @param {Object} options - Processing options
     * @returns {Object} Processed model data
     */
    async processModel(gltf, options = {}) {
        const model = {
            scenes: [],
            meshes: [],
            materials: [],
            textures: [],
            nodes: [],
            animations: [],
            metadata: {
                generator: gltf.asset?.generator || 'Unknown',
                version: gltf.asset?.version || '2.0',
                copyright: gltf.asset?.copyright || null
            }
        };

        // Process textures first (needed by materials)
        if (gltf.textures) {
            model.textures = await this.processTextures(gltf, options);
        }

        // Process materials
        if (gltf.materials) {
            model.materials = this.processMaterials(gltf, model.textures, options);
        }

        // Process meshes
        if (gltf.meshes) {
            model.meshes = this.processMeshes(gltf, options);
        }

        // Process nodes
        if (gltf.nodes) {
            model.nodes = this.processNodes(gltf, options);
        }

        // Process scenes
        if (gltf.scenes) {
            model.scenes = this.processScenes(gltf, options);
        }

        // Set default scene
        model.defaultScene = gltf.scene || 0;

        return model;
    }

    /**
     * Process glTF textures
     * @param {Object} gltf - glTF data
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Processed textures
     */
    async processTextures(gltf, options) {
        const textures = [];

        for (let i = 0; i < gltf.textures.length; i++) {
            const gltfTexture = gltf.textures[i];
            const image = gltf.images[gltfTexture.source];
            const sampler = gltf.samplers?.[gltfTexture.sampler] || {};

            textures.push({
                index: i,
                name: gltfTexture.name || `Texture_${i}`,
                image: image.data || null,
                imageUri: image.uri || null,
                sampler: {
                    magFilter: sampler.magFilter || 9729, // LINEAR
                    minFilter: sampler.minFilter || 9987, // LINEAR_MIPMAP_LINEAR
                    wrapS: sampler.wrapS || 10497, // REPEAT
                    wrapT: sampler.wrapT || 10497  // REPEAT
                }
            });
        }

        return textures;
    }

    /**
     * Process glTF materials
     * @param {Object} gltf - glTF data
     * @param {Array} textures - Processed textures
     * @param {Object} options - Processing options
     * @returns {Array} Processed materials
     */
    processMaterials(gltf, textures, options) {
        const materials = [];

        for (let i = 0; i < gltf.materials.length; i++) {
            const gltfMaterial = gltf.materials[i];
            const pbr = gltfMaterial.pbrMetallicRoughness || {};

            const material = {
                index: i,
                name: gltfMaterial.name || `Material_${i}`,
                color: pbr.baseColorFactor || [1, 1, 1, 1],
                metallic: pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1.0,
                roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1.0,
                emissive: gltfMaterial.emissiveFactor || [0, 0, 0],
                doubleSided: gltfMaterial.doubleSided || false,
                alphaMode: gltfMaterial.alphaMode || 'OPAQUE',
                alphaCutoff: gltfMaterial.alphaCutoff || 0.5,
                textures: {}
            };

            // Process texture references
            if (pbr.baseColorTexture) {
                material.textures.baseColor = textures[pbr.baseColorTexture.index];
                material.textures.baseColorTexCoord = pbr.baseColorTexture.texCoord || 0;
            }

            if (pbr.metallicRoughnessTexture) {
                material.textures.metallicRoughness = textures[pbr.metallicRoughnessTexture.index];
                material.textures.metallicRoughnessTexCoord = pbr.metallicRoughnessTexture.texCoord || 0;
            }

            if (gltfMaterial.normalTexture) {
                material.textures.normal = textures[gltfMaterial.normalTexture.index];
                material.textures.normalTexCoord = gltfMaterial.normalTexture.texCoord || 0;
                material.textures.normalScale = gltfMaterial.normalTexture.scale || 1.0;
            }

            if (gltfMaterial.emissiveTexture) {
                material.textures.emissive = textures[gltfMaterial.emissiveTexture.index];
                material.textures.emissiveTexCoord = gltfMaterial.emissiveTexture.texCoord || 0;
            }

            materials.push(material);
        }

        return materials;
    }

    /**
     * Process glTF meshes
     * @param {Object} gltf - glTF data
     * @param {Object} options - Processing options
     * @returns {Array} Processed meshes
     */
    processMeshes(gltf, options) {
        const meshes = [];

        for (let i = 0; i < gltf.meshes.length; i++) {
            const gltfMesh = gltf.meshes[i];
            const mesh = {
                index: i,
                name: gltfMesh.name || `Mesh_${i}`,
                primitives: []
            };

            for (const primitive of gltfMesh.primitives) {
                const processedPrimitive = this.processPrimitive(primitive, gltf);
                mesh.primitives.push(processedPrimitive);
            }

            meshes.push(mesh);
        }

        return meshes;
    }

    /**
     * Process a mesh primitive
     * @param {Object} primitive - glTF primitive
     * @param {Object} gltf - Full glTF data
     * @returns {Object} Processed primitive
     */
    processPrimitive(primitive, gltf) {
        const result = {
            mode: primitive.mode || 4, // TRIANGLES
            material: primitive.material !== undefined ? primitive.material : null,
            attributes: {},
            indices: null
        };

        // Process attributes
        for (const [attributeName, accessorIndex] of Object.entries(primitive.attributes)) {
            const accessor = gltf.accessors[accessorIndex];
            const bufferView = gltf.bufferViews[accessor.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];

            result.attributes[attributeName] = this.extractAccessorData(accessor, bufferView, buffer);
        }

        // Process indices
        if (primitive.indices !== undefined) {
            const accessor = gltf.accessors[primitive.indices];
            const bufferView = gltf.bufferViews[accessor.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];

            result.indices = this.extractAccessorData(accessor, bufferView, buffer);
        }

        return result;
    }

    /**
     * Extract data from glTF accessor
     * @param {Object} accessor - glTF accessor
     * @param {Object} bufferView - glTF buffer view
     * @param {Object} buffer - glTF buffer
     * @returns {Array} Extracted data
     */
    extractAccessorData(accessor, bufferView, buffer) {
        const arrayBuffer = buffer.data;
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

        let TypedArray;
        switch (accessor.componentType) {
            case 5120: TypedArray = Int8Array; break;      // BYTE
            case 5121: TypedArray = Uint8Array; break;     // UNSIGNED_BYTE
            case 5122: TypedArray = Int16Array; break;     // SHORT
            case 5123: TypedArray = Uint16Array; break;    // UNSIGNED_SHORT
            case 5125: TypedArray = Uint32Array; break;    // UNSIGNED_INT
            case 5126: TypedArray = Float32Array; break;   // FLOAT
            default: throw new Error(`Unsupported component type: ${accessor.componentType}`);
        }

        const componentCount = this.getComponentCount(accessor.type);
        const elementCount = accessor.count * componentCount;

        return new TypedArray(arrayBuffer, byteOffset, elementCount);
    }

    /**
     * Get component count for accessor type
     * @param {string} type - Accessor type
     * @returns {number} Component count
     */
    getComponentCount(type) {
        switch (type) {
            case 'SCALAR': return 1;
            case 'VEC2': return 2;
            case 'VEC3': return 3;
            case 'VEC4': return 4;
            case 'MAT2': return 4;
            case 'MAT3': return 9;
            case 'MAT4': return 16;
            default: throw new Error(`Unknown accessor type: ${type}`);
        }
    }

    /**
     * Process glTF nodes
     * @param {Object} gltf - glTF data
     * @param {Object} options - Processing options
     * @returns {Array} Processed nodes
     */
    processNodes(gltf, options) {
        const nodes = [];

        for (let i = 0; i < gltf.nodes.length; i++) {
            const gltfNode = gltf.nodes[i];
            const node = {
                index: i,
                name: gltfNode.name || `Node_${i}`,
                mesh: gltfNode.mesh !== undefined ? gltfNode.mesh : null,
                children: gltfNode.children || [],
                matrix: gltfNode.matrix || null,
                translation: gltfNode.translation || [0, 0, 0],
                rotation: gltfNode.rotation || [0, 0, 0, 1],
                scale: gltfNode.scale || [1, 1, 1]
            };

            nodes.push(node);
        }

        return nodes;
    }

    /**
     * Process glTF scenes
     * @param {Object} gltf - glTF data
     * @param {Object} options - Processing options
     * @returns {Array} Processed scenes
     */
    processScenes(gltf, options) {
        const scenes = [];

        for (let i = 0; i < gltf.scenes.length; i++) {
            const gltfScene = gltf.scenes[i];
            const scene = {
                index: i,
                name: gltfScene.name || `Scene_${i}`,
                nodes: gltfScene.nodes || []
            };

            scenes.push(scene);
        }

        return scenes;
    }

    /**
     * Get loading progress for a model
     * @param {string} url - Model URL
     * @returns {Object} Progress information
     */
    getLoadingProgress(url) {
        return this.loadingProgress.get(url) || { loaded: 0, total: 0, status: 'not_started' };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.loadingProgress.clear();
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.clearCache();
    }
}

// Export singleton instance
export const modelLoader = new ModelLoader();
