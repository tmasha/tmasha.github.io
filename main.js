import * as THREE from '/node_modules/three';
import { BODIES } from './data/bodies.js';

// ---------------------
// CONSTANTS TO USE THROUGHOUT
// ---------------------
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

// initial camera coordinates
const INIT_X = 0;
const INIT_Y = 0;
const INIT_Z = 10;

// scale factors
const ROTATION_SCALE = 77; // used to scale rotation period
const ORBIT_SCALE = 25000; // used to scale orbital period

const RADIUS_SCALE = 5e-5; // used to scale body radii
const DISTANCE_SCALE = 5e-7; // used to scale orbital distances

// ---------------------
// SHARED RESOURCES
// ---------------------
const textureLoader = new THREE.TextureLoader();
const STAR_GEOM = new THREE.SphereGeometry(0.5, 24, 24);
const STAR_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
const STAR_COUNT = 300; // number of random stars generated

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

	const ringPath = `assets/maps/${bodyName}Ring.jpg`;
	const ringTexture = textureLoader.load(ringPath);

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
	const orbitGeom = new THREE.TorusGeometry(distance, 0.1);
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

	// create the body's geometry using the body's Radius
	const bodyGeom = new THREE.SphereGeometry(bodyRadius);

	// create a path name for the body texture image file, then use the shared texture loader
	const bodyPath = `assets/maps/${bodyName}.jpg`;
	const bodyTexture = textureLoader.load(bodyPath);

	// use the body texture and body material to make a body mesh
	const bodyMat = new THREE.MeshStandardMaterial({
		map: bodyTexture,
	});

	// create a planet
	const body = new THREE.Mesh(bodyGeom, bodyMat);

	// create a pivot to control the planet's orbit around the Sun, then add the body to the pivot
	const pivot = new THREE.Object3D();
	pivot.add(body);

	// add the pivot and set the body's distance from the Sun
	scene.add(pivot);
	body.position.set(distance, 0, 0);

	// create a representation for the body's orbit based on its distance
	const orbit = createOrbit(distance);
	scene.add(orbit);
	orbit.rotation.x += 0.5 * Math.PI;

	// create ring if it exists
	if (ringRadii) {
		const ring = createRing(bodyName, ringRadii);

		pivot.add(ring);
		ring.position.set(distance, 0, 0);
		ring.rotation.x = -0.5 * Math.PI;

		return { body, ring, pivot, orbit };
	}

	// no ring for this body
	return { body, pivot, orbit };
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

// create bodies from data file
const bodyObjects = new Map(); // id -> { body, pivot, ring?, orbit }

for (const b of BODIES) {
	const scaledRadius = b.radiusKm * RADIUS_SCALE;
	const scaledDist = b.distKm * DISTANCE_SCALE;

	// prepare ring radii if present
	const ringParam = {
		innerRadius: b.ringInnerKm * RADIUS_SCALE,
		outerRadius: b.ringOuterKm * RADIUS_SCALE,
	};

	const created = createBody(b.id, scaledRadius, scaledDist, ringParam);
	bodyObjects.set(b.id, created);

	// apply axial tilt and inclination immediately
	applyTiltAndInclination(created, b.axialTiltDeg, b.inclinationDeg);
}

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

// (tilts applied above during creation from data)

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
 * handle window resize events
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

	// advance rotation and orbit for all created bodies
	for (const [id, obj] of bodyObjects.entries()) {
		// find corresponding data entry
		const data = BODIES.find(x => x.id === id);
		if (!data) continue;

	// rotation and orbital period are both in days
	const dayLength = data.rotationDays;
	const yearLength = data.orbitalDays;

	// skip bodies without an orbital period (e.g., the Sun)
	if (yearLength == null) continue;

	advanceRotationAndOrbit(obj, dayLength, yearLength);
	}

	renderer.render(scene, camera);
}

animate();