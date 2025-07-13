import * as THREE from 'three';

/**
 * Handles user interactions with 3D objects
 */
export class InteractionSystem {
  /**
   * Create a new InteractionSystem
   * @param {THREE.Camera} camera - The camera used for raycasting
   * @param {HTMLElement} domElement - The DOM element to attach listeners to
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.touch = new THREE.Vector2();

    // Objects that can be interacted with
    this.interactiveObjects = [];

    // Drag state
    this.isDragging = false;
    this.dragObject = null;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
    this.dragOffset = new THREE.Vector3();
    this.dragStartPosition = new THREE.Vector3();

    // Hover state
    this.hoveredObject = null;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for mouse and touch events
   */
  setupEventListeners() {
    // Mouse events
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Touch events
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /**
   * Register an object for interaction
   * @param {THREE.Object3D} object - The object to register
   * @param {Object} callbacks - Callback functions for different interactions
   */
  register(object, callbacks = {}) {
    if (!object.userData) {
      object.userData = {};
    }

    object.userData.interactive = true;
    object.userData.callbacks = callbacks;

    this.interactiveObjects.push(object);
    return object;
  }

  /**
   * Unregister an object from interaction
   * @param {THREE.Object3D} object - The object to unregister
   */
  unregister(object) {
    const index = this.interactiveObjects.indexOf(object);
    if (index !== -1) {
      this.interactiveObjects.splice(index, 1);
    }

    if (object.userData) {
      object.userData.interactive = false;
      object.userData.callbacks = null;
    }
  }

  /**
   * Update mouse coordinates from event
   * @param {MouseEvent} event - Mouse event
   */
  updateMouse(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Update touch coordinates from event
   * @param {TouchEvent} event - Touch event
   */
  updateTouch(event) {
    if (event.touches.length > 0) {
      const rect = this.domElement.getBoundingClientRect();
      this.touch.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
      this.touch.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
    }
  }

  /**
   * Find objects intersected by a ray
   * @param {THREE.Vector2} pointer - Screen coordinates (mouse or touch)
   * @returns {Array} - Array of intersected objects
   */
  findIntersectedObjects(pointer) {
    this.raycaster.setFromCamera(pointer, this.camera);

    // Filter only interactive objects
    const interactiveObjects = this.interactiveObjects.filter(obj =>
      obj.userData && obj.userData.interactive && obj.visible
    );

    return this.raycaster.intersectObjects(interactiveObjects, true);
  }

  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  onMouseDown(event) {
    event.preventDefault();
    this.updateMouse(event);

    const intersects = this.findIntersectedObjects(this.mouse);

    if (intersects.length > 0) {
      const object = this.findInteractiveParent(intersects[0].object);

      if (object && object.userData.callbacks && object.userData.callbacks.onDragStart) {
        // Start dragging
        this.isDragging = true;
        this.dragObject = object;
        this.dragStartPosition = object.position.clone();

        // Calculate drag plane and offset
        this.setupDragPlane(intersects[0].point, object);

        // Call onDragStart callback
        object.userData.callbacks.onDragStart(intersects[0].point);
      } else if (object && object.userData.callbacks && object.userData.callbacks.onClick) {
        // Just a click, not a drag
        object.userData.callbacks.onClick();
      }
    }
  }

  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  onMouseMove(event) {
    event.preventDefault();
    this.updateMouse(event);

    // Handle dragging
    if (this.isDragging && this.dragObject) {
      this.handleDragMove(this.mouse);
    } else {
      // Handle hover
      this.handleHover(this.mouse);
    }
  }

  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse event
   */
  onMouseUp(event) {
    event.preventDefault();

    // Handle drag end
    if (this.isDragging && this.dragObject) {
      if (this.dragObject.userData.callbacks && this.dragObject.userData.callbacks.onDragEnd) {
        this.dragObject.userData.callbacks.onDragEnd();
      }

      this.isDragging = false;
      this.dragObject = null;
    }
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   */
  onTouchStart(event) {
    event.preventDefault();
    this.updateTouch(event);

    const intersects = this.findIntersectedObjects(this.touch);

    if (intersects.length > 0) {
      const object = this.findInteractiveParent(intersects[0].object);

      if (object && object.userData.callbacks && object.userData.callbacks.onDragStart) {
        // Start dragging
        this.isDragging = true;
        this.dragObject = object;
        this.dragStartPosition = object.position.clone();

        // Calculate drag plane and offset
        this.setupDragPlane(intersects[0].point, object);

        // Call onDragStart callback
        object.userData.callbacks.onDragStart(intersects[0].point);
      } else if (object && object.userData.callbacks && object.userData.callbacks.onClick) {
        // Just a tap, not a drag
        object.userData.callbacks.onClick();
      }
    }
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   */
  onTouchMove(event) {
    event.preventDefault();
    this.updateTouch(event);

    // Handle dragging
    if (this.isDragging && this.dragObject) {
      this.handleDragMove(this.touch);
    }
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch event
   */
  onTouchEnd(event) {
    event.preventDefault();

    // Handle drag end
    if (this.isDragging && this.dragObject) {
      if (this.dragObject.userData.callbacks && this.dragObject.userData.callbacks.onDragEnd) {
        this.dragObject.userData.callbacks.onDragEnd();
      }

      this.isDragging = false;
      this.dragObject = null;
    }
  }

  /**
   * Set up the drag plane for an object
   * @param {THREE.Vector3} hitPoint - Point where the ray hit the object
   * @param {THREE.Object3D} object - Object being dragged
   */
  setupDragPlane(hitPoint, object) {
    // Create a plane perpendicular to the camera
    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, hitPoint);

    // Calculate offset from hit point to object position
    this.dragOffset.copy(object.position).sub(hitPoint);
  }

  /**
   * Handle object dragging
   * @param {THREE.Vector2} pointer - Screen coordinates (mouse or touch)
   */
  handleDragMove(pointer) {
    this.raycaster.setFromCamera(pointer, this.camera);

    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
      // Add offset to get new object position
      intersectionPoint.add(this.dragOffset);

      // Call onDrag callback
      if (this.dragObject.userData.callbacks && this.dragObject.userData.callbacks.onDrag) {
        this.dragObject.userData.callbacks.onDrag(intersectionPoint, this.dragStartPosition);
      }
    }
  }

  /**
   * Handle hover effects
   * @param {THREE.Vector2} pointer - Screen coordinates (mouse or touch)
   */
  handleHover(pointer) {
    const intersects = this.findIntersectedObjects(pointer);

    // If we were hovering over something before, check if we're still hovering over it
    if (this.hoveredObject) {
      let stillHovering = false;

      for (const intersect of intersects) {
        const object = this.findInteractiveParent(intersect.object);
        if (object === this.hoveredObject) {
          stillHovering = true;
          break;
        }
      }

      // If not hovering anymore, trigger hover end
      if (!stillHovering) {
        if (this.hoveredObject.userData.callbacks && this.hoveredObject.userData.callbacks.onHoverEnd) {
          this.hoveredObject.userData.callbacks.onHoverEnd();
        }
        this.hoveredObject = null;
      }
    }

    // Check for new hover
    if (!this.hoveredObject && intersects.length > 0) {
      const object = this.findInteractiveParent(intersects[0].object);

      if (object && object.userData.callbacks && object.userData.callbacks.onHoverStart) {
        this.hoveredObject = object;
        object.userData.callbacks.onHoverStart();
      }
    }
  }

  /**
   * Find the parent object that has interactive flag
   * @param {THREE.Object3D} object - The object to check
   * @returns {THREE.Object3D|null} - The interactive parent or null
   */
  findInteractiveParent(object) {
    let current = object;

    while (current) {
      if (current.userData && current.userData.interactive) {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Update the interaction system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Any continuous updates needed
  }
}
