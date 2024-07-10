// card factory function
const card = (stats = [], procs = [], handlers = []) => {
	let statChanges = stats; // [name, [operation, min], [operation, max], [operation, value]]
	let procedures = procs; // [name, function, parameters]
	let eventHandlers = handlers; // [eventName, function]

	const clone = (keepParams = false) => {
		const clonedStatChanges = JSON.parse(JSON.stringify(statChanges));
		const clonedProcs = JSON.parse(JSON.stringify(procedures));
		const clonedHandlers = JSON.parse(JSON.stringify(eventHandlers));

		if (!keepParams) {
			for (const proc of clonedProcs) {
				for (const param of proc[2]) {
					param[2] = null; // Clear the value
				}
			}
		}

		return card(clonedStatChanges, clonedProcs, clonedHandlers);
	};

	const getStats = () => statChanges;
	const getProcs = () => procedures;
	const getHandlers = () => eventHandlers;

	return {
		clone,
		getStats,
		getProcs,
		getHandlers,

		type: "card"
	};
};

// helper functions for cardsManager
const _add = (hiddenDeck, normalDeck, size, card, hidden) => {
	if (hidden) {
		hiddenDeck.push(card);
		return true;
	} else {
		const index = normalDeck.indexOf(null);
		if (index !== -1) {
			normalDeck[index] = card;
			return true;
		} else if (normalDeck.length < size) {
			normalDeck.push(card);
			return true;
		}
		return false;
	}
};

const _remove = (deck, cardOrIndex) => {
	let card;
	if (typeof cardOrIndex === 'number') {
		card = deck[cardOrIndex];
		deck[cardOrIndex] = null;
	} else {
		const index = deck.indexOf(cardOrIndex);
		if (index !== -1) {
			card = deck[index];
			deck[index] = null;
		}
	}
	return card || false;
};

const _rebuildStats = (decks) => {
	const cache = [];
	const addToCache = (deck) => {
		for (const card of deck) {
			if (card) {
				const stats = card.getStats();
				for (const stat of stats) {
					cache.push(stat);
				}
			}
		}
	};
	decks.forEach(deck => addToCache(deck));
	return cache;
};

const _rebuildProcs = (decks) => {
	const cache = {};
	// const procNames = new Set();
	const addToCache = (deck) => {
		for (const card of deck) {
			if (card) {
				const procs = card.getProcs();
				for (const proc of procs) {
					cache[proc[0]] = proc;
					// if (!procNames.has(proc[0])) {
					// 	cache.push(proc);
					// 	procNames.add(proc[0]);
					// }
				}
			}
		}
	};
	decks.forEach(deck => addToCache(deck));
	return cache;
};

const _rebuildHandlers = (decks) => {
	const cache = [];
	const addToCache = (deck) => {
		for (const card of deck) {
			if (card) {
				const handlers = card.getHandlers();
				for (const handler of handlers) {
					cache.push(handler);
				}
			}
		}
	};
	decks.forEach(deck => addToCache(deck));
	return cache;
};

const _groupNamedArrays = (arr) => {
	const result = [];
	const map = new Map();

	arr.forEach(subArray => {
		const key = subArray[0];
		if (!map.has(key)) {
			map.set(key, []);
		}
		map.get(key).push(subArray);
	});

	map.forEach((value, key) => {
		result.push([key, value]);
	});

	return result;
};

const _applyStat = (name, compiled, statsManager) => {
	console.log(name, compiled);
	const apply = (s, mods) => mods.reduce((n, f) => n = f(n), s);

	let entry = statsManager.getEntry(name);
	if (entry === null) entry = [name, null, null, null];

	const nums = entry.slice(1);

	for (const [i, mods] of compiled.entries()) {
		nums[i] = apply(nums[i], mods);
	}

	statsManager.add([name, ...nums]);
}

const _applyStats = (stats, statsManager) => {
	const statgroups = _groupNamedArrays(stats);
	for (const statstack of statgroups) {
		const name = statstack[0];
		const base = [-1, -1, -1];
		const compiled = [[], [], []];
		for (const [i, stat] of statstack[1].entries()) {
			for (const [j, v] of stat.slice(1).entries()) {
				if (v === null) {
					compiled[i].push(n => n);
					break;
				}

				const [op, amount] = v;
				switch (op) {
					case "ifset":
						compiled[j].push(n => n === null ? (n = amount) : null)
						base[j] = i;
						break;
					case "set":
						compiled[j].push(n => n = amount)
						base[j] = i;
						break;
					case "add":
						if (base[j] === -1) break;
						compiled[j].push(n => n === null ? n : (n + amount))
						break;
					case "mult":
						if (base[j] === -1) break;
						compiled[j].push(n => n === null ? n : Math.floor(n * amount))
						break;
				}
			}
		}

		_applyStat(name, compiled, statsManager);
	}
};

const _proc = (procs, name) => {
	const procedure = procs.find(proc => proc[0] === name);
	if (procedure) {
		const [procName, procFunction, parameters] = procedure;
		const iapi = {
			getParam: (paramName) => {
				const param = parameters.find(param => param[0] === paramName);
				return param ? param[2] : undefined;
			},
			setParam: (paramName, value) => {
				const param = parameters.find(param => param[0] === paramName);
				if (param) param[2] = value;
			},
			getParams: () => parameters,
			getSelf: () => procedure
		};

		return {
			run: (...extraArgs) => procFunction(iapi, extraArgs),
			get: iapi.getParam, set: iapi.setParam
		};
	}
	return null;
};

// cards manager factory function
const cardsManager = (initialSize = 10) => {
	let size = initialSize || 1;
	let normalDeck = new Array(initialSize).fill(null);
	let hiddenDeck = [];
	let ejectedDeck = [];
	let statCache = [];
	let procCache = {};
	let handlerCache = [];

	const add = (card, hidden = false) => {
		const result = _add(hiddenDeck, normalDeck, size, card, hidden);
		if (result === true) rebuild();
		return result;
	};

	const remove = (cardOrIndex, hidden = false) => {
		const result = _remove(hidden ? hiddenDeck : normalDeck, cardOrIndex);
		if (result !== false) rebuild();
		return result;
	};

	const getSize = () => normalDeck.length;
	const setSize = (newSize) => {
		if (newSize === size) return size;
		if (newSize < normalDeck.length) {
			const overflow = normalDeck.slice(newSize).filter(card => card !== null);
			ejectedDeck.push(...overflow);
			normalDeck = normalDeck.slice(0, newSize);
			rebuild();
		}
		size = newSize;
		return size;
	};

	const addEjected = (card) => ejectedDeck.push(card);
	const getEjected = () => ejectedDeck;
	const clearEjected = () => {
		const ejected = [...ejectedDeck];
		ejectedDeck = [];
		return ejected;
	};

	const getHidden = () => hiddenDeck;
	const getDeck = () => normalDeck;

	const rebuildStats = () => { statCache = _rebuildStats([hiddenDeck, normalDeck]) };

	const rebuildProcs = () => { procCache = _rebuildProcs([hiddenDeck, normalDeck]) };

	const rebuildHandlers = () => { handlerCache = _rebuildHandlers([hiddenDeck, normalDeck]) };

	const rebuild = () => {
		rebuildStats();
		rebuildProcs();
		rebuildHandlers();
	};

	const applyStats = (statsManager) => _applyStats(statCache, statsManager);

	const handle = (name, event) => {
		const output = [];
		for (const [eventName, handler] of handlerCache) {
			if (eventName === name) {
				output.push(handler(event));
			}
		}
		return output;
	};

	const proc = (name) => _proc(procCache, name);

	const raw = () => ({
		normalDeck,
		hiddenDeck,
		ejectedDeck,
		statCache,
		procCache,
		handlerCache,
	});

	return {
		add,
		remove,
		getSize,
		setSize,
		addEjected,
		getEjected,
		clearEjected,
		getHidden,
		getDeck,
		rebuildStats,
		rebuildProcs,
		rebuildHandlers,
		rebuild,
		applyStats,
		handle,
		proc,
		raw,

		type: "deck"
	};
};

export { card, cardsManager };