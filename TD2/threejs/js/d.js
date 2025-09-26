const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

    
// Variables pour stocker l'inclinaison
let beta = 0;  // inclinaison avant/arrière (x)
let gamma = 0; // inclinaison gauche/droite (y)

window.addEventListener("deviceorientation", (event) => {
  // beta = inclinaison avant/arrière [-180,180]
  beta = event.beta || 0;

  // gamma = inclinaison gauche/droite [-90,90]
  gamma = event.gamma || 0;
});

// Dans ta fonction animate(), remplace la rotation auto par :
function animate() {
  requestAnimationFrame(animate);

  // On mappe l'inclinaison du tel aux rotations du cube
  cube.rotation.x = THREE.MathUtils.degToRad(beta);
  cube.rotation.y = THREE.MathUtils.degToRad(gamma);

  renderer.render(scene, camera);
}

const loader = new THREE.GLTFLoader();
loader.load(
    "model/scene.gltf",
    function(gltf) {
        gltf.scene.position.set(2,0,0);
        gltf.scene.scale.set(1,1,1);
        scene.add(gltf.scene);
    },
    undefined,
    function(error) {
        console.error("Erreur : ",error);
    }
)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Lumière ambiante (éclaire toute la scène faiblement)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);