import { SceneObject } from '../SceneObject.js';
import { Mesh, GeometryGenerator } from '../../rendering/Mesh.js';
import { MaterialLibrary } from '../../rendering/Material.js';
import { MathUtils } from '../../utils/Math.js';

/**
 * Cloud system component
 * Creates and animates white parallelepiped clouds drifting away from camera
 */
export class CloudSystem extends SceneObject {
    constructor(options = {}) {
        super({
            ...options,
            type: 'cloud',
            name: options.name || 'cloud_system',
            renderOrder: 500 // Render after ground but before UI
        });

        // Cloud system properties
        this.cloudCount = options.cloudCount || 25;
        this.height = options.height || 0
        this.windSpeed = options.windSpeed || options.driftSpeed || { x: 0.5, y: 0, z: -1.0 };
        this.groundRadius = options.groundRadius || 100;
        this.performanceProfile = 'medium';

        // Individual clouds
        this.clouds = [];
        this.cloudMesh = null;
        this.cloudMaterial = null;

        // Defer mesh creation until WebGL context is available
        this.cloudMesh = null;
        this.cloudMaterial = null;
        this.isInitialized = false;
    }

    /**
     * Initialize cloud system with WebGL context
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    init(gl) {
        if (this.isInitialized) return;

        this.gl = gl;
        this.createCloudMesh();
        this.createCloudMaterial();
        this.initializeClouds();
        this.isInitialized = true;
    }

    /**
     * Create cloud mesh (parallelepiped/box shape)
     */
    createCloudMesh() {
        // Create a box geometry for cloud shape
        const geometry = GeometryGenerator.createBox(2, 1, 3); // Wider than tall
        this.cloudMesh = new Mesh(this.gl, geometry);
    }

    /**
     * Create cloud material
     */
    createCloudMaterial() {
        this.cloudMaterial = MaterialLibrary.createCloud(0.8);
        this.cloudMaterial.shader = 'cloud';
        this.cloudMaterial.transparent = true;
        this.cloudMaterial.doubleSided = true;
        this.cloudMaterial.depthWrite = false;
    }

    /**
     * Initialize individual clouds
     */
    initializeClouds() {
        this.clouds = [];

        for (let i = 0; i < this.cloudCount; i++) {
            const cloud = this.createCloud();
            this.clouds.push(cloud);
            this.addChild(cloud);
        }

        console.log(`Initialized ${this.cloudCount} clouds`);
    }

    /**
     * Create a single cloud object
     * @returns {SceneObject} Cloud object
     */
    createCloud() {
        const cloud = new SceneObject({
            type: 'cloud',
            name: `cloud_${this.clouds.length}`,
            mesh: this.cloudMesh,
            material: this.cloudMaterial.clone()
        });

        // Random position within spawn area
        const x = MathUtils.random(-this.groundRadius, this.groundRadius);
        const z = MathUtils.random(-this.groundRadius, this.groundRadius);
        cloud.transform.setPosition(x, this.height, z);

        // Random scale for variety
        const scalex = MathUtils.random(3, 4);
        const scalez = MathUtils.random(2, 5);
        cloud.transform.setScale(scalex, scalex * 0.5, scalez); // Flatter clouds

        // Initialize outOfScene flag
        cloud.userData.outOfScene = false;

        // Random opacity variation
        const opacity = MathUtils.random(0.6, 0.9);
        cloud.material.setOpacity(opacity);

        return cloud;
    }

    /**
     * Update cloud system
     * @param {number} deltaTime - Time since last update
     */
    onUpdate(deltaTime) {
        if (!this.isInitialized) return;

        for (const cloud of this.clouds) {
            this.updateCloud(cloud, deltaTime);
        }
    }

    /**
     * Update individual cloud
     * @param {SceneObject} cloud - Cloud to update
     * @param {number} deltaTime - Time since last update
     */
    updateCloud(cloud, deltaTime) {
        // Skip if cloud is paused
        if (cloud.userData.paused) return;

        // Move cloud with unified wind speed
        cloud.transform.translate(
            this.windSpeed.x * deltaTime,
            this.windSpeed.y * deltaTime,
            this.windSpeed.z * deltaTime
        );

        // Check if cloud has reached ground radius boundary
        const position = cloud.transform.position;
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);

        if (distanceFromCenter >= this.groundRadius && !cloud.userData.outOfScene) {
            cloud.userData.outOfScene = true;
        }

        // Re-initialize clouds that are marked as out of scene
        if (cloud.userData.outOfScene) {
            this.reinitializeCloud(cloud);
        }
    }

    /**
     * Re-initialize cloud that has gone out of scene
     * @param {SceneObject} cloud - Cloud to re-initialize
     */
    reinitializeCloud(cloud) {
        // Reset position to spawn area
        const x = MathUtils.random(-this.groundRadius, this.groundRadius);
        const z = MathUtils.random(-this.groundRadius, this.groundRadius); // Start closer

        cloud.transform.setPosition(x, this.height, z);

        // Consistent scale range (same as initial creation)
        const scale = MathUtils.random(3, 4);
        cloud.transform.setScale(scale, scale * 0.7, scale);

        // Reset outOfScene flag
        cloud.userData.outOfScene = false;

        // Vary opacity
        const opacity = MathUtils.random(0.6, 0.9);
        cloud.material.setOpacity(opacity);
    }

    /**
     * Respawn cloud at starting position (legacy method for compatibility)
     * @param {SceneObject} cloud - Cloud to respawn
     */
    respawnCloud(cloud) {
        this.reinitializeCloud(cloud);
    }

    /**
     * Set cloud count
     * @param {number} count - Number of clouds
     */
    setCloudCount(count) {
        const oldCount = this.cloudCount;
        this.cloudCount = Math.max(1, count);

        if (this.cloudCount > oldCount) {
            // Add more clouds
            for (let i = oldCount; i < this.cloudCount; i++) {
                const cloud = this.createCloud();
                this.clouds.push(cloud);
                this.addChild(cloud);
            }
        } else if (this.cloudCount < oldCount) {
            // Remove excess clouds
            for (let i = oldCount - 1; i >= this.cloudCount; i--) {
                const cloud = this.clouds[i];
                this.removeChild(cloud);
                cloud.destroy();
                this.clouds.splice(i, 1);
            }
        }

        console.log(`Cloud count changed: ${oldCount} -> ${this.cloudCount}`);
    }

    /**
     * Set wind speed (replaces setDriftSpeed)
     * @param {Object} speed - Wind speed {x, y, z}
     */
    setWindSpeed(speed) {
        this.windSpeed = { ...speed };
    }

    /**
     * Set drift speed (legacy method for compatibility)
     * @param {Object} speed - Drift speed {x, y, z}
     */
    setDriftSpeed(speed) {
        this.setWindSpeed(speed);
    }

    /**
     * Set ground radius for boundary detection
     * @param {number} radius - Ground radius
     */
    setGroundRadius(radius) {
        this.groundRadius = radius;
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile
     */
    setPerformanceProfile(profile) {
        this.performanceProfile = profile;

        let targetCloudCount;
        switch (profile) {
            case 'high':
                targetCloudCount = 25;
                break;
            case 'medium':
                targetCloudCount = 15;
                break;
            case 'low':
                targetCloudCount = 8;
                break;
            default:
                targetCloudCount = this.cloudCount;
        }

        this.setCloudCount(targetCloudCount);
    }

    /**
     * Pause/resume cloud animation
     * @param {boolean} paused - Whether to pause animation
     */
    setPaused(paused) {
        for (const cloud of this.clouds) {
            cloud.userData.paused = paused;
        }
    }

    /**
     * Add wind effect to clouds
     * @param {Object} windForce - Wind force {x, y, z}
     * @param {number} strength - Wind strength multiplier
     */
    addWindEffect(windForce, strength = 1.0) {
        this.windSpeed.x += windForce.x * strength;
        this.windSpeed.y += windForce.y * strength;
        this.windSpeed.z += windForce.z * strength;
    }

    /**
     * Reset all clouds to initial state
     */
    resetClouds() {
        for (const cloud of this.clouds) {
            this.reinitializeCloud(cloud);
        }
    }

    /**
     * Get cloud system statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            cloudCount: this.cloudCount,
            activeCount: this.clouds.filter(c => c.visible).length,
            outOfSceneCount: this.clouds.filter(c => c.userData.outOfScene).length,
            height: this.height,
            windSpeed: this.windSpeed,
            groundRadius: this.groundRadius,
            performanceProfile: this.performanceProfile
        };
    }

    /**
     * Create preset cloud configurations
     */
    static createPresets() {
        const windSpeed = { x: 5, y: 0, z: 0 };
        return {
            /**
             * Dense cloud cover
             */
            dense: () => new CloudSystem({
                cloudCount: 40,
                windSpeed: windSpeed,
                name: 'dense_clouds'
            }),

            /**
             * Sparse clouds
             */
            sparse: () => new CloudSystem({
                cloudCount: 10,
                windSpeed: windSpeed,
                name: 'sparse_clouds'
            }),

            /**
             * Fast moving clouds
             */
            fast: () => new CloudSystem({
                cloudCount: 20,
                windSpeed: windSpeed,
                name: 'fast_clouds'
            }),

            /**
             * Slow drifting clouds
             */
            slow: () => new CloudSystem({
                cloudCount: 15,
                windSpeed: windSpeed,
                name: 'slow_clouds'
            }),

            /**
             * Default atmospheric clouds for start screen
             */
            atmospheric: () => new CloudSystem({
                cloudCount: 25,
                windSpeed: windSpeed,
                name: 'atmospheric_clouds'
            })
        };
    }

    /**
     * Create atmospheric clouds for start screen
     * @returns {CloudSystem} Atmospheric cloud system
     */
    static createAtmospheric() {
        return CloudSystem.createPresets().atmospheric();
    }

    /**
     * Destroy cloud system
     */
    destroy() {
        // Destroy all individual clouds
        for (const cloud of this.clouds) {
            cloud.destroy();
        }
        this.clouds = [];

        // Dispose of shared resources
        if (this.cloudMesh) {
            this.cloudMesh.dispose();
        }
        if (this.cloudMaterial) {
            this.cloudMaterial.dispose();
        }

        super.destroy();
    }
}
