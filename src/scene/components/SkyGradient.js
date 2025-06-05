import { SceneObject } from '../SceneObject.js';
import { Mesh, GeometryGenerator } from '../../rendering/Mesh.js';
import { MaterialLibrary } from '../../rendering/Material.js';

/**
 * Sky gradient component for atmospheric background
 * Creates a gradient from light blue to white
 */
export class SkyGradient extends SceneObject {
    constructor(options = {}) {
        super({
            ...options,
            type: 'sky',
            name: options.name || 'sky_gradient',
            frustumCulled: false,
            renderOrder: -1000 // Render first
        });

        // Sky properties
        this.topColor = options.topColor || [0.5, 0.8, 1.0]; // Light blue
        this.bottomColor = options.bottomColor || [1.0, 1.0, 1.0]; // White
        this.size = options.size || 100;

        // Defer mesh creation until WebGL context is available
        this.mesh = null;
        this.material = null;
        this.isInitialized = false;
    }

    /**
     * Initialize sky gradient with WebGL context
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    init(gl) {
        if (this.isInitialized) return;

        this.gl = gl;
        this.createSkyMesh();
        this.createSkyMaterial();
        this.isInitialized = true;
    }

    /**
     * Create sky mesh (large sphere or box)
     */
    createSkyMesh() {
        // Create a large sphere that surrounds the scene
        const geometry = this.createSkyGeometry();
        this.mesh = new Mesh(this.gl, geometry);
    }

    /**
     * Create sky geometry with vertex colors for gradient
     */
    createSkyGeometry() {
        const vertices = [];
        const indices = [];
        const colors = [];
        const texCoords = [];

        // Create a large box that acts as skybox
        const size = this.size;

        // Define the 8 vertices of a cube
        const positions = [
            [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size], // Back face
            [-size, -size,  size], [size, -size,  size], [size, size,  size], [-size, size,  size]  // Front face
        ];

        // Add vertices with colors based on height
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            vertices.push(...pos);

            // Calculate color based on Y position (height)
            const t = (pos[1] + size) / (2 * size); // Normalize Y to 0-1
            const color = this.interpolateColor(this.bottomColor, this.topColor, t);
            colors.push(...color);

            // Simple texture coordinates
            texCoords.push(0, 0);
        }

        // Define faces (we only need the inside faces since we're inside the box)
        const faces = [
            // Back face (looking towards -Z)
            [0, 2, 1], [0, 3, 2],
            // Front face (looking towards +Z)
            [4, 5, 6], [4, 6, 7],
            // Left face (looking towards -X)
            [0, 4, 7], [0, 7, 3],
            // Right face (looking towards +X)
            [1, 6, 5], [1, 2, 6],
            // Top face (looking towards +Y)
            [3, 7, 6], [3, 6, 2],
            // Bottom face (looking towards -Y)
            [0, 1, 5], [0, 5, 4]
        ];

        // Add indices
        for (const face of faces) {
            indices.push(...face);
        }

        return {
            vertices,
            indices,
            colors,
            texCoords
        };
    }

    /**
     * Interpolate between two colors
     * @param {number[]} color1 - First color [r, g, b]
     * @param {number[]} color2 - Second color [r, g, b]
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number[]} Interpolated color
     */
    interpolateColor(color1, color2, t) {
        return [
            color1[0] + (color2[0] - color1[0]) * t,
            color1[1] + (color2[1] - color1[1]) * t,
            color1[2] + (color2[2] - color1[2]) * t
        ];
    }

    /**
     * Create sky material
     */
    createSkyMaterial() {
        this.material = MaterialLibrary.createSky();
        this.material.shader = 'sky';
        this.material.depthTest = false;
        this.material.depthWrite = false;
    }

    /**
     * Set sky colors
     * @param {number[]} topColor - Top color [r, g, b]
     * @param {number[]} bottomColor - Bottom color [r, g, b]
     */
    setSkyColors(topColor, bottomColor) {
        this.topColor = [...topColor];
        this.bottomColor = [...bottomColor];

        // Recreate mesh with new colors
        this.createSkyMesh();
        this.needsUpdate = true;
    }

    /**
     * Set sky size
     * @param {number} size - Sky box size
     */
    setSkySize(size) {
        this.size = size;
        this.createSkyMesh();
        this.needsUpdate = true;
    }

    /**
     * Update sky (override from SceneObject)
     * @param {number} deltaTime - Time since last update
     */
    onUpdate(deltaTime) {
        // Sky doesn't need updates, but could add subtle color changes here
        // For example, time-of-day effects or weather transitions
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile
     */
    setPerformanceProfile(profile) {
        // Sky rendering is already optimized, no changes needed
        // Could potentially reduce sky box resolution on low-end devices
    }

    /**
     * Sky objects should not be raycast
     * @param {Object} ray - Ray for intersection testing
     * @returns {null} Always returns null
     */
    raycast(ray) {
        return null; // Sky is not interactive
    }

    /**
     * Create preset sky configurations
     */
    static createPresets() {
        return {
            /**
             * Clear day sky
             */
            clearDay: () => new SkyGradient({
                topColor: [0.3, 0.7, 1.0],    // Bright blue
                bottomColor: [0.8, 0.9, 1.0], // Light blue-white
                name: 'clear_day_sky'
            }),

            /**
             * Sunset sky
             */
            sunset: () => new SkyGradient({
                topColor: [0.2, 0.3, 0.8],     // Deep blue
                bottomColor: [1.0, 0.6, 0.3],  // Orange
                name: 'sunset_sky'
            }),

            /**
             * Overcast sky
             */
            overcast: () => new SkyGradient({
                topColor: [0.6, 0.6, 0.7],     // Gray
                bottomColor: [0.8, 0.8, 0.8],  // Light gray
                name: 'overcast_sky'
            }),

            /**
             * Night sky
             */
            night: () => new SkyGradient({
                topColor: [0.05, 0.05, 0.2],   // Dark blue
                bottomColor: [0.1, 0.1, 0.3],  // Slightly lighter blue
                name: 'night_sky'
            }),

            /**
             * Default atmospheric sky for start screen
             */
            atmospheric: () => new SkyGradient({
                topColor: [0.5, 0.8, 1.0],     // Light blue
                bottomColor: [1.0, 1.0, 1.0],  // White
                name: 'atmospheric_sky'
            })
        };
    }

    /**
     * Create atmospheric sky for start screen
     * @returns {SkyGradient} Atmospheric sky instance
     */
    static createAtmospheric() {
        return SkyGradient.createPresets().atmospheric();
    }
}
