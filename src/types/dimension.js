import { eventManager } from "./events.js";
import { mapManager } from "./map.js";
import { tickLoopManager } from "./tickloop.js";

const dimManager = (initialEntities = []) => {
	const map = mapManager(initialEntities);
	const ticker = tickLoopManager();
	const unresolved = [];
	const events = eventManager((type, data) => unresolved.push([type, data]));

	const _queue = [];
	const queue = fn => _queue.push(fn);

	let time = 0;
	const tick = () => {
		const queuedfns = _queue.length
		for (let i = 0; i < queuedfns; i++) {
			const fn = _queue.pop();
			fn(api);
		}

		map.all().forEach(entity => {
			if (!entity.physics) return;
			entity.physics.tick();
		});
		time++;
	};

	ticker.setUpdate(tick);

	const api = {
		...map,
		events,
		ticker,
		queue
	};

	return api;
};

export { dimManager };