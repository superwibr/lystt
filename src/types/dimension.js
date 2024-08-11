import { eventManager } from "./events.js";
import { mapManager } from "./map.js";

const dimManager = (initialEntities = []) => {
	const map = mapManager(initialEntities);
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

	const api = {
		...map,
		events,
		tick,
		queue
	};

	return api;
};

export { dimManager };