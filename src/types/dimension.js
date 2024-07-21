import { eventManager } from "./events.js";

const tileSize = 100;

const chunkManager = (initialEntities = [], size = 5, offset = [0, 0]) => {
	const chunkSize = size; // chunk size in tiles
	const chunkOffset = offset; // coordinate offset for handling positions
	const tiles = new Map(); // map of tile coordinates to entities

	const add = entity => {
		const [x, y] = entity.physics.getPos();
		const tileCoord = [Math.floor((x - chunkOffset[0]) / tileSize), Math.floor((y - chunkOffset[1]) / tileSize)];
		if (!tiles.has(tileCoord.toString())) {
			tiles.set(tileCoord.toString(), []);
		}
		tiles.get(tileCoord.toString()).push(entity);
	};

	const remove = entity => {
		const [x, y] = entity.physics.getPos();
		const tileCoord = [Math.floor((x - chunkOffset[0]) / tileSize), Math.floor((y - chunkOffset[1]) / tileSize)];
		if (tiles.has(tileCoord.toString())) {
			const entities = tiles.get(tileCoord.toString());
			const index = entities.indexOf(entity);
			if (index > -1) {
				entities.splice(index, 1);
				if (entities.length === 0) {
					tiles.delete(tileCoord.toString());
				}
			}
		}
	};

	const at = ([x, y]) => {
		const tileCoord = [Math.floor((x - chunkOffset[0]) / tileSize), Math.floor((y - chunkOffset[1]) / tileSize)];
		return tiles.get(tileCoord.toString()) || [];
	};

	const within = ([x1, y1], [x2, y2]) => {
		const entities = [];
		for (let x = Math.floor((x1 - chunkOffset[0]) / tileSize); x <= Math.floor((x2 - chunkOffset[0]) / tileSize); x++) {
			for (let y = Math.floor((y1 - chunkOffset[1]) / tileSize); y <= Math.floor((y2 - chunkOffset[1]) / tileSize); y++) {
				const tileEntities = tiles.get([x, y].toString());
				if (tileEntities) {
					entities.push(...tileEntities);
				}
			}
		}
		return entities;
	};

	const all = () => {
		const allEntities = [];
		for (const entities of tiles.values()) {
			allEntities.push(...entities);
		}
		return allEntities;
	};

	const move = entity => {
		remove(entity);
		add(entity);
	};

	// Initialize with initial entities
	initialEntities.forEach(add);

	return {
		add, remove,
		at, within, all,
		move,
		offset: chunkOffset
	};
};

const regionManager = (initialEntities = [], size = 20, offset = [0, 0]) => {
	const regionSize = size; // region size in chunks
	const regionOffset = offset; // coordinate offset for positions
	const chunks = new Map(); // map of chunk coordinates to chunk managers

	const getChunk = ([x, y]) => {
		const chunkCoord = [Math.floor((x - regionOffset[0]) / (tileSize * regionSize)), Math.floor((y - regionOffset[1]) / (tileSize * regionSize))];
		const chunkKey = chunkCoord.toString();
		if (!chunks.has(chunkKey)) {
			chunks.set(chunkKey, chunkManager([], regionSize, [chunkCoord[0] * regionSize * tileSize, chunkCoord[1] * regionSize * tileSize]));
		}
		return chunks.get(chunkKey);
	};

	const add = entity => {
		const chunk = getChunk(entity.physics.getPos());
		chunk.add(entity);
	};

	const remove = entity => {
		const chunk = getChunk(entity.physics.getPos());
		chunk.remove(entity);
	};

	const at = ([x, y]) => {
		const chunk = getChunk([x, y]);
		return chunk.at([x, y]);
	};

	const within = ([x1, y1], [x2, y2]) => {
		const entities = [];
		for (let x = x1; x <= x2; x += tileSize * regionSize) {
			for (let y = y1; y <= y2; y += tileSize * regionSize) {
				const chunk = getChunk([x, y]);
				entities.push(...chunk.within([x, y], [Math.min(x + tileSize * regionSize - 1, x2), Math.min(y + tileSize * regionSize - 1, y2)]));
			}
		}
		return entities;
	};

	const all = () => {
		const allEntities = [];
		for (const chunk of chunks.values()) {
			allEntities.push(...chunk.all());
		}
		return allEntities;
	};

	const move = entity => {
		const currentChunk = getChunk(entity.physics.getPos());
		const oldChunkCoord = currentChunk.offset;
		currentChunk.move(entity);
		const newChunkCoord = getChunk(entity.physics.getPos()).offset;
		if (oldChunkCoord.toString() !== newChunkCoord.toString()) {
			remove(entity);
			add(entity);
		}
	};

	// Initialize with initial entities
	initialEntities.forEach(add);

	return {
		add, remove,
		at, within, all,
		move,
		offset: regionOffset
	};
};

const dimManager = (initialEntities = [], size = 10) => {
	const dimensionSize = size; // dimension size in tiles
	const regions = new Map(); // map of region coordinates to region managers
	const unresolved = [];
	const events = eventManager((type, data) => unresolved.push([type, data]));

	const getRegion = ([x, y]) => {
		const regionCoord = [Math.floor(x / (tileSize * dimensionSize)), Math.floor(y / (tileSize * dimensionSize))];
		const regionKey = regionCoord.toString();
		if (!regions.has(regionKey)) {
			regions.set(regionKey, regionManager([], dimensionSize, [regionCoord[0] * dimensionSize * tileSize, regionCoord[1] * dimensionSize * tileSize]));
		}
		return regions.get(regionKey);
	};

	const add = entity => {
		const region = getRegion(entity.physics.getPos());
		region.add(entity);
	};

	const remove = entity => {
		const region = getRegion(entity.physics.getPos());
		region.remove(entity);
	};

	const at = ([x, y]) => {
		const region = getRegion([x, y]);
		return region.at([x, y]);
	};

	const within = ([x1, y1], [x2, y2]) => {
		const entities = [];
		for (let x = x1; x <= x2; x += tileSize * dimensionSize) {
			for (let y = y1; y <= y2; y += tileSize * dimensionSize) {
				const region = getRegion([x, y]);
				entities.push(...region.within([x, y], [Math.min(x + tileSize * dimensionSize - 1, x2), Math.min(y + tileSize * dimensionSize - 1, y2)]));
			}
		}
		return entities;
	};

	const all = () => {
		const allEntities = [];
		for (const region of regions.values()) {
			allEntities.push(...region.all());
		}
		return allEntities;
	};

	const move = entity => {
		const currentRegion = getRegion(entity.physics.getPos());
		const oldRegionCoord = currentRegion.offset;
		currentRegion.move(entity);
		const newRegionCoord = getRegion(entity.physics.getPos()).offset;
		if (oldRegionCoord.toString() !== newRegionCoord.toString()) {
			remove(entity);
			add(entity);
		}
	};

	// Initialize with initial entities
	initialEntities.forEach(add);

	return {
		add, remove,
		at, within, all,
		move,
		offset: [0, 0]
	};
};


export { dimManager };