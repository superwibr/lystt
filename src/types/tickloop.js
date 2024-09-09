const tickLoopManager = (init = () => { }) => {
	let
		targetTPS = 20,
		updateTimestep = 1000 / targetTPS,
		maxCPS = 100,
		minClockInterval = 1000 / maxCPS,
		performanceUpdateInterval = 0,
		performanceAlpha = 0.9;

	const setTPS = tps => {
		targetTPS = tps;
		updateTimestep = 1000 / targetTPS;
		return targetTPS;
	};

	const setMaxCPS = cps => {
		maxCPS = cps;
		minClockInterval = 1000 / maxCPS;
		return maxCPS;
	};

	const setPerformanceUpdateInterval = pui => performanceUpdateInterval = pui;
	const setPerformanceAlpha = a => performanceAlpha = a;

	let
		always = async () => { },
		begin = async () => { },
		update = async () => { },
		end = async () => { };

	const setAlways = cb => always = cb;
	const setBegin = cb => begin = cb;
	const setUpdate = cb => update = cb;
	const setEnd = cb => end = cb;

	let
		clockDelta = 0,
		lastClockTime = 0,
		lastPerformanceUpdate = 0,
		clocksSincePerformanceUpdate = 0,
		updateSteps = 0, // kept here to prevent it being garbage-collected every time
		frameHandle = 0,
		tickStart = 0,
		tickEnd = 0,
		updateCount = 0,
		started = false,
		running = false,
		panic = false,
		paused = false;

	const perf = {
		cps: maxCPS,
		tps: targetTPS,
		mspt: 0,
		cpt: 0,
		deviation: 0,
		effort: 0,
		clockInterval: minClockInterval
	};

	const getPerformance = () => perf;

	const weightPerf = (old, new_) => performanceAlpha * new_ + (1 - performanceAlpha) * old;

	const clock = async timestamp => {
		frameHandle = requestClock(clock);

		await always();

		// throttle clock rate
		if (timestamp < lastClockTime + minClockInterval) return;

		// pause logic
		if (paused) {
			lastClockTime = timestamp;
			return;
		}

		tickStart = performance.now();

		clockDelta += timestamp - lastClockTime;
		lastClockTime = timestamp;

		// constant start processing
		await begin(timestamp, clockDelta);

		// update
		updateSteps = 0;
		while (clockDelta >= updateTimestep) {
			await update(updateTimestep);
			clockDelta -= updateTimestep;

			if (++updateSteps >= 240) {
				panic = true;
				break;
			}
		}
		updateCount += updateSteps;

		tickEnd = performance.now();

		// performance report
		clocksSincePerformanceUpdate++;
		if (timestamp > lastPerformanceUpdate + performanceUpdateInterval) {
			const elapsed = timestamp - lastPerformanceUpdate;

			perf.tps = weightPerf(perf.tps, updateCount / (elapsed + 1) * 1000)
			perf.mspt = weightPerf(perf.mspt, tickEnd - tickStart)
			perf.deviation = weightPerf(perf.deviation, 100 - (perf.tps / targetTPS) * 100)
			perf.effort = weightPerf(perf.effort, perf.mspt / updateTimestep * 100)

			//console.log("report", perf)

			updateCount = 0;

			lastPerformanceUpdate = timestamp;
			clocksSincePerformanceUpdate = 0;
		}

		// cleanups, etc
		await end(perf, panic);

		panic = false;
	};

	const requestClock = (() => {
		let
			lastTimestamp = performance.now(),
			now,
			timeout;

		return cb => {
			now = performance.now();
			// The next clock should run no sooner than the simulation allows,
			// but as soon as possible if the current clock has already taken
			// more time to run than is simulated in one timestep.
			timeout = Math.max(0, updateTimestep - (now - lastTimestamp));
			lastTimestamp = now + timeout;
			return setTimeout(function () {
				cb(now + timeout);
			}, timeout);
		};
	})();

	const resetClockDelta = () => { // can be used to avoid death spiral
		const old = clockDelta;
		clockDelta = 0;
		return old;
	};

	const start = () => {
		if (!started) {
			started = true;

			frameHandle = requestClock(function (timestamp) {
				// render initial state
				// draw(1);

				running = true;

				// don't simulate all time since init
				lastClockTime = timestamp;
				lastPerformanceUpdate = timestamp;
				tickEnd = tickStart = performance.now();
				clocksSincePerformanceUpdate = 0;

				// Start the main loop.
				frameHandle = requestClock(clock);
			});
		}
		return this;
	};
	const stop = () => {
		running = false;
		started = false;
		cancelFrame(frameHandle);
		return this;
	};
	const pause = (state) => {
		if (!state) paused ^= 1;
		if (state) paused = state;
		return !!paused;
	}
	const isPaused = () => paused;

	const api = {
		setTPS, setMaxCPS, setPerformanceUpdateInterval, setPerformanceAlpha,
		setAlways, setBegin, setUpdate, setEnd,
		getPerformance, resetClockDelta, start, stop, pause, isPaused
	};

	init(api);

	return api;
};

export { tickLoopManager };