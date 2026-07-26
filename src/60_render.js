// ---------------------------------------------------------------------------
// WebGL2 renderer: forward pass into an HDR target, then bloom and grade.
// ---------------------------------------------------------------------------

import { m4, m4perspective, m4lookAt, m4mul, m4identity, v3, clamp } from './00_math.js';

function sh(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
  }
  return s;
}
function prog(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  p.u = new Proxy({}, { get: (t, k) => (t[k] !== undefined ? t[k] : (t[k] = gl.getUniformLocation(p, k))) });
  return p;
}

const HEAD = `#version 300 es
precision highp float;`;

// `SWAY` WAS HERE, AND IT IS GONE (ROADMAP 7 step 5, 2026-07-26).
//
// It was three sines of position and wall-clock time, evaluated in the vertex shader,
// displacing every pass by the same field so the specimen appeared to breathe. It was
// the last authored motion in the piece: the simulation could not see it, it ran on
// real milliseconds rather than plant time so it ignored the time slider, and a falling
// blade got it added on top of its own integrated aerodynamics.
//
// The stem bends for real now (`39a_stem.js`), so the vertex shader does not have to
// pretend. What replaced it is not a better wobble — it is the plant's own first
// bending mode, off `EI` on radii Murray's law grew, driven by a wind field the
// simulation shares with everything else in the scene.
//
// One number worth keeping: the hand-tuned displacement peaked at about 0.34 world
// units at the top of a Cathedral Fern. The physics, asked independently, says 0.30.
// Whoever tuned that sine had a good eye.

const MESH_VS = `${HEAD}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aEmis;
uniform mat4 uVP;
out vec3 vP; out vec3 vN; out vec3 vC; out float vE;
void main(){ vP=aPos; vN=aNrm; vC=aCol; vE=aEmis; gl_Position=uVP*vec4(aPos,1.0); }`;

const MESH_FS = `${HEAD}
in vec3 vP; in vec3 vN; in vec3 vC; in float vE;
uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot, uFog;
uniform float uFogD, uFogNear;
out vec4 o;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uEye - vP);
  if (dot(N,V) < 0.0) N = -N;
  float d = max(dot(N, uKey), 0.0);
  // light that has passed through the tissue rather than bounced off it
  float back = pow(max(dot(-N, uKey), 0.0), 2.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 amb = mix(uAmbBot, uAmbTop, N.y*0.5+0.5);
  vec3 c = vC * (amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7;
  c += vC * vE * 3.0;
  // fog measured from the near face of the subject, not from the eye, so it
  // reads the same whether the camera is close in or pulled right back
  float dist = length(vP-uEye);
  float f = 1.0 - exp(-max(0.0, dist - uFogNear)*uFogD);
  c = mix(c, uFog, clamp(f,0.0,1.0)*0.80);
  // alpha carries linear depth for the defocus pass
  o = vec4(c, dist*0.01);
}`;

const LINE_VS = `${HEAD}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aCol;
layout(location=2) in float aEmis;
uniform mat4 uVP;
out vec3 vC; out float vE; out vec3 vP;
void main(){ vC=aCol; vE=aEmis; vP=aPos; gl_Position=uVP*vec4(aPos,1.0); }`;

const LINE_FS = `${HEAD}
in vec3 vC; in float vE; in vec3 vP;
uniform vec3 uEye, uFog; uniform float uFogD, uFogNear;
out vec4 o;
void main(){
  vec3 c = vC * vE;
  float f = 1.0 - exp(-max(0.0, length(vP-uEye) - uFogNear)*uFogD);
  c *= (1.0 - clamp(f,0.0,1.0)*0.8);
  o = vec4(c, 1.0);   // alpha is masked off by blendFuncSeparate
}`;

const PT_VS = `${HEAD}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aCol;
layout(location=2) in float aSize;
uniform mat4 uVP; uniform vec3 uEye; uniform float uPx;
out vec3 vC;
void main(){
  vC=aCol;
  vec4 cp = uVP*vec4(aPos,1.0);
  gl_Position = cp;
  gl_PointSize = clamp(aSize*uPx/max(0.001,cp.w), 1.0, 64.0);
}`;

const PT_FS = `${HEAD}
in vec3 vC; out vec4 o;
void main(){
  vec2 d = gl_PointCoord*2.0-1.0;
  float r = dot(d,d);
  if (r>1.0) discard;
  float a = smoothstep(1.0, 0.15, r);
  o = vec4(vC*a*1.12, 1.0);
}`;

const QUAD_VS = `${HEAD}
out vec2 uv;
void main(){
  vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
  uv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
}`;

const BG_FS = `${HEAD}
in vec2 uv; out vec4 o;
uniform vec3 uTop, uBot, uGlow; uniform float uT;
void main(){
  vec2 p = uv*2.0-1.0;
  vec3 c = mix(uBot, uTop, pow(clamp(uv.y,0.0,1.0),0.75));
  // a slow bloom of light behind the specimen
  float d = length(p*vec2(1.0,1.25) - vec2(0.0,-0.15));
  c += uGlow * exp(-d*2.1) * (0.85+0.15*sin(uT*0.0007));
  o = vec4(c, 3.0);   // the void is far away, so it defocuses

}`;

const BRIGHT_FS = `${HEAD}
in vec2 uv; out vec4 o;
uniform sampler2D uT; uniform float uThresh;
void main(){
  vec3 c = texture(uT, uv).rgb;
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  o = vec4(c * smoothstep(uThresh, uThresh*2.2, l), 1.0);
}`;

const BLUR_FS = `${HEAD}
in vec2 uv; out vec4 o;
uniform sampler2D uT; uniform vec2 uDir;
void main(){
  vec3 s = texture(uT,uv).rgb*0.2270270270;
  s += texture(uT, uv+uDir*1.3846153846).rgb*0.3162162162;
  s += texture(uT, uv-uDir*1.3846153846).rgb*0.3162162162;
  s += texture(uT, uv+uDir*3.2307692308).rgb*0.0702702703;
  s += texture(uT, uv-uDir*3.2307692308).rgb*0.0702702703;
  o = vec4(s,1.0);
}`;

const COMP_FS = `${HEAD}
in vec2 uv; out vec4 o;
uniform sampler2D uScene, uBloom, uDof;
uniform float uBloomAmt, uExposure, uGrain, uT, uVig;
uniform float uFocus, uRange, uDofAmt;
vec3 aces(vec3 x){
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec4 sc = texture(uScene,uv);
  vec3 c = sc.rgb;
  // defocus: alpha carries linear depth, so the plane the camera is looking at
  // stays sharp and everything in front of and behind it softens
  float zdep = sc.a * 100.0;
  float coc = clamp(abs(zdep - uFocus) / max(0.001, uRange), 0.0, 1.0);
  coc = coc*coc*(3.0-2.0*coc) * uDofAmt;
  c = mix(c, texture(uDof, uv).rgb, coc);
  vec3 b = texture(uBloom,uv).rgb;
  c += b*uBloomAmt;
  // a touch of lateral chroma, strongest at the edges
  vec2 d = (uv-0.5);
  float ca = 0.0016*dot(d,d)*4.0;
  c.r = mix(texture(uScene, uv+d*ca).r, texture(uDof, uv+d*ca).r, coc) + texture(uBloom, uv+d*ca).r*uBloomAmt;
  c.b = mix(texture(uScene, uv-d*ca).b, texture(uDof, uv-d*ca).b, coc) + texture(uBloom, uv-d*ca).b*uBloomAmt;
  c *= uExposure;
  c = aces(c);
  c *= 1.0 - uVig*dot(d,d)*1.6;
  c += (hash(uv*vec2(1024.0,768.0)+fract(uT*0.001))-0.5)*uGrain;
  o = vec4(pow(max(c,0.0), vec3(1.0/2.2)), 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: true, alpha: false, powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl; this.canvas = canvas;
    this.float = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    this.pMesh = prog(gl, MESH_VS, MESH_FS);
    this.pLine = prog(gl, LINE_VS, LINE_FS);
    this.pPt = prog(gl, PT_VS, PT_FS);
    this.pBg = prog(gl, QUAD_VS, BG_FS);
    this.pBright = prog(gl, QUAD_VS, BRIGHT_FS);
    this.pBlur = prog(gl, QUAD_VS, BLUR_FS);
    this.pComp = prog(gl, QUAD_VS, COMP_FS);

    this.vaoQuad = gl.createVertexArray();

    this.triBuf = gl.createBuffer();
    this.vaoTri = gl.createVertexArray();
    gl.bindVertexArray(this.vaoTri);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuf);
    const S = 10 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 36);

    this.lineBuf = gl.createBuffer();
    this.vaoLine = gl.createVertexArray();
    gl.bindVertexArray(this.vaoLine);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    const S2 = 7 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S2, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S2, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S2, 24);

    this.ptBuf = gl.createBuffer();
    this.vaoPt = gl.createVertexArray();
    gl.bindVertexArray(this.vaoPt);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S2, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S2, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S2, 24);
    gl.bindVertexArray(null);

    this.fbo = {};
    this.vp = m4(); this.proj = m4(); this.view = m4();
    this.resize();
  }

  _tex(w, h, float) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const internal = float && this.float ? gl.RGBA16F : gl.RGBA8;
    const type = float && this.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  _fb(w, h, float, depth) {
    const gl = this.gl;
    const f = gl.createFramebuffer();
    const tex = this._tex(w, h, float);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rb = null;
    if (depth) {
      rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, tex, rb, w, h };
  }

  resize() {
    const gl = this.gl, c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.floor(c.clientWidth * dpr));
    const h = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width === w && c.height === h && this.fbo.scene) return;
    c.width = w; c.height = h;
    for (const k of Object.keys(this.fbo)) {
      const o = this.fbo[k];
      if (!o) continue;
      gl.deleteFramebuffer(o.f); gl.deleteTexture(o.tex);
      if (o.rb) gl.deleteRenderbuffer(o.rb);
    }
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    this.fbo.scene = this._fb(w, h, true, true);
    this.fbo.bright = this._fb(hw, hh, true, false);
    this.fbo.blurA = this._fb(hw, hh, true, false);
    this.fbo.blurB = this._fb(hw, hh, true, false);
    this.fbo.dofA = this._fb(hw, hh, true, false);
    this.fbo.dofB = this._fb(hw, hh, true, false);
    this.W = w; this.H = h;
  }

  upload(B) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.tri.subarray(0, B.triN), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.line.subarray(0, B.lineN), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.pt.subarray(0, B.ptN), gl.DYNAMIC_DRAW);
    this.nTri = B.triN / 10; this.nLine = B.lineN / 7; this.nPt = B.ptN / 7;
  }

  draw(cam, pal, t) {
    const gl = this.gl;
    this.resize();
    m4perspective(this.proj, cam.fov, this.W / this.H, 0.05, 400);
    m4lookAt(this.view, cam.eye, cam.target, v3(0, 1, 0));
    m4mul(this.vp, this.proj, this.view);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.scene.f);
    gl.viewport(0, 0, this.W, this.H);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.disable(gl.BLEND);
    gl.useProgram(this.pBg);
    gl.uniform3fv(this.pBg.u.uTop, pal.bgTop);
    gl.uniform3fv(this.pBg.u.uBot, pal.bgBot);
    gl.uniform3fv(this.pBg.u.uGlow, pal.bgGlow);
    gl.uniform1f(this.pBg.u.uT, t);
    gl.bindVertexArray(this.vaoQuad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // depthMask must be back on before the clear — glClear respects the mask,
    // and a silently skipped depth clear leaves last frame's depth in place
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.pMesh);
    gl.uniformMatrix4fv(this.pMesh.u.uVP, false, this.vp);
    gl.uniform3fv(this.pMesh.u.uEye, cam.eye);
    gl.uniform3fv(this.pMesh.u.uKey, pal.key);
    gl.uniform3fv(this.pMesh.u.uKeyCol, pal.keyCol);
    gl.uniform3fv(this.pMesh.u.uAmbTop, pal.ambTop);
    gl.uniform3fv(this.pMesh.u.uAmbBot, pal.ambBot);
    gl.uniform3fv(this.pMesh.u.uFog, pal.fog);
    gl.uniform1f(this.pMesh.u.uFogD, pal.fogD);
    gl.uniform1f(this.pMesh.u.uFogNear, cam.fogNear || 0);
    gl.bindVertexArray(this.vaoTri);
    if (this.nTri) gl.drawArrays(gl.TRIANGLES, 0, this.nTri);

    gl.enable(gl.BLEND);
    // colour adds, alpha is left alone — it is carrying depth for the defocus
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.depthMask(false);

    gl.useProgram(this.pLine);
    gl.uniformMatrix4fv(this.pLine.u.uVP, false, this.vp);
    gl.uniform3fv(this.pLine.u.uEye, cam.eye);
    gl.uniform3fv(this.pLine.u.uFog, pal.fog);
    gl.uniform1f(this.pLine.u.uFogD, pal.fogD);
    gl.uniform1f(this.pLine.u.uFogNear, cam.fogNear || 0);
    gl.bindVertexArray(this.vaoLine);
    if (this.nLine) gl.drawArrays(gl.TRIANGLES, 0, this.nLine);

    gl.useProgram(this.pPt);
    gl.uniformMatrix4fv(this.pPt.u.uVP, false, this.vp);
    gl.uniform3fv(this.pPt.u.uEye, cam.eye);
    gl.uniform1f(this.pPt.u.uPx, this.H * 0.9);
    gl.bindVertexArray(this.vaoPt);
    if (this.nPt) gl.drawArrays(gl.POINTS, 0, this.nPt);

    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // --- bloom ---------------------------------------------------------------
    const { bright, blurA, blurB, scene } = this.fbo;
    gl.bindVertexArray(this.vaoQuad);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bright.f);
    gl.viewport(0, 0, bright.w, bright.h);
    gl.useProgram(this.pBright);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(this.pBright.u.uT, 0);
    gl.uniform1f(this.pBright.u.uThresh, pal.bloomThresh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    let src = bright, dst = blurA;
    for (let i = 0; i < 3; i++) {
      const r = 1 + i * 1.6;
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.useProgram(this.pBlur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(this.pBlur.u.uT, 0);
      gl.uniform2f(this.pBlur.u.uDir, r / dst.w, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const tmp = src === bright ? blurB : src;
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmp.f);
      gl.useProgram(this.pBlur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dst.tex);
      gl.uniform1i(this.pBlur.u.uT, 0);
      gl.uniform2f(this.pBlur.u.uDir, 0, r / dst.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      src = tmp; dst = dst === blurA ? blurB === src ? blurA : blurB : blurA;
      if (dst === src) dst = (src === blurA) ? blurB : blurA;
    }

    // --- defocus image: two gaussian passes over the whole scene ------------
    const { dofA, dofB } = this.fbo;
    let dsrc = scene;
    for (let i = 0; i < 2; i++) {
      const r = 1.4 + i * 2.2;
      gl.bindFramebuffer(gl.FRAMEBUFFER, dofA.f);
      gl.viewport(0, 0, dofA.w, dofA.h);
      gl.useProgram(this.pBlur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dsrc.tex);
      gl.uniform1i(this.pBlur.u.uT, 0);
      gl.uniform2f(this.pBlur.u.uDir, r / dofA.w, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dofB.f);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dofA.tex);
      gl.uniform2f(this.pBlur.u.uDir, 0, r / dofB.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      dsrc = dofB;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(this.pComp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(this.pComp.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.pComp.u.uBloom, 1);
    gl.uniform1f(this.pComp.u.uBloomAmt, pal.bloom);
    gl.uniform1f(this.pComp.u.uExposure, pal.exposure);
    gl.uniform1f(this.pComp.u.uGrain, pal.grain);
    gl.uniform1f(this.pComp.u.uVig, pal.vignette);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, dofB.tex);
    gl.uniform1i(this.pComp.u.uDof, 2);
    gl.uniform1f(this.pComp.u.uFocus, cam.dist);
    gl.uniform1f(this.pComp.u.uRange, cam.dofRange || 8);
    gl.uniform1f(this.pComp.u.uDofAmt, pal.dof);
    gl.uniform1f(this.pComp.u.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
