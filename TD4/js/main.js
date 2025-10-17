// js/main.js - Version V2
// Améliorations :
// - Parcours en longueur (moyen ~150) procédural garantissant un chemin jouable
// - Collisions simples entre voiture et obstacles (arbres + rochers)
// - Rochers plus gros et fixes (plusieurs)
// - Tutoriel visuel des touches affiché 3.5s au lancement de chaque carte
// - Caméra large, smooth, derrière la voiture (ne contrôle pas la voiture)
// - Difficulté : "Balance"

window.addEventListener('DOMContentLoaded', initGame);

function initGame(){
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});

  let scene = null;
  let car = null;
  let finish = null;
  let mapSeed = Math.floor(Math.random()*1e9);

  const keys = createKeyState();

  const ui = setupUI();

  restart();

  window.addEventListener('resize', ()=>engine.resize());

  document.getElementById('respawn').addEventListener('click', ()=>{ if(car) respawn(car); ui.hideMessage(); });
  document.getElementById('restart').addEventListener('click', ()=>{ restart(); ui.hideMessage(); });

  function restart(){
    if(scene){ try{ scene.dispose(); } catch(e){} }
    mapSeed = Math.floor(Math.random()*1e9);
    scene = createScene(engine, canvas, mapSeed, keys, ui, (c,f)=>{ car = c; finish = f; });
    engine.runRenderLoop(()=>{ if(scene) scene.render(); });
  }
}

function createScene(engine, canvas, seed, keys, ui, setRefs){
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.6,0.8,1);

  const light = new BABYLON.HemisphericLight('hlight', new BABYLON.Vector3(0,1,0), scene);
  light.intensity = 0.95;

  const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0,5,-18), scene);
  camera.attachControl(canvas, false);
  camera.minZ = 0.1;

  const length = 150; 
  const pathWidth = 14;
  const rnd = mulberry32(seed);

  // 1️⃣ Générer le chemin et les murs
  const waypoints = generateWaypoints(length, 6, rnd);
  createCorridorWalls(scene, waypoints, pathWidth);

  // Calculer bounds pour le sol
  let minX = Math.min(...waypoints.map(p => p.x)) - pathWidth;
  let maxX = Math.max(...waypoints.map(p => p.x)) + pathWidth;
  let minZ = Math.min(...waypoints.map(p => p.z)) - pathWidth;
  let maxZ = Math.max(...waypoints.map(p => p.z)) + pathWidth;

  const ground = BABYLON.MeshBuilder.CreateGround('ground', {width: maxX-minX, height: maxZ-minZ}, scene);
  ground.position = new BABYLON.Vector3((minX+maxX)/2,0,(minZ+maxZ)/2);
  const gmat = new BABYLON.StandardMaterial('gmat', scene);
  gmat.diffuseColor = new BABYLON.Color3(0.45,0.8,0.45);
  ground.material = gmat;

  // 2️⃣ Placer les obstacles après le chemin
  const obstaclesParent = new BABYLON.TransformNode('obstacles', scene);
  placeObstaclesAlongPath(scene, obstaclesParent, waypoints, rnd, {treeCount:60, rockCount:12});

  // 3️⃣ Créer voiture et finish
  const car = createCar(scene);
  car.position = new BABYLON.Vector3(0,0,0);
  car.rotation = new BABYLON.Vector3(0, Math.PI, 0);

  const last = waypoints[waypoints.length-1];
  const finish = createFinish(scene, new BABYLON.Vector3(last.x,0.6,last.z));
  setRefs(car, finish);

  const camCfg = { offset: new BABYLON.Vector3(0,7,-26), targetOffset: new BABYLON.Vector3(0,2,8), smooth:6.5, avoidClip:true, clipMargin:0.5 };
  showControlsTutorial(ui);

  if(!car._v_state) car._v_state = {speed:0, steering:0};

  scene.registerBeforeRender(()=>{
    const dt = engine.getDeltaTime()/1000;
    updateCarKinematic(car, car._v_state, keys, dt);
    handleCollisions(car, obstaclesParent);
    clampCarToCorridor(car, waypoints, pathWidth);
    updateFollowCamera(scene, camera, car, camCfg);

    const dist = Math.round(BABYLON.Vector3.Distance(car.position, finish.position));
    const distEl = document.getElementById('distance'); if(distEl) distEl.innerText = dist;
    if(dist < 2) ui.showMessage('🎉 Tu as atteint le point final !', 3500);
  });

  return scene;
}

// ================= Corridor & Path generation =================
function generateWaypoints(totalLength, segments, rnd){
  // produce segments waypoints along +X axis, with random Z offsets to create bends
  const pts = [];
  const step = totalLength / segments;
  for(let i=0;i<=segments;i++){
    const x = Math.round(i * step);
    // jitter z but keep moderate
    const z = Math.round((rnd()*2 -1) * 12 * (1 - Math.abs((i - segments/2)/(segments/2))));
    pts.push({x:x, z:z});
  }
  return pts;
}

function createCorridorWalls(scene, waypoints, width){
  // create a simple wall strip around path: create boxes between offset points
  const wallMat = new BABYLON.StandardMaterial('wallMat', scene);
  wallMat.diffuseColor = new BABYLON.Color3(0.25,0.15,0.08);
  const height = 4;
  for(let i=0;i<waypoints.length-1;i++){
    const a = waypoints[i];
    const b = waypoints[i+1];
    const midX = (a.x + b.x)/2;
    const midZ = (a.z + b.z)/2;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dz, dx);

    // left wall position = mid + normal * (width/2)
    const nx = -Math.sin(angle);
    const nz = Math.cos(angle);

    const leftX = midX + nx * (width/2 + 0.5);
    const leftZ = midZ + nz * (width/2 + 0.5);
    const rightX = midX - nx * (width/2 + 0.5);
    const rightZ = midZ - nz * (width/2 + 0.5);

    const left = BABYLON.MeshBuilder.CreateBox('wallL_'+i,{width:segLen+0.5, depth:1, height:height}, scene);
    left.position = new BABYLON.Vector3(leftX, height/2, leftZ);
    left.rotation.y = -angle;
    left.material = wallMat;

    const right = BABYLON.MeshBuilder.CreateBox('wallR_'+i,{width:segLen+0.5, depth:1, height:height}, scene);
    right.position = new BABYLON.Vector3(rightX, height/2, rightZ);
    right.rotation.y = -angle;
    right.material = wallMat;
  }
}

// ================= Obstacles placement updated =================
function placeObstaclesAlongPath(scene, parent, waypoints, rnd, opts){
  // Trees
  for(let i=0;i<opts.treeCount;i++){
    const idx = Math.floor(rnd()*(waypoints.length-1));
    const base = waypoints[idx];
    const side = (rnd() > 0.6) ? (rnd()>0.5?1:-1) : 0; 
    const zNoise = Math.floor((rnd()*2 -1) * 10);
    const xNoise = Math.floor((rnd()*2 -1) * 6);
    const x = base.x + xNoise;
    const z = base.z + zNoise + side * (8 + Math.floor(rnd()*6));
    if(Math.hypot(x - 0, z - 0) < 6) continue;
    if(Math.hypot(x - waypoints[waypoints.length-1].x, z - waypoints[waypoints.length-1].z) < 6) continue;
    placeTree(scene, parent, x, z, rnd);
  }

  // Rocks - avoid corridor
  for(let i=0;i<opts.rockCount;i++){
    let tries = 0;
    while(tries < 20){
      const idx = Math.floor(rnd()*(waypoints.length-1));
      const base = waypoints[idx];
      const x = base.x + Math.floor((rnd()*2 -1)*8);
      const z = base.z + Math.floor((rnd()*2 -1)*6);

      let safe = true;
      for(const wp of waypoints){
        if(Math.hypot(x - wp.x, z - wp.z) < (14/2 + 1)){ // pathWidth/2 + margin
          safe = false;
          break;
        }
      }

      if(safe){
        placeRock(scene, parent, x, z, 4 + Math.floor(rnd()*2));
        break;
      }
      tries++;
    }
  }
}

function placeTree(scene, parent, x, z, rnd){
  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk_'+x+'_'+z,{diameter:0.6, height:2, tessellation:12}, scene);
  trunk.position = new BABYLON.Vector3(x,1,z);
  const tm = new BABYLON.StandardMaterial('tm_'+x+'_'+z, scene);
  tm.diffuseColor = new BABYLON.Color3(0.38,0.18,0.06);
  trunk.material = tm;
  trunk.parent = parent;

  const leaves = BABYLON.MeshBuilder.CreateSphere('leaf_'+x+'_'+z,{diameter:2.2, segments:12}, scene);
  leaves.position = new BABYLON.Vector3(x,2.2,z);
  const lm = new BABYLON.StandardMaterial('lm_'+x+'_'+z, scene);
  lm.diffuseColor = new BABYLON.Color3(0.05 + Math.random()*0.25, 0.45 + Math.random()*0.3, 0.05);
  leaves.material = lm;
  leaves.parent = parent;
}

function placeRock(scene, parent, x, z, scale=2){
  const rock = BABYLON.MeshBuilder.CreateSphere('rock_'+x+'_'+z,{diameter:scale, segments:10}, scene);
  rock.position = new BABYLON.Vector3(x, scale/2, z);
  const rm = new BABYLON.StandardMaterial('rm_'+x+'_'+z, scene);
  rm.diffuseColor = new BABYLON.Color3(0.35,0.35,0.38);
  rock.material = rm;
  rock.parent = parent;
  // mark as obstacle
  rock.isObstacle = true;
}

// ================= Car creation =================
function createCar(scene){
  const car = new BABYLON.TransformNode('car', scene);
  const body = BABYLON.MeshBuilder.CreateBox('body',{height:0.8, width:2.2, depth:4}, scene);
  body.position.y = 0.9; body.parent = car;
  const bmat = new BABYLON.StandardMaterial('bmat', scene); bmat.diffuseColor = new BABYLON.Color3(0.85,0.12,0.12); body.material = bmat;

  const wheels = [];
  const wpos = [[-0.9,0.3,1.4],[0.9,0.3,1.4],[-0.9,0.3,-1.4],[0.9,0.3,-1.4]];
  wpos.forEach((p,i)=>{
    const w = BABYLON.MeshBuilder.CreateCylinder('wh'+i,{height:0.5, diameter:0.6, tessellation:12}, scene);
    w.rotation.x = Math.PI/2; w.position = new BABYLON.Vector3(p[0], p[1], p[2]); w.parent = car;
    const wm = new BABYLON.StandardMaterial('wm'+i, scene); wm.diffuseColor = new BABYLON.Color3(0.12,0.12,0.12); w.material = wm; wheels.push(w);
  });

  // bounding info for collisions (sphere radius)
  car._collisionRadius = 1.6; // approximate
  return car;
}

function createFinish(scene, pos){
  const f = BABYLON.MeshBuilder.CreateSphere('finish',{diameter:1.2, segments:16}, scene);
  f.position = pos.clone();
  const fm = new BABYLON.StandardMaterial('fmat', scene); fm.emissiveColor = new BABYLON.Color3(0,1,0); f.material = fm;
  const ring = BABYLON.MeshBuilder.CreateTorus('fr',{diameter:3, thickness:0.05, tessellation:32}, scene);
  ring.position = new BABYLON.Vector3(pos.x, 0.05, pos.z); ring.rotation.x = Math.PI/2; ring.material = fm;
  return f;
}

// ================= Input helpers =================
function createKeyState(){
  const keys = {forward:false, back:false, left:false, right:false};
  window.addEventListener('keydown', (e)=>{ const k = normalizeKey(e.key); mapToState(k, keys, true); });
  window.addEventListener('keyup', (e)=>{ const k = normalizeKey(e.key); mapToState(k, keys, false); });
  return keys;
}
function normalizeKey(k){ if(!k) return ''; return (k.length===1)? k.toLowerCase() : k; }
function mapToState(k, state, pressed){ if(k==='z' || k==='w' || k==='ArrowUp') state.forward = pressed; if(k==='s' || k==='ArrowDown') state.back = pressed; if(k==='q' || k==='a' || k==='ArrowLeft') state.left = pressed; if(k==='d' || k==='ArrowRight') state.right = pressed; }

// Correction Vitesse et Reverse
// Remplacer l'utilisation de maxReverse inexistant par une valeur correcte dans updateCarKinematic

// ================= Car kinematic =================
function updateCarKinematic(car, state, keys, dt){
  const maxSpeed = 9;
  const maxReverseSpeed = -4;
  const accel = 28; 
  const brake = 48; 
  const friction = 8; 
  const steerSpeed = 2.0; // un peu plus rapide
  const steerLimit = 0.7;

  if(!car._v_state) car._v_state = {speed:0, steering:0};
  const cs = car._v_state;

  const forwardInput = (keys.forward?1:0) + (keys.back?-1:0);
  const steerInput = (keys.right?1:0) + (keys.left?-1:0);

  if(forwardInput>0) cs.speed += accel*forwardInput*dt;
  else if(forwardInput<0){
    if(cs.speed>0) cs.speed += -brake*(-forwardInput)*dt;
    else cs.speed += -accel*(-forwardInput)*dt;
  } else {
    if(cs.speed>0){ cs.speed -= friction*dt; if(cs.speed<0) cs.speed=0; }
    else if(cs.speed<0){ cs.speed += friction*dt; if(cs.speed>0) cs.speed=0; }
  }

  cs.speed = Math.min(maxSpeed, Math.max(maxReverseSpeed, cs.speed));

  const steerFactor = Math.max(0.12, Math.abs(cs.speed)/maxSpeed);
  cs.steering += steerInput * steerSpeed * dt * steerFactor;
  cs.steering = Math.max(-steerLimit, Math.min(steerLimit, cs.steering));

  const angular = cs.steering * (cs.speed/maxSpeed) * 2.0;
  car.rotation.y += angular * dt;

  const forwardVec = new BABYLON.Vector3(Math.sin(car.rotation.y),0,Math.cos(car.rotation.y));
  car.position.addInPlace(forwardVec.scale(cs.speed*dt));
  car.position.y = 0;

  cs.steering *= 0.996;
}


// ================= Collisions =================
function handleCollisions(car, obstaclesParent){
  if(!obstaclesParent) return;
  const children = obstaclesParent.getChildren();
  if(!children || children.length===0) return;
  const cr = car._collisionRadius || 1.4;
  const carPos = car.position;
  for(const m of children){
    if(!m.position) continue;
    const dx = carPos.x - m.position.x; const dz = carPos.z - m.position.z; const dist = Math.hypot(dx,dz);
    const r = (m.scaling && m.scaling.x)? m.scaling.x : (m._diameter || (m.getBoundingInfo? m.getBoundingInfo().boundingSphere.radiusWorld:1));
    const obstacleRadius = Math.max(0.8, r);
    if(dist < (cr + obstacleRadius - 0.2)){
      // collision response: bounce a bit and reduce speed
      if(car._v_state){ car._v_state.speed *= 0.25; car._v_state.steering *= 0.6; }
      // push car out along collision normal
      const nx = dx / (dist || 0.0001); const nz = dz / (dist || 0.0001);
      car.position.x = m.position.x + (cr + obstacleRadius + 0.2) * nx;
      car.position.z = m.position.z + (cr + obstacleRadius + 0.2) * nz;
    }
  }
}

// ================= Corridor clamp (keep inside walls) =================
function clampCarToCorridor(car, waypoints, width){
  // find nearest segment and clamp lateral offset
  let bestI = 0; let bestDist = 1e9; let proj = null;
  for(let i=0;i<waypoints.length-1;i++){
    const a = waypoints[i]; const b = waypoints[i+1];
    const seg = {x:b.x-a.x, z:b.z-a.z};
    const t = ((car.position.x - a.x)*seg.x + (car.position.z - a.z)*seg.z) / (seg.x*seg.x + seg.z*seg.z);
    const tt = Math.min(1, Math.max(0, t));
    const px = a.x + seg.x*tt; const pz = a.z + seg.z*tt;
    const d = Math.hypot(car.position.x - px, car.position.z - pz);
    if(d < bestDist){ bestDist = d; bestI = i; proj = {px, pz, seg}; }
  }
  if(!proj) return;
  const half = width/2 - 0.6; // leave margin
  if(bestDist > half){
    // push car back within corridor
    const nx = (car.position.x - proj.px) / (bestDist || 0.0001);
    const nz = (car.position.z - proj.pz) / (bestDist || 0.0001);
    car.position.x = proj.px + nx * half;
    car.position.z = proj.pz + nz * half;
    // punish speed
    if(car._v_state) car._v_state.speed *= 0.4;
  }
}

// ================= Camera follow style "Roblox" =================
// ================= Camera style Roblox =================
function updateFollowCamera(scene, camera, car, cfg){
  if(!camera._camState){
    camera._camState = {
      yaw: 0, pitch: 0, distance: -cfg.offset.z,
      minDistance: -8, maxDistance: -35, 
      rotationSpeed: 0.0035, zoomSpeed: 2.5
    };
  }

  const state = camera._camState;

  // Rotation via souris
  if(scene.activeCamera && !camera._pointerSetup){
    camera._pointerSetup = true;
    let dragging=false, lastX=0, lastY=0;
    scene.onPointerObservable.add((pi,s)=>{
      if(pi.type===BABYLON.PointerEventTypes.POINTERDOWN && pi.event.button===0){ dragging=true; lastX=pi.event.clientX; lastY=pi.event.clientY; }
      if(pi.type===BABYLON.PointerEventTypes.POINTERUP) dragging=false;
      if(pi.type===BABYLON.PointerEventTypes.POINTERMOVE && dragging){
        const dx = pi.event.clientX - lastX; const dy = pi.event.clientY - lastY;
        lastX = pi.event.clientX; lastY = pi.event.clientY;
        state.yaw -= dx*state.rotationSpeed;
        state.pitch -= dy*state.rotationSpeed;
        state.pitch = Math.max(-Math.PI/4, Math.min(Math.PI/3, state.pitch));
      }
    });
    // Zoom molette
    scene.onPointerObservable.add(pi=>{
      if(pi.type===BABYLON.PointerEventTypes.POINTERWHEEL){
        state.distance += pi.event.deltaY*0.01*state.zoomSpeed;
        state.distance = Math.max(state.minDistance, Math.min(state.maxDistance, state.distance));
      }
    });
  }

  // Calcul position
  const targetPos = car.position.add(new BABYLON.Vector3(0,cfg.targetOffset.y,0));
  const offset = new BABYLON.Vector3(
    Math.sin(state.yaw)*Math.cos(state.pitch),
    Math.sin(state.pitch),
    Math.cos(state.yaw)*Math.cos(state.pitch)
  ).scale(-state.distance);

  let desiredPos = targetPos.add(offset);

  // Eviter clipping
  const ray = new BABYLON.Ray(targetPos, offset.normalize(), offset.length());
  const hit = scene.pickWithRay(ray, m=>{
    if(!m) return false;
    if(m.name && (m.name.startsWith('car') || m.name.startsWith('finish'))) return false;
    return true;
  });
  if(hit && hit.hit){
    const p = hit.pickedPoint;
    const safeDir = p.subtract(targetPos).normalize();
    desiredPos = targetPos.add(safeDir.scale(hit.distance - cfg.clipMargin));
  }

  // Interpolation douce
  const t = Math.min(1, cfg.smooth * (scene.getEngine().getDeltaTime()/1000));
  camera.position = BABYLON.Vector3.Lerp(camera.position, desiredPos, t);
  const curT = camera._target || camera.getTarget() || car.position;
  const newT = BABYLON.Vector3.Lerp(curT, targetPos, t);
  camera.setTarget(newT);
  camera._target = newT;
}

// ================= Tutorial UI =================
function showControlsTutorial(ui){
  // create a small overlay inside #ui or use #message
  const el = document.getElementById('message');
  if(!el) return;
  el.innerHTML = "<div style='font-size:18px;font-weight:600;margin-bottom:6px'>Commandes</div>" +
    "<div style='font-size:16px'>Déplacer : <b>Z</b>/<b>W</b> = avancer, <b>S</b> = reculer, <b>Q</b>/<b>A</b> = gauche, <b>D</b> = droite</div>";
  el.classList.remove('hidden');
  setTimeout(()=>{ el.classList.add('hidden'); el.innerText = ''; }, 3500);
}

// ================= UI helpers =================
function setupUI(){
  return {
    showMessage(text, ms){ const m = document.getElementById('message'); if(!m) return; m.innerText = text; m.classList.remove('hidden'); if(ms) setTimeout(()=>m.classList.add('hidden'), ms); },
    hideMessage(){ const m = document.getElementById('message'); if(!m) return; m.classList.add('hidden'); }
  };
}

function respawn(car){ car.position = new BABYLON.Vector3(0,0,0); car.rotation = new BABYLON.Vector3(0, Math.PI, 0); if(car._v_state){ car._v_state.speed = 0; car._v_state.steering = 0; } }

// ================= Utilities =================
function mulberry32(a){ return function(){ var t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
