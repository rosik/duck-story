attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;
attribute vec3 a_color;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_normalMatrix;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_color;

void main() {
    // Transform position to world space
    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
    v_position = worldPosition.xyz;

    // Transform normal to world space
    v_normal = normalize((u_normalMatrix * vec4(a_normal, 0.0)).xyz);

    // Pass through texture coordinates and color
    v_texCoord = a_texCoord;
    v_color = a_color;

    // Final position in clip space
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
}
