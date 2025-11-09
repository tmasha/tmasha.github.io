import * as THREE from '/node_modules/three';
import { BODIES } from './data/bodies.js';
import { EffectComposer } from '/node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ---------------------
// CONSTANTS TO USE THROUGHOUT
// ---------------------
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

const INIT_X = 0;
const INIT_Y = 0;
const INIT_Z = 10;

// camera end positions for scroll
const END_X = 0;
const END_Y = 300;
const END_Z = 1500;
const END_ROTATION_X = -0.35;

// scale factors
const ROTATION_SCALE = 77; // used to scale rotation period
const ORBIT_SCALE = 25000; // used to scale orbital period

const RADIUS_SCALE = 2e-4; // used to scale body radii
const DISTANCE_SCALE = 4e-7; // used to scale orbital distances

// pulsing sun parameters
const FLARE_BASE_SCALE = 18;
const FLARE_BASE_OPACITY = 0.45;
const FLARE_PULSE_FREQ = 0.25;
const FLARE_PULSE_AMPL = 0.35;
const SUN_BASE_INTENSITY = 1.6;
const SUN_PULSE_AMPL = 0.25;

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

// ensure the camera far plane covers the outermost bodies
const maxScaledDist = Math.max(...BODIES.map(b => b.distKm * DISTANCE_SCALE));
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, Math.max(1000, maxScaledDist * 2));
camera.position.set(INIT_X, INIT_Y, INIT_Z);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// enable soft shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.render(scene, camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

// cast sunlight to all bodies equally in this model
const sunLight = new THREE.PointLight(0xffffff, SUN_BASE_INTENSITY, 0, 0);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.radius = 4;
sunLight.shadow.bias = -0.0005;

sunLight.decay = 0;
sunLight.distance = 0;
scene.add(sunLight);

const flareSize = FLARE_BASE_SCALE;
const flareCanvas = document.createElement('canvas');
flareCanvas.width = flareCanvas.height = 256;
const fctx = flareCanvas.getContext('2d');
const g = fctx.createRadialGradient(128, 128, 10, 128, 128, 128);
g.addColorStop(0, 'rgba(255, 255, 255, 0)');
g.addColorStop(0.35, 'rgba(255, 220, 180, 0.35)');
g.addColorStop(0.65, 'rgba(255, 150, 80, 0.12)');
g.addColorStop(1, 'rgba(0, 0, 0, 0)');
fctx.fillStyle = g;
fctx.fillRect(0, 0, 256, 256);
const flareTex = new THREE.CanvasTexture(flareCanvas);
const flareMat = new THREE.SpriteMaterial({ map: flareTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, opacity: FLARE_BASE_OPACITY });
const flareSprite = new THREE.Sprite(flareMat);
flareSprite.scale.set(flareSize, flareSize, 1);
flareSprite.position.set(0, 0, 0);
flareSprite.renderOrder = 0;
flareSprite.material.depthTest = false;
scene.add(flareSprite);

// bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
bloomPass.threshold = 0.0;
bloomPass.strength = 0.25;
bloomPass.radius = 0.4;
composer.addPass(bloomPass);

// ---------------------
// helper functions
// ---------------------
function randSpread() {
	return THREE.MathUtils.randFloatSpread(2000);
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
		opacity: 0.15
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

	const bodyGeom = new THREE.SphereGeometry(bodyRadius);
	const bodyPath = `assets/maps/${bodyName}.jpg`;
	const bodyTexture = textureLoader.load(bodyPath);
	const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture });
	const body = new THREE.Mesh(bodyGeom, bodyMat);

	// planets cast and receive shadows, sun does not
	if (bodyName === 'sun') {
		// show the sun texture directly and ensure it renders above the flare
		body.material = new THREE.MeshBasicMaterial({ map: bodyTexture });
		body.renderOrder = 1;
		body.castShadow = false;
		body.receiveShadow = false;
	} else {
		body.castShadow = true;
		body.receiveShadow = true;
	}
	const pivot = new THREE.Object3D();
	pivot.add(body);
	scene.add(pivot);
	body.position.set(distance, 0, 0);
	const orbit = createOrbit(distance);
	scene.add(orbit);
	orbit.rotation.x += 0.5 * Math.PI;

	if (ringRadii) {
		const ring = createRing(bodyName, ringRadii);

		pivot.add(ring);
		ring.position.set(distance, 0, 0);
		ring.rotation.x = -0.5 * Math.PI;
		ring.castShadow = false;
		ring.receiveShadow = true;

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
	let scaledRadius = b.radiusKm * RADIUS_SCALE;
	if (b.id === 'sun') scaledRadius *= 0.02; // temporarily shrinking the sun more
	const scaledDist = b.distKm * DISTANCE_SCALE;

	const ringParam = {
		innerRadius: b.ringInnerKm * RADIUS_SCALE,
		outerRadius: b.ringOuterKm * RADIUS_SCALE,
	};

	const created = createBody(b.id, scaledRadius, scaledDist, ringParam);
	bodyObjects.set(b.id, created);

	// apply axial tilt and inclination immediately
	applyTiltAndInclination(created, b.axialTiltDeg, b.inclinationDeg);

	// randomize initial planet rotational and orbital positions
	const randomPhase = Math.random() * TWO_PI;
	created.pivot.rotation.y = randomPhase;
	created.body.rotation.y += Math.random() * TWO_PI;
}

/**
 * apply axial tilt and orbital inclination to a body
 * @param {Object} body - the celestial body object
 * @param {number} tilt - the axial tilt in degrees
 * @param {number} inclination - the orbital inclination to the ecliptic in degrees
 */
function applyTiltAndInclination(body, tilt, inclination) {
	tilt *= DEG_TO_RAD;
	inclination *= DEG_TO_RAD;
	body.body.rotation.x += tilt;
	body.pivot.rotation.x += inclination;
	body.orbit.rotation.x += inclination;
	if (body.ring) {
		body.ring.rotation.x += tilt;
	}
}

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

	// rotationPeriod converts dayLength to rad/sec
	var rotationPeriod = TWO_PI / (dayLength * 86400);
	rotationPeriod *= ROTATION_SCALE;

	body.body.rotation.y += rotationPeriod;

	// need this if statement because the Sun has no orbital motion in this model
	if (yearLength != null) {
		var orbitalPeriod = TWO_PI / (yearLength * 86400);
		orbitalPeriod *= ORBIT_SCALE;
		body.pivot.rotation.y += orbitalPeriod;
	}

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
	if (typeof composer !== 'undefined') {
		composer.setSize(window.innerWidth, window.innerHeight);
	}
}

window.addEventListener('resize', onWindowResize);

/**
 * move the camera based on scroll position
 */
function moveCamera() {
	const t = document.body.getBoundingClientRect().top;
	// map scroll (t is negative when scrolling down) to a 0..1 progress over ~2000px
	const progress = Math.min(1, Math.max(0, -t / 2000));

	// linear interpolation
	const interpolate = (a, b, p) => a + (b - a) * p;

	camera.position.x = interpolate(INIT_X, END_X, progress);
	camera.position.y = interpolate(INIT_Y, END_Y, progress);
	camera.position.z = interpolate(INIT_Z, END_Z, progress);
	camera.rotation.x = interpolate(0, END_ROTATION_X, progress);
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

		// rotation and orbital period are both in days
		const dayLength = data.rotationDays;
		const yearLength = data.orbitalDays;

		// advance rotation for all bodies; orbital advance only when yearLength != null
		advanceRotationAndOrbit(obj, dayLength, yearLength);
	}

	// sun pulse
	const t = performance.now() / 1000;
	const p = 0.5 * (1 + Math.sin(2 * Math.PI * FLARE_PULSE_FREQ * t));

	flareSprite.material.opacity = FLARE_BASE_OPACITY + (p - 0.5) * FLARE_PULSE_AMPL;
	const s = FLARE_BASE_SCALE * (1 + (p - 0.5) * FLARE_PULSE_AMPL);
	flareSprite.scale.set(s, s, 1);

	sunLight.intensity = SUN_BASE_INTENSITY + (p - 0.5) * SUN_PULSE_AMPL;

	composer.render();
}

animate();