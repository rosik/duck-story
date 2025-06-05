import { Transform } from './Transform.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Base class for all 3D objects in the scene
 * Contains transform, mesh, material, and interaction components
 */
export class SceneObject {
    constructor(options = {}) {
        // Basic properties
        this.id = options.id || this.generateId();
        this.name = options.name || this.id;
        this.type = options.type || 'object';
        this.visible = options.visible !== undefined ? options.visible : true;
        this.castShadows = options.castShadows || false;
        this.receiveShadows = options.receiveShadows || false;

        // Components
        this.transform = options.transform || new Transform();
        this.mesh = options.mesh || null;
        this.material = options.material || null;
        this.interactionZone = options.interactionZone || null;

        // Hierarchy
        this.parent = null;
        this.children = [];

        // Animation and behavior
        this.animations = new Map();
        this.behaviors = [];
        this.userData = options.userData || {};

        // Performance
        this.frustumCulled = options.frustumCulled !== undefined ? options.frustumCulled : true;
        this.renderOrder = options.renderOrder || 0;
        this.lodLevel = 0;

        // State
        this.needsUpdate = true;
        this.isDestroyed = false;

        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
    }

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'object_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set visibility
     * @param {boolean} visible - Whether object is visible
     */
    setVisible(visible) {
        if (this.visible !== visible) {
            this.visible = visible;
            eventBus.emit('object.visibility.changed', {
                object: this,
                visible
            });
        }
    }

    /**
     * Set mesh
     * @param {Mesh} mesh - Mesh to assign
     */
    setMesh(mesh) {
        this.mesh = mesh;
        this.needsUpdate = true;
    }

    /**
     * Set material
     * @param {Material} material - Material to assign
     */
    setMaterial(material) {
        this.material = material;
        this.needsUpdate = true;
    }

    /**
     * Set interaction zone
     * @param {InteractionZone} interactionZone - Interaction zone to assign
     */
    setInteractionZone(interactionZone) {
        this.interactionZone = interactionZone;
        if (interactionZone) {
            interactionZone.object = this;
        }
    }

    /**
     * Add child object
     * @param {SceneObject} child - Child object to add
     */
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }

        child.parent = this;
        this.children.push(child);

        // Add child transform to this transform
        this.transform.addChild(child.transform);

        eventBus.emit('object.child.added', {
            parent: this,
            child
        });
    }

    /**
     * Remove child object
     * @param {SceneObject} child - Child object to remove
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;

            // Remove child transform
            this.transform.removeChild(child.transform);

            eventBus.emit('object.child.removed', {
                parent: this,
                child
            });
        }
    }

    /**
     * Find child by name
     * @param {string} name - Name to search for
     * @returns {SceneObject|null} Found child or null
     */
    findChild(name) {
        for (const child of this.children) {
            if (child.name === name) {
                return child;
            }

            // Search recursively
            const found = child.findChild(name);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * Find child by ID
     * @param {string} id - ID to search for
     * @returns {SceneObject|null} Found child or null
     */
    findChildById(id) {
        for (const child of this.children) {
            if (child.id === id) {
                return child;
            }

            // Search recursively
            const found = child.findChildById(id);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * Get all children of a specific type
     * @param {string} type - Type to filter by
     * @returns {SceneObject[]} Array of matching children
     */
    getChildrenByType(type) {
        const result = [];

        for (const child of this.children) {
            if (child.type === type) {
                result.push(child);
            }

            // Search recursively
            result.push(...child.getChildrenByType(type));
        }

        return result;
    }

    /**
     * Add animation
     * @param {string} name - Animation name
     * @param {Object} animation - Animation object
     */
    addAnimation(name, animation) {
        this.animations.set(name, animation);
        animation.object = this;
    }

    /**
     * Remove animation
     * @param {string} name - Animation name
     */
    removeAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.stop();
            this.animations.delete(name);
        }
    }

    /**
     * Play animation
     * @param {string} name - Animation name
     * @param {Object} options - Animation options
     */
    playAnimation(name, options = {}) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.play(options);
        }
    }

    /**
     * Stop animation
     * @param {string} name - Animation name
     */
    stopAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.stop();
        }
    }

    /**
     * Add behavior
     * @param {Object} behavior - Behavior object with update method
     */
    addBehavior(behavior) {
        this.behaviors.push(behavior);
        behavior.object = this;

        if (typeof behavior.onAttach === 'function') {
            behavior.onAttach(this);
        }
    }

    /**
     * Remove behavior
     * @param {Object} behavior - Behavior to remove
     */
    removeBehavior(behavior) {
        const index = this.behaviors.indexOf(behavior);
        if (index !== -1) {
            this.behaviors.splice(index, 1);

            if (typeof behavior.onDetach === 'function') {
                behavior.onDetach(this);
            }
        }
    }

    /**
     * Update object and all children
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (this.isDestroyed) return;

        // Update behaviors
        for (const behavior of this.behaviors) {
            if (typeof behavior.update === 'function') {
                behavior.update(deltaTime);
            }
        }

        // Update animations
        for (const animation of this.animations.values()) {
            if (typeof animation.update === 'function') {
                animation.update(deltaTime);
            }
        }

        // Update children
        for (const child of this.children) {
            child.update(deltaTime);
        }

        // Custom update logic (override in subclasses)
        this.onUpdate(deltaTime);

        this.needsUpdate = false;
    }

    /**
     * Custom update logic (override in subclasses)
     * @param {number} deltaTime - Time since last update in seconds
     */
    onUpdate(deltaTime) {
        // Override in subclasses
    }

    /**
     * Render object (called by renderer)
     * @param {Renderer} renderer - Renderer instance
     */
    render(renderer) {
        if (!this.visible || this.isDestroyed) return;

        // Custom render logic (override in subclasses)
        this.onRender(renderer);
    }

    /**
     * Custom render logic (override in subclasses)
     * @param {Renderer} renderer - Renderer instance
     */
    onRender(renderer) {
        // Override in subclasses
    }

    /**
     * Check if object intersects with ray
     * @param {Object} ray - Ray with origin and direction
     * @returns {Object|null} Intersection result or null
     */
    raycast(ray) {
        if (!this.mesh || !this.visible) return null;

        // Transform ray to local space
        const localRay = this.worldToLocal(ray);

        // Check intersection with bounding sphere first (fast rejection)
        const boundingSphere = this.mesh.boundingSphere;
        const toCenter = {
            x: boundingSphere.center[0] - localRay.origin.x,
            y: boundingSphere.center[1] - localRay.origin.y,
            z: boundingSphere.center[2] - localRay.origin.z
        };

        const projection = toCenter.x * localRay.direction.x +
                          toCenter.y * localRay.direction.y +
                          toCenter.z * localRay.direction.z;

        if (projection < 0) return null; // Behind ray

        const distanceSquared = toCenter.x * toCenter.x +
                               toCenter.y * toCenter.y +
                               toCenter.z * toCenter.z -
                               projection * projection;

        const radiusSquared = boundingSphere.radius * boundingSphere.radius;

        if (distanceSquared > radiusSquared) return null; // No intersection

        // For now, return simple intersection at bounding sphere
        // TODO: Implement detailed triangle intersection
        const distance = projection - Math.sqrt(radiusSquared - distanceSquared);
        const point = {
            x: localRay.origin.x + localRay.direction.x * distance,
            y: localRay.origin.y + localRay.direction.y * distance,
            z: localRay.origin.z + localRay.direction.z * distance
        };

        return {
            object: this,
            distance,
            point: this.localToWorld(point)
        };
    }

    /**
     * Transform ray from world to local space
     * @param {Object} ray - World space ray
     * @returns {Object} Local space ray
     */
    worldToLocal(ray) {
        // Get inverse world matrix
        const worldMatrix = this.transform.getMatrix();
        const invWorldMatrix = worldMatrix.clone().invert();

        // Transform origin and direction
        const localOrigin = this.transformPoint(ray.origin, invWorldMatrix);
        const localDirection = this.transformDirection(ray.direction, invWorldMatrix);

        return { origin: localOrigin, direction: localDirection };
    }

    /**
     * Transform point from local to world space
     * @param {Object} point - Local space point
     * @returns {Object} World space point
     */
    localToWorld(point) {
        const worldMatrix = this.transform.getMatrix();
        return this.transformPoint(point, worldMatrix);
    }

    /**
     * Transform point by matrix
     * @param {Object} point - Point to transform
     * @param {Mat4} matrix - Transformation matrix
     * @returns {Object} Transformed point
     */
    transformPoint(point, matrix) {
        const m = matrix.elements;
        const x = point.x, y = point.y, z = point.z;

        return {
            x: m[0] * x + m[4] * y + m[8] * z + m[12],
            y: m[1] * x + m[5] * y + m[9] * z + m[13],
            z: m[2] * x + m[6] * y + m[10] * z + m[14]
        };
    }

    /**
     * Transform direction by matrix
     * @param {Object} direction - Direction to transform
     * @param {Mat4} matrix - Transformation matrix
     * @returns {Object} Transformed direction
     */
    transformDirection(direction, matrix) {
        const m = matrix.elements;
        const x = direction.x, y = direction.y, z = direction.z;

        return {
            x: m[0] * x + m[4] * y + m[8] * z,
            y: m[1] * x + m[5] * y + m[9] * z,
            z: m[2] * x + m[6] * y + m[10] * z
        };
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile (high, medium, low)
     */
    setPerformanceProfile(profile) {
        // Override in subclasses to adjust quality based on performance
    }

    /**
     * Clone this object
     * @returns {SceneObject} Cloned object
     */
    clone() {
        const cloned = new this.constructor({
            name: this.name + '_clone',
            type: this.type,
            visible: this.visible,
            castShadows: this.castShadows,
            receiveShadows: this.receiveShadows,
            transform: this.transform.clone(),
            mesh: this.mesh, // Share mesh (don't clone)
            material: this.material ? this.material.clone() : null,
            frustumCulled: this.frustumCulled,
            renderOrder: this.renderOrder,
            userData: { ...this.userData }
        });

        // Clone children
        for (const child of this.children) {
            cloned.addChild(child.clone());
        }

        return cloned;
    }

    /**
     * Destroy object and free resources
     */
    destroy() {
        if (this.isDestroyed) return;

        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }

        // Destroy children
        for (const child of this.children.slice()) {
            child.destroy();
        }

        // Stop animations
        for (const animation of this.animations.values()) {
            animation.stop();
        }
        this.animations.clear();

        // Remove behaviors
        for (const behavior of this.behaviors.slice()) {
            this.removeBehavior(behavior);
        }

        // Dispose of material (if not shared)
        if (this.material && this.material.dispose) {
            this.material.dispose();
        }

        // Dispose of mesh (if not shared)
        if (this.mesh && this.mesh.dispose) {
            this.mesh.dispose();
        }

        this.isDestroyed = true;

        eventBus.emit('object.destroyed', { object: this });
    }
}
