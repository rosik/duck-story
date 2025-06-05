attribute vec3 a_position;
attribute vec3 a_color;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec3 v_color;

void main() {
    // Pass through color for gradient interpolation
    v_color = a_color;

    // Remove translation from view matrix for skybox effect
    mat4 viewNoTranslation = u_viewMatrix;
    viewNoTranslation[3][0] = 0.0;
    viewNoTranslation[3][1] = 0.0;
    viewNoTranslation[3][2] = 0.0;

    // Transform position
    vec4 position = u_projectionMatrix * viewNoTranslation * vec4(a_position, 1.0);

    // Set z to w to ensure sky is always at far plane
    gl_Position = position.xyww;
}
