# 3D Model Loading System

This document describes the comprehensive 3D model loading system implemented for the WebGL project.

## Overview

The model loading system provides robust support for loading and processing glTF/GLB 3D models, converting them into a format compatible with the existing rendering pipeline. The system is designed to be performant, error-resilient, and easy to use.

## Architecture

### Core Components

1. **ModelLoader** (`src/rendering/ModelLoader.js`)
   - Handles asynchronous loading of glTF/GLB files
   - Parses glTF format and extracts geometry, materials, and textures
   - Provides loading progress tracking and error handling
   - Implements caching for performance optimization

2. **GeometryGenerator Extensions** (`src/rendering/Mesh.js`)
   - Extended with `createFromModel()` method
   - Converts loaded model data to engine-compatible geometry
   - Supports transformations (scaling, centering, Y-flipping)
   - Handles multiple meshes and primitives

3. **Integration Layer** (`src/core/Engine.js`)
   - Shows how to integrate model loading into the existing engine
   - Provides fallback mechanisms for failed loads
   - Demonstrates material mapping from glTF to engine materials

## Features

### Supported Formats

- **glTF (.gltf)** - JSON-based format with external resources
- **GLB (.glb)** - Binary glTF format with embedded resources

### Loading Capabilities

- ✅ Asynchronous loading with progress tracking
- ✅ External resource loading (buffers, images)
- ✅ Binary GLB parsing
- ✅ Error handling and recovery
- ✅ Caching system for performance
- ✅ Loading progress callbacks

### Data Processing

- ✅ Vertex positions, normals, texture coordinates
- ✅ Vertex colors and indices
- ✅ Multiple meshes and primitives per model
- ✅ Material properties (PBR support)
- ✅ Texture references and sampling parameters
- ✅ Node transformations and hierarchies

### Geometry Transformations

- ✅ Scaling (uniform and non-uniform)
- ✅ Centering around origin
- ✅ Y-axis flipping for coordinate system conversion
- ✅ Node-based transformations (TRS matrices)
- ✅ Bounding box calculation

## Usage Examples

### Basic Model Loading

```javascript
import { modelLoader } from '../src/rendering/ModelLoader.js';
import { GeometryGenerator, Mesh } from '../src/rendering/Mesh.js';
import { MaterialLibrary } from '../src/rendering/Material.js';

// Load a model
const modelData = await modelLoader.loadModel('models/rubber_duck.gltf');

// Create geometry from the first mesh
const geometry = GeometryGenerator.createFromModel(modelData, {
    meshIndex: 0,
    scale: [2, 2, 2],
    center: true
});

// Create WebGL mesh
const mesh = new Mesh(gl, geometry);
```

### Loading All Meshes

```javascript
// Create geometries from all meshes in the model
const geometries = GeometryGenerator.createAllFromModel(modelData, {
    scale: [1, 1, 1],
    center: true,
    flipY: false
});

// Create scene objects for each geometry
geometries.forEach((geometry, index) => {
    const mesh = new Mesh(gl, geometry);
    const material = MaterialLibrary.createBasic([1, 1, 1]);

    const sceneObject = new SceneObject({
        name: `model_part_${index}`,
        mesh: mesh,
        material: material,
        transform: new Transform()
    });

    scene.addObject(sceneObject);
});
```

### Progress Tracking

```javascript
// Start loading
const loadPromise = modelLoader.loadModel('models/large_model.gltf');

// Check progress periodically
const progressInterval = setInterval(() => {
    const progress = modelLoader.getLoadingProgress('models/large_model.gltf');
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);

    if (progress.status === 'complete' || progress.status === 'error') {
        clearInterval(progressInterval);
    }
}, 100);

// Wait for completion
const modelData = await loadPromise;
```

### Error Handling

```javascript
try {
    const modelData = await modelLoader.loadModel('models/model.gltf');
    // Process successful load
} catch (error) {
    console.error('Failed to load model:', error.message);

    // Fallback to default geometry
    const fallbackGeometry = GeometryGenerator.createSphere(1);
    const fallbackMesh = new Mesh(gl, fallbackGeometry);
}
```

### Material Integration

```javascript
// Create materials based on model data
const materials = modelData.materials.map(modelMaterial => {
    const material = MaterialLibrary.createBasic(
        modelMaterial.color.slice(0, 3), // RGB
        modelMaterial.color[3] || 1.0    // Alpha
    );

    // Apply additional properties
    material.setUniform('u_metallic', modelMaterial.metallic);
    material.setUniform('u_roughness', modelMaterial.roughness);

    return material;
});
```

## API Reference

### ModelLoader Class

#### Methods

- `loadModel(url, options)` - Load a glTF/GLB model
- `getLoadingProgress(url)` - Get loading progress for a model
- `clearCache()` - Clear the model cache
- `dispose()` - Clean up resources

#### Options

```javascript
{
    forceReload: false,  // Skip cache and reload
    // Additional options for future expansion
}
```

### GeometryGenerator Extensions

#### Methods

- `createFromModel(modelData, options)` - Create geometry from single mesh
- `createAllFromModel(modelData, options)` - Create geometries from all meshes
- `createFromModelNode(modelData, nodeIndex, options)` - Create geometry with node transforms

#### Options

```javascript
{
    meshIndex: 0,        // Which mesh to use (for createFromModel)
    primitiveIndex: 0,   // Which primitive to use
    scale: [1, 1, 1],   // Scale factors
    center: false,       // Center geometry at origin
    flipY: false        // Flip Y coordinates
}
```

## Performance Considerations

### Optimization Features

1. **Caching System**
   - Models are cached after first load
   - Subsequent loads return cached data instantly
   - Cache can be cleared manually if needed

2. **Efficient Data Processing**
   - Direct TypedArray access for vertex data
   - Minimal data copying during processing
   - Lazy evaluation of optional data

3. **Memory Management**
   - Proper disposal methods for cleanup
   - Shared texture resources
   - Efficient buffer management

### Best Practices

1. **Model Optimization**
   - Use GLB format for production (smaller, fewer requests)
   - Optimize polygon count for target performance
   - Compress textures appropriately

2. **Loading Strategy**
   - Preload critical models during initialization
   - Use progress callbacks for user feedback
   - Implement fallbacks for failed loads

3. **Resource Management**
   - Clear cache when memory is constrained
   - Dispose of unused models
   - Share materials between similar objects

## File Structure

```
src/rendering/
├── ModelLoader.js          # Main model loading class
├── Mesh.js                 # Extended with model geometry creation
└── Material.js             # Material system (existing)

models/
├── README.md               # Model directory documentation
└── rubber_duck.gltf        # Example model file

examples/
└── model-loading-test.js   # Comprehensive test suite

docs/
└── MODEL_LOADING.md        # This documentation
```

## Testing

The system includes a comprehensive test suite (`examples/model-loading-test.js`) that covers:

- Basic model loading functionality
- Error handling and edge cases
- Performance and caching behavior
- Material and texture processing
- Geometry transformation features

Run tests in browser console:
```javascript
// Load the test file, then run:
window.modelLoadingTests.runAllTests();
```

## Integration with Existing Systems

The model loading system is designed to integrate seamlessly with existing engine components:

- **Renderer**: Uses existing Mesh and Material classes
- **Scene**: Compatible with SceneObject and Transform
- **Engine**: Integrated with error handling and fallback systems
- **Performance**: Respects performance profiles and optimization settings

## Future Enhancements

Potential areas for expansion:

1. **Animation Support**
   - glTF animation parsing
   - Skeletal animation system
   - Morph target support

2. **Advanced Materials**
   - PBR material pipeline
   - Custom shader integration
   - Texture loading and management

3. **Optimization Features**
   - Level-of-detail (LOD) support
   - Instancing for repeated models
   - Streaming for large models

4. **Additional Formats**
   - OBJ file support
   - FBX format support
   - Custom binary formats

## Troubleshooting

### Common Issues

1. **Model not loading**
   - Check file path and accessibility
   - Verify glTF format validity
   - Check browser console for errors

2. **Missing textures**
   - Ensure texture files are in correct relative paths
   - Check CORS settings for external resources
   - Verify image format support

3. **Performance issues**
   - Check model complexity (polygon count)
   - Monitor memory usage
   - Consider using GLB format

4. **Rendering issues**
   - Verify coordinate system compatibility
   - Check material properties
   - Ensure proper normal vectors

### Debug Information

Enable debug logging by setting:
```javascript
// In browser console
localStorage.setItem('debug_model_loading', 'true');
```

This will provide detailed information about the loading and processing pipeline.
