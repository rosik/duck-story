# 3D Browser Game Framework Architecture

## Project Overview

This document outlines the architecture for a 3D browser game framework using pure JavaScript and WebGL without external dependencies. The framework is designed for branching narrative games with programmed scenes, where users can select objects and interact through dialogues.

## Core Requirements

- Start screen with atmospheric 3D scene
- Clouds as white boxes drifting away from camera and slightly right
- Infinite green ground plane (represented by a large circle)
- Gradient sky (light blue to white)
- Camera with gentle swaying motion
- Interactive "START" button with hover animations
- Modular code structure with separate classes

## Target Specifications

- **Compatibility**: Broad browser support including mobile devices
- **Performance**: Adaptive performance scaling based on device capabilities
- **Game Type**: Branching narrative with 3D scene interactions
- **Dialogue System**: Script-based with embedded JavaScript for complex logic

## 1. File Structure and Organization

```
game-framework/
├── index.html                 # Main entry point
├── src/
│   ├── core/                  # Core engine systems
│   │   ├── Engine.js          # Main engine orchestrator
│   │   ├── GameLoop.js        # Update/render loop management
│   │   ├── StateManager.js    # Game state management
│   │   └── EventBus.js        # Global event communication
│   ├── rendering/             # WebGL rendering system
│   │   ├── Renderer.js        # Main WebGL renderer
│   │   ├── Camera.js          # Camera management
│   │   ├── Shader.js          # Shader compilation/management
│   │   ├── Mesh.js            # 3D mesh representation
│   │   ├── Material.js        # Material properties
│   │   └── RenderQueue.js     # Render optimization
│   ├── scene/                 # Scene management
│   │   ├── Scene.js           # Scene container
│   │   ├── SceneObject.js     # Base 3D object class
│   │   ├── Transform.js       # Position/rotation/scale
│   │   └── components/        # Reusable components
│   │       ├── CloudSystem.js # Animated cloud generation
│   │       ├── GroundPlane.js # Infinite ground
│   │       └── SkyGradient.js # Sky rendering
│   ├── interaction/           # User interaction system
│   │   ├── InputManager.js    # Mouse/touch/keyboard input
│   │   ├── RaycastPicker.js   # 3D object selection
│   │   ├── UIManager.js       # 2D UI overlay management
│   │   └── InteractionZone.js # Clickable 3D areas
│   ├── narrative/             # Story and dialogue system
│   │   ├── DialogueManager.js # Dialogue execution
│   │   ├── ScriptEngine.js    # JavaScript script execution
│   │   ├── StoryState.js      # Narrative state tracking
│   │   └── ChoiceHandler.js   # User choice processing
│   ├── animation/             # Animation system
│   │   ├── Animator.js        # Animation controller
│   │   ├── Tween.js           # Interpolation utilities
│   │   └── Timeline.js        # Sequence management
│   ├── performance/           # Optimization utilities
│   │   ├── LODManager.js      # Level of detail
│   │   ├── Culling.js         # Frustum culling
│   │   └── PerformanceMonitor.js # FPS/memory tracking
│   ├── utils/                 # Utility functions
│   │   ├── Math.js            # Vector/matrix operations
│   │   ├── AssetLoader.js     # Resource loading
│   │   └── DeviceDetector.js  # Mobile/desktop detection
│   └── shaders/               # GLSL shader files
│       ├── vertex/
│       │   ├── basic.vert     # Basic vertex shader
│       │   └── sky.vert       # Sky gradient shader
│       └── fragment/
│           ├── basic.frag     # Basic fragment shader
│           ├── sky.frag       # Sky gradient shader
│           └── cloud.frag     # Cloud rendering
├── assets/                    # Game assets
│   ├── models/               # 3D models
│   ├── textures/             # Texture files
│   └── scripts/              # Narrative scripts
├── config/                   # Configuration files
│   ├── graphics.js           # Graphics settings
│   ├── performance.js        # Performance profiles
│   └── input.js              # Input mappings
└── docs/                     # Documentation
    ├── API.md                # API documentation
    └── ARCHITECTURE.md       # This document
```

## 2. Class Hierarchy and Responsibilities

### Core Engine Classes

**Engine.js**
- Main orchestrator that initializes and coordinates all systems
- Manages StateManager, Renderer, InputManager, GameLoop, EventBus
- Provides public API for game initialization and control

**GameLoop.js**
- Maintains consistent frame timing with requestAnimationFrame
- Handles performance scaling and frame skipping
- Coordinates update and render phases

**StateManager.js**
- Manages current scene and story state
- Handles scene transitions and state persistence
- Coordinates with narrative system for story progression

**EventBus.js**
- Global event communication system
- Decouples components through publish/subscribe pattern
- Handles event queuing and priority

### Rendering System Classes

**Renderer.js**
- Main WebGL renderer with context management
- Coordinates rendering pipeline stages
- Manages viewport, clear operations, and render state

**Camera.js**
- 3D camera with projection and view matrices
- Implements gentle swaying motion using sine waves
- Supports perspective and orthographic projections

**Shader.js**
- GLSL shader compilation and management
- Uniform and attribute binding
- Shader program caching and reuse

**Mesh.js**
- 3D geometry representation with vertices, indices, normals
- Buffer management and WebGL binding
- Support for different primitive types

**Material.js**
- Surface properties including colors, textures, transparency
- Shader parameter binding
- Material state management

**RenderQueue.js**
- Optimizes rendering by sorting objects
- Minimizes state changes and draw calls
- Implements frustum culling integration

### Scene Management Classes

**Scene.js**
- Container for all 3D objects in a scene
- Manages scene graph hierarchy
- Coordinates updates and rendering of child objects

**SceneObject.js**
- Base class for all 3D objects
- Contains Transform, Mesh, Material, and optional InteractionZone
- Provides update and render interface

**Transform.js**
- Position, rotation, and scale representation
- Matrix calculations for world transformations
- Parent-child hierarchy support

### Component Classes

**CloudSystem.js**
- Generates and animates cloud parallelepipeds
- Implements drifting motion away from camera and right
- Uses instanced rendering for performance

**GroundPlane.js**
- Infinite green ground plane implementation
- Efficient rendering using large quad with texture tiling
- Integrates with camera for seamless infinite appearance

**SkyGradient.js**
- Gradient sky rendering from light blue to white
- Vertex-based color interpolation
- Rendered as background with depth testing disabled

### Interaction System Classes

**InputManager.js**
- Captures mouse, touch, and keyboard input
- Normalizes input across different devices
- Provides unified input event interface

**RaycastPicker.js**
- Converts 2D screen coordinates to 3D world coordinates
- Performs ray-object intersection testing
- Identifies selectable objects in 3D space

**UIManager.js**
- Manages 2D UI overlay elements
- Handles UI animations and transitions
- Coordinates with 3D scene interactions

**InteractionZone.js**
- Defines clickable areas on 3D objects
- Triggers dialogue and interaction events
- Supports hover states and visual feedback

### Narrative System Classes

**DialogueManager.js**
- Executes dialogue sequences and manages conversation flow
- Integrates with ScriptEngine for dynamic content
- Handles choice presentation and processing

**ScriptEngine.js**
- Sandboxed JavaScript execution environment
- Provides API for scene manipulation and state management
- Ensures security while allowing flexible scripting

**StoryState.js**
- Tracks narrative progression and player choices
- Manages flags, variables, and story branches
- Provides persistence for save/load functionality

**ChoiceHandler.js**
- Processes user dialogue choices
- Triggers appropriate script actions
- Manages choice consequences and story branching

### Animation System Classes

**Animator.js**
- Controls object animations and transformations
- Manages multiple concurrent animations
- Provides play, pause, stop, and seek functionality

**Tween.js**
- Interpolation utilities with various easing functions
- Supports linear, cubic, elastic, and custom easing
- Handles both numeric and vector interpolation

**Timeline.js**
- Sequences multiple animations and events
- Supports parallel and sequential execution
- Provides timeline scrubbing and control

### Performance Classes

**LODManager.js**
- Level of detail management based on distance
- Switches between high and low poly models
- Optimizes rendering performance automatically

**Culling.js**
- Frustum culling implementation
- Removes objects outside camera view
- Reduces unnecessary rendering operations

**PerformanceMonitor.js**
- Tracks FPS, memory usage, and render statistics
- Provides performance warnings and recommendations
- Enables adaptive quality adjustments

### Utility Classes

**Math.js**
- Vector and matrix operations
- 3D math utilities for transformations
- Optimized mathematical functions

**AssetLoader.js**
- Asynchronous resource loading
- Supports textures, models, and scripts
- Provides loading progress and error handling

**DeviceDetector.js**
- Detects mobile vs desktop devices
- Identifies device capabilities and limitations
- Enables platform-specific optimizations

## 3. Data Flow Between Components

### Main Data Flow
```
User Input → InputManager → EventBus → StateManager → Scene → SceneObjects → Renderer
```

### Interaction Flow
```
User Click → RaycastPicker → InteractionZone → DialogueManager → ScriptEngine → StoryState → StateManager
```

### Update Loop Flow
```
GameLoop → StateManager → Scene → Animator → SceneObjects → Transform Updates
```

### Render Flow
```
GameLoop → Renderer → RenderQueue → Culling → Shader Binding → Draw Calls
```

## 4. WebGL Rendering Pipeline Design

### Rendering Stages

1. **Setup Phase**
   - Initialize WebGL context with appropriate settings
   - Compile and link GLSL shaders
   - Create and populate vertex/index buffers
   - Set up render targets and framebuffers

2. **Culling Phase**
   - Perform frustum culling to eliminate off-screen objects
   - Apply level-of-detail selection based on distance
   - Sort objects by material and depth for optimization

3. **Sorting Phase**
   - Group objects by shader program to minimize state changes
   - Sort opaque objects front-to-back for early depth rejection
   - Sort transparent objects back-to-front for correct blending

4. **Rendering Phase**
   - Render sky gradient as background (depth testing disabled)
   - Render ground plane with depth testing enabled
   - Render opaque 3D objects with lighting
   - Render transparent clouds with alpha blending
   - Render 2D UI overlay with orthographic projection

### Shader Strategy

**Basic Shader (basic.vert/basic.frag)**
- Handles standard 3D objects with diffuse lighting
- Supports vertex colors and single texture mapping
- Implements basic Phong lighting model

**Sky Shader (sky.vert/sky.frag)**
- Creates gradient from light blue to white
- Uses vertex-based color interpolation
- Renders as full-screen quad

**Cloud Shader (cloud.frag)**
- Implements procedural noise for cloud texture
- Supports alpha blending for transparency
- Includes animation uniforms for movement

**UI Shader**
- 2D orthographic projection for overlay elements
- No lighting calculations required
- Supports text rendering and UI animations

### Performance Optimizations

- **Batching**: Group similar objects to reduce draw calls
- **Instancing**: Use instanced rendering for clouds and repeated objects
- **Culling**: Implement frustum culling to skip off-screen objects
- **LOD**: Dynamic level of detail based on distance and device capabilities
- **State Sorting**: Minimize WebGL state changes between draw calls

## 5. Animation and Update Loop Architecture

### Update Loop Sequence

1. **Input Processing**: InputManager captures and processes user input
2. **State Updates**: StateManager updates current scene and story state
3. **Scene Updates**: Scene updates all child objects and components
4. **Animation Updates**: Animator applies interpolated transformations
5. **Physics Updates**: Apply any physics simulations or constraints
6. **Render Preparation**: Prepare render queue and perform culling
7. **Rendering**: Execute WebGL rendering pipeline

### Animation System Features

- **Tween-based Animations**: Smooth interpolation between keyframes
- **Easing Functions**: Various easing curves for natural motion
- **Timeline Sequences**: Complex multi-object animation sequences
- **Performance Scaling**: Adaptive frame skipping on low-end devices
- **Camera Animation**: Gentle swaying motion using sine wave functions

### Frame Timing Strategy

- Use `requestAnimationFrame` for smooth 60 FPS on capable devices
- Implement adaptive frame rate targeting (60/30/20 FPS) based on performance
- Provide frame skipping for animation updates during performance drops
- Monitor frame timing to detect performance issues

## 6. Event Handling System Design

### Event Flow Architecture
```
Input Device → InputManager → EventBus → Event Subscribers
```

### Event Types

**Input Events**
- `input.mouse.click` - Mouse/touch clicks with screen coordinates
- `input.mouse.move` - Mouse movement for hover effects
- `input.key.down` - Keyboard key press events
- `input.touch.start` - Touch interaction start

**Scene Events**
- `scene.object.selected` - 3D object selection events
- `scene.transition.start` - Scene change initiation
- `scene.transition.complete` - Scene change completion
- `scene.object.hover` - Object hover state changes

**Dialogue Events**
- `dialogue.started` - Dialogue system activation
- `dialogue.choice.made` - User dialogue choice selection
- `dialogue.ended` - Dialogue sequence completion
- `dialogue.text.complete` - Text display completion

**Performance Events**
- `performance.warning` - Performance degradation alerts
- `performance.profile.changed` - Quality setting adjustments
- `performance.fps.drop` - Frame rate drop notifications

### Interaction System Flow

1. **Input Capture**: InputManager detects user interaction
2. **Coordinate Conversion**: RaycastPicker converts screen to world coordinates
3. **Object Selection**: Intersection testing identifies target objects
4. **Zone Activation**: InteractionZone components respond to selection
5. **Event Broadcasting**: EventBus notifies interested systems
6. **Action Execution**: DialogueManager or other systems respond to events

## 7. Mobile Compatibility and Performance Scaling

### Device Detection Strategy

- **User Agent Analysis**: Identify mobile vs desktop browsers
- **Touch Capability Detection**: Check for touch input support
- **Performance Benchmarking**: Run initial performance test scene
- **Memory Assessment**: Detect available device memory
- **GPU Capability Testing**: Test WebGL feature support

### Performance Profiles

**High Performance Profile**
- Target: 60 FPS on desktop and high-end mobile
- Features: Full effects, complex shaders, maximum cloud count
- Quality: High-resolution textures, advanced lighting

**Medium Performance Profile**
- Target: 30 FPS on mid-range mobile devices
- Features: Reduced particle effects, simplified shaders
- Quality: Medium-resolution textures, basic lighting

**Low Performance Profile**
- Target: 20 FPS on low-end mobile devices
- Features: Minimal effects, basic shaders only
- Quality: Low-resolution textures, no advanced features

### Adaptive Features

- **Dynamic Cloud Count**: Adjust number of cloud objects based on performance
- **Shader Complexity**: Switch between complex and simple shader variants
- **Animation Quality**: Reduce animation smoothness on low-end devices
- **UI Scaling**: Touch-friendly interface scaling for mobile devices
- **Render Resolution**: Dynamic resolution scaling for performance

## 8. Script-Based Narrative System

### Script Format and Structure

Scripts are JavaScript modules that define scene interactions, dialogue trees, and story logic:

```javascript
// assets/scripts/intro_scene.js
export default {
  id: 'intro_scene',

  // Scene initialization
  onStart() {
    this.setFlag('first_visit', true);
    this.playAnimation('camera_intro');
  },

  // Define interactive objects
  interactions: {
    mysterious_object: {
      // Conditional availability
      condition: () => this.getFlag('first_visit'),

      // Dialogue tree
      dialogue: [
        {
          text: "You see a strange glowing object...",
          choices: [
            { text: "Approach carefully", action: 'approach' },
            { text: "Stay back and observe", action: 'stay_back' },
            { text: "Leave immediately", action: 'leave' }
          ]
        }
      ],

      // Action handlers
      actions: {
        approach() {
          this.setFlag('approached_object', true);
          this.addInventoryItem('mysterious_key');
          this.transitionTo('object_close_scene');
        },

        stay_back() {
          this.setFlag('cautious_player', true);
          this.showDialogue('observation_dialogue');
        },

        leave() {
          this.setFlag('avoided_object', true);
          this.transitionTo('forest_path_scene');
        }
      }
    }
  },

  // Scene cleanup
  onExit() {
    this.saveProgress();
  }
};
```

### Script Engine Features

**Sandboxed Execution**
- Safe JavaScript execution environment
- Limited API access for security
- Error handling and recovery

**State Management API**
- `setFlag(name, value)` - Set story flags
- `getFlag(name)` - Retrieve story flags
- `addInventoryItem(item)` - Manage player inventory
- `hasItem(item)` - Check inventory contents

**Scene Control API**
- `transitionTo(sceneId)` - Change scenes
- `playAnimation(animId)` - Trigger animations
- `showDialogue(dialogueId)` - Display dialogue
- `spawnObject(objectId, position)` - Add scene objects

**Persistence Features**
- Automatic save/load of story state
- Cross-session story continuation
- Multiple save slot support

### Integration with 3D Scene

- **Object Binding**: Scripts can reference 3D objects by ID
- **Animation Triggers**: Scripts can start/stop object animations
- **Dynamic Content**: Scripts can modify scene objects in real-time
- **Conditional Rendering**: Objects can appear/disappear based on story state

## 9. Implementation Phases

### Phase 1: Core Engine Foundation
- Implement Engine, GameLoop, EventBus, StateManager
- Basic WebGL context setup and shader system
- Simple scene management and object rendering

### Phase 2: 3D Scene Components
- Camera system with swaying motion
- Sky gradient, ground plane, and cloud system
- Basic lighting and material system

### Phase 3: Interaction System
- Input management and raycasting
- UI overlay and button interactions
- Object selection and hover effects

### Phase 4: Narrative Framework
- Script engine and dialogue manager
- Story state management and persistence
- Choice handling and branching logic

### Phase 5: Performance Optimization
- Mobile compatibility and device detection
- Performance profiling and adaptive quality
- LOD system and culling optimizations

### Phase 6: Polish and Testing
- Animation system refinement
- Cross-browser testing and compatibility
- Performance optimization and bug fixes

## 10. Future Expansion Considerations

### Planned Features
- **Advanced Lighting**: Dynamic shadows and multiple light sources
- **Audio System**: 3D positional audio and music management
- **Particle Effects**: Weather, magic effects, and environmental particles
- **Advanced Materials**: PBR materials and texture mapping
- **Networking**: Multiplayer support and state synchronization

### Architecture Extensibility
- **Plugin System**: Modular components for easy feature addition
- **Asset Pipeline**: Tools for content creation and optimization
- **Editor Integration**: Visual scene editor and dialogue tree editor
- **Localization**: Multi-language support for international audiences

This architecture provides a solid foundation for building a scalable, maintainable 3D browser game framework that can grow with your project's needs while maintaining performance across a wide range of devices.
