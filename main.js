import * as THREE from '/node_modules/three';

// ---------------------
// constants to use throughout
// ---------------------
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

// initial camera coordinates
const INIT_X = 0;
const INIT_Y = 0;
const INIT_Z = 10;

// scale factors
const ORBIT_DISTANCE_SCALE = 0.7; // used to scale distances for orbits
const STAR_COUNT = 300;
const ROTATION_SCALE = 77; // used to scale day lengths for rotation
const ORBIT_SCALE = 25000; // used to scale year lengths for orbits

// ---------------------
// shared resources
// ---------------------
const textureLoader = new THREE.TextureLoader();
const STAR_GEOM = new THREE.SphereGeometry(0.5, 24, 24);
const STAR_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });

// ---------------------
// scene setup
// ---------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(INIT_X, INIT_Y, INIT_Z);

const renderer = new THREE.WebGLRenderer({
	canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.render(scene, camera);

// ambient light, lights up everything equally 
const ambientLight = new THREE.AmbientLight(0xffffff, 1); // color, intensity
scene.add(ambientLight);

// ---------------------
// helper functions
// ---------------------
function randSpread() {
	return THREE.MathUtils.randFloatSpread(633);
}

// ---------------------
// factory functions
// ---------------------
/**
 * create a ring for a celestial body
 * @param {string} bodyName - body name as a lowercase string
 * @param {Object} ringRadii - the inner and outer ring radii in km
 * @returns {Object} the created ring mesh
 */
function createRing(bodyName, ringRadii) {
	const ringGeom = new THREE.RingGeometry(
		ringRadii.innerRadius,
		ringRadii.outerRadius
	);

	// make a path name for the ring texture image file, then use the shared texture loader
	const ringPath = `assets/maps/${bodyName}Ring.jpg`;
	const ringTexture = textureLoader.load(ringPath);

	// use the ring geometry and ring material to make a ring mesh
	const ringMat = new THREE.MeshBasicMaterial({
		map: ringTexture,
		side: THREE.DoubleSide
	});
	return new THREE.Mesh(ringGeom, ringMat);
}

/**
 * create body orbit torus
 * @param {number} distance - body distance from Sun in AU
 * @returns {Object} the created orbit mesh
 */
function createOrbit(distance) {
	// Create a representation for the body's orbit based on its distance
	const orbitGeom = new THREE.TorusGeometry(distance * ORBIT_DISTANCE_SCALE, 0.1);
	const orbitMat = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.25
	});
	return new THREE.Mesh(orbitGeom, orbitMat);
}

/**
 * create a celestial body
 * @param {string} bodyName - body name as a lowercase string
 * @param {number} bodyRadius - body radius in km
 * @param {number} distance - body distance from Sun in AU
 * @param {Object} ringRadii - the inner and outer ring radii in km
 * @returns {Object} the created celestial body
 */
function createBody(bodyName, bodyRadius, distance, ringRadii) {

	// Create the body's geometry using the body's Radius
	const bodyGeom = new THREE.SphereGeometry(bodyRadius);

	// Create a path name for the body texture image file, then use the shared texture loader
	const bodyPath = `assets/maps/${bodyName}.jpg`;
	const bodyTexture = textureLoader.load(bodyPath);

	// Use the body texture and body material to make a body mesh
	const bodyMat = new THREE.MeshStandardMaterial({
		map: bodyTexture,
	});

	// Create a planet
	const body = new THREE.Mesh(bodyGeom, bodyMat);

	// Create a pivot to control the planet's orbit around the Sun, then add the body to the pivot
	const pivot = new THREE.Object3D();
	pivot.add(body);

	// Add the pivot and set the body's distance from the Sun
	scene.add(pivot);
	body.position.set(distance * ORBIT_DISTANCE_SCALE, 0, 0);

	// Create a representation for the body's orbit based on its distance
	const orbit = createOrbit(distance);
	scene.add(orbit);
	orbit.rotation.x += 0.5 * Math.PI;

	// This if statement is run if the ring's inner and outer radii are passed in a list
	if (ringRadii) {

		const ring = createRing(bodyName, ringRadii);

		// Add the ring to the pivot and set its distance from the Sun
		pivot.add(ring);
		ring.position.set(distance * ORBIT_DISTANCE_SCALE, 0, 0);
		ring.rotation.x = -0.5 * Math.PI;

		// Return body, ring, pivot so they can be accessed later
		return { body, ring, pivot, orbit }

	}

	// If ring is not rendered, just return a body and pivot
	return { body, pivot, orbit }
}

// ---------------------
// scene population
// ---------------------
/**
 * Add a star at a random position in the scene
 */
function addStar() {
	// reuse geometry and material for many stars to save memory
	const star = new THREE.Mesh(STAR_GEOM, STAR_MAT);
	const [x, y, z] = [randSpread(), randSpread(), randSpread()];
	star.position.set(x, y, z);
	scene.add(star);
}

for (let i = 0; i < STAR_COUNT; i++) addStar();

// main planets
const mercury = createBody("mercury", 1, 25);
const venus = createBody("venus", 3, 50);
const earth = createBody("earth", 3, 75);
const mars = createBody("mars", 1.5, 100);
const jupiter = createBody("jupiter", 10, 200);
const saturn = createBody("saturn", 9, 300, { innerRadius: 10, outerRadius: 20 });
const uranus = createBody("uranus", 6, 400);
const neptune = createBody("neptune", 6, 500);
const pluto = createBody("pluto", 1, 550);

/**
 * apply axial tilt and orbital inclination to a body
 * @param {Object} body - the celestial body object
 * @param {number} tilt - the axial tilt in degrees
 * @param {number} inclination - the orbital inclination to the ecliptic in degrees
 */
function applyTiltAndInclination(body, tilt, inclination) {
	// convert to radians using cached multiplier
	tilt *= DEG_TO_RAD;
	inclination *= DEG_TO_RAD;

	// set each accordingly (increment angles)
	body.body.rotation.x += tilt;
	body.pivot.rotation.x += inclination;
	body.orbit.rotation.x += inclination;

	if (body.ring) {
		body.ring.rotation.x += tilt;
	}
}

applyTiltAndInclination(mercury, 2.04, 7);
applyTiltAndInclination(venus, 2.64, 3.39);
applyTiltAndInclination(earth, 23.439, 0);
applyTiltAndInclination(mars, 25.19, 1.85);
applyTiltAndInclination(jupiter, 3.13, 1.3);
applyTiltAndInclination(saturn, 26.73, 2.49);
applyTiltAndInclination(uranus, 97.77, 0.77);
applyTiltAndInclination(neptune, 28, 1.77);
applyTiltAndInclination(pluto, 120, 17.2);

// ---------------------
// animation helpers (per-frame)
// ---------------------
/**
 * advance the body's spin and orbital angle for animation (per-frame)
 * @param {Object} body - the celestial body object
 * @param {number} dayLength - body day length in Earth days
 * @param {number} yearLength - body year length in Earth days
 */
function advanceRotationAndOrbit(body, dayLength, yearLength) {

	// orbitalPeriod: orbital period in radians/seconds
	// rotationPeriod: rotation period in radians/seconds
	var orbitalPeriod = TWO_PI / (yearLength * 86400);
	var rotationPeriod = TWO_PI / (dayLength * 86400);

	// scale periods so they are observable in a reasonable time frame
	orbitalPeriod *= ORBIT_SCALE;
	rotationPeriod *= ROTATION_SCALE;

	// implement angles accordingly
	body.pivot.rotation.y += orbitalPeriod;
	body.body.rotation.y += rotationPeriod;

}

// ---------------------
// event handlers
// ---------------------
/**
 * Handle window resize events
 */
function onWindowResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

window.addEventListener('resize', onWindowResize);

/**
 * move the camera based on scroll position
 */
function moveCamera() {
	const t = document.body.getBoundingClientRect().top;
	camera.position.x = INIT_X + (t * 0.0004);
	camera.rotation.x = (t * 0.0001);
	camera.position.y = INIT_Y + (t * -0.02);
	camera.position.z = INIT_Z + (t * -0.08);
}

document.body.onscroll = moveCamera;

onWindowResize();

// ---------------------
// main animation loop
// ---------------------
function animate() {
	requestAnimationFrame(animate);

	// Mercury
	advanceRotationAndOrbit(mercury, 59, 120)

	// Venus
	advanceRotationAndOrbit(venus, -243, 224.7)

	// Earth
	advanceRotationAndOrbit(earth, 1, 365.256);

	// Mars
	advanceRotationAndOrbit(mars, 1.02749125, 686.980);

	// Jupiter
	advanceRotationAndOrbit(jupiter, 0.42, 1200);

	// Saturn
	advanceRotationAndOrbit(saturn, 0.46, 1400);

	// Uranus
	advanceRotationAndOrbit(uranus, 0.71, 2000);

	// Neptune
	advanceRotationAndOrbit(neptune, 0.67, 4000);

	// Pluto
	advanceRotationAndOrbit(pluto, 6, 5000);

	renderer.render(scene, camera);
}

animate();