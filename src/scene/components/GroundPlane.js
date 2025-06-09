import { SceneObject } from '../SceneObject.js';
import { Mesh, GeometryGenerator } from '../../rendering/Mesh.js';
import { MaterialLibrary } from '../../rendering/Material.js';

/**
 * Infinite ground plane component
 * Creates a large green ground plane that appears infinite
 */
export class GroundPlane extends SceneObject {
    constructor(options = {}) {
        super({
            ...options,
            type: 'ground',
            name: options.name || 'ground_plane',
            renderOrder: 100 // Render after sky but before other objects
        });

        // Ground properties
        this.color = options.color || [0.3, 0.9, 0.3]; // Green
        this.size = options.size || 200; // Large size for "infinite" appearance
        this.segments = options.segments || 100; // Tessellation for better lighting
        this.textureRepeat = options.textureRepeat || 10;

        // Circular border properties
        this.borderRadius = options.borderRadius || this.size * 0.4; // 40% of ground size for more visible effect
        this.borderSoftness = options.borderSoftness || this.size * 0.15; // 15% of ground size for smoother transition
        this.borderColor = options.borderColor || [0.2, 0.7, 0.2]; // Slightly darker green

        // Defer mesh creation until WebGL context is available
        this.mesh = null;
        this.material = null;
        this.isInitialized = false;

        // Position the ground plane
        this.transform.setPosition(0, -1, 0); // Slightly below origin
    }

    /**
     * Initialize ground plane with WebGL context
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    init(gl) {
        if (this.isInitialized) return;

        this.gl = gl;
        this.createGroundMesh();
        this.createGroundMaterial();
        this.isInitialized = true;
    }

    /**
     * Create ground mesh
     */
    createGroundMesh() {
        const geometry = this.createGroundGeometry();
        this.mesh = new Mesh(this.gl, geometry);
    }

    /**
     * Create ground plane geometry using GeometryGenerator
     */
    createGroundGeometry() {
        // Use GeometryGenerator to create horizontal plane geometry (XZ axis)
        const baseGeometry = GeometryGenerator.createPlane(
            this.size,
            this.size,
            this.segments,
            this.segments,
            'xz'
        );

        // Apply texture tiling to base texture coordinates
        const texCoords = [];
        for (let i = 0; i < baseGeometry.texCoords.length; i += 2) {
            const u = baseGeometry.texCoords[i] * this.textureRepeat;
            const v = baseGeometry.texCoords[i + 1] * this.textureRepeat;
            texCoords.push(u, v);
        }

        // Generate vertex colors with slight variation for visual interest
        const colors = [];
        const vertexCount = baseGeometry.vertices.length / 3;
        const variation = 0.1;
        for (let i = 0; i < vertexCount; i++) {
            const colorVariation = (Math.random() - 0.5) * variation;
            colors.push(
                Math.max(0, Math.min(1, this.color[0] + colorVariation)),
                Math.max(0, Math.min(1, this.color[1] + colorVariation)),
                Math.max(0, Math.min(1, this.color[2] + colorVariation))
            );
        }

        return {
            vertices: baseGeometry.vertices,
            indices: baseGeometry.indices,
            normals: baseGeometry.normals,
            texCoords,
            colors
        };
    }

    /**
     * Create ground material
     */
    createGroundMaterial() {
        this.material = MaterialLibrary.createGround(this.color);
        this.material.shader = 'ground';

        // Set material properties for ground
        this.material.ambient = [0.4, 0.4, 0.4];
        this.material.diffuse = [0.8, 0.8, 0.8];
        this.material.receiveShadows = true;

        // Set circular border uniforms
        this.material.setUniform('u_borderRadius', this.borderRadius);
        this.material.setUniform('u_borderSoftness', this.borderSoftness);
        this.material.setUniform('u_borderColor', this.borderColor);

        // Enable transparency for the circular fade-out effect
        this.material.transparent = true;
    }

    /**
     * Set ground color
     * @param {number[]} color - RGB color [r, g, b]
     */
    setGroundColor(color) {
        this.color = [...color];
        this.material.setColor(color);

        // Recreate mesh with new colors
        this.createGroundMesh();
        this.needsUpdate = true;
    }

    /**
     * Set ground size
     * @param {number} size - Ground plane size
     */
    setGroundSize(size) {
        this.size = size;

        // Update border radius to maintain 40% ratio
        this.borderRadius = this.size * 0.4;
        this.borderSoftness = this.size * 0.15;

        if (this.material) {
            this.material.setUniform('u_borderRadius', this.borderRadius);
            this.material.setUniform('u_borderSoftness', this.borderSoftness);
        }

        this.createGroundMesh();
        this.needsUpdate = true;
    }

    /**
     * Set tessellation level
     * @param {number} segments - Number of segments
     */
    setSegments(segments) {
        this.segments = Math.max(1, segments);
        this.createGroundMesh();
        this.needsUpdate = true;
    }

    /**
     * Set border radius for circular clipping
     * @param {number} radius - Border radius in world units
     */
    setBorderRadius(radius) {
        this.borderRadius = Math.max(0, radius);
        if (this.material) {
            this.material.setUniform('u_borderRadius', this.borderRadius);
        }
        this.needsUpdate = true;
    }

    /**
     * Set border softness for smooth transition
     * @param {number} softness - Border softness in world units
     */
    setBorderSoftness(softness) {
        this.borderSoftness = Math.max(0, softness);
        if (this.material) {
            this.material.setUniform('u_borderSoftness', this.borderSoftness);
        }
        this.needsUpdate = true;
    }

    /**
     * Update ground (override from SceneObject)
     * @param {number} deltaTime - Time since last update
     */
    onUpdate(deltaTime) {
        // Ground is static, but could add effects like:
        // - Wind effects on grass
        // - Subtle color changes
        // - Animated texture coordinates for flowing effects
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile
     */
    setPerformanceProfile(profile) {
        switch (profile) {
            case 'high':
                this.setSegments(20);
                break;
            case 'medium':
                this.setSegments(10);
                break;
            case 'low':
                this.setSegments(4);
                break;
        }
    }

    /**
     * Ground plane raycast for interaction
     * @param {Object} ray - Ray for intersection testing
     * @returns {Object|null} Intersection result or null
     */
    raycast(ray) {
        // Simple plane intersection test
        // Plane equation: y = 0 (ground level)
        const groundY = this.transform.position.y;

        // Check if ray direction has a Y component
        if (Math.abs(ray.direction.y) < 0.0001) {
            return null; // Ray is parallel to ground
        }

        // Calculate intersection distance
        const t = (groundY - ray.origin.y) / ray.direction.y;

        if (t < 0) {
            return null; // Intersection is behind ray origin
        }

        // Calculate intersection point
        const intersectionPoint = {
            x: ray.origin.x + ray.direction.x * t,
            y: groundY,
            z: ray.origin.z + ray.direction.z * t
        };

        // Check if intersection is within ground bounds
        const halfSize = this.size * 0.5;
        if (Math.abs(intersectionPoint.x) > halfSize ||
            Math.abs(intersectionPoint.z) > halfSize) {
            return null; // Outside ground bounds
        }

        return {
            object: this,
            distance: t,
            point: intersectionPoint,
            normal: [0, 1, 0] // Ground normal points up
        };
    }

    /**
     * Create preset ground configurations
     */
    static createPresets() {
        return {
            /**
             * Grass ground
             */
            grass: () => new GroundPlane({
                color: [0.2, 0.8, 0.2],
                name: 'grass_ground'
            }),

            /**
             * Desert sand
             */
            desert: () => new GroundPlane({
                color: [0.9, 0.8, 0.6],
                name: 'desert_ground'
            }),

            /**
             * Snow ground
             */
            snow: () => new GroundPlane({
                color: [0.9, 0.9, 1.0],
                name: 'snow_ground'
            }),

            /**
             * Rocky ground
             */
            rock: () => new GroundPlane({
                color: [0.5, 0.4, 0.3],
                name: 'rock_ground'
            }),

            /**
             * Water surface
             */
            water: () => {
                const water = new GroundPlane({
                    color: [0.2, 0.4, 0.8],
                    name: 'water_surface'
                });

                // Make water slightly transparent
                water.material.setOpacity(0.8);
                water.material.transparent = true;

                return water;
            },

            /**
             * Default green ground for start screen
             */
            default: () => new GroundPlane({
                color: [0.2, 0.8, 0.2],
                name: 'default_ground'
            })
        };
    }

    /**
     * Create default ground for start screen
     * @returns {GroundPlane} Default ground instance
     */
    static createDefault() {
        return GroundPlane.createPresets().default();
    }

    /**
     * Add subtle animation effects to ground
     * @param {string} effectType - Type of effect ('wave', 'pulse', 'none')
     */
    addEffect(effectType) {
        switch (effectType) {
            case 'wave':
                this.addBehavior({
                    update: (deltaTime) => {
                        // Subtle wave effect on texture coordinates
                        const time = performance.now() / 1000;
                        if (this.material) {
                            this.material.setUniform('u_time', time);
                        }
                    }
                });
                break;

            case 'pulse':
                this.addBehavior({
                    update: (deltaTime) => {
                        // Subtle color pulsing
                        const time = performance.now() / 1000;
                        const pulse = Math.sin(time * 0.5) * 0.1 + 1.0;
                        const pulsedColor = this.color.map(c => c * pulse);
                        if (this.material) {
                            this.material.setColor(pulsedColor);
                        }
                    }
                });
                break;

            case 'none':
            default:
                // No effects
                break;
        }
    }
}
