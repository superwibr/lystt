const eventManager = (routerfn) => {
	const router = routerfn;

	const emit = (type, data) => {
		let res;
		const promise = new Promise(r => res = r);

		router(type, {
			data,
			fail: () => res({ ok: false }),
			end: result => res({ ok: true, data: result })
		});

		return promise;
	}

	return {
		emit,

		type: "events"
	};
};

class EventEmitter {
	constructor() {
		this.events = {};
	}
	on(event, listener) {
		if (!(event in this.events)) this.events[event] = [];
		this.events[event].push(listener);
		return () => this.removeListener(event, listener);
	}
	removeListener(event, listener) {
		if (!(event in this.events)) return;
		const idx = this.events[event].indexOf(listener);
		if (idx > -1) this.events[event].splice(idx, 1);
		if (this.events[event].length === 0) delete this.events[event];
	}
	emit(event, ...args) {
		if (!(event in this.events)) return;
		this.events[event].forEach(listener => listener(...args));
	}
	once(event, listener) {
		const remove = this.on(event, (...args) => {
			remove();
			listener(...args);
		});
	}
};

export { eventManager, EventEmitter };