
import * as THREE from 'three';

export const injectWaterShader = (shader: THREE.Shader) => {
  shader.uniforms.uTime = { value: 0 };
    
  // Inject uTime
  shader.vertexShader = `
    uniform float uTime;
    ${shader.vertexShader}
  `;

  // VERTEX SHADER: Wave displacement and Normal Recalculation
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    
    // Get absolute world position of this specific vertex to ensure seamless connection
    // We use unique variable names to avoid "redefinition" errors with Three.js internal 'worldPosition'
    vec4 customInstanceWorldPos = instanceMatrix * vec4(position, 1.0);
    vec3 wPos = customInstanceWorldPos.xyz;
    
    float waveStr = 0.12;
    float speed = 1.5;
    float freqX = 0.4;
    float freqZ = 0.3;
    
    // Calculate Wave Height based on exact vertex position
    float angleX = wPos.x * freqX + uTime * speed;
    float angleZ = wPos.z * freqZ + uTime * speed * 0.7;
    
    float waveY = sin(angleX) * waveStr + cos(angleZ) * waveStr;
    
    // Apply displacement ONLY to top vertices
    // BoxGeometry is usually centered, so top vertices have y > 0
    if (position.y > 0.0) {
        transformed.y += waveY * 0.5;
        
        // RECALCULATE NORMAL for proper lighting on waves
        // Derivatives of the wave function
        float dx = cos(angleX) * freqX * waveStr; 
        float dz = -sin(angleZ) * freqZ * waveStr;
        
        vec3 newNormal = normalize(vec3(-dx, 1.0, -dz));
        objectNormal = newNormal;
    }
    `
  );
};
