// helper functions
const _rectifyRotation = (rotation) => {
	return ((rotation % 400) + 400) % 400;
};

const _snapRotation = (rotation) => {
	const rectified = _rectifyRotation(rotation);
	const nearest = Math.round(rectified * 0.01) * 100;
	return nearest % 400;
};

const _validateVector = (vector) => {
	const sdims = vector.length;
	if (Array.isArray(vector)) {
		const numvec = vector.map(Number);
		if (!numvec.some(n => isNaN(n))) {
			return numvec;
		}
	}
	return Array(sdims).fill(0);
};

const _resist = (force, amount) => {
	const resistance = force * -amount;
	if (
		Math.sign(force + resistance) != Math.sign(force)
		|| Math.abs(force) < 0.01
	) return force * -1;
	return resistance;
}

// base physics
const physical = (init = () => { }) => {
	let
		position = [], velocity = [], acceleration = [],
		hitboxes = [], forces = [],
		mass = 1, invmass = 1 / mass, friction = 1, rotation = 0;

	const setMass = num => {
		mass = Math.max(0, Number(num) || 0);
		invmass = 1 / mass;
		return mass;
	}
	const getMass = () => mass;

	const getRotation = () => rotation;
	const setRotation = num => rotation = _rectifyRotation(Number(num) || 0);

	const setPosition = vec => position = _validateVector(vec);
	const getPosition = () => position;

	const setVelocity = vec => velocity = _validateVector(vec);
	const getVelocity = () => velocity;
	const applyVelocity = () => position = position.map((p, i) => p + (velocity[i] || 0));

	const setAcceleration = vec => acceleration = _validateVector(vec);
	const getAcceleration = () => acceleration;
	const applyAcceleration = () => {
		velocity = velocity.map((v, i) => v + (acceleration[i] || 0));
		acceleration.fill(0);
		return velocity;
	};

	const setFriction = (num, mult = false) => friction = Math.max(0, mult ? 1 - num : Number(num) || 0);
	const getFriction = () => friction;
	const applyFriction = () => velocity = velocity.map(v => v + _resist(v, friction))

	const addForce = (vec, duration = 0) => forces.push([_validateVector(vec), Number(duration) || 0]);
	const getForces = () => forces;
	const applyForces = () => forces.forEach(force => {
		acceleration = acceleration.map((a, i) => i > force[0].length ? a : a + force[0][i] * invmass);
		force[1]--;
		if (force[1] <= 0) forces.splice(forces.indexOf(force), 1);
	});

	const resizePhysicalDimensions = n => {
		position = Array(n).fill(0);
		velocity = Array(n).fill(0);
		acceleration = Array(n).fill(0);
	}

	const raw = () => [position, velocity, acceleration, hitboxes, forces];

	const api = {
		setMass, getMass,
		getRotation, setRotation,
		setPosition, getPosition,
		setVelocity, getVelocity, applyVelocity,
		setAcceleration, getAcceleration, applyAcceleration,
		setFriction, getFriction, applyFriction,
		addForce, getForces, applyForces,
		resizePhysicalDimensions,
		raw
	};

	init(api);

	return api;
}

// physical properties for tile entities, or blocks
const tilePhysical = (init = () => { }) => {
	const phys = physical(p => {
		p.resizePhysicalDimensions(2);
		p.setFriction(1);
	});

	let size = 1;

	const setPosition = ([x, y]) => phys.setPosition([x, y]);
	const setPositionObject = ({ x, y }) => phys.setPosition([x, y]);
	const getPositionObject = () => {
		const pos = phys.getPosition();
		return { x: pos[0], y: pos[1] };
	};

	const setVelocity = ([vx, vy]) => phys.setVelocity([vx, vy]);
	const setVelocityObject = ({ vx, vy }) => phys.setVelocity([vx, vy]);
	const getVelocityObject = () => {
		const vel = phys.getVelocity();
		return { x: vel[0], y: vel[1] };
	};

	const setSize = newSize => size = newSize;
	const getSize = () => size;

	const setRotation = newRotation => phys.setRotation(_snapRotation(newRotation));

	const tick = () => {
		phys.applyForces();
		phys.applyAcceleration();
		phys.applyVelocity();
		phys.applyFriction();
	};

	const raw = () => phys.raw().concat(size);

	const api = {
		...phys,

		setPosition,
		setPositionObject, getPositionObject,
		setVelocity,
		setVelocityObject, getVelocityObject,
		setSize, getSize,
		setRotation,
		tick,
		raw,

		type: "physical:tile"
	};

	init(api);

	return api;
};

// physical properties for free entities, or pods
const freePhysical = (init = () => { }) => {
	const phys = physical(p => {
		p.resizePhysicalDimensions(3);
		p.setFriction(0.01);
	});

	let size = 10, gravity = 0.1;

	const setPosition = ([x, y, z]) => (phys.setPosition([x, y, z]));
	const setPositionObject = ({ x, y, z }) => phys.setPosition([x, y, z]);
	const getPositionObject = () => {
		const pos = phys.getPosition();
		return { x: pos[0], y: pos[1], x: pos[2] };
	};

	const setVelocity = ([vx, vy, vz]) => phys.setVelocity([vx, vy, vz]);
	const setVelocityObject = ({ vx, vy, vz }) => phys.setVelocity([vx, vy, vz]);
	const getVelocityObject = () => {
		const vel = phys.getVelocity();
		return { x: vel[0], y: vel[1] }; ocity
	};

	const getSize = () => size;
	const setSize = newSize => size = newSize;

	const getGravity = () => gravity;
	const setGravity = newGravity => gravity = newGravity;
	const applyGravity = () => phys.addForce([0, 0, -gravity || 0], 1);

	const tick = () => {
		applyGravity();
		phys.applyForces();
		phys.applyAcceleration();
		phys.applyVelocity();
		phys.applyFriction();
	};

	const raw = () => phys.raw().concat(gravity, size);

	const api = {
		...phys,

		setPosition, setPositionObject, getPositionObject,
		setVelocity, setVelocityObject, getVelocityObject,
		getSize, setSize,
		getGravity, setGravity, applyGravity,
		tick,
		raw,

		type: "physical:free"
	};

	init(api);

	return api;
};

export { tilePhysical, freePhysical };