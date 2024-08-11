const tileSize = 100;

const _inBounds = (coord, bounds) => {
	const [x1, y1] = bounds[0];
	const [x2, y2] = bounds[1];
	const [xc, yc] = coord;
	return (xc >= x1
		&& yc >= y1
		&& xc < x2
		&& yc < y2);
};

const coords = {
	_base: x => ({
		toTile: () => Math.trunc(x / tileSize),
		toChunk: () => Math.trunc(x / (tileSize * chunkSize))
	}),
	_tile: (x) => ({
		toBase: () => x * tileSize,
		toChunk: () => Math.trunc(x / chunkSize)
	}),
	_chunk: (x) => ({
		toBase: () => x * chunkSize * tileSize,
		toTile: () => x * chunkSize
	}),

	base: ([x, y]) => ({
		toTile: () => [coords._base(x).toTile(), coords._base(y).toTile()],
		toChunk: () => [coords._base(x).toChunk(), coords._base(y).toChunk()]
	}),
	tile: ([x, y]) => ({
		toBase: () => [coords._tile(x).toBase(), coords._tile(y).toBase()],
		toChunk: () => [coords._tile(x).toChunk(), coords._tile(y).toChunk()]
	}),
	chunk: ([x, y]) => ({
		toBase: () => [coords._chunk(x).toBase(), coords._chunk(y).toBase()],
		toTile: () => [coords._chunk(x).toTile(), coords._chunk(y).toTile()]
	}),

	wholesWithin: (bounds) => {
		const [x1, y1] = bounds[0];
		const [x2, y2] = bounds[1];

		const minX = Math.min(x1, x2);
		const maxX = Math.max(x1, x2);
		const minY = Math.min(y1, y2);
		const maxY = Math.max(y1, y2);

		const coordinates = [];

		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				coordinates.push([x, y]);
			}
		}

		return coordinates;
	}
};

const tileManager = (initialEntities = [], offset = [0, 0]) => {
	const entities = initialEntities;
	const [ox, oy] = offset;
	const bounds = [
		new Array(2).fill(ox * tileSize - tileSize / 2),
		new Array(2).fill(oy * tileSize + tileSize / 2)
	];

	const add = entity => {
		const [x, y] = entity.physics.getPosition();
		if (!_inBounds([x, y], bounds)) return false;
		return entities.push(entity);
	};

	const remove = entity => {
		const i = entities.indexOf(entity);
		if (i === -1) return false;
		return entities.splice(i, 1);
	};

	const move = () => {
		const removed = entities.splice(0, entities.length);
		removed.forEach(add);
		return removed.length;
	};

	const within = ([[x1, y1], [x2, y2]]) => {
		return entities.filter(e => _inBounds(e.physics.getPosition(), [[x1, y1], [x2, y2]]));
	};

	const isWithin = (entity, [[x1, y1], [x2, y2]]) => {
		return within([[x1, y1], [x2, y2]]).includes(entity);
	};

	const at = ([x, y], t = 0) => {
		return within([[x - t, y - t], [x + t, y + t]]);
	};

	const isAt = (entity, [x, y], t = 0) => {
		return at([x, y], t).includes(entity);
	};

	const all = () => entities;

	const ofType = (type = "") => entities.filter(e => e.type === type);

	return {
		add, remove, move,
		within, isWithin, at, isAt,
		all, ofType
	};
};

const _toNonNegative = (n) => n >= 0 ? 2 * n : -2 * n - 1;
const _fromNonNegative = (n) => n % 2 === 0 ? n / 2 : -(n + 1) / 2;
const _interleaveBits = ([x, y]) => {
	[x, y] = [BigInt(x), BigInt(y)];
	let z = 0n;
	for (let i = 0n; i < 32; i++) z |= (x & (1n << i)) << i | (y & (1n << i)) << (i + 1n);
	return z;
};
const _deinterleaveBits = (z) => {
	let x = 0n, y = 0n;
	for (let i = 0n; i < 32; i++) {
		x |= (z & (1n << (2n * i))) >> i;
		y |= (z & (1n << (2n * i + 1n))) >> (i + 1n);
	}
	return [Number(x), Number(y)];
};
const zOrder = {
	encode: ([x, y]) => _interleaveBits([x, y].map(_toNonNegative)),
	decode: (z) => _deinterleaveBits(z).map(_fromNonNegative)
};

const mapManager = (initialEntities = []) => {
	const tiles = new Map();

	const add = entity => {
		const [x, y] = entity.physics.getPosition();
		const [tileX, tileY] = coords.base([x, y]).toTile();
		const tileKey = zOrder.encode([tileX, tileY]);
		if (!tiles.has(tileKey)) {
			tiles.set(tileKey, tileManager([entity], [tileX, tileY]));
		} else {
			tiles.get(tileKey).add(entity);
		}
	};

	const remove = entity => {
		const [x, y] = entity.physics.getPosition();
		const [tileX, tileY] = coords.base([x, y]).toTile();
		const tileKey = zOrder.encode([tileX, tileY]);
		if (tiles.has(tileKey)) {
			const tile = tiles.get(tileKey)
			const result = tile.remove(entity);
			if (tile.all().length === 0) tiles.remove(tileKey);
			return result;
		} else {
			return false;
		}
	};

	const move = () => tiles.values().forEach(t => t.move());

	const within = ([[x1, y1], [x2, y2]]) => {
		const tileCoords = coords.wholesWithin([[x1, y1], [x2, y2]].map(c => coords.base(c).toTile()));
		const tilesWithin = [];
		const entities = [];

		tileCoords
			.map(tileCoord => zOrder.encode(tileCoord))
			.forEach(tileKey => tiles.has(tileKey) && tilesWithin.push(tiles.get(tileKey)));

		tilesWithin.forEach(tile => entities.push(...tile.within([[x1, y1], [x2, y2]])));

		return entities;
	};

	const isWithin = (entity, [[x1, y1], [x2, y2]]) => {
		return within([[x1, y1], [x2, y2]]).includes(entity);
	};

	const at = ([x, y], t = 0) => {
		return within([[x - t, y - t], [x + t, y + t]]);
	};

	const isAt = (entity, [x, y], t = 0) => {
		return at([x, y], t).includes(entity);
	};

	const getTiles = () => tiles;

	const all = () => {
		const allEntities = [];
		for (const tile of tiles.values()) {
			allEntities.push(...tile.all());
		}
		return allEntities;
	};

	// Initialize with initial entities
	initialEntities.forEach(add);

	return {
		add, remove, move,
		within, isWithin, at, isAt,
		getTiles, all
	};
};

export { tileSize, coords, zOrder, mapManager };