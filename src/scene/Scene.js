import { Camera } from '../rendering/Camera.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Scene container for all 3D objects
 * Manages scene graph hierarchy and rendering
 */
export class Scene {
    constructor(id = 'scene') {
        this.id = id;
        this.name = id;

        // Scene objects
        this.objects = [];
        this.objectsById = new Map();
        this.objectsByType = new Map();

        // Camera
        this.camera = null;

        // Environment
        this.background = null;
        this.fog = null;
        this.ambientLight = [0.3, 0.3, 0.4];

        // Performance
        this.performanceProfile = 'medium';
        this.autoSort = true;
        this.frustumCulling = true;

        // State
        this.needsUpdate = true;
        this.isActive = false;
    }

    /**
     * Add object to scene
     * @param {SceneObject} object - Object to add
     */
    addObject(object) {
        if (this.objects.includes(object)) {
            console.warn('Object already in scene:', object.id);
            return;
        }

        this.objects.push(object);
        this.objectsById.set(object.id, object);

        // Add to type map
        if (!this.objectsByType.has(object.type)) {
            this.objectsByType.set(object.type, []);
        }
        this.objectsByType.get(object.type).push(object);

        this.needsUpdate = true;

        eventBus.emit('scene.object.added', {
            scene: this,
            object
        });

        console.log(`Object added to scene: ${object.id} (${object.type})`);
    }

    /**
     * Remove object from scene
     * @param {SceneObject} object - Object to remove
     */
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index === -1) {
            console.warn('Object not in scene:', object.id);
            return;
        }

        this.objects.splice(index, 1);
        this.objectsById.delete(object.id);

        // Remove from type map
        const typeObjects = this.objectsByType.get(object.type);
        if (typeObjects) {
            const typeIndex = typeObjects.indexOf(object);
            if (typeIndex !== -1) {
                typeObjects.splice(typeIndex, 1);
            }

            // Clean up empty type arrays
            if (typeObjects.length === 0) {
                this.objectsByType.delete(object.type);
            }
        }

        this.needsUpdate = true;

        eventBus.emit('scene.object.removed', {
            scene: this,
            object
        });

        console.log(`Object removed from scene: ${object.id}`);
    }

    /**
     * Find object by ID
     * @param {string} id - Object ID
     * @returns {SceneObject|null} Found object or null
     */
    findObjectById(id) {
        const ret = this.objectsById.get(id) || this.objects.find(obj => obj.findObjectById(id));
        console.log("findObjectById", id, ret)
        return ret
    }

    /**
     * Find objects by name
     * @param {string} name - Object name
     * @returns {SceneObject[]} Array of matching objects
     */
    findObjectsByName(name) {
        return this.objects.filter(obj => obj.name === name) || this.objects.find(obj => obj.findObjectByName(name));
    }

    /**
     * Find objects by type
     * @param {string} type - Object type
     * @returns {SceneObject[]} Array of matching objects
     */
    findObjectsByType(type) {
        return this.objectsByType.get(type) || [];
    }

    /**
     * Get all objects (including children)
     * @returns {SceneObject[]} All objects in scene
     */
    getAllObjects() {
        const allObjects = [];

        const addObjectAndChildren = (obj) => {
            allObjects.push(obj);
            for (const child of obj.children) {
                addObjectAndChildren(child);
            }
        };

        for (const obj of this.objects) {
            addObjectAndChildren(obj);
        }

        return allObjects;
    }

    /**
     * Set scene camera
     * @param {Camera} camera - Camera to use
     */
    setCamera(camera) {
        this.camera = camera;

        eventBus.emit('scene.camera.changed', {
            scene: this,
            camera
        });
    }

    /**
     * Setup camera for start scene with gentle swaying
     */
    setupStartCamera() {
        this.camera = new Camera({
            position: [60, 30, 110],
            target: [0, 0, 0],
            fov: Math.PI / 6,
            aspect: window.innerWidth / window.innerHeight,
            near: 0.1,
            far: 1000,
            swayEnabled: true,
            swayAmplitude: 0.02,
            swaySpeed: 0.5
        });

        console.log('Start scene camera setup complete');
    }

    /**
     * Set ambient lighting
     * @param {number[]} color - RGB ambient color
     */
    setAmbientLight(color) {
        this.ambientLight = [...color];

        eventBus.emit('scene.ambient.changed', {
            scene: this,
            ambientLight: this.ambientLight
        });
    }

    /**
     * Set performance profile for all objects
     * @param {string} profile - Performance profile (high, medium, low)
     */
    setPerformanceProfile(profile) {
        this.performanceProfile = profile;

        // Apply to all objects
        for (const object of this.objects) {
            object.setPerformanceProfile(profile);
        }

        // Adjust scene-level settings
        switch (profile) {
            case 'high':
                this.frustumCulling = true;
                this.autoSort = true;
                break;
            case 'medium':
                this.frustumCulling = true;
                this.autoSort = true;
                break;
            case 'low':
                this.frustumCulling = true;
                this.autoSort = false;
                break;
        }

        eventBus.emit('scene.performance.changed', {
            scene: this,
            profile
        });
    }

    /**
     * Update scene and all objects
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update camera
        if (this.camera) {
            this.camera.update(deltaTime);
        }

        // Update all objects
        for (const object of this.objects) {
            object.update(deltaTime);
        }

        // Custom scene update logic
        this.onUpdate(deltaTime);

        this.needsUpdate = false;
    }

    /**
     * Custom scene update logic (override in subclasses)
     * @param {number} deltaTime - Time since last update in seconds
     */
    onUpdate(deltaTime) {
        // Override in subclasses or scene-specific logic
    }

    /**
     * Perform raycast against all objects in scene
     * @param {Object} ray - Ray with origin and direction
     * @returns {Object[]} Array of intersection results, sorted by distance
     */
    raycast(ray) {
        const intersections = [];

        for (const object of this.objects) {
            if (!object.visible) continue;

            const intersection = object.raycast(ray);
            if (intersection) {
                intersections.push(intersection);
            }

            // Check children recursively
            const checkChildren = (obj) => {
                for (const child of obj.children) {
                    if (!child.visible) continue;

                    const childIntersection = child.raycast(ray);
                    if (childIntersection) {
                        intersections.push(childIntersection);
                    }

                    checkChildren(child);
                }
            };

            checkChildren(object);
        }

        // Sort by distance
        intersections.sort((a, b) => a.distance - b.distance);

        return intersections;
    }

    /**
     * Perform frustum culling
     * @param {Object[]} frustumPlanes - Camera frustum planes
     * @returns {SceneObject[]} Visible objects after culling
     */
    frustumCull(frustumPlanes) {
        if (!this.frustumCulling) {
            return this.objects.filter(obj => obj.visible);
        }

        const visibleObjects = [];

        for (const object of this.objects) {
            if (!object.visible || !object.frustumCulled) {
                visibleObjects.push(object);
                continue;
            }

            // Check if object's bounding sphere intersects frustum
            if (this.isObjectInFrustum(object, frustumPlanes)) {
                visibleObjects.push(object);
            }
        }

        return visibleObjects;
    }

    /**
     * Check if object is within camera frustum
     * @param {SceneObject} object - Object to check
     * @param {Object[]} frustumPlanes - Frustum planes
     * @returns {boolean} Whether object is visible
     */
    isObjectInFrustum(object, frustumPlanes) {
        if (!object.mesh || !object.mesh.boundingSphere) {
            return true; // Assume visible if no bounding info
        }

        const worldPos = object.transform.getWorldPosition();
        const boundingSphere = object.mesh.boundingSphere;
        const worldScale = object.transform.getWorldScale();
        const maxScale = Math.max(worldScale.x, worldScale.y, worldScale.z);
        const radius = boundingSphere.radius * maxScale;

        // Check against each frustum plane
        for (const plane of frustumPlanes) {
            const distance =
                plane.normal[0] * worldPos.x +
                plane.normal[1] * worldPos.y +
                plane.normal[2] * worldPos.z +
                plane.distance;

            if (distance < -radius) {
                return false; // Object is completely outside this plane
            }
        }

        return true; // Object intersects or is inside frustum
    }

    /**
     * Sort objects for optimal rendering
     * @param {SceneObject[]} objects - Objects to sort
     * @returns {SceneObject[]} Sorted objects
     */
    sortObjects(objects) {
        if (!this.autoSort) {
            return objects;
        }

        return objects.slice().sort((a, b) => {
            // Sort by render order first
            if (a.renderOrder !== b.renderOrder) {
                return a.renderOrder - b.renderOrder;
            }

            // Then by type (sky first, then opaque, then transparent)
            const getTypePriority = (obj) => {
                if (obj.type === 'sky') return 0;
                if (obj.material && obj.material.transparent) return 2;
                return 1;
            };

            const aPriority = getTypePriority(a);
            const bPriority = getTypePriority(b);

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // For transparent objects, sort back-to-front
            if (aPriority === 2 && this.camera) {
                const aDistance = a.transform.getWorldPosition().distanceTo(this.camera.position);
                const bDistance = b.transform.getWorldPosition().distanceTo(this.camera.position);
                return bDistance - aDistance;
            }

            return 0;
        });
    }

    /**
     * Get scene statistics
     * @returns {Object} Scene statistics
     */
    getStats() {
        const stats = {
            totalObjects: this.objects.length,
            visibleObjects: this.objects.filter(obj => obj.visible).length,
            objectsByType: {},
            hasCamera: !!this.camera,
            performanceProfile: this.performanceProfile
        };

        // Count objects by type
        for (const [type, objects] of this.objectsByType) {
            stats.objectsByType[type] = objects.length;
        }

        return stats;
    }

    /**
     * Scene lifecycle methods
     */

    /**
     * Called when scene becomes active
     */
    onEnter() {
        this.isActive = true;
        console.log(`Scene entered: ${this.id}`);

        eventBus.emit('scene.entered', { scene: this });
    }

    /**
     * Called when scene becomes inactive
     */
    onExit() {
        this.isActive = false;
        console.log(`Scene exited: ${this.id}`);

        eventBus.emit('scene.exited', { scene: this });
    }

    /**
     * Clear all objects from scene
     */
    clear() {
        // Remove all objects
        for (const object of this.objects.slice()) {
            this.removeObject(object);
        }

        // Clear maps
        this.objectsById.clear();
        this.objectsByType.clear();

        this.needsUpdate = true;

        eventBus.emit('scene.cleared', { scene: this });
    }

    /**
     * Destroy scene and all objects
     */
    destroy() {
        // Destroy all objects
        for (const object of this.objects.slice()) {
            object.destroy();
        }

        this.clear();
        this.camera = null;

        eventBus.emit('scene.destroyed', { scene: this });
    }

    /**
     * Clone scene
     * @returns {Scene} Cloned scene
     */
    clone() {
        const cloned = new Scene(this.id + '_clone');

        // Copy properties
        cloned.name = this.name + '_clone';
        cloned.ambientLight = [...this.ambientLight];
        cloned.performanceProfile = this.performanceProfile;
        cloned.autoSort = this.autoSort;
        cloned.frustumCulling = this.frustumCulling;

        // Clone camera
        if (this.camera) {
            cloned.camera = this.camera.clone();
        }

        // Clone objects
        for (const object of this.objects) {
            cloned.addObject(object.clone());
        }

        return cloned;
    }
}
