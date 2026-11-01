'use strict';

// Мод «Шейдеры»: свет от солнца, качающаяся листва, волны, небо с градиентом,
// мягкое свечение, сочные цвета и затемнение по краям экрана.
const Shaders = (() => {
  const U = {
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(0.4, 0.34, 0.22) },
    uShade: { value: new THREE.Color(0.75, 0.8, 0.95) },
    uTime: { value: 0 },
    uSkyCol: { value: new THREE.Color(0.55, 0.75, 0.95) },
    uDay: { value: 1 },
    uSkyTop: { value: new THREE.Color(0.3, 0.5, 0.85) },
    uSunTrue: { value: new THREE.Vector3(0, 1, 0) },        // где солнце на самом деле (ночью — под землёй)
    uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },     // цвет солнечного диска
    uShadowMap: { value: null },
    uShadowMat: { value: new THREE.Matrix4() },
    uShadowOn: { value: 0 },
  };
  const SHADOW_SIZE = 2048, SHADOW_R = 72;
  // свет факелов и ламп: ночью там, где он сильнее дневного, всё ярче и теплее
  const BLOCK_LIGHT_GLSL = `{ float dl = max(diffuse.r, 0.001), bl = vBlockLight;
    diffuseColor.rgb *= max(dl, bl) / dl * mix(vec3(1.0), vec3(1.18, 0.95, 0.7), clamp((bl - dl) * 1.6, 0.0, 1.0)); }\n`;                    // карта теней: 144×144 блока вокруг игрока

  // тени: глубина сцены «глазами солнца» и проверка, видит ли солнце эту точку
  const SHADOW_GLSL = `
    float sunShadow() {
      if (uShadowOn < 0.5) return 1.0;
      vec4 sc = uShadowMat * vec4(vWorld + vNrm * 0.07, 1.0);
      vec3 p = sc.xyz * 0.5 + 0.5;
      if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
      float d = p.z - 0.0006, s = 0.0, tx = 1.0 / ${SHADOW_SIZE.toFixed(1)};
      for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++)
        s += step(d, unpackRGBAToDepth(texture2D(uShadowMap, p.xy + (vec2(float(i), float(j)) - 0.5) * tx)));
      vec2 e = abs(p.xy - 0.5) * 2.0;
      return mix(s * 0.25, 1.0, smoothstep(0.8, 1.0, max(e.x, e.y)));   // у края карты тень плавно пропадает
    }`;
  // листва качается одинаково и в обычной картинке, и в карте теней
  const SWAY_GLSL = `float gust = 0.55 + 0.45 * sin(uTime * 0.45 + wp.x * 0.05 + wp.z * 0.04);
           float sway = (sin(uTime * 1.8 + wp.x * 0.9 + wp.z * 0.5) + 0.5 * sin(uTime * 3.1 + wp.z * 1.3 + wp.y)) * gust;
           transformed.x += sway * 0.07;
           transformed.z += cos(uTime * 1.5 + wp.x * 1.1 + wp.y * 0.7) * gust * 0.06;
           transformed.y += sin(uTime * 2.4 + wp.x + wp.z) * gust * 0.025;`;

  // Вода: волны по вершинам, а в каждом пикселе — рябь, отражение неба и облаков, солнечные блики
  const WATER_FRAG = `
    if (vIsWater > 0.5) {
      vec3 V = normalize(cameraPosition - vWorld);
      vec3 N = vNrm;
      if (vNrm.y > 0.5) {
        vec2 q = vWorld.xz; float t = uTime;
        float dx = cos(q.x * 0.7 + t * 1.4) * 0.10 + cos(q.x * 1.9 + q.y * 0.8 + t * 2.1) * 0.08
                 + cos((q.x + q.y) * 3.9 + t * 3.2) * 0.05 + cos(q.x * 8.0 - q.y * 2.0 - t * 4.3) * 0.025;
        float dz = cos(q.y * 0.8 + t * 1.2) * 0.10 + cos(q.y * 2.2 - q.x * 0.6 + t * 2.6) * 0.08
                 + cos((q.x - q.y) * 3.4 + t * 2.8) * 0.05 + cos(q.y * 7.5 + q.x * 1.7 + t * 3.9) * 0.025;
        N = normalize(vec3(-dx, 1.0, -dz));
      }
      float light = diffuse.r;
      vec3 R = reflect(-V, N);
      // отражение: небо темнее вверху и светлее у горизонта, плюс облака
      vec3 refl = mix(uSkyCol, uSkyTop, clamp(R.y * 1.6, 0.0, 1.0)) * 0.72;
      if (R.y > 0.02) {
        vec2 cp = (vWorld.xz + R.xz / R.y * (136.0 - vWorld.y) + vec2(uTime * 3.0, uTime * 1.2)) / 170.0;
        float cl = smoothstep(0.47, 0.75, wfbm(cp));
        refl = mix(refl, vec3(1.0) * light, cl * 0.7);
      }
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 deep = vec3(0.015, 0.11, 0.21), shallow = vec3(0.05, 0.30, 0.40);
      vec3 base = mix(shallow, deep, clamp(1.0 - abs(V.y) * 1.2, 0.0, 1.0)) * light;
      vec3 col = mix(base, refl, clamp(fres * 0.7, 0.0, 0.7));
      vec3 H = normalize(uSun + V);
      float spec = pow(max(dot(N, H), 0.0), 220.0) * uDay;
      col += uSunCol * spec * 2.6;
      diffuseColor.rgb = col;
      diffuseColor.a = clamp(0.7 + fres * 0.3 + spec, 0.0, 1.0);
    }`;
  const NOISE_GLSL = `
    float whash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float wnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      return mix(mix(whash(i), whash(i + vec2(1.0, 0.0)), u.x), mix(whash(i + vec2(0.0, 1.0)), whash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float wfbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * wnoise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
      return v + 0.03;
    }`;

  function patch(base, kind) {
    const m = base.clone();
    m.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, U);
      // листва колышется от ветра с порывами; соседние листья двигаются одинаково, поэтому щелей нет
      const wave = kind === 'water'
        ? `if (fract(wp.y) > 0.5) transformed.y += sin(uTime * 1.6 + wp.x * 0.8 + wp.z * 0.6) * 0.045 + sin(uTime * 2.3 + wp.x * 1.7 - wp.z * 1.1) * 0.025 - 0.06;`
        : SWAY_GLSL;
      shader.vertexShader = `attribute vec3 aNormal; attribute float aWave; attribute float aLight; varying float vBlockLight;
        uniform vec3 uSun; uniform vec3 uSunColor; uniform vec3 uShade; uniform float uTime;
        varying float vNdl; varying vec3 vWorld; varying vec3 vNrm; varying float vIsWater;
        ` + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        if (aWave > 0.5) { ${wave} }
        vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vNrm = aNormal;
        vIsWater = ${kind === 'water' ? 'aWave' : '0.0'};
        vNdl = max(dot(aNormal, uSun), 0.0);
        vBlockLight = aLight;`);
      shader.fragmentShader = `uniform vec3 uSun; uniform float uTime; uniform vec3 uSkyCol; uniform vec3 uSkyTop; uniform float uDay;
        uniform vec3 uSunColor; uniform vec3 uShade; uniform vec3 uSunCol;
        uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowOn;
        varying float vNdl; varying vec3 vWorld; varying vec3 vNrm; varying float vIsWater; varying float vBlockLight;\n#include <packing>\n` + SHADOW_GLSL + (kind === 'water' ? NOISE_GLSL : '') + shader.fragmentShader.replace(
        '#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= uShade + uSunColor * (vNdl > 0.0 ? vNdl * sunShadow() : 0.0);\n' + BLOCK_LIGHT_GLSL + (kind === 'water' ? WATER_FRAG : ''));
    };
    m.customProgramCacheKey = () => 'bronicraft-shader-' + kind;
    return m;
  }

  function create(renderer, baseMaterials) {
    const materials = {};
    for (const k in baseMaterials) materials[k] = patch(baseMaterials[k], k);

    // небо-купол: градиент, круглое солнце с короной и сиянием, луна.
    // В альфе неба записано, где светит солнце, — по ней рисуются лучи и блики.
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uSunDir: U.uSunTrue, uSunCol: U.uSunCol,
        uGlow: { value: new THREE.Color() }, uNight: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uGlow; uniform float uNight; varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(uBottom, uTop, pow(h, 0.55));
          float up = smoothstep(-0.1, 0.03, uSunDir.y);
          float cs = dot(d, uSunDir), s = max(cs, 0.0);
          // воздух вокруг солнца светится: широкое сияние, яркая корона и ореол у самого диска
          c += uGlow * (pow(s, 6.0) * 0.12 + pow(s, 60.0) * 0.2) * up;
          c += uSunCol * (pow(s, 600.0) * 0.45 + pow(s, 4000.0) * 0.9) * up;
          // сам диск: круглый, к краю чуть темнее
          float ang = acos(clamp(cs, -1.0, 1.0));
          float disk = (1.0 - smoothstep(0.03, 0.036, ang)) * up;
          c = mix(c, uSunCol * (1.25 - 0.3 * pow(clamp(ang / 0.036, 0.0, 1.0), 2.0)), disk);
          // луна с пятнами-«морями» и лёгким сиянием
          vec3 md = -uSunDir;
          float ma = acos(clamp(dot(d, md), -1.0, 1.0));
          float mUp = smoothstep(-0.05, 0.08, md.y) * uNight;
          vec3 mx = normalize(cross(md, vec3(0.0, 0.0, 1.0))), my = cross(mx, md);
          vec2 mp = vec2(dot(d, mx), dot(d, my)) / 0.024;
          float spots = smoothstep(0.55, 0.75, hash(floor(mp * 3.0 + 7.0)));
          float mdisk = (1.0 - smoothstep(0.022, 0.026, ma)) * mUp;
          c += vec3(0.6, 0.68, 0.9) * pow(max(dot(d, md), 0.0), 600.0) * 0.35 * mUp;
          c = mix(c, vec3(0.92, 0.94, 1.0) * (1.0 - spots * 0.18), mdisk);
          float mask = clamp(disk + pow(s, 500.0) * 0.6 * up, 0.0, 1.0);
          gl_FragColor = vec4(c, 1.0 - mask);
        }`,
    }));
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    sky.visible = false;

    // настоящие облака: пушистый шум, светлые сверху к солнцу и серые в тени
    const cloudU = {
      uTime: U.uTime, uSun: U.uSun, uCam: { value: new THREE.Vector2() },
      uLit: { value: new THREE.Color(1, 1, 1) }, uDark: { value: new THREE.Color(0.6, 0.65, 0.76) },
    };
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: cloudU,
      vertexShader: 'varying vec2 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: `uniform float uTime; uniform vec3 uSun; uniform vec2 uCam; uniform vec3 uLit; uniform vec3 uDark; varying vec2 vW;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
          return v;
        }
        void main() {
          vec2 p = (vW + vec2(uTime * 3.0, uTime * 1.2)) / 170.0;
          float d = fbm(p);
          float dens = smoothstep(0.47, 0.75, d);
          if (dens < 0.01) discard;
          vec2 toSun = normalize(uSun.xz + vec2(0.0001));
          float d2 = fbm(p + toSun * 0.05);
          float lit = clamp(0.6 + (d - d2) * 5.0, 0.0, 1.0);
          vec3 col = mix(uDark, uLit, lit);
          col = mix(col, uLit, (1.0 - dens) * 0.45);
          float a = dens * 0.95 * (1.0 - smoothstep(500.0, 1000.0, length(vW - uCam)));
          gl_FragColor = vec4(col, a);
        }`,
    }));
    clouds.rotation.x = -Math.PI / 2;
    clouds.frustumCulled = false;
    clouds.visible = false;

    // ---- тени от солнца ----
    const shadowRT = new THREE.WebGLRenderTarget(SHADOW_SIZE, SHADOW_SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    U.uShadowMap.value = shadowRT.texture;
    const shadowCam = new THREE.OrthographicCamera(-SHADOW_R, SHADOW_R, SHADOW_R, -SHADOW_R, 1, 400);
    shadowCam.up.set(0, 0, 1);
    const depthMat = cut => new THREE.ShaderMaterial({
      uniforms: { map: { value: baseMaterials.cutout.map }, uTime: U.uTime },
      vertexShader: `attribute float aWave; uniform float uTime; varying vec2 vUv;
        void main(){
          vUv = uv;
          vec3 transformed = position;
          ${cut ? `vec4 wp = modelMatrix * vec4(transformed, 1.0); if (aWave > 0.5) { ${SWAY_GLSL} }` : ''}
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }`,
      fragmentShader: `#include <packing>
        uniform sampler2D map; varying vec2 vUv;
        void main(){ ${cut ? 'if (texture2D(map, vUv).a < 0.5) discard;' : ''} gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }`,
      side: THREE.DoubleSide,
    });
    const depthSolid = depthMat(false), depthCut = depthMat(true);
    const white = new THREE.Color(1, 1, 1), oldClear = new THREE.Color(), tmp = new THREE.Vector3();
    const right = new THREE.Vector3(), upv = new THREE.Vector3();

    function renderShadows(scene, camera) {
      const dir = U.uSun.value;
      // центр карты теней — у игрока, сдвинутый ровно на целые пиксели, чтобы края теней не дрожали
      const target = camera.position.clone();
      shadowCam.position.copy(target).addScaledVector(dir, 200);
      shadowCam.lookAt(target);
      shadowCam.updateMatrixWorld();
      right.set(1, 0, 0).applyQuaternion(shadowCam.quaternion);
      upv.set(0, 1, 0).applyQuaternion(shadowCam.quaternion);
      const tx = SHADOW_R * 2 / SHADOW_SIZE;
      const a = target.dot(right), b = target.dot(upv);
      target.addScaledVector(right, Math.round(a / tx) * tx - a).addScaledVector(upv, Math.round(b / tx) * tx - b);
      shadowCam.position.copy(target).addScaledVector(dir, 200);
      shadowCam.updateMatrixWorld();
      U.uShadowMat.value.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);

      // кто отбрасывает тень: блоки мира (вода нет), машины, мобы, герой
      const hidden = [], cutouts = [];
      for (const o of scene.children) {
        if (!o.visible) continue;
        const m = o.material;
        let keep = false;
        if (o.isGroup) keep = true;
        else if (o.isMesh && m === materials.opaque) keep = true;
        else if (o.isMesh && m === materials.cutout) { cutouts.push(o); }
        if (!keep) { o.visible = false; hidden.push(o); }
      }
      const bg = scene.background;
      scene.background = null;
      renderer.getClearColor(oldClear);
      const oldAlpha = renderer.getClearAlpha();
      renderer.setClearColor(white, 1);
      renderer.setRenderTarget(shadowRT);
      scene.overrideMaterial = depthSolid;
      renderer.render(scene, shadowCam);
      // вторым проходом — листва, стекло и цветы: тень только там, где есть картинка
      for (const o of scene.children) if (o.visible) { o.visible = false; hidden.push(o); }
      for (const o of cutouts) o.visible = true;
      scene.overrideMaterial = depthCut;
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, shadowCam);
      renderer.autoClear = ac;
      scene.overrideMaterial = null;
      for (const o of hidden) o.visible = true;
      renderer.setRenderTarget(null);
      renderer.setClearColor(oldClear, oldAlpha);
      scene.background = bg;
    }

    // постобработка
    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const post = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: size.clone() }, uWarm: { value: 0 },
        uSunUv: { value: new THREE.Vector2(0.5, 0.5) }, uSunOn: { value: 0 }, uSunCol: U.uSunCol, uRays: { value: 0.5 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uWarm; varying vec2 vUv;
        uniform vec2 uSunUv; uniform float uSunOn; uniform vec3 uSunCol; uniform float uRays;
        vec3 bright(vec2 uv){ return max(texture2D(tDiffuse, uv).rgb - 0.7, 0.0); }
        float sunLight(vec2 uv){ return 1.0 - texture2D(tDiffuse, uv).a; }
        float ghost(vec2 p, vec2 at, float r, float asp){ vec2 q = (p - at) * vec2(asp, 1.0); return smoothstep(r, r * 0.55, length(q)); }
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float asp = uRes.x / uRes.y;
          if (uSunOn > 0.001) {
            // лучи: свет от солнца пробивается между листьями, домами и облаками
            vec2 step = (vUv - uSunUv) / 48.0;
            vec2 uv = vUv; float w = 1.0, acc = 0.0;
            for (int i = 0; i < 48; i++) { uv -= step; acc += sunLight(uv) * w; w *= 0.965; }
            c += uSunCol * acc / 48.0 * uRays * uSunOn * 1.6;
            // насколько солнце сейчас видно (не закрыто домом или облаком)
            float vis = 0.0;
            for (int i = 0; i < 5; i++) { float a = float(i) * 1.2566; vis += sunLight(uSunUv + vec2(cos(a) / asp, sin(a)) * 0.008); }
            vis = vis / 5.0 * uSunOn;
            if (uSunUv.x < -0.1 || uSunUv.x > 1.1 || uSunUv.y < -0.1 || uSunUv.y > 1.1) vis = 0.0;
            // блики в «объективе» и звёздочка вокруг солнца
            vec2 axis = vec2(0.5) - uSunUv;
            vec3 fl = vec3(0.0);
            fl += vec3(1.0, 0.8, 0.4) * ghost(vUv, uSunUv + axis * 0.55, 0.035, asp) * 0.18;
            fl += vec3(0.4, 1.0, 0.6) * ghost(vUv, uSunUv + axis * 1.25, 0.06, asp) * 0.10;
            fl += vec3(0.5, 0.6, 1.0) * ghost(vUv, uSunUv + axis * 1.6, 0.025, asp) * 0.22;
            fl += vec3(1.0, 0.5, 0.8) * ghost(vUv, uSunUv + axis * 2.1, 0.11, asp) * 0.07;
            vec2 sq = (vUv - uSunUv) * vec2(asp, 1.0);
            float ring = smoothstep(0.02, 0.0, abs(length(sq) - 0.32)) * 0.05;
            float star = (pow(max(0.0, 1.0 - abs(sq.y) * 60.0), 2.0) * 0.5 + pow(max(0.0, 1.0 - abs(sq.x) * 60.0), 2.0) * 0.25) * exp(-length(sq) * 6.0);
            c += uSunCol * (star + ring) * vis + fl * vis;
            // слепит, когда смотришь прямо на солнце
            c += uSunCol * vis * 0.06 * exp(-length(sq) * 4.0);
          }
          vec3 glow = vec3(0.0);
          vec2 px = 4.0 / uRes;
          for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) glow += bright(vUv + vec2(float(i), float(j)) * px);
          c += glow / 25.0 * 1.8;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, 1.25);
          c = (c - 0.5) * 1.07 + 0.5;
          c *= mix(vec3(1.0), vec3(1.1, 0.97, 0.85), uWarm);
          vec2 d = vUv - 0.5;
          c *= 1.0 - dot(d, d) * 0.6;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return {
      materials, sky, clouds, debug: { U, shadowRT, renderer, shadowCam },
      // sunDir — откуда светит солнце (или луна ночью), day — 0..1, sunset — 0..1
      update(time, sunDir, day, sunset, skyColor, camera) {
        U.uTime.value = time;
        U.uSun.value.copy(sunDir.y > 0 ? sunDir : sunDir.clone().negate());
        U.uSunTrue.value.copy(sunDir);
        const night = 1 - day;
        // низкое солнце — оранжевое и красноватое, высокое — почти белое
        const low = 1 - Math.min(1, Math.max(0, sunDir.y / 0.45));
        U.uSunCol.value.setRGB(1, 0.96, 0.86).lerp(new THREE.Color(1, 0.55, 0.22), low * low);
        U.uSunColor.value.setRGB(0.64, 0.52, 0.31).lerp(new THREE.Color(0.6, 0.32, 0.12), sunset * 0.8).multiplyScalar(day)
          .add(new THREE.Color(0.06, 0.08, 0.16).multiplyScalar(night));
        U.uShadowOn.value = 1;
        sky.material.uniforms.uNight.value = night;
        // где солнце на экране
        camera.updateMatrixWorld();
        const sp = tmp.copy(camera.position).addScaledVector(sunDir, 500).project(camera);
        post.uniforms.uSunUv.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
        const facing = camera.getWorldDirection(new THREE.Vector3()).dot(sunDir);
        post.uniforms.uSunOn.value = Math.max(0, Math.min(1, facing / 0.35)) * Math.max(0, Math.min(1, (sunDir.y + 0.04) / 0.12)) * day;
        post.uniforms.uRays.value = 0.35 + 0.45 * sunset;
        U.uShade.value.setRGB(0.64, 0.7, 0.88).lerp(new THREE.Color(0.74, 0.79, 0.95), night);   // тень чуть голубая, как от неба
        sky.position.copy(camera.position);
        clouds.position.set(camera.position.x, 136, camera.position.z);
        cloudU.uCam.value.set(camera.position.x, camera.position.z);
        const warm = new THREE.Color(1, 0.72, 0.5);
        cloudU.uLit.value.setRGB(1, 1, 1).lerp(warm, sunset * 0.8).multiplyScalar(0.22 + 0.78 * day);
        cloudU.uDark.value.setRGB(0.58, 0.63, 0.75).lerp(new THREE.Color(0.55, 0.42, 0.48), sunset * 0.7).multiplyScalar(0.18 + 0.82 * day);
        U.uDay.value = day;
        sky.material.uniforms.uTop.value.copy(skyColor).multiplyScalar(0.72);
        sky.material.uniforms.uBottom.value.copy(skyColor).lerp(new THREE.Color(1, 0.75, 0.55), sunset * 0.5).lerp(new THREE.Color(1, 1, 1), 0.12 * day);
        sky.material.uniforms.uGlow.value.setRGB(1, 0.85, 0.6).lerp(new THREE.Color(1, 0.55, 0.3), sunset).multiplyScalar(0.3 + day * 0.7);
        post.uniforms.uWarm.value = sunset;
        U.uSkyCol.value.copy(sky.material.uniforms.uBottom.value).lerp(sky.material.uniforms.uTop.value, 0.25);
        U.uSkyTop.value.copy(sky.material.uniforms.uTop.value).multiplyScalar(0.85);
        return sky.material.uniforms.uBottom.value;   // цвет горизонта — для тумана
      },
      render(scene, camera) {
        renderer.getDrawingBufferSize(size);
        if (rt.width !== size.x || rt.height !== size.y) {
          rt.setSize(size.x, size.y);
          post.uniforms.uRes.value.copy(size);
        }
        renderShadows(scene, camera);
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCam);
      },
    };
  }

  return { create, BLOCK_LIGHT_GLSL };
})();
