import { cardsManager } from "./cards.js";
import { freePhysical, tilePhysical } from "./physical.js";
import { statsManager } from "./stats.js";

const rawEntityManager = (ientityphysics, istatsmanager, icardsmanager) => {
	const entityphysics = ientityphysics;
	const statsmanager = istatsmanager;
	const cardsmanager = icardsmanager;

	let dim = null;
	let id = null;

	const setDim = d => dim = d;
	const getDim = () => dim;
	const setId = i => id = i;
	const getId = () => id;

	return {
		get physics() { return entityphysics }, 
		get stats() { return statsmanager }, 
		get deck() { return cardsmanager },
		setDim, getDim,
		setId, getId,

		type: "entity"
	};
};

const smartEntityManager = (physical, deckSize) => {
	const physics = physical;
	const stats = statsManager();
	const deck = cardsManager(deckSize);

	const manager = rawEntityManager(physics, stats, deck);

	const api = {
		...manager,

		type: "entity:smart"
	};

	return api;
};

const tileEntityManager = (deckSize = 0, initialPos = [0, 0]) => {
	const physics = tilePhysical();
	const manager = smartEntityManager(physics, deckSize);

	physics.setPosition(initialPos);

	return {
		...manager,

		type: "entity:tile"
	}
};

const flyEntityManager = (deckSize = 0, initialPos = [0, 0, 0]) => {
	const physics = freePhysical();
	const manager = smartEntityManager(physics, deckSize);

	physics.setPosition(initialPos);

	return {
		...manager,

		type: "entity:fly"
	};
};

const podEntityManager = (itype, idata, initialPos = [0, 0, 0]) => {
	const type = itype;
	const data = idata;

	const physics = freePhysical();
	const stats = statsManager();
	const deck = cardsManager(0);

	const manager = rawEntityManager(physics, stats, deck);

	physics.setPosition(initialPos);

	const getContent = () => [type, data];
	const getContentObj = () => { type, data };
	const setContent = c => [type, data] = c;
	const getData = () => data;
	const setData = d => data = d;
	const getContentType = () => type;
	const setContentType = t => type = t;

	return {
		...manager,

		getContent, getContentObj, setContent,
		getData, setData,
		getContentType, setContentType,

		type: "entity:payload"
	}
}

export { tileEntityManager, flyEntityManager, podEntityManager };