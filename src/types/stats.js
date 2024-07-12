const defaultStats = [
	// name, min, max, value
	['health', 0, 100, 0],
	['ap', 0, 100, 0],
	// more stats...
];

// Helper functions for clamping and initialization
const _clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const _rebuild = (statsArray) => {
	const statsIndex = {};
	for (let i = 0; i < statsArray.length; i++) {
		const [name] = statsArray[i];
		statsIndex[name] = i;
	}
	return statsIndex;
};

const _initialize = (stats) => {
	const statsArray = stats;
	const statsIndex = _rebuild(statsArray);
	return [statsArray, statsIndex];
};

const _get = (statsArray, statsIndex, name) => {
	const index = statsIndex[name];
	return index !== undefined ? statsArray[index][3] : null;
};

const _getEntry = (statsArray, statsIndex, name) => {
	const index = statsIndex[name];
	return index !== undefined ? statsArray[index] : null;
};

const _getObject = (statsArray, statsIndex, name) => {
	const entry = _getEntry(statsArray, statsIndex, name);
	return entry ? { value: entry[3], min: entry[1], max: entry[2] } : null;
};

const _set = (statsArray, statsIndex, name, newValue) => {
	const index = statsIndex[name];
	if (index !== undefined && typeof newValue === 'number') {
		const [_, min, max] = statsArray[index];
		statsArray[index][3] = _clampValue(newValue, min, max);
		return statsArray[index][3];
	}
	return null;
};

const _add = (statsArray, statsIndex, entries) => {
	const entryArray = Array.isArray(entries[0]) ? entries : [entries];
	for (const entry of entryArray) {
		const [name] = entry;
		if (statsIndex[name] === undefined) {
			statsArray.push(entry);
		}
	}
	return _rebuild(statsArray);
};


const _addObject = (statsArray, statsIndex, name, object) => {
	if (typeof object.value === 'number' && typeof object.min === 'number' && typeof object.max === 'number') {
		return _add(statsArray, statsIndex, [name, object.min, object.max, object.value]);
	}
	return statsIndex;
};

const _remove = (statsArray, statsIndex, names) => {
	const nameArray = Array.isArray(names) ? names : [names];
	for (const name of nameArray) {
		const index = statsIndex[name];
		if (index !== undefined) {
			statsArray.splice(index, 1);
			statsIndex = _rebuild(statsArray);
		}
	}
	return _rebuild(statsArray);
};


// Stats manager factory function
const statsManager = (initialStats) => {
	let statsArray;
	let statsIndex;

	const initialize = (stats) => {
		[statsArray, statsIndex] = _initialize(stats);
	};

	// Initialize with provided stats or default stats
	initialize(initialStats || defaultStats);

	// Public API
	const get = (name) => _get(statsArray, statsIndex, name);
	const getEntry = (name) => _getEntry(statsArray, statsIndex, name);
	const getObject = (name) => _getObject(statsArray, statsIndex, name);
	const set = (name, newValue) => _set(statsArray, statsIndex, name, newValue);

	const rebuild = () => { statsIndex = _rebuild(statsArray); };

	const add = (entries) => { statsIndex = _add(statsArray, statsIndex, entries); };
	const addObject = (name, object) => { statsIndex = _addObject(statsArray, statsIndex, name, object); };
	const remove = (names) => { statsIndex = _remove(statsArray, statsIndex, names); };

	const raw = () => [statsArray, statsIndex];

	return {
		get,
		getEntry,
		getObject,
		set,
		rebuild,
		add,
		addObject,
		remove,
		raw,

		type: "stats"
	};
};

export { statsManager };