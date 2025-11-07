import * as THREE from '/node_modules/three';

// consts that can be used throughout
// initial camera coordinates
const initX = 0;
const initY = 0;
const initZ = 10;

// general setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(initX, initY, initZ);

const renderer = new THREE.WebGLRenderer({
	canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.render(scene, camera);

// lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

/**
 * Add a star at a random position in the scene
 */
function addStar() {
	const starGeom = new THREE.SphereGeometry(0.5, 24, 24);
	const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
	const star = new THREE.Mesh(starGeom, starMat);

	const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(633));
	star.position.set(x, y, z);
	scene.add(star);
}

Array(300).fill().forEach(addStar);

/**
 * Create a ring for a celestial body
 * @param {string} bodyName - Body name as a lowercase string
 * @param {Object} ringRadii - The inner and outer ring radii in km
 * @returns {Object} The created ring mesh
 */
function createRing(bodyName, ringRadii) {
	const ringGeom = new THREE.RingGeometry(
		ringRadii.innerRadius,
		ringRadii.outerRadius
	);

	// Make a path name for the ring texture image file, then use that to make a ring texture
	const ringPath = "assets/maps/" + bodyName + "Ring.jpg";
	const ringTexture = new THREE.TextureLoader().load(ringPath);

	// Use the ring geometry and ring material to make a ring mesh
	const ringMat = new THREE.MeshBasicMaterial({
		map: ringTexture,
		side: THREE.DoubleSide
	});
	return new THREE.Mesh(ringGeom, ringMat);
}

/**
 * Create body orbit torus
 * @param {number} distance - Body distance from Sun in AU
 * @returns {Object} The created orbit mesh
 */
function createOrbit(distance) {
	// Create a representation for the body's orbit based on its distance
	const orbitGeom = new THREE.TorusGeometry(distance * 0.7, 0.1);
	const orbitMat = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.25
	});
	return new THREE.Mesh(orbitGeom, orbitMat);
}

/**
 * Create a celestial body
 * @param {string} bodyName - Body name as a lowercase string
 * @param {number} bodyRadius - Body radius in km
 * @param {number} distance - Body distance from Sun in AU
 * @param {Object} ringRadii - The inner and outer ring radii in km
 * @returns {Object} The created celestial body
 */
function createBody(bodyName, bodyRadius, distance, ringRadii) {

	// Create the body's geometry using the body's Radius
	const bodyGeom = new THREE.SphereGeometry(bodyRadius);

	// Create a path name for the body texture image file, then use that to make a body texture
	const bodyPath = "assets/maps/" + bodyName + ".jpg";
	const bodyTexture = new THREE.TextureLoader().load(bodyPath);

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
	body.position.set(distance * 0.7, 0, 0);

	// Create a representation for the body's orbit based on its distance
	const orbit = createOrbit(distance);
	scene.add(orbit);
	orbit.rotation.x += 0.5 * Math.PI;

	// This if statement is run if the ring's inner and outer radii are passed in a list
	if (ringRadii) {

		const ring = createRing(bodyName, ringRadii);

		// Add the ring to the pivot and set its distance from the Sun
		pivot.add(ring);
		ring.position.set(distance * 0.7, 0, 0);
		ring.rotation.x = -0.5 * Math.PI;

		// Return body, ring, pivot so they can be accessed later
		return { body, ring, pivot, orbit }

	}

	// If ring is not rendered, just return a body and pivot
	return { body, pivot, orbit }
}

/**
 * Advance the body's spin and orbital angle for animation (per-frame)
 * @param {Object} body - The celestial body object
 * @param {number} dayLength - Body day length in Earth days
 * @param {number} yearLength - Body year length in Earth days
 */
function advanceRotationAndOrbit(body, dayLength, yearLength) {

	// orbitalPeriod: orbital period in radians/seconds
	// rotationPeriod: rotation period in radians/seconds
	var orbitalPeriod = (Math.PI * 2) / (yearLength * 86400);
	var rotationPeriod = (Math.PI * 2) / (dayLength * 86400);

	// Scale it so it doesn't take a gorillion years for anything to happen lmfao
	const rscale = 77;
	const oscale = 25000;
	orbitalPeriod *= oscale;
	rotationPeriod *= rscale;

	// implement each accordingly
	body.pivot.rotation.y += orbitalPeriod;
	body.body.rotation.y += rotationPeriod;

}

/**
 * Apply axial tilt and orbital inclination to a body
 * @param {Object} body - The celestial body object
 * @param {number} tilt - The axial tilt in degrees
 * @param {number} inclination - The orbital inclination to the ecliptic in degrees
 */
function applyTiltAndInclination(body, tilt, inclination) {
	// convert to radians
	tilt *= Math.PI / 180;
	inclination *= Math.PI / 180;

	// set each accordingly
	body.body.rotation.x += tilt;
	body.pivot.rotation.x += inclination;
	body.orbit.rotation.x += inclination;

	if (body.ring) {
		body.ring.rotation.x += tilt;
	}

}

// Main planets
const mercury = createBody("mercury", 1, 25);
applyTiltAndInclination(mercury, 2.04, 7);

const venus = createBody("venus", 3, 50);
applyTiltAndInclination(venus, 2.64, 3.39);

const earth = createBody("earth", 3, 75);
applyTiltAndInclination(earth, 23.439, 0);

const mars = createBody("mars", 1.5, 100);
applyTiltAndInclination(mars, 25.19, 1.85);

const jupiter = createBody("jupiter", 10, 200);
applyTiltAndInclination(jupiter, 3.13, 1.3);

const saturn = createBody("saturn", 9, 300, { innerRadius: 10, outerRadius: 20 });
applyTiltAndInclination(saturn, 26.73, 2.49);

const uranus = createBody("uranus", 6, 400);
applyTiltAndInclination(uranus, 97.77, 0.77);

const neptune = createBody("neptune", 6, 500);
applyTiltAndInclination(neptune, 28, 1.77);

const pluto = createBody("pluto", 1, 550);
applyTiltAndInclination(pluto, 120, 17.2);

window.addEventListener('resize', onWindowResize);

/**
 * Handle window resize events
 */
function onWindowResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

onWindowResize();

/**
 * Move the camera based on scroll position
 */
function moveCamera() {
	const t = document.body.getBoundingClientRect().top;
	camera.position.x = initX + (t * 0.0004);
	camera.rotation.x = (t * 0.0001);
	camera.position.y = initY + (t * -0.02);
	camera.position.z = initZ + (t * -0.08);
}

document.body.onscroll = moveCamera;

/**
 * Animate the scene
 */
function animate() {
	requestAnimationFrame(animate);
	// setPeriods(planet, dayLength, yearLength)

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

animate()