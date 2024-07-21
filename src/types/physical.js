// helper functions
const _rectifyRotation = (rotation) => {
	return ((rotation % 400) + 400) % 400;
};

const _snapRotation = (rotation) => {
	const rectified = _rectifyRotation(rotation);
	const nearest = Math.round(rectified / 100) * 100;
	return nearest % 400;
};

const _validateVector = (vector) => {
	if (Array.isArray(vector) && vector.length === 2) {
		const [x, y] = vector.map(Number);
		if (!isNaN(x) && !isNaN(y)) {
			return [x, y];
		}
	}
	return [0, 0];
};

const _validateVector3D = (vector) => {
	if (Array.isArray(vector) && vector.length === 3) {
		const [x, y, z] = vector.map(Number);
		if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
			return [x, y, z];
		}
	}
	return [0, 0, 0];
};

// physical properties for tile entities, or blocks
const tilePhysical = (initialData = [[0, 0], [0, 0], 1, 0]) => {
	let [position, velocity, size, rotation] = initialData;
	position = _validateVector(position);
	velocity = _validateVector(velocity);
	rotation = _snapRotation(rotation);

	const setPos = ([x, y]) => { position = _validateVector([x, y]); };
	const getPos = () => position;
	const setPosObject = ({ x, y }) => { position = _validateVector([x, y]); };
	const getPosObject = () => ({ x: position[0], y: position[1] });

	const setVel = ([vx, vy]) => { velocity = _validateVector([vx, vy]); };
	const getVel = () => velocity;
	const setVelObject = ({ vx, vy }) => { velocity = _validateVector([vx, vy]); };
	const getVelObject = () => ({ vx: velocity[0], vy: velocity[1] });

	const getSize = () => size;
	const setSize = (newSize) => { size = newSize; };

	const getRotation = () => rotation;
	const setRotation = (newRotation) => { rotation = _snapRotation(newRotation); };

	const raw = () => [position, velocity, size, rotation];

	const applyVelocity = () => {
		position[0] += velocity[0];
		position[1] += velocity[1];
	};

	const applyFriction = () => {
		velocity = [0, 0];
	};

	const tick = () => {
		applyVelocity();
		applyFriction();
	};

	return {
		setPos,
		getPos,
		setPosObject,
		getPosObject,
		setVel,
		getVel,
		setVelObject,
		getVelObject,
		getSize,
		setSize,
		getRotation,
		setRotation,
		raw,
		applyVelocity,
		applyFriction,
		tick,

		type: "physical:tile"
	};
};

// physical properties for free entities, or pods
const freePhysical = (initialData = [[0, 0, 0], [0, 0, 0], 1, 0.99, 0.1, 100, 0]) => {
	let [position, velocity, size, friction, gravity, life, rotation] = initialData;
	position = _validateVector3D(position);
	velocity = _validateVector3D(velocity);
	rotation = _rectifyRotation(rotation);

	const setPos = ([x, y, z]) => { position = _validateVector3D([x, y, z]); };
	const getPos = () => position;
	const setPosObject = ({ x, y, z }) => { position = _validateVector3D([x, y, z]); };
	const getPosObject = () => ({ x: position[0], y: position[1], z: position[2] });

	const setVel = ([vx, vy, vz]) => { velocity = _validateVector3D([vx, vy, vz]); };
	const getVel = () => velocity;
	const setVelObject = ({ vx, vy, vz }) => { velocity = _validateVector3D([vx, vy, vz]); };
	const getVelObject = () => ({ vx: velocity[0], vy: velocity[1], vz: velocity[2] });

	const getSize = () => size;
	const setSize = (newSize) => { size = newSize; };

	const getFriction = () => friction;
	const setFriction = (newFriction) => { friction = newFriction; };

	const getGrav = () => gravity;
	const setGrav = (newGravity) => { gravity = newGravity; };

	const getLife = () => life;
	const setLife = (newLife) => { life = newLife; };

	const getRotation = () => rotation;
	const setRotation = (newRotation) => { rotation = _rectifyRotation(newRotation); };

	const raw = () => [position, velocity, size, friction, gravity, life, rotation];

	const applyVelocity = () => {
		position[0] += velocity[0];
		position[1] += velocity[1];
		position[2] += velocity[2];
	};

	const applyGravity = () => {
		velocity[1] -= gravity; // Assuming gravity affects the y-axis
	};

	const applyFriction = () => {
		velocity = velocity.map(v => v * friction);
	};

	const tick = () => {
		if (life <= 0) return;
		life -= 1;
		applyGravity();
		applyVelocity();
		applyFriction();
	};

	return {
		setPos,
		getPos,
		setPosObject,
		getPosObject,
		setVel,
		getVel,
		setVelObject,
		getVelObject,
		getSize,
		setSize,
		getFriction,
		setFriction,
		getGrav,
		setGrav,
		getLife,
		setLife,
		getRotation,
		setRotation,
		raw,
		applyVelocity,
		applyGravity,
		applyFriction,
		tick,

		type: "physical:free"
	};
};

export { tilePhysical, freePhysical };