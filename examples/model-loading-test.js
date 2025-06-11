/**
 * Model Loading System Test
 * Demonstrates how to use the ModelLoader and GeometryGenerator
 */

import { modelLoader } from '../src/rendering/ModelLoader.js';
import { GeometryGenerator } from '../src/rendering/Mesh.js';

/**
 * Test the model loading system
 */
async function testModelLoading() {
    console.log('=== Model Loading System Test ===');

    try {
        // Test 1: Load the rubber duck model
        console.log('\n1. Loading rubber duck model...');
        const modelData = await modelLoader.loadModel('models/Rubber_Duck.gltf');

        console.log('✓ Model loaded successfully');
        console.log('  - Scenes:', modelData.scenes.length);
        console.log('  - Meshes:', modelData.meshes.length);
        console.log('  - Materials:', modelData.materials.length);
        console.log('  - Textures:', modelData.textures.length);
        console.log('  - Nodes:', modelData.nodes.length);

        // Test 2: Create geometry from first mesh
        console.log('\n2. Creating geometry from first mesh...');
        const geometry = GeometryGenerator.createFromModel(modelData, {
            meshIndex: 0,
            primitiveIndex: 0,
            scale: [1, 1, 1],
            center: true
        });

        console.log('✓ Geometry created successfully');
        console.log('  - Vertices:', geometry.vertices.length / 3);
        console.log('  - Indices:', geometry.indices.length);
        console.log('  - Normals:', geometry.normals.length / 3);
        console.log('  - Texture coords:', geometry.texCoords.length / 2);
        console.log('  - Material index:', geometry.materialIndex);

        // Test 3: Create all geometries from model
        console.log('\n3. Creating all geometries from model...');
        const allGeometries = GeometryGenerator.createAllFromModel(modelData, {
            scale: [2, 2, 2],
            center: true
        });

        console.log('✓ All geometries created successfully');
        console.log('  - Total geometries:', allGeometries.length);

        allGeometries.forEach((geom, index) => {
            console.log(`  - Geometry ${index}: ${geom.vertices.length / 3} vertices, mesh: ${geom.meshName}`);
        });

        // Test 4: Test loading progress
        console.log('\n4. Checking loading progress...');
        const progress = modelLoader.getLoadingProgress('models/Rubber_Duck.gltf');
        console.log('✓ Loading progress:', progress);

        // Test 5: Test model materials
        console.log('\n5. Analyzing model materials...');
        if (modelData.materials.length > 0) {
            const material = modelData.materials[0];
            console.log('✓ First material:');
            console.log('  - Name:', material.name);
            console.log('  - Color:', material.color);
            console.log('  - Metallic:', material.metallic);
            console.log('  - Roughness:', material.roughness);
            console.log('  - Has base color texture:', !!material.textures.baseColor);
        }

        console.log('\n=== All tests completed successfully! ===');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        return false;
    }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    console.log('\n=== Error Handling Test ===');

    try {
        // Test loading non-existent file
        console.log('\n1. Testing non-existent file...');
        await modelLoader.loadModel('models/non-existent.gltf');
        console.log('❌ Should have thrown an error');
        return false;
    } catch (error) {
        console.log('✓ Correctly caught error for non-existent file:', error.message);
    }

    try {
        // Test unsupported format
        console.log('\n2. Testing unsupported format...');
        await modelLoader.loadModel('models/test.obj');
        console.log('❌ Should have thrown an error');
        return false;
    } catch (error) {
        console.log('✓ Correctly caught error for unsupported format:', error.message);
    }

    console.log('\n=== Error handling tests completed successfully! ===');
    return true;
}

/**
 * Performance test
 */
async function testPerformance() {
    console.log('\n=== Performance Test ===');

    const startTime = performance.now();

    try {
        // Load model multiple times (should use cache)
        console.log('\n1. Loading model 3 times (testing cache)...');

        const promises = [
            modelLoader.loadModel('models/Rubber_Duck.gltf'),
            modelLoader.loadModel('models/Rubber_Duck.gltf'),
            modelLoader.loadModel('models/Rubber_Duck.gltf')
        ];

        const results = await Promise.all(promises);
        const endTime = performance.now();

        console.log('✓ All loads completed');
        console.log('  - Time taken:', (endTime - startTime).toFixed(2), 'ms');
        console.log('  - All results identical:', results[0] === results[1] && results[1] === results[2]);

        return true;

    } catch (error) {
        console.error('❌ Performance test failed:', error);
        return false;
    }
}

// Export test functions for use in browser console or other scripts
if (typeof window !== 'undefined') {
    window.modelLoadingTests = {
        testModelLoading,
        testErrorHandling,
        testPerformance,
        runAllTests: async () => {
            const results = await Promise.all([
                testModelLoading(),
                testErrorHandling(),
                testPerformance()
            ]);

            const allPassed = results.every(result => result);
            console.log('\n' + '='.repeat(50));
            console.log(allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
            console.log('='.repeat(50));

            return allPassed;
        }
    };

    console.log('Model loading tests available at window.modelLoadingTests');
    console.log('Run window.modelLoadingTests.runAllTests() to test the system');
}

export { testModelLoading, testErrorHandling, testPerformance };
