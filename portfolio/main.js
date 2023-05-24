// general setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
camera.position.set(-7, 0, 10);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.render( scene, camera );

// lights
const pointLight = new THREE.PointLight(0xfffff);
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);

// random stars background
function addStar() {
  const starGeom = new THREE.SphereGeometry(0.25, 24, 24);
  const starMat = new THREE.MeshStandardMaterial( { color: 0xffffff });
  const star = new THREE.Mesh(starGeom, starMat);

  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100));
  star.position.set(x, y, z);
  scene.add(star);
}

Array(200).fill().forEach(addStar);

// solar system graphics

// sun
const sunGeom1 = new THREE.SphereGeometry(1, 10, 10);
const sunMat1 = new THREE.MeshStandardMaterial( { color: 0xffffff, transparent: true, opacity: 0.2 });
const sun1 = new THREE.Mesh(sunGeom1, sunMat1);
scene.add(sun1);

const sunGeom2 = new THREE.SphereGeometry(2, 10, 10);
const sunMat2 = new THREE.MeshStandardMaterial( { color: 0xFFFF00, transparent: true, opacity: 0.2 });
const sun2 = new THREE.Mesh(sunGeom2, sunMat2);
scene.add(sun2);



function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  camera.position.x = (t * -0.0002) - 7;
  camera.rotation.y = (t * 0.0002);
  camera.position.z = (t * -0.01) + 10;

}

document.body.onscroll = moveCamera;

// animate
function animate() {
  requestAnimationFrame( animate );


  sun1.rotation.x += -0.01;
  sun1.rotation.y -= 0.005;

  sun2.rotation.y += 0.005;
  sun2.rotation.z += 0.01;

  renderer.render(scene, camera);
}

animate()