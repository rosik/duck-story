# 3D Models Directory

This directory contains 3D model files for the WebGL project.

## Supported Formats

- **glTF (.gltf)** - JSON-based format with external resources
- **GLB (.glb)** - Binary glTF format with embedded resources

## Current Models

### Rubber Duck
- **File**: `rubber_duck.gltf` (placeholder - copy from `../gltf/Rubber_Duck.gltf`)
- **Description**: A yellow rubber duck model for testing
- **Usage**: Perfect for testing the model loading system
- **Materials**: Uses PBR materials with base color texture

## Usage Example

```javascript
import { modelLoader } from '../src/rendering/ModelLoader.js';
import { GeometryGenerator } from '../src/rendering/Mesh.js';

// Load a model
const modelData = await modelLoader.loadModel('models/rubber_duck.gltf');

// Create geometry from the model
const geometry = GeometryGenerator.createFromModel(modelData, {
    meshIndex: 0,
    scale: [1, 1, 1],
    center: true
});

// Create mesh from geometry
const mesh = new Mesh(gl, geometry);
```

## Adding New Models

1. Place your `.gltf` or `.glb` files in this directory
2. Ensure any external resources (textures, binary data) are in the correct relative paths
3. Update this README with model information
4. Test loading with the ModelLoader class

## Notes

- Models should be optimized for web delivery (reasonable polygon count, compressed textures)
- glTF 2.0 is the preferred format
- Binary GLB format is recommended for production use (smaller file size, fewer HTTP requests)
- Ensure proper licensing for any models used in the project
