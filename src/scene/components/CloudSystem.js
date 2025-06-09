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
        this.spawnArea = options.spawnArea || { width: 100, height: 20, depth: 100 };
        this.driftSpeed = options.driftSpeed || { x: 0.5, y: 0, z: -1.0 }; // Away from camera and slightly right
        this.respawnDistance = options.respawnDistance || 50;
        this.performanceProfile = 'high';

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
        const x = MathUtils.random(-this.spawnArea.width / 2, this.spawnArea.width / 2);
        const y = MathUtils.random(5, 5 + this.spawnArea.height);
        const z = MathUtils.random(-this.spawnArea.depth / 2, this.spawnArea.depth / 2);
        cloud.transform.setPosition(x, y, z);

        // Random scale for variety
        const scale = MathUtils.random(0.5, 1.5);
        cloud.transform.setScale(scale, scale * 0.7, scale); // Flatter clouds

        // Random rotation
        cloud.transform.setRotationDegrees(
            MathUtils.random(-10, 10),
            MathUtils.random(0, 360),
            MathUtils.random(-5, 5)
        );

        // Individual drift speed variation
        cloud.userData.driftSpeed = {
            x: this.driftSpeed.x + MathUtils.random(-0.2, 0.2),
            y: this.driftSpeed.y + MathUtils.random(-0.1, 0.1),
            z: this.driftSpeed.z + MathUtils.random(-0.3, 0.3)
        };

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
        const driftSpeed = cloud.userData.driftSpeed;

        // Move cloud
        cloud.transform.translate(
            driftSpeed.x * deltaTime,
            driftSpeed.y * deltaTime,
            driftSpeed.z * deltaTime
        );

        // Removed rotation to fix cloud movement issue
        // cloud.transform.rotateDegrees(0, 5 * deltaTime, 0);

        // Check if cloud has drifted too far and needs respawning
        const position = cloud.transform.position;
        if (position.z < -this.respawnDistance ||
            Math.abs(position.x) > this.spawnArea.width ||
            position.y > 5 + this.spawnArea.height * 2) {

            this.respawnCloud(cloud);
        }
    }

    /**
     * Respawn cloud at starting position
     * @param {SceneObject} cloud - Cloud to respawn
     */
    respawnCloud(cloud) {
        // Reset position to spawn area
        const x = MathUtils.random(-this.spawnArea.width / 2, this.spawnArea.width / 2);
        const y = MathUtils.random(5, 5 + this.spawnArea.height);
        const z = MathUtils.random(this.spawnArea.depth / 4, this.spawnArea.depth / 2); // Start closer

        cloud.transform.setPosition(x, y, z);

        // Randomize scale again
        const scale = MathUtils.random(0.5, 1.5);
        cloud.transform.setScale(scale, scale * 0.7, scale);

        // Randomize rotation
        cloud.transform.setRotationDegrees(
            MathUtils.random(-10, 10),
            MathUtils.random(0, 360),
            MathUtils.random(-5, 5)
        );

        // Vary drift speed
        cloud.userData.driftSpeed = {
            x: this.driftSpeed.x + MathUtils.random(-0.2, 0.2),
            y: this.driftSpeed.y + MathUtils.random(-0.1, 0.1),
            z: this.driftSpeed.z + MathUtils.random(-0.3, 0.3)
        };

        // Vary opacity
        const opacity = MathUtils.random(0.6, 0.9);
        cloud.material.setOpacity(opacity);
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
     * Set drift speed
     * @param {Object} speed - Drift speed {x, y, z}
     */
    setDriftSpeed(speed) {
        this.driftSpeed = { ...speed };

        // Update existing clouds with new base speed
        for (const cloud of this.clouds) {
            cloud.userData.driftSpeed = {
                x: this.driftSpeed.x + MathUtils.random(-0.2, 0.2),
                y: this.driftSpeed.y + MathUtils.random(-0.1, 0.1),
                z: this.driftSpeed.z + MathUtils.random(-0.3, 0.3)
            };
        }
    }

    /**
     * Set spawn area
     * @param {Object} area - Spawn area {width, height, depth}
     */
    setSpawnArea(area) {
        this.spawnArea = { ...area };
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
        for (const cloud of this.clouds) {
            cloud.userData.driftSpeed.x += windForce.x * strength;
            cloud.userData.driftSpeed.y += windForce.y * strength;
            cloud.userData.driftSpeed.z += windForce.z * strength;
        }
    }

    /**
     * Reset all clouds to initial state
     */
    resetClouds() {
        for (const cloud of this.clouds) {
            this.respawnCloud(cloud);
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
            spawnArea: this.spawnArea,
            driftSpeed: this.driftSpeed,
            performanceProfile: this.performanceProfile
        };
    }

    /**
     * Create preset cloud configurations
     */
    static createPresets() {
        return {
            /**
             * Dense cloud cover
             */
            dense: () => new CloudSystem({
                cloudCount: 40,
                driftSpeed: { x: 0.3, y: 0, z: -0.8 },
                name: 'dense_clouds'
            }),

            /**
             * Sparse clouds
             */
            sparse: () => new CloudSystem({
                cloudCount: 10,
                driftSpeed: { x: 0.7, y: 0, z: -1.2 },
                name: 'sparse_clouds'
            }),

            /**
             * Fast moving clouds
             */
            fast: () => new CloudSystem({
                cloudCount: 20,
                driftSpeed: { x: 1.0, y: 0, z: -2.0 },
                name: 'fast_clouds'
            }),

            /**
             * Slow drifting clouds
             */
            slow: () => new CloudSystem({
                cloudCount: 15,
                driftSpeed: { x: 0.2, y: 0, z: -0.5 },
                name: 'slow_clouds'
            }),

            /**
             * Default atmospheric clouds for start screen
             */
            atmospheric: () => new CloudSystem({
                cloudCount: 25,
                driftSpeed: { x: 0.5, y: 0, z: -1.0 },
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
