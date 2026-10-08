(() => {
  'use strict';
  const scene = document.getElementById('hero-art-scene');
  const canvas = document.getElementById('hero-animated-art');
  const original = document.getElementById('hero-original-art');
  const star = document.getElementById('hero-star-cursor');
  if (!scene || !canvas || !original || !star) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduce.matches && fine.matches;
  const amount = 1;
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, ready = false, gaze = 0, targetGaze = 0;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  let program, leftLook, rightLook, ribbonPointer;
  function shader(type, source) {
    const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value));
    return value;
  }
  // Sample the original painting; no objects or face features are redrawn.
  const fragment = `precision highp float;
    varying vec2 uv;
    uniform sampler2D art;
    uniform vec2 leftLook;
    uniform vec2 rightLook;
    uniform vec2 ribbonPointer;
    float region(vec2 p, vec2 center, vec2 radius) {
      float d=length((p-center)/radius);
      return exp(-2.0*d*d*d*d);
    }
    vec2 head(vec2 p,vec2 center,vec2 pivot,vec2 radius,vec2 look) {
      float weight=region(p,center,radius);
      float a=-(look.x*.095+look.y*.012)*weight;
      vec2 d=p-pivot;
      vec2 turned=mat2(cos(a),sin(a),-sin(a),cos(a))*d;
      return pivot+turned-look*vec2(.0065,.005)*weight;
    }
    void main() {
      vec2 p=uv;
      p=head(p,vec2(.264,.301),vec2(.282,.360),vec2(.067,.075),leftLook);
      p=head(p,vec2(.783,.612),vec2(.768,.666),vec2(.068,.075),rightLook);
      // Soft local deformation gives the painted ribbon a little give.
      float ribbon=region(p,vec2(.702,.165),vec2(.175,.18));
      p.x+=sin(p.y*12.0)*ribbon*ribbonPointer.x*.0045;
      p.y+=cos(p.x*9.0)*ribbon*ribbonPointer.y*.003;
      gl_FragColor=texture2D(art,p);
    }`;
  function draw() {
    const moving = enabled && !reduce.matches && fine.matches;
    const unit = scene.clientWidth / 585;
    // The upper end opens up dramatically; lower settings keep their soft feel.
    const high = Math.max(0, (amount - .6) / .4);
    const sceneStrength = amount * (1 + 5 * high * high);
    const headStrength = amount * (1 + 1.6 * high * high);
    if (gl && ready) {
      gl.viewport(0,0,canvas.width,canvas.height);
      const clamp = value => Math.max(-1, Math.min(1, value));
      const lookStrength = moving ? headStrength * gaze : 0;
      const mouseU = (x + 1) / 2, mouseV = (y + 1) / 2;
      gl.uniform2f(leftLook,clamp((mouseU-.264)/.38)*lookStrength,clamp((mouseV-.301)/.42)*lookStrength);
      gl.uniform2f(rightLook,clamp((mouseU-.783)/.38)*lookStrength,clamp((mouseV-.612)/.42)*lookStrength);
      gl.uniform2f(ribbonPointer,moving ? x*sceneStrength : 0,moving ? y*sceneStrength : 0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    const art = ready && enabled ? canvas : original;
    art.style.transform = moving ? `translate3d(${x*sceneStrength*7*unit}px,${y*sceneStrength*4*unit}px,0) rotateX(${-y*sceneStrength*2.2}deg) rotateY(${x*sceneStrength*3.2}deg)` : 'none';
    art.style.filter = `drop-shadow(${-x*sceneStrength*8*unit}px ${(22-y*sceneStrength*3)*unit}px ${(24+high*10)*unit}px #52728218)`;
  }
  function animate() {
    x += (targetX-x)*.09; y += (targetY-y)*.09; gaze += (targetGaze-gaze)*.09; draw();
    if (Math.abs(targetX-x)+Math.abs(targetY-y)+Math.abs(targetGaze-gaze)>.001) frame=requestAnimationFrame(animate);
    else { x=targetX; y=targetY; gaze=targetGaze; draw(); frame=0; }
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(animate); }
  function resize() {
    const dpr=Math.min(devicePixelRatio || 1,2), bounds=canvas.getBoundingClientRect();
    canvas.width=Math.round(bounds.width*dpr); canvas.height=Math.round(bounds.height*dpr); draw();
  }
  function updateAppearance() {
    original.style.visibility = ready && enabled ? 'hidden' : 'visible';
    canvas.style.visibility = ready && enabled ? 'visible' : 'hidden';
    original.style.transform = enabled ? original.style.transform : 'none';
    draw();
  }
  function setup() {
    if (!gl) return;
    try {
      program=gl.createProgram();
      gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 point; varying vec2 uv; void main(){gl_Position=vec4(point,0.,1.); uv=vec2((point.x+1.)*.5,1.-(point.y+1.)*.5);}'));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const point=gl.getAttribLocation(program,'point'); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,original);
      gl.uniform1i(gl.getUniformLocation(program,'art'),0);
      leftLook=gl.getUniformLocation(program,'leftLook'); rightLook=gl.getUniformLocation(program,'rightLook'); ribbonPointer=gl.getUniformLocation(program,'ribbonPointer');
      ready=true; canvas.style.display='block'; original.style.visibility='hidden'; resize(); updateAppearance();
    } catch (error) { console.warn('Using the original illustration with perspective only.',error); }
  }
  scene.addEventListener('pointermove',event=>{
    if (!fine.matches || event.pointerType === 'touch') return;
    const bounds=scene.getBoundingClientRect();
    if (event.pointerType !== 'touch') {
      star.style.transform=`translate3d(${event.clientX-bounds.left}px,${event.clientY-bounds.top}px,0)`;
      scene.classList.add('hero-star-active');
    }
    if (!enabled || reduce.matches) return;
    targetGaze=1;
    targetX=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
    targetY=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1)); schedule();
  });
  scene.addEventListener('pointerleave',()=>{targetX=0;targetY=0;targetGaze=0;scene.classList.remove('hero-star-active');schedule();});
  function preferencesChanged() {
    enabled = !reduce.matches && fine.matches;
    targetX=targetY=x=y=gaze=targetGaze=0;
    scene.classList.remove('hero-star-active');
    updateAppearance();
  }
  reduce.addEventListener('change',preferencesChanged);
  fine.addEventListener('change',preferencesChanged);
  window.addEventListener('resize',resize);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;canvas.style.display='none';original.style.visibility='visible';});
  if(original.complete && original.naturalWidth) setup(); else original.addEventListener('load',setup,{once:true});
  updateAppearance();
})();
