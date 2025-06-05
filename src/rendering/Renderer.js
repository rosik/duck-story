import { Shader, ShaderLibrary } from './Shader.js';
import { Mat4 } from '../utils/Math.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Main WebGL renderer
 * Manages rendering pipeline, shaders, and WebGL state
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;

        // Rendering state
        this.clearColor = [0.0, 0.0, 0.0, 1.0];
        this.viewport = { x: 0, y: 0, width: 0, height: 0 };

        // Shader management
        this.shaderLibrary = null;
        this.currentShader = null;

        // Lighting
        this.lightDirection = [0.5, -1.0, 0.3];
        this.lightColor = [1.0, 1.0, 1.0];
        this.ambientColor = [0.3, 0.3, 0.4];

        // Performance settings
        this.performanceProfile = 'high';
        this.enableCulling = true;
        this.enableDepthTest = true;

        // Statistics
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            vertices: 0,
            frameTime: 0
        };

        // Matrices
        this.modelMatrix = new Mat4();
        this.normalMatrix = new Mat4();
    }

    /**
     * Initialize WebGL context and renderer
     */
    async init() {
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl2') ||
                  this.canvas.getContext('webgl') ||
                  this.canvas.getContext('experimental-webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        console.log('WebGL context created:', this.gl.getParameter(this.gl.VERSION));

        // Initialize WebGL state
        this.initWebGLState();

        // Create shader library
        this.shaderLibrary = new ShaderLibrary(this.gl);

        // Load default shaders
        await this.loadDefaultShaders();

        // Set initial viewport
        this.setViewport(this.canvas.width, this.canvas.height);

        console.log('Renderer initialized successfully');
    }

    /**
     * Initialize WebGL state
     */
    initWebGLState() {
        const gl = this.gl;

        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Enable face culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);

        // Set clear color
        gl.clearColor(...this.clearColor);

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Set pixel storage
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }

    /**
     * Load default shaders
     */
    async loadDefaultShaders() {
        try {
            // Load basic shader
            const basicVertexSource = await this.loadShaderSource('src/shaders/vertex/basic.vert');
            const basicFragmentSource = await this.loadShaderSource('src/shaders/fragment/basic.frag');
            this.shaderLibrary.create('basic', basicVertexSource, basicFragmentSource);

            // Load sky shader
            const skyVertexSource = await this.loadShaderSource('src/shaders/vertex/sky.vert');
            const skyFragmentSource = await this.loadShaderSource('src/shaders/fragment/sky.frag');
            this.shaderLibrary.create('sky', skyVertexSource, skyFragmentSource);

            // Load cloud shader
            const cloudFragmentSource = await this.loadShaderSource('src/shaders/fragment/cloud.frag');
            this.shaderLibrary.create('cloud', basicVertexSource, cloudFragmentSource);

            console.log('Default shaders loaded');

        } catch (error) {
            console.error('Failed to load shaders:', error);
            throw error;
        }
    }

    /**
     * Load shader source from file
     * @param {string} path - Path to shader file
     * @returns {Promise<string>} Shader source code
     */
    async loadShaderSource(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${path}`);
        }
        return await response.text();
    }

    /**
     * Set viewport size
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     */
    setViewport(width, height) {
        this.viewport.width = width;
        this.viewport.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    /**
     * Set clear color
     * @param {number} r - Red component (0-1)
     * @param {number} g - Green component (0-1)
     * @param {number} b - Blue component (0-1)
     * @param {number} a - Alpha component (0-1)
     */
    setClearColor(r, g, b, a = 1.0) {
        this.clearColor = [r, g, b, a];
        this.gl.clearColor(r, g, b, a);
    }

    /**
     * Set lighting parameters
     * @param {number[]} direction - Light direction
     * @param {number[]} color - Light color
     * @param {number[]} ambient - Ambient color
     */
    setLighting(direction, color, ambient) {
        this.lightDirection = [...direction];
        this.lightColor = [...color];
        this.ambientColor = [...ambient];
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile (high, medium, low)
     */
    setPerformanceProfile(profile) {
        this.performanceProfile = profile;

        // Adjust settings based on profile
        switch (profile) {
            case 'high':
                this.enableCulling = true;
                this.enableDepthTest = true;
                break;
            case 'medium':
                this.enableCulling = true;
                this.enableDepthTest = true;
                break;
            case 'low':
                this.enableCulling = true;
                this.enableDepthTest = true;
                break;
        }
    }

    /**
     * Main render method
     * @param {Scene} scene - Scene to render
     * @param {number} interpolation - Interpolation factor for smooth rendering
     */
    render(scene, interpolation = 0) {
        const startTime = performance.now();

        // Reset statistics
        this.stats.drawCalls = 0;
        this.stats.triangles = 0;
        this.stats.vertices = 0;

        // Clear buffers
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        if (!scene || !scene.camera) {
            return;
        }

        // Update camera
        scene.camera.update(0.016); // Assume 60 FPS for now

        // Render scene objects
        this.renderScene(scene);

        // Calculate frame time
        this.stats.frameTime = performance.now() - startTime;

        // Emit render statistics
        eventBus.emit('renderer.stats', this.stats);
    }

    /**
     * Render scene objects
     * @param {Scene} scene - Scene to render
     */
    renderScene(scene) {
        const gl = this.gl;
        const camera = scene.camera;

        // Sort objects by rendering order
        const sortedObjects = this.sortObjects(scene.objects);

        // Render each object
        for (const object of sortedObjects) {
            if (!object.visible) continue;

            // Get appropriate shader
            const shader = this.getShaderForObject(object);
            if (!shader) continue;

            // Use shader
            shader.use();
            this.currentShader = shader;

            // Set common uniforms
            this.setCommonUniforms(shader, camera, object);

            // Apply material
            if (object.material) {
                object.material.apply(gl, shader);
            }

            // Bind mesh attributes
            if (object.mesh) {
                object.mesh.bindAttributes(shader);

                // Render mesh
                object.mesh.render();

                // Update statistics
                this.stats.drawCalls++;
                this.stats.vertices += object.mesh.vertexCount;
                if (object.mesh.indexCount > 0) {
                    this.stats.triangles += object.mesh.indexCount / 3;
                } else {
                    this.stats.triangles += object.mesh.vertexCount / 3;
                }
            }
        }
    }

    /**
     * Sort objects for optimal rendering
     * @param {SceneObject[]} objects - Objects to sort
     * @returns {SceneObject[]} Sorted objects
     */
    sortObjects(objects) {
        return objects.slice().sort((a, b) => {
            // Sky objects first (no depth testing)
            if (a.type === 'sky' && b.type !== 'sky') return -1;
            if (b.type === 'sky' && a.type !== 'sky') return 1;

            // Opaque objects before transparent
            const aTransparent = a.material && a.material.transparent;
            const bTransparent = b.material && b.material.transparent;

            if (!aTransparent && bTransparent) return -1;
            if (aTransparent && !bTransparent) return 1;

            // Sort by shader to minimize state changes
            const aShader = this.getShaderNameForObject(a);
            const bShader = this.getShaderNameForObject(b);

            if (aShader !== bShader) {
                return aShader.localeCompare(bShader);
            }

            return 0;
        });
    }

    /**
     * Get appropriate shader for object
     * @param {SceneObject} object - Scene object
     * @returns {Shader} Shader instance
     */
    getShaderForObject(object) {
        const shaderName = this.getShaderNameForObject(object);
        return this.shaderLibrary.get(shaderName);
    }

    /**
     * Get shader name for object
     * @param {SceneObject} object - Scene object
     * @returns {string} Shader name
     */
    getShaderNameForObject(object) {
        // Use object-specific shader if specified
        if (object.material && object.material.shader) {
            return object.material.shader;
        }

        // Use type-based shader selection
        switch (object.type) {
            case 'sky':
                return 'sky';
            case 'cloud':
                return 'cloud';
            default:
                return 'basic';
        }
    }

    /**
     * Set common uniforms for all shaders
     * @param {Shader} shader - Shader to set uniforms on
     * @param {Camera} camera - Scene camera
     * @param {SceneObject} object - Current object
     */
    setCommonUniforms(shader, camera, object) {
        // Calculate model matrix
        this.modelMatrix.identity();
        if (object.transform) {
            object.transform.getMatrix(this.modelMatrix);
        }

        // Calculate normal matrix (inverse transpose of model matrix)
        this.normalMatrix.copy(this.modelMatrix).invert();

        // Set matrix uniforms
        if (shader.hasUniform('u_modelMatrix')) {
            shader.setUniform('u_modelMatrix', this.modelMatrix.elements);
        }

        if (shader.hasUniform('u_viewMatrix')) {
            shader.setUniform('u_viewMatrix', camera.viewMatrix.elements);
        }

        if (shader.hasUniform('u_projectionMatrix')) {
            shader.setUniform('u_projectionMatrix', camera.projectionMatrix.elements);
        }

        if (shader.hasUniform('u_normalMatrix')) {
            shader.setUniform('u_normalMatrix', this.normalMatrix.elements);
        }

        // Set lighting uniforms
        if (shader.hasUniform('u_lightDirection')) {
            shader.setUniform('u_lightDirection', this.lightDirection);
        }

        if (shader.hasUniform('u_lightColor')) {
            shader.setUniform('u_lightColor', this.lightColor);
        }

        if (shader.hasUniform('u_ambientColor')) {
            shader.setUniform('u_ambientColor', this.ambientColor);
        }

        // Set time uniform for animations
        if (shader.hasUniform('u_time')) {
            shader.setUniform('u_time', performance.now() / 1000.0);
        }
    }

    /**
     * Handle WebGL context lost
     */
    handleContextLost() {
        console.warn('WebGL context lost');
        eventBus.emit('renderer.context.lost');
    }

    /**
     * Handle WebGL context restored
     */
    async handleContextRestored() {
        console.log('WebGL context restored, reinitializing...');

        try {
            // Reinitialize WebGL state
            this.initWebGLState();

            // Recreate shaders
            await this.loadDefaultShaders();

            // Reset viewport
            this.setViewport(this.viewport.width, this.viewport.height);

            eventBus.emit('renderer.context.restored');

        } catch (error) {
            console.error('Failed to restore WebGL context:', error);
            eventBus.emit('renderer.context.restore.failed', error);
        }
    }

    /**
     * Get renderer statistics
     * @returns {Object} Renderer statistics
     */
    getStats() {
        return {
            ...this.stats,
            performanceProfile: this.performanceProfile,
            viewport: { ...this.viewport },
            webglVersion: this.gl.getParameter(this.gl.VERSION),
            vendor: this.gl.getParameter(this.gl.VENDOR),
            renderer: this.gl.getParameter(this.gl.RENDERER)
        };
    }

    /**
     * Resize renderer
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.setViewport(width, height);
    }

    /**
     * Destroy renderer and free resources
     */
    destroy() {
        if (this.shaderLibrary) {
            this.shaderLibrary.destroy();
        }

        // Note: WebGL context will be lost when canvas is removed
        this.gl = null;
        this.canvas = null;

        console.log('Renderer destroyed');
    }
}
