"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createBridge() {
	const window = {};
	const engine = fs.readFileSync(path.join(__dirname, "game-engine.js"), "utf8");
	vm.runInNewContext(engine, { window });
	return window.PalaceBridge;
}

function settings(players, decks = 1, jokers = 2, startWithJoker = false) {
	return JSON.stringify({ players, decks, jokers, start_with_joker: startWithJoker });
}

function finishSetup(bridge, state) {
	while (state.phase === "setup") {
		state = JSON.parse(bridge.act(JSON.stringify({ type: "setup", cards: [0, 1, 2] })));
	}
	return state;
}

function startGame(players) {
	const bridge = createBridge();
	const state = finishSetup(bridge, JSON.parse(bridge.new_game(settings(players))));
	return { bridge, state, game: bridge.game };
}

test("catalog keeps all characters, abilities, reusable rules, and defaults", () => {
	const bridge = createBridge();
	const catalog = JSON.parse(bridge.get_catalog());
	assert.deepEqual(catalog.characters.map((character) => character.name), ["Sukuna", "Gojo", "Yuji Itadori", "Aoi Todo", "Mahito"]);
	assert.ok(catalog.characters.every((character) => character.tracks.every((track) => Array.isArray(track.rules))));
	assert.equal(catalog.defaults.players, 6);
	assert.ok(catalog.rules["Stack destroy"]);
	assert.equal(catalog.rules["Black Flash triggers"], undefined);
	for (const ability of ["Blood Manipulation", "Soul Separation", "Prisoner's Soul"]) {
		assert.equal(catalog.rules[ability], undefined);
	}
	const yujiTracks = catalog.characters.find((character) => character.name === "Yuji Itadori").tracks;
	assert.ok(yujiTracks.some((track) => track.ability === "Blood Manipulation"));
	assert.ok(yujiTracks.some((track) => track.ability === "Prisoners Soul"));
	assert.ok(yujiTracks.some((track) => track.evolution?.description.includes("Soul Separation")));
	assert.ok(yujiTracks.every((track) => track.rules.length === 0 && (!track.evolution || track.evolution.rules.length === 0)));
	const aoiTracks = catalog.characters.find((character) => character.name === "Aoi Todo").tracks;
	assert.deepEqual(aoiTracks.map((track) => track.ability),
		["Boogie Woogie", "Black Flash", "Built Different", "Arm Sacrifice", "Simple Domain"]);
	assert.ok(aoiTracks.every((track) => track.rules.every((rule) => Object.hasOwn(catalog.rules, rule))
		&& (!track.evolution || track.evolution.rules.every((rule) => Object.hasOwn(catalog.rules, rule)))));
	for (const ability of aoiTracks.flatMap((track) => [track.ability, track.evolution?.ability]).filter(Boolean)) {
		assert.equal(catalog.rules[ability], undefined);
	}
	const mahitoTracks = catalog.characters.find((character) => character.name === "Mahito").tracks;
	assert.deepEqual(mahitoTracks.map((track) => track.ability),
		["Body Manipulation", "Transfigured Humans", "Idle Transfiguration", "Soul Touch", "Black Flash"]);
	assert.ok(mahitoTracks.every((track) => track.rules.length === 0
		&& (!track.evolution || track.evolution.rules.length === 0)));
	for (const ability of mahitoTracks.flatMap((track) => [track.ability, track.evolution?.ability]).filter(Boolean)) {
		assert.equal(catalog.rules[ability], undefined);
	}
	assert.match(catalog.domain_rule, /Domain Clashing/);
});

test("Body Manipulation makes all three card zones match the chosen hand size", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	const handCards = [
		{ rank: "2", suit: "Clubs", deck_number: 0 },
		{ rank: "3", suit: "Clubs", deck_number: 0 },
		{ rank: "4", suit: "Clubs", deck_number: 0 },
	];
	const faceUpCards = [
		{ rank: "5", suit: "Hearts", deck_number: 0 },
		{ rank: "6", suit: "Hearts", deck_number: 0 },
		{ rank: "7", suit: "Hearts", deck_number: 0 },
	];
	const faceDownCards = [
		{ rank: "8", suit: "Spades", deck_number: 0 },
		{ rank: "9", suit: "Spades", deck_number: 0 },
		{ rank: "10", suit: "Spades", deck_number: 0 },
	];
	player.hand = [...handCards];
	player.face_up = [...faceUpCards];
	player.face_down = [...faceDownCards];
	game.draw_piles = [[
		{ rank: "2", suit: "Diamonds", deck_number: 1 },
		{ rank: "3", suit: "Diamonds", deck_number: 1 },
		{ rank: "4", suit: "Diamonds", deck_number: 1 },
	], [
		{ rank: "5", suit: "Diamonds", deck_number: 1 },
		{ rank: "6", suit: "Diamonds", deck_number: 1 },
		{ rank: "7", suit: "Diamonds", deck_number: 1 },
	]];
	player.known_cards.push({ c: faceDownCards[2], owner: 0 });
	game.players[1].known_cards.push({ c: faceDownCards[2], owner: 0 });

	bridge.bodyManipulation({ values: [1, 0, 0, 0, 0], pos: 0 });
	assert.equal(bridge.bodyManipulationMax(0), 3);
	assert.equal(player.hand.length, 2);
	assert.equal(player.face_up.length, 2);
	assert.equal(player.face_down.length, 2);
	assert.equal(game.handSize(0), 2);
	assert.ok(player.personal_draw_pile.includes(faceDownCards[2]));
	assert.ok(player.known_cards.every((entry) => entry.c !== faceDownCards[2]));
	assert.ok(game.players[1].known_cards.every((entry) => entry.c !== faceDownCards[2]));

	player.hand_size_override = 2;
	player.hand.splice(1);
	const privateCardsBeforeRefill = player.personal_draw_pile.length;
	game.refill(0);
	assert.equal(player.hand.length, 2);
	assert.equal(player.personal_draw_pile.length, privateCardsBeforeRefill - 1);
	const remainingPrivateCard = player.personal_draw_pile[0];
	player.known_cards.push({ c: remainingPrivateCard, owner: 0 });
	game.releaseMahitoPrivateDeck(0);
	assert.equal(player.personal_draw_pile.length, 0);
	assert.equal(player.hand_size_override, null);
	assert.equal(player.hand_size_source, null);
	assert.ok(player.known_cards.every((entry) => entry.c !== remainingPrivateCard));
});

test("Body Manipulation only consumes its staged draws after face-up choices finish", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	const handCards = [
		{ rank: "2", suit: "Clubs", deck_number: 0 },
		{ rank: "3", suit: "Clubs", deck_number: 0 },
	];
	const drawCards = [
		{ rank: "4", suit: "Diamonds", deck_number: 0 },
		{ rank: "5", suit: "Diamonds", deck_number: 0 },
		{ rank: "6", suit: "Diamonds", deck_number: 0 },
		{ rank: "7", suit: "Diamonds", deck_number: 0 },
		{ rank: "8", suit: "Diamonds", deck_number: 0 },
		{ rank: "9", suit: "Diamonds", deck_number: 0 },
	];
	player.hand = [...handCards];
	player.face_up = [];
	player.face_down = [];
	game.draw_piles = [drawCards.slice(0, 4), drawCards.slice(4)];

	let state = JSON.parse(bridge.act(JSON.stringify({ type: "body_manipulation", answers: [1] })));
	assert.ok(state.ask);
	assert.equal(state.ask.options.length, 4);
	assert.equal(game.draw_piles.flat().length, 6);
	assert.deepEqual(player.hand, handCards);
	assert.equal(player.face_down.length, 0);

	state = JSON.parse(bridge.act(JSON.stringify({ type: "body_manipulation", answers: [1, 0] })));
	assert.ok(state.ask);
	assert.equal(state.ask.options.length, 3);
	assert.equal(game.draw_piles.flat().length, 6);
	assert.deepEqual(player.hand, handCards);

	state = JSON.parse(bridge.act(JSON.stringify({ type: "body_manipulation", answers: [1, 0, 0] })));
	assert.equal(state.ask, undefined);
	assert.equal(player.hand.length, 2);
	assert.equal(player.face_up.length, 2);
	assert.equal(player.face_down.length, 2);
	assert.equal(game.draw_piles.flat().length, 2);
	assert.deepEqual(player.face_down, drawCards.slice(2, 4).reverse());
	assert.equal(new Set([
		...player.hand,
		...player.face_up,
		...player.face_down,
		...game.draw_piles.flat(),
	]).size, 8);
});

test("Free Cards only frees the value selected for the current round", () => {
	const { game } = startGame([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	]);
	const player = game.players[0];
	const seven = { rank: "7", suit: "Clubs", deck_number: 0 };
	const eight = { rank: "8", suit: "Clubs", deck_number: 0 };
	game.discards[0] = [{ rank: "King", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 13;
	player.god_rule = "Free Cards";
	player.god_round = game.round;
	player.god_rule_param = "7";

	assert.equal(game.legal(seven, 0), true);
	assert.equal(game.legal(eight, 0), false);
});

test("completed actions refill short hands and log ability notices", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	player.hand = [{ rank: "2", suit: "Clubs", deck_number: 0 }];
	game.draw_piles = [[
		{ rank: "3", suit: "Clubs", deck_number: 0 },
	], [
		{ rank: "4", suit: "Clubs", deck_number: 0 },
	]];

	const state = JSON.parse(bridge.act(JSON.stringify({ type: "transfigured_humans", answers: [0] })));
	assert.equal(player.hand.length, 3);
	assert.match(state.log.at(-1), /set their next card's value to 2/);
});

test("domain clashes treat Aces as royal shields and only tick clashing refinements", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	]);
	game.openMahitoDomain(0, 3);
	assert.equal(game.domains[0].refinement, 1);
	game.tickDomains();
	assert.equal(game.domains[0].refinement, 1);
	game.domains.push({ owner: 1, name: "Other Domain", refinement: 4, duration: null });
	game.draw_piles = [[
		{ rank: "2", suit: "Hearts", deck_number: 0 },
		{ rank: "Ace", suit: "Hearts", deck_number: 0 },
	], []];

	bridge.domain({ values: [], pos: 0 });
	assert.equal(game.domains[0].shield, true);
	bridge.domain({ values: [], pos: 0 });
	assert.equal(game.draw_piles[0].length, 1);
	game.tickDomains();
	assert.equal(game.domains[0].refinement, 1);
	assert.equal(game.domains[0].shield, false);
	game.tickDomains();
	assert.equal(game.domains.some((domain) => domain.owner === 0), false);
});

test("Turn Cancel grants immunity for the current and next two rounds", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	player.god_rule = "Turn Cancel";
	player.god_round = game.round;

	bridge.useGodRule({ values: [0], pos: 0 });
	assert.equal(player.cancel_immunity_until, 3);
	for (const round of [1, 2, 3]) {
		game.round = round;
		assert.equal(player.cancel_immunity_until >= game.round, true);
	}
	game.round = 4;
	assert.equal(player.cancel_immunity_until >= game.round, false);
});

test("bot follow stacking resolves without losing its turn state", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Aoi Todo" },
	]);
	const bot = game.players[1];
	bot.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 6;
	game.pile_value_history[0] = [6];
	game.pile_owner_history[0] = [null];
	game.pending_follow_stacks.push({ rank: "7", pile: 0, played_by: 0, targets: [1] });

	const state = JSON.parse(bridge.bot_step(1));
	assert.equal(game.pending_follow_stacks.length, 0);
	assert.equal(bot.hand.length, game.handSize(1));
	assert.equal(state.phase, "play");
});

test("Self Clones grants and consumes the expected bonus turns", () => {
	const { game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	player.ability_states["Body Manipulation"].evolved = true;
	player.hand = Array.from({ length: 15 }, (_, index) => ({ rank: "2", suit: "Clubs", deck_number: index }));
	game.prepareMahitoTurn(0);
	assert.equal(player.self_clone_turns, 7);
	game.endTurn();
	assert.equal(game.current, 0);
	assert.equal(player.self_clone_turns, 6);
});

test("Mahito and Todo retain their base abilities after ending a turn", () => {
	for (const [character, abilities] of [
		["Mahito", ["Body Manipulation", "Transfigured Humans"]],
		["Aoi Todo", ["Boogie Woogie", "Built Different"]],
	]) {
		const { game } = startGame([
			{ type: "Human", character },
			{ type: "Bot", character: "Gojo" },
		]);
		const before = abilities.map((ability) => game.effective(0, ability));
		game.endTurn();
		assert.deepEqual(abilities.map((ability) => game.effective(0, ability)), before);
	}
});

test("Transfigured Humans carries its next-card value across rounds and Transfigured Army changes both piles once per turn", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	const played = { rank: "3", suit: "Clubs", deck_number: 0 };
	player.hand = [played];
	game.discards = [
		[{ rank: "7", suit: "Spades", deck_number: 0 }],
		[{ rank: "5", suit: "Hearts", deck_number: 0 }],
	];
	game.pile_values = [7, 5];
	game.pile_value_history = [[7], [5]];
	game.pile_owner_history = [[null], [null]];

	bridge.transfiguredHumans({ values: [12], pos: 0 });
	game.round++;
	assert.equal(game.legal(played, 0), true);
	game.place(played, 0, null, "hand");
	assert.equal(game.pile_values[0], 14);
	assert.equal(player.transfigured_next_value, null);

	player.ability_states["Transfigured Humans"].evolved = true;
	assert.equal(bridge.canMahitoArmy(0), true);
	bridge.transfiguredArmy({ values: [5], pos: 0 }, 0);
	assert.deepEqual(game.pile_values, [7, 7]);
	assert.equal(bridge.canMahitoArmy(0), false);
});

test("Refined Soul locks a player immediately when Soul Touch changes their hand size", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0], target = game.players[1];
	player.ability_states["Soul Touch"].evolved = true;
	game.draw_piles = [[
		{ rank: "2", suit: "Clubs", deck_number: 0 },
		{ rank: "3", suit: "Clubs", deck_number: 0 },
	], []];
	target.hand = [
		{ rank: "4", suit: "Clubs", deck_number: 0 },
		{ rank: "5", suit: "Clubs", deck_number: 0 },
		{ rank: "6", suit: "Clubs", deck_number: 0 },
	];

	bridge.soulTouch({ values: [0, 2], pos: 0 });
	assert.equal(target.hand.length, 4);
	assert.equal(target.hand_size_override, 4);
	assert.equal(target.hand_size_until_round, game.round + 2);
	assert.equal(target.hand_lock_until_round, game.round + 2);
	assert.equal(player.rule_uses["Soul Touch"], game.round);
});

test("Mahito's domain protects Simple Domain users, applies its effects, and burns out on expiry", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	]);
	const mahito = game.players[0], protectedPlayer = game.players[1], target = game.players[2];
	mahito.ability_states["Idle Transfiguration"].evolved = true;
	game.openMahitoDomain(0, 3);
	protectedPlayer.simple_domain_active = true;
	protectedPlayer.simple_domain_refinement = 3;

	bridge.mahitoDomainCancel({ values: [0], pos: 0 });
	assert.equal(protectedPlayer.turn_cancelled, false);
	assert.equal(target.turn_cancelled, true);
	assert.equal(bridge.canMahitoDomainRemove(0), true);
	bridge.mahitoDomainRemove({ values: [0, 0], pos: 0 });
	assert.equal(target.ability_states.Cleave.removed, true);
	assert.equal(bridge.canMahitoDomainRemove(0), false);

	game.tickDomains();
	assert.equal(protectedPlayer.simple_domain_refinement, 2);
	assert.equal(game.domains[0].refinement, 1);
	game.domains[0].duration = 1;
	game.tickDomains();
	assert.equal(game.domains.length, 0);
	assert.equal(mahito.ability_states["Idle Transfiguration"].evolved, false);
	assert.equal(mahito.mahito_burnout_until_round, game.round + 2);
});

test("Mahito can shatter a domain while Simple Domain protects its user", () => {
	const { bridge, game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	]);
	const mahito = game.players[0], protectedPlayer = game.players[1], target = game.players[2];
	mahito.ability_states["Idle Transfiguration"].evolved = true;
	game.openMahitoDomain(0, 3);
	game.domains.push({ owner: 2, name: "Other Domain", refinement: 4, duration: null });
	protectedPlayer.simple_domain_active = true;

	bridge.mahitoDomainShatter({ values: [0], pos: 0 });
	assert.equal(protectedPlayer.turn_cancelled, false);
	assert.equal(target.turn_cancelled, true);
	assert.equal(target.ability_states.Cleave.removed, true);
	assert.equal(game.domains.length, 0);
	assert.equal(mahito.ability_states["Idle Transfiguration"].evolved, false);
	assert.equal(mahito.mahito_burnout_until_round, game.round + 2);
});

test("Mahito lands Black Flash with a Jack and recovers from burnout", () => {
	const { game } = startGame([
		{ type: "Human", character: "Mahito" },
		{ type: "Bot", character: "Gojo" },
	]);
	const player = game.players[0];
	const jack = { rank: "Jack", suit: "Hearts", deck_number: 0 };
	player.hand = [jack];
	player.mahito_burnout_until_round = game.round + 2;
	game.discards[0] = [{ rank: "9", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 9;
	game.pile_value_history[0] = [9];
	game.pile_owner_history[0] = [null];

	game.place(jack, 0, null, "hand");
	assert.equal(player.last_black_flash_round, game.round);
	assert.equal(player.black_flash_round_count, 1);
	assert.equal(player.mahito_burnout_until_round, game.round - 1);
});

test("Aoi Todo lands Black Flash with an 8-valued Joker and gains two rounds of Follow Stacking", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0];
	game.draw_piles = [[], []];
	aoi.hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.discards[0] = [{ rank: "7", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 7;
	game.pile_value_history[0] = [7];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	game.place(aoi.hand[0], 0, 8, "hand");
	assert.equal(aoi.last_black_flash_round, game.round);
	assert.equal(aoi.black_flash_round_count, 1);
	assert.ok(game.hasRule(0, "Follow Stacking"));
	game.round++;
	assert.ok(game.hasRule(0, "Follow Stacking"));
	game.round++;
	assert.equal(game.hasRule(0, "Follow Stacking"), false);
});

test("Boogie Woogie swaps any rank once per turn, and Vibraslap tracks accrued swaps", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0];
	game.draw_piles = [[], []];
	aoi.hand = [{ rank: "2", suit: "Clubs", deck_number: 0 }];
	game.players[1].hand = [];
	game.players[1].face_up = [];
	game.players[1].face_down = [];
	game.discards = [[], []];
	game.pile_values = [14, 14];
	game.pile_value_history = [[], []];
	game.pile_owner_history = [[], []];
	game.destroyed = [{ rank: "Ace", suit: "Hearts", deck_number: 0 }];
	assert.equal(bridge.canCardSwap(0), true);
	bridge.cardSwap({ values: [0, 0], pos: 0 });
	assert.equal(aoi.hand[0].rank, "Ace");
	assert.equal(game.destroyed[0].rank, "2");
	assert.equal(bridge.canCardSwap(0), false);

	aoi.ability_states["Boogie Woogie"].evolved = true;
	aoi.vibraslap_acquired_turn = game.turn - 4;
	aoi.vibraslap_swaps_spent = 1;
	assert.equal(bridge.swapCredits(0), 3);
	assert.equal(bridge.swapRanks(0).includes("Ace"), true);
});

test("Built Different spends one swap for a single rule activation and Stack Destroy works", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0];
	game.draw_piles = [[], []];
	aoi.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	aoi.ability_states["Boogie Woogie"].evolved = true;
	aoi.vibraslap_acquired_turn = game.turn - 5;
	game.current = 0;
	const meterRule = Object.keys(JSON.parse(bridge.get_catalog()).rules).indexOf("Meters");
	for (let use = 0; use < 3; use++) {
		bridge.builtDifferent({ values: [meterRule], pos: 0 });
	}
	assert.equal(aoi.meter, 3);
	assert.equal(aoi.built_different_uses, 3);
	assert.equal(bridge.swapCredits(0), 2);
	bridge.builtDifferent({ values: [meterRule], pos: 0 });
	assert.equal(aoi.meter, 3);

	aoi.ability_states["Boogie Woogie"].evolved = false;
	aoi.ability_states["Built Different"].evolved = false;
	aoi.ability_states["Built Different"].removed = false;
	game.pile_values[0] = 7;
	game.discards[0] = [{ rank: "7", suit: "Hearts", deck_number: 1 }];
	game.pile_value_history[0] = [7];
	game.pile_owner_history[0] = [1];
	game.current = 0;
	game.cards_played = 0;
	game.place(aoi.hand[0], 0, null, "hand");
	assert.equal(game.discards[0].length, 0);
	assert.equal(game.turn_pile_destroyed, true);
});

test("Best Brother redirects a turn cancel and lets the redirected player choose both cards", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Human", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0], sukuna = game.players[1];
	aoi.ability_states["Black Flash"].evolved = true;
	sukuna.god_rule = "Turn Cancel";
	sukuna.god_round = game.round;
	game.current = 1;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "god_rule", answers: [0] })));
	assert.equal(state.viewer, 0);
	assert.equal(state.me.mode, "best_brother");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "best_brother", answers: [0] })));
	assert.equal(sukuna.turn_cancelled, true);
	assert.equal(state.viewer, 1);
	assert.equal(state.me.mode, "best_brother_swap");
	const aoiCard = aoi.hand[0], sukunaCard = sukuna.hand[0];
	bridge.act(JSON.stringify({ type: "best_brother_swap", answers: [0, 0] }));
	assert.equal(aoi.hand[0], sukunaCard);
	assert.equal(sukuna.hand[0], aoiCard);
	assert.equal(game.pending_best_brother_swaps.length, 0);
});

test("Arm Sacrifice preserves eligibility to evolve Boogie Woogie into Vibraslap", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0];
	aoi.cut_meter = 8;
	assert.equal(game.tryArmSacrifice(0), true);
	assert.equal(aoi.cut_meter, 0);
	assert.equal(game.effective(0, "Boogie Woogie"), null);
	assert.ok(bridge.evolvable(0).some((track) => track.ability === "Boogie Woogie"));
	aoi.ability_states["Boogie Woogie"].evolved = true;
	assert.equal(game.effective(0, "Boogie Woogie"), "Vibraslap");
	assert.equal(game.tryArmSacrifice(0), false);
});

test("Vivid Imagination stores Queen meters and skips to Aoi's next turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0], gojo = game.players[1];
	aoi.ability_states["Arm Sacrifice"].evolved = true;
	game.draw_piles = [[], []];
	game.discards = [[{ rank: "9", suit: "Clubs", deck_number: 0 }], []];
	game.pile_values = [9, 14];
	game.pile_value_history = [[9], []];
	game.pile_owner_history = [[null], []];
	gojo.hand = [{ rank: "Queen", suit: "Hearts", deck_number: 0 }];
	game.current = 1;
	game.place(gojo.hand[0], 0, null, "hand");
	assert.equal(aoi.takada_meter, 1);
	bridge.vividSkip(0);
	assert.equal(aoi.takada_meter, 0);
	assert.equal(aoi.vivid_uses, 1);
	assert.equal(game.current, 0);
	assert.equal(game.round, 2);
});

test("What's Your Type lets Aoi destroy a card swapped into their hand", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Aoi Todo" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, aoi = game.players[0], gojo = game.players[1];
	aoi.ability_states["Built Different"].evolved = true;
	gojo.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	game.current = 1;
	game.cards_played = 0;
	game.draw_piles = [[], []];
	const incoming = gojo.hand[0];
	bridge.cardSwap({ values: [0, 0], pos: 0 });
	assert.equal(game.pending_todo_swap_destroys.length, 1);
	assert.equal(game.pending_todo_swap_destroys[0].target, 0);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "todo_swap_destroy" })));
	assert.ok(game.destroyed.includes(incoming));
	assert.equal(game.pending_todo_swap_destroys.length, 0);
	assert.equal(state.viewer, 0);
});

test("Yuji's 7 is free and lands a Black Flash", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 14;
	game.pile_value_history[0] = [14];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(game.discards[0].at(-1).rank, "7");
	assert.equal(yuji.last_black_flash_round, game.round);
	assert.ok(game.log.some((line) => line.includes("landed a Black Flash")));
});

test("Yuji lands a Black Flash when playing a Joker as a 7", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 14;
	game.pile_value_history[0] = [14];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0, answers: [5] })));
	assert.equal(game.discards[0].at(-1).rank, "Joker");
	assert.equal(yuji.last_black_flash_round, game.round);
	assert.ok(game.log.some((line) => line.includes("landed a Black Flash")));
	assert.equal(game.pending_black_flash_evolutions.length, 1);
});

test("Yuji's expanded Black Flash ranks also trigger when selected for a Joker", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.ability_states["Black Flash"].evolved = true;
	yuji.black_flash_ranks.push("9");
	yuji.hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.discards[0] = [{ rank: "2", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 2;
	game.pile_value_history[0] = [2];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0, answers: [7] })));
	assert.equal(game.discards[0].at(-1).rank, "Joker");
	assert.equal(yuji.last_black_flash_round, game.round);
	assert.ok(game.pending_black_flash_expansions.some((event) => event.target === 0));
});

test("Yuji bots choose an unlocked Black Flash rank when playing a Joker", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Yuji Itadori" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[1];
	game.draw_piles = [[], []];
	game.current = 1;
	for (const track of JSON.parse(bridge.get_catalog()).characters.find((entry) => entry.name === "Yuji Itadori").tracks) {
		if (track.evolution) yuji.ability_states[track.ability].evolved = true;
	}
	yuji.hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.discards[0] = [{ rank: "2", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 2;
	game.pile_value_history[0] = [2];
	game.pile_owner_history[0] = [null];
	state = JSON.parse(bridge.bot_step(1));
	assert.equal(game.pile_values[0], 7);
	assert.equal(yuji.last_black_flash_round, game.round);
	assert.ok(state.log.some((line) => line.includes("landed a Black Flash")));
});

test("Yuji's Black Flash can temporarily evolve different abilities, but not reuse one that round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 14;
	game.pile_value_history[0] = [14];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.ok(state.buttons.some((button) => button.id === "black_flash_evolve" && button.ability === "Blood Manipulation"));
	state = JSON.parse(bridge.act(JSON.stringify({ type: "black_flash_evolve", ability: "Blood Manipulation" })));
	assert.equal(yuji.temporary_evolutions["Blood Manipulation"], game.round);
	assert.equal(game.effective(0, "Blood Manipulation"), "Reversed Cursed Technique");
	assert.equal(game.pending_black_flash_evolutions.length, 0);
	game.landBlackFlash(0);
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "black_flash_evolve" && button.ability === "Divergent Fist"));
	assert.ok(!state.buttons.some((button) => button.id === "black_flash_evolve" && button.ability === "Blood Manipulation"));
	bridge.act(JSON.stringify({ type: "black_flash_evolve", ability: "Divergent Fist" }));
	assert.equal(yuji.temporary_evolutions["Divergent Fist"], game.round);
	game.landBlackFlash(0);
	state = JSON.parse(bridge.get_state());
	assert.ok(!state.buttons.some((button) => button.id === "black_flash_evolve"
		&& ["Blood Manipulation", "Divergent Fist"].includes(button.ability)));
});

test("God of Jujutsu chooses a Black Flash card value for the round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	game.current = 0;
	const rulesPrompt = JSON.parse(bridge.act(JSON.stringify({ type: "god" })));
	const blackFlashIndex = rulesPrompt.ask.options.indexOf("Black Flash");
	assert.ok(blackFlashIndex >= 0);
	const rankPrompt = JSON.parse(bridge.act(JSON.stringify({ type: "god", answers: [blackFlashIndex] })));
	assert.match(rankPrompt.ask.title, /card value that activates Black Flash/);
	const rankIndex = rankPrompt.ask.options.indexOf("5");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "god", answers: [blackFlashIndex, rankIndex] })));
	assert.equal(player.god_rule, "Black Flash");
	assert.equal(player.god_rule_param, "5");
	assert.ok(!state.buttons.some((button) => button.id === "god_rule" && button.label.includes("Black Flash")));

	player.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	game.draw_piles = [[], []];
	game.discards[0] = [{ rank: "4", suit: "Hearts", deck_number: 0 }];
	game.pile_values[0] = 4;
	game.pile_value_history[0] = [4];
	game.pile_owner_history[0] = [null];
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(player.black_flash_count, 1);
	assert.equal(player.last_black_flash_round, game.round);
	assert.ok(state.buttons.some((button) => button.id === "black_flash_evolve"));
});

test("Yuji's evolved Black Flash grants a bounded extra turn and rank expansion", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.ability_states["Black Flash"].evolved = true;
	yuji.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "2", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 2;
	game.pile_value_history[0] = [2];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));
	assert.equal(yuji.black_flash_turns, 1);
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "expand_black_flash" && button.rank === "2"));
	assert.equal(state.me.turns_remaining, 2);
	bridge.act(JSON.stringify({ type: "expand_black_flash", rank: "2" }));
	assert.ok(yuji.black_flash_ranks.includes("2"));
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "black_flash_evolve"));
	bridge.act(JSON.stringify({ type: "black_flash_evolve", ability: "Blood Manipulation" }));
	bridge.act(JSON.stringify({ type: "end_turn" }));
	assert.equal(game.current, 0);
	assert.equal(yuji.black_flash_turns, 0);
});

test("players can end a bonus turn without playing and continue to their next turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	game.current = 0;
	game.human_has_played = false;
	player.black_flash_turns = 2;
	state = JSON.parse(bridge.get_state());
	assert.equal(state.me.turns_remaining, 3);
	assert.equal(state.me.can_end, true);
	const startingTurn = game.turn;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "end_turn" })));
	assert.equal(game.current, 0);
	assert.equal(game.turn, startingTurn + 1);
	assert.equal(player.black_flash_turns, 1);
	assert.equal(state.me.turns_remaining, 2);
	assert.equal(state.me.can_end, true);
});

test("Blessed By The Sparks of Black spends a Joker to expand the trigger ranks", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.ability_states["Black Flash"].evolved = true;
	yuji.hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	state = JSON.parse(bridge.act(JSON.stringify({ type: "expand_black_flash_joker", answers: [0] })));
	assert.equal(yuji.hand.some((card) => card.rank === "Joker"), false);
	assert.ok(yuji.black_flash_ranks.includes("2"));
});

test("Divergent Fist can play an illegal card without immediately destroying on underplay", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	game.destroyed = [];
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }, { rank: "8", suit: "Hearts", deck_number: 0 }];
	game.pile_values[0] = 8;
	game.pile_value_history[0] = [6, 8];
	game.pile_owner_history[0] = [null, null];
	game.current = 0;
	const destroyedBefore = game.destroyed.length;
	bridge.act(JSON.stringify({ type: "divergent_fist", answers: [0, 0] }));
	assert.equal(game.discards[0].length, 3);
	assert.equal(game.discards[0].at(-1).rank, "5");
	assert.equal(game.destroyed.length, destroyedBefore);
	assert.equal(yuji.rule_uses["Divergent Fist"], game.turn);
});

test("Delayed Black Flash can activate an untriggered played card and destroy its pile once per round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	game.destroyed = [];
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.hand = [
		{ rank: "7", suit: "Clubs", deck_number: 0 },
		{ rank: "5", suit: "Hearts", deck_number: 0 },
	];
	game.discards = [[], []];
	game.pile_values = [14, 14];
	game.pile_value_history = [[], []];
	game.pile_owner_history = [[], []];
	game.current = 0;
	game.place(yuji.hand[0], 0, null, "hand");
	game.pending_black_flash_evolutions = [];
	game.place(yuji.hand[0], 0, null, "hand");
	assert.equal(Array.from(bridge.delayedBlackFlashChoices(0), (entry) => entry.card.rank).join(","), "5");
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "delayed_black_flash"));
	state = JSON.parse(bridge.act(JSON.stringify({ type: "delayed_black_flash", answers: [0] })));
	assert.equal(game.destroyed.length, 2);
	assert.equal(game.discards[0].length, 0);
	assert.equal(yuji.black_flash_count, 2);
	assert.equal(yuji.rule_uses["Delayed Black Flash"], game.round);
	assert.equal(game.pending_black_flash_evolutions.length, 1);
	assert.ok(!state.buttons.some((button) => button.id === "delayed_black_flash"));
	assert.equal(state.notice.includes("destroy discard pile 1"), true);
});

test("Delayed Black Flash does not destroy an empty discard pile", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	const destroyedBefore = game.destroyed.length;
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	game.discards = [[], []];
	game.pile_values = [14, 14];
	game.pile_value_history = [[], []];
	game.pile_owner_history = [[], []];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(game.discards[0].length, 1);
	assert.equal(game.discards[0][0].rank, "5");
	assert.equal(game.destroyed.length, destroyedBefore);
	assert.equal(state.notice.includes("Delayed Black Flash destroyed"), false);
});

test("Yuji's Cleave is locked until Black Flash and deletes a card after Stack Destroy", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.current = 0;
	game.discards[0] = [{ rank: "2", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 2;
	yuji.hand = [{ rank: "Ace", suit: "Clubs", deck_number: 0 }];
	assert.match(JSON.parse(bridge.act(JSON.stringify({ type: "yuji_cleave" }))).notice, /Land a Black Flash to use/);
	yuji.last_black_flash_round = game.round;
	game.draw_piles = [[], []];
	yuji.hand = [
		{ rank: "7", suit: "Clubs", deck_number: 0 },
		{ rank: "4", suit: "Hearts", deck_number: 0 },
	];
	game.discards[0] = [{ rank: "7", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 7;
	game.pile_value_history[0] = [7];
	game.pile_owner_history[0] = [1];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));
	assert.equal(game.pending_cleave_deletes.length, 1);
	bridge.act(JSON.stringify({ type: "cleave_delete", answers: [0] }));
	assert.equal(game.deleted.length, 1);
	assert.equal(game.deleted[0].rank, "4");
	assert.equal(yuji.hand.some((card) => card.rank === "4"), false);
});

test("Blood Manipulation can destroy hand cards repeatedly while over three cards", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.destroyed = [];
	yuji.hand = [
		{ rank: "2", suit: "Clubs", deck_number: 0 },
		{ rank: "3", suit: "Clubs", deck_number: 0 },
		{ rank: "4", suit: "Clubs", deck_number: 0 },
		{ rank: "5", suit: "Clubs", deck_number: 0 },
		{ rank: "6", suit: "Clubs", deck_number: 0 },
	];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "blood_manipulation", answers: [0] }));
	bridge.act(JSON.stringify({ type: "blood_manipulation", answers: [0] }));
	assert.equal(yuji.hand.length, 3);
	assert.equal(game.destroyed.length, 2);
});

test("Reversed Cursed Technique keeps pickup draws and caps its Black Flash draw per round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	yuji.ability_states["Blood Manipulation"].evolved = true;
	yuji.hand = [];
	game.draw_piles = [
		[{ rank: "2", suit: "Clubs", deck_number: 0 }, { rank: "3", suit: "Clubs", deck_number: 0 }, { rank: "4", suit: "Clubs", deck_number: 0 }, { rank: "5", suit: "Clubs", deck_number: 0 }, { rank: "6", suit: "Clubs", deck_number: 0 }],
		[],
	];
	game.discards = [[{ rank: "7", suit: "Hearts", deck_number: 0 }], []];
	game.pile_values = [7, 14];
	game.pile_value_history = [[7], []];
	game.pile_owner_history = [[null], []];
	game.takePiles(0);
	assert.equal(yuji.hand.length, 2);
	game.landBlackFlash(0);
	assert.equal(yuji.hand.length, 5);
	assert.equal(yuji.rule_uses["Reversed Cursed Technique"], game.round);
	yuji.hand = [];
	game.landBlackFlash(0);
	assert.equal(yuji.hand.length, 0);
	game.discards = [[{ rank: "7", suit: "Hearts", deck_number: 0 }], []];
	game.pile_values = [7, 14];
	game.pile_value_history = [[7], []];
	game.pile_owner_history = [[null], []];
	game.takePiles(0);
	assert.equal(yuji.hand.length, 2);
	assert.equal(yuji.rule_uses["Reversed Cursed Technique"], game.round);
});

test("Soul Separation lets the affected player choose an upgrade to lose", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Yuji Itadori" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, gojo = game.players[0], yuji = game.players[1];
	gojo.ability_states["Hollow Purple"].evolved = true;
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.ability_states.Cleave.evolved = true;
	gojo.soul_separation = 1;
	gojo.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	yuji.hand = [{ rank: "7", suit: "Hearts", deck_number: 0 }];
	game.draw_piles = [[], []];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 6;
	game.pile_value_history[0] = [6];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));
	state = JSON.parse(bridge.act(JSON.stringify({ type: "follow_stack", answers: [0] })));
	if (state.me.mode === "black_flash_evolution") {
		state = JSON.parse(bridge.act(JSON.stringify({ type: "black_flash_evolve", ability: "Blood Manipulation" })));
	}
	assert.equal(gojo.soul_separation, 2);
	assert.equal(state.viewer, 0);
	assert.equal(state.me.mode, "ability_loss");
	assert.equal(state.players[0].soul_separation, 2);
	assert.ok(state.players[0].tags.includes("Soul Separation 2"));
	assert.ok(state.buttons.some((button) => button.id === "lose_ability" && button.ability === "Hollow Purple"));
	bridge.act(JSON.stringify({ type: "lose_ability", ability: "Hollow Purple" }));
	assert.equal(gojo.ability_states["Hollow Purple"].evolved, false);
	assert.equal(gojo.ability_states["Hollow Purple"].evolution_lost, true);
});

test("bots resolve Yuji Follow Stacking, Black Flash choices, and Soul Separation", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Yuji Itadori" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, gojo = game.players[0], yuji = game.players[1];
	game.draw_piles = [[], []];
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.ability_states.Cleave.evolved = true;
	yuji.ability_states["Black Flash"].evolved = true;
	gojo.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	yuji.hand = [{ rank: "7", suit: "Hearts", deck_number: 0 }];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 6;
	game.pile_value_history[0] = [6];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	game.place(gojo.hand[0], 0, null, "hand");
	state = JSON.parse(bridge.bot_step(20));
	assert.equal(game.pending_follow_stacks.length, 0);
	assert.equal(game.pending_black_flash_evolutions.length, 0);
	assert.equal(game.pending_black_flash_expansions.length, 0);
	assert.equal(gojo.soul_separation, 1);
	assert.ok(state.players[0].tags.includes("Soul Separation 1"));
	assert.equal(yuji.temporary_evolutions["Blood Manipulation"], game.round);
});

test("bots resolve ability-loss choices when Yuji's Soul Separation meter reaches a threshold", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0], gojo = game.players[1];
	game.draw_piles = [[], []];
	yuji.ability_states["Divergent Fist"].evolved = true;
	yuji.ability_states.Cleave.evolved = true;
	yuji.rule_uses["Black Flash"] = game.round;
	gojo.ability_states["Hollow Purple"].evolved = true;
	gojo.soul_separation = 1;
	yuji.hand = [{ rank: "7", suit: "Hearts", deck_number: 0 }];
	gojo.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 6;
	game.pile_value_history[0] = [6];
	game.pile_owner_history[0] = [null];
	game.current = 1;
	game.place(gojo.hand[0], 0, null, "hand");
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "follow_stack", answers: [0] })));
	assert.equal(gojo.soul_separation, 2);
	assert.equal(gojo.ability_states["Hollow Purple"].evolved, false);
	assert.equal(gojo.ability_states["Hollow Purple"].evolution_lost, true);
	assert.equal(game.pending_ability_losses.length, 0);
});

test("Prisoner's Soul blocks card interaction, offers retaliation, and schedules two turns for Soul Swap", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Yuji Itadori" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[1];
	yuji.hand = [{ rank: "6", suit: "Hearts", deck_number: 0 }];
	assert.equal(game.cardInteractionBlocked(1, 0, "soul_swap"), true);
	assert.equal(game.next_player_override, 1);
	assert.equal(yuji.black_flash_turns, 2);
	state = JSON.parse(bridge.get_state());
	assert.equal(state.viewer, 1);
	assert.ok(state.buttons.some((button) => button.id === "prisoner_delete"));
	bridge.act(JSON.stringify({ type: "prisoner_delete", answers: [0] }));
	assert.equal(game.deleted[0].rank, "6");
	assert.equal(yuji.prisoner_soul_used_round, game.round);
});

test("new games validate player, deck, and human-player requirements", () => {
	const bridge = createBridge();
	assert.match(JSON.parse(bridge.new_game(settings([{ type: "Human", character: "Sukuna" }]))).error, /Players must be between/);
	assert.match(JSON.parse(bridge.new_game(settings([
		{ type: "Bot", character: "Sukuna" },
		{ type: "Bot", character: "Sukuna" },
	]))).error, /At least one player must be a human/);
	const tooManyPlayers = [{ type: "Human", character: "Gojo" }, ...Array.from({ length: 11 }, () => ({ type: "Bot", character: "Sukuna" }))];
	assert.match(JSON.parse(bridge.new_game(settings(tooManyPlayers, 1, 0))).error, /need at least/);
});

test("hot-seat setup hands control to each human and starts play", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Human", character: "Gojo" },
	])));
	assert.equal(state.phase, "setup");
	assert.equal(state.viewer, 0);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "setup", cards: [0, 1, 2] })));
	assert.equal(state.phase, "setup");
	assert.equal(state.viewer, 1);
	assert.equal(state.me.name, "Player 2");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "setup", cards: [0, 1, 2] })));
	assert.equal(state.phase, "play");
	assert.equal(state.hot_seat, true);
	assert.equal(state.viewer, 0);
});

test("evolving in hot-seat play gives the next human their turn even without a legal play", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.draw_piles = [[], []];
	game.players[0].hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.players[1].hand = [{ rank: "3", suit: "Clubs", deck_number: 0 }];
	game.discards = [
		[{ rank: "Ace", suit: "Spades", deck_number: 0 }],
		[{ rank: "King", suit: "Hearts", deck_number: 0 }],
	];
	game.pile_values = [14, 13];
	game.pile_last_player = [null, null];
	game.current = 0;
	const prompt = JSON.parse(bridge.act(JSON.stringify({ type: "evolve" })));
	assert.match(prompt.ask.title, /Choose an ability to evolve/);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "evolve", answers: [0] })));
	assert.equal(game.current, 1);
	assert.equal(state.viewer, 1);
	assert.equal(state.me.is_current, true);
	assert.equal(game.discards[0].length + game.discards[1].length, 2);
});

test("players with no legal moves can still use abilities before picking up piles", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.draw_piles = [[], []];
	game.players[0].hand = [{ rank: "3", suit: "Clubs", deck_number: 0 }];
	game.discards = [
		[{ rank: "Ace", suit: "Spades", deck_number: 0 }],
		[{ rank: "King", suit: "Hearts", deck_number: 0 }],
	];
	game.pile_values = [14, 13];
	game.pile_last_player = [null, null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "no_op" })));
	assert.equal(game.current, 0);
	assert.equal(state.me.can_pickup, true);
	assert.ok(state.buttons.some((button) => button.id === "six_eyes"));
	assert.equal(game.discards[0].length + game.discards[1].length, 2);
});

test("players can voluntarily pick up both discard piles and end their turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	game.discards = [
		[{ rank: "4", suit: "Clubs", deck_number: 0 }],
		[{ rank: "5", suit: "Hearts", deck_number: 0 }],
	];
	game.pile_values = [4, 5];
	const firstPileCard = game.discards[0][0], secondPileCard = game.discards[1][0];
	state = JSON.parse(bridge.act(JSON.stringify({ type: "take_piles" })));
	assert.equal(game.current, 1);
	assert.ok(player.hand.includes(firstPileCard));
	assert.ok(player.hand.includes(secondPileCard));
	assert.equal(game.discards[0].length + game.discards[1].length, 0);
});

test("all players can start with a bonus Joker when the setting is enabled", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	], 1, 0, true)));
	assert.ok(bridge.game.players[1].hand.some((card) => card.rank === "Joker"));
	state = finishSetup(bridge, state);
	assert.ok(bridge.game.players[0].hand.some((card) => card.rank === "Joker"));
});

test("Joker prompts preserve the game until the selected value is submitted", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.players[0].hand = [{ rank: "Joker", suit: "", deck_number: 3 }];
	game.discards[0] = [];
	game.pile_values[0] = 14;
	const prompt = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(prompt.ask.title, "Joker value");
	assert.equal(game.cards_played, 0);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0, answers: [12] })));
	assert.equal(game.cards_played, 1);
	assert.equal(game.discards[0][0].rank, "Joker");
	assert.equal(state.phase, "play");
});

test("an illegal opening play picks up both discard piles and ends the turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.players[0].hand = [{ rank: "3", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.discards[1] = [{ rank: "King", suit: "Hearts", deck_number: 0 }];
	game.pile_values = [14, 13];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));
	assert.equal(game.current, 1);
	assert.equal(game.discards[0].length + game.discards[1].length, 0);
	assert.ok(game.players[0].hand.some((card) => card.rank === "Ace"));
	assert.ok(game.players[0].hand.some((card) => card.rank === "King"));
});

test("World Cutting Slash prompts before deleting a card and applying Cut Meter", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.players[0].pending_world_slashes = 1;
	const prompt = JSON.parse(bridge.act(JSON.stringify({ type: "resolve_slash" })));
	assert.match(prompt.ask.title, /choose a card or pile to delete/);
	assert.equal(game.deleted.length, 0);
	bridge.act(JSON.stringify({ type: "resolve_slash", answers: [0, 0, 0] }));
	assert.equal(game.deleted.length, 1);
	assert.equal(game.players[1].cut_meter, 1);
	assert.equal(game.players[0].pending_world_slashes, 0);
});

test("Simple Domain activates once and can discard a card to cleanse Cut Meter", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const player = bridge.game.players[0];
	bridge.act(JSON.stringify({ type: "simple_domain" }));
	assert.equal(player.simple_domain_active, true);
	assert.equal(player.simple_domain_used, true);
	player.cut_meter = 2;
	player.hand = [{ rank: "2", suit: "Clubs", deck_number: 0 }];
	bridge.act(JSON.stringify({ type: "simple_domain", answers: [0, 0] }));
	assert.equal(player.cut_meter, 1);
	assert.equal(player.hand.length, 3);
	assert.ok(bridge.game.destroyed.some((card) => card.rank === "2"));
});

test("Binding Vow can select a face-up card once draw piles are empty", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	const card = { rank: "7", suit: "Hearts", deck_number: 0 };
	player.hand = [];
	player.face_up = [card];
	game.draw_piles = [[], []];
	game.current = 0;
	const prompt = JSON.parse(bridge.act(JSON.stringify({ type: "vow" })));
	assert.match(prompt.ask.title, /Choose a card/);
	bridge.act(JSON.stringify({ type: "vow", answers: [0] }));
	assert.equal(player.vow_card, card);
	assert.equal(game.current, 1);
	assert.equal(game.source(0)[0], "face_up");
	assert.equal(game.source(0)[1][0], card);
});

test("admin editing stays session-gated and updates card values", () => {
	const bridge = createBridge();
	bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	]));
	assert.match(JSON.parse(bridge.admin_cards()).error, /locked/);
	assert.equal(JSON.parse(bridge.admin_unlock("incorrect")).unlocked, false);
	assert.equal(JSON.parse(bridge.admin_unlock("ZaydIsABum")).unlocked, true);
	const rows = JSON.parse(bridge.admin_cards()).rows;
	assert.ok(rows.length > 0);
	assert.match(JSON.parse(bridge.admin_set(0, "Ace", "Spades")).message, /Ace of Spades/);
});

test("Reversal Red can swap its 6 or 9 with a visible opposing card", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0], opponent = game.players[1];
	player.ability_states["Lapse Blue"].evolved = true;
	player.hand = [{ rank: "6", suit: "Clubs", deck_number: 0 }];
	opponent.face_up = [{ rank: "9", suit: "Spades", deck_number: 0 }];
	const prompt = JSON.parse(bridge.act(JSON.stringify({ type: "card_swap" })));
	assert.match(prompt.ask.title, /Choose a card to swap/);
	bridge.act(JSON.stringify({ type: "card_swap", answers: [0, 0] }));
	assert.ok(player.hand.some((card) => card.rank === "9"));
	assert.equal(opponent.face_up[0].rank, "6");
});

test("Card Swap can be used repeatedly in the same round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0], opponent = game.players[1];
	player.ability_states["Lapse Blue"].evolved = true;
	game.draw_piles = [[], []];
	player.hand = [
		{ rank: "6", suit: "Clubs", deck_number: 0 },
		{ rank: "6", suit: "Hearts", deck_number: 0 },
	];
	player.face_up = [];
	player.face_down = [];
	opponent.face_up = [
		{ rank: "9", suit: "Spades", deck_number: 0 },
		{ rank: "10", suit: "Diamonds", deck_number: 0 },
	];
	bridge.act(JSON.stringify({ type: "card_swap", answers: [0, 0] }));
	assert.equal(bridge.game.players[0].hand.filter((card) => card.rank === "6").length, 1);
	assert.ok(bridge.game.players[0].hand.some((card) => card.rank === "9"));
	bridge.act(JSON.stringify({ type: "card_swap", answers: [0, 1] }));
	assert.ok(player.hand.some((card) => card.rank === "10"));
	assert.equal(game.round, 1);
});

test("Six Eyes is limited to once per round and preserves viewed cards", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	let prompt = JSON.parse(bridge.act(JSON.stringify({ type: "six_eyes" })));
	assert.equal(prompt.ask.title, "Six Eyes");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "six_eyes", answers: [0, 0] })));
	assert.ok(!state.buttons.some((button) => button.id === "six_eyes"));
	state = JSON.parse(bridge.act(JSON.stringify({ type: "six_eyes", answers: [0, 1] })));
	assert.equal(state.ask, undefined);
	assert.equal(player.known_cards.filter((row) => row.owner === 0).length, 1);

	game.round++;
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "six_eyes"));
	prompt = JSON.parse(bridge.act(JSON.stringify({ type: "six_eyes" })));
	assert.equal(prompt.ask.title, "Six Eyes");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "six_eyes", answers: [1, 0] })));
	assert.ok(!state.buttons.some((button) => button.id === "six_eyes"));
	assert.ok(player.known_cards.some((row) => row.owner === 1));
	assert.equal(state.players[1].seen_hand.length, bridge.game.players[1].hand.length);
	assert.equal(state.players[1].seen_face_down.length, 0);
});

test("Mastered Six Eyes shares the once-per-round manual cooldown", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const player = bridge.game.players[0];
	player.ability_states["Six Eyes"].evolved = true;

	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "six_eyes"));
	bridge.act(JSON.stringify({ type: "six_eyes", answers: [0, 0] }));
	state = JSON.parse(bridge.get_state());
	assert.ok(!state.buttons.some((button) => button.id === "six_eyes"));
});

test("Yuji cannot switch piles after his Stack Destroy", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.last_black_flash_round = game.round;
	player.hand = [
		{ rank: "5", suit: "Clubs", deck_number: 0 },
		{ rank: "6", suit: "Clubs", deck_number: 0 },
		{ rank: "8", suit: "Clubs", deck_number: 0 },
	];
	game.draw_piles = [[], []];
	game.discards = [
		[{ rank: "5", suit: "Hearts", deck_number: 0 }],
		[{ rank: "2", suit: "Spades", deck_number: 0 }],
	];
	game.pile_values = [5, 2];
	game.pile_last_player = [1, null];
	game.pile_value_history = [[5], [2]];
	game.pile_owner_history = [[1], [null]];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(game.pending_cleave_deletes.length, 1);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "cleave_delete", answers: [0] })));
	assert.equal(game.turn_pile, 0);
	assert.equal(state.turn_pile, 0);
	assert.equal(state.turn_pile_destroyed, true);
	assert.equal(game.current, 0);
	assert.equal(game.legal(player.hand[0], 1), false);
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(game.current, 0);
	assert.equal(game.cards_played, 2);
	assert.equal(game.discards[0].at(-1).rank, "8");
	assert.equal(game.discards[1].at(-1).rank, "2");
});

test("a 10 locks follow-up plays to the pile it destroyed", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.hand = [
		{ rank: "10", suit: "Clubs", deck_number: 0 },
		{ rank: "8", suit: "Clubs", deck_number: 0 },
	];
	game.draw_piles = [[], []];
	game.discards = [
		[{ rank: "9", suit: "Hearts", deck_number: 0 }],
		[{ rank: "2", suit: "Spades", deck_number: 0 }],
	];
	game.pile_values = [9, 2];
	game.pile_last_player = [1, null];
	game.pile_value_history = [[9], [2]];
	game.pile_owner_history = [[1], [null]];
	game.current = 0;

	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));

	assert.equal(game.turn_pile_destroyed, true);
	assert.equal(state.turn_pile, 0);
	assert.equal(game.legal(player.hand[0], 1), false);
});

test("Yuji's Stack Destroy does not count a game-seeded card as a stack", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	yuji.last_black_flash_round = game.round;
	yuji.hand = [{ rank: "Ace", suit: "Clubs", deck_number: 0 }];
	game.draw_piles = [[], []];
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 14;
	game.pile_value_history[0] = [14];
	game.pile_owner_history[0] = [null];
	game.current = 0;

	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));

	assert.equal(game.discards[0].length, 2);
	assert.equal(game.discards[0][1].rank, "Ace");
	assert.equal(game.destroyed.some((card) => card.rank === "Ace"), false);
	assert.equal(state.turn_pile, 0);
});

test("played matching cards still trigger Stack Destroy", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	yuji.last_black_flash_round = game.round;
	yuji.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.draw_piles = [[], []];
	game.discards[0] = [{ rank: "7", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 7;
	game.pile_value_history[0] = [7];
	game.pile_owner_history[0] = [1];
	game.current = 0;

	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));

	assert.equal(game.discards[0].length, 0);
	assert.ok(game.destroyed.some((card) => card.rank === "7"));
});

test("destroyed-pile lock prevents switching to an over-ace pile", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.ability_states["Hollow Purple"].evolved = true;
	player.hand = [
		{ rank: "7", suit: "Clubs", deck_number: 0 },
		{ rank: "8", suit: "Clubs", deck_number: 0 },
	];
	game.draw_piles = [[], []];
	game.discards = [
		[{ rank: "7", suit: "Hearts", deck_number: 0 }],
		[{ rank: "2", suit: "Spades", deck_number: 0 }],
	];
	game.pile_values = [7, 2];
	game.pile_last_player = [0, null];
	game.pile_value_history = [[7], [2]];
	game.pile_owner_history = [[0], [null]];
	game.pile_over_ace = [false, true];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(game.turn_pile_destroyed, true);
	assert.equal(game.legal(player.hand[0], 1), false);
	assert.equal(state.pile_over_ace[1], true);
});

test("Yuji's final Stack Destroy advances after the pending Stack Steal resolves", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	game.draw_piles = [[], []];
	game.players.forEach((current) => {
		current.hand = [];
		current.face_up = [];
		current.face_down = [];
	});
	player.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	player.last_black_flash_round = game.round;
	game.players[1].god_rule = "Stack Steal";
	game.players[2].hand = [{ rank: "6", suit: "Clubs", deck_number: 1 }];
	game.discards[0] = [{ rank: "5", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 5;
	game.pile_value_history[0] = [5];
	game.pile_owner_history[0] = [1];
	game.current = 0;

	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));

	assert.equal(game.pending_stack_steals.length, 0);
	assert.equal(game.finish_order[0].index, 0);
	assert.equal(game.current, 1);
	assert.equal(state.phase, "play");
	assert.equal(state.needs_bot, true);
});

test("Quick Grab can trigger repeatedly during the same player's turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.players[0].hand = [
		{ rank: "7", suit: "Clubs", deck_number: 0 },
		{ rank: "7", suit: "Hearts", deck_number: 0 },
	];
	game.players[1].god_rule = "Quick Grab";
	game.players[1].god_grab_value = 7;
	game.draw_piles = [[], []];
	game.discards = [
		[{ rank: "2", suit: "Spades", deck_number: 0 }],
		[{ rank: "3", suit: "Diamonds", deck_number: 0 }],
	];
	game.pile_values = [2, 3];
	game.pile_last_player = [null, null];
	game.pile_value_history = [[2], [3]];
	game.pile_owner_history = [[null], [null]];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	assert.equal(state.viewer, 1);
	assert.equal(game.pending_quick_grabs.length, 1);
	bridge.act(JSON.stringify({ type: "quick_grab" }));
	assert.equal(game.current, 0);
	const secondSeven = game.players[0].hand.findIndex((card) => card.rank === "7");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: secondSeven, pile: 0 })));
	assert.equal(state.viewer, 1);
	assert.equal(game.pending_quick_grabs.length, 1);
	bridge.act(JSON.stringify({ type: "quick_grab" }));
	assert.equal(game.current, 0);
	assert.equal(game.cards_played, 2);
});

test("Card Swapping is a start-of-turn action and remains repeatable", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0], opponent = game.players[1];
	player.ability_states["Lapse Blue"].evolved = true;
	player.hand = [
		{ rank: "5", suit: "Clubs", deck_number: 0 },
		{ rank: "5", suit: "Hearts", deck_number: 0 },
	];
	opponent.face_up = [
		{ rank: "7", suit: "Diamonds", deck_number: 0 },
		{ rank: "8", suit: "Spades", deck_number: 0 },
	];
	game.current = 0;
	assert.equal(bridge.canCardSwap(0), true);
	bridge.act(JSON.stringify({ type: "card_swap", answers: [0, 0] }));
	assert.equal(bridge.canCardSwap(0), true);
	bridge.act(JSON.stringify({ type: "card_swap", answers: [0, 1] }));
	assert.equal(opponent.face_up.filter((card) => card.rank === "5").length, 2);
	game.cards_played = 1;
	assert.equal(bridge.canCardSwap(0), false);
});

test("turn-limited discard actions retain their cap while peek and burn remain repeatable", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	game.current = 0;
	player.god_rule = "Top card discard";
	game.discards[0] = [
		{ rank: "3", suit: "Clubs", deck_number: 0 },
		{ rank: "4", suit: "Hearts", deck_number: 0 },
	];
	game.pile_value_history[0] = [3, 4];
	game.pile_owner_history[0] = [null, null];
	bridge.act(JSON.stringify({ type: "god_rule", answers: [0] }));
	assert.equal(bridge.godRuleReady(0), false);

	player.god_rule = "Sneak Peek";
	game.draw_piles = [
		[{ rank: "5", suit: "Clubs", deck_number: 0 }, { rank: "6", suit: "Hearts", deck_number: 0 }],
		[],
	];
	bridge.act(JSON.stringify({ type: "god_rule", answers: [0, 0] }));
	bridge.act(JSON.stringify({ type: "god_rule", answers: [0, 0] }));
	assert.equal(player.rule_uses["Sneak Peek"], undefined);

	player.god_rule = "Burn One";
	player.face_up = [
		{ rank: "7", suit: "Clubs", deck_number: 0 },
		{ rank: "8", suit: "Hearts", deck_number: 0 },
	];
	game.players[1].hand = [
		{ rank: "9", suit: "Clubs", deck_number: 0 },
		{ rank: "10", suit: "Hearts", deck_number: 0 },
	];
	bridge.act(JSON.stringify({ type: "god_rule", answers: [0, 0, 0] }));
	bridge.act(JSON.stringify({ type: "god_rule", answers: [0, 0, 0] }));
	assert.equal(player.face_up.length, 0);
	assert.equal(player.rule_uses["Burn One"], undefined);
});

test("Follow Stacking is not offered to a player whose turn is canceled", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.players[1].god_rule = "Follow Stacking";
	game.players[1].hand = [{ rank: "7", suit: "Hearts", deck_number: 0 }];
	game.players[1].turn_cancelled = true;
	game.players[0].hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "6", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 6;
	game.pile_value_history[0] = [6];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 }));
	assert.equal(game.pending_follow_stacks.length, 0);
});

test("players can allow an effect through their active immunity", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.it_until_round = game.round;
	state = JSON.parse(bridge.get_state());
	assert.ok(state.buttons.some((button) => button.id === "allow_effect"));
	bridge.act(JSON.stringify({ type: "allow_effect" }));
	assert.equal(player.allow_next_effect, true);
	assert.equal(game.blocksEffect(0, 1, true), false);
	assert.equal(player.allow_next_effect, false);
});

test("Tie Break applies to the next player who plays on the chosen pile", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.tie_breaks[0] = 0;
	game.current = 1;
	assert.equal(game.tieBreakApplies(0, 1), true);
	assert.equal(game.tieBreakApplies(0, 0), false);
	assert.equal(game.tieBreakApplies(1, 1), false);
});

test("Turn Reversal does not advance the round while moving backward", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, round = game.round;
	game.current = 2;
	game.next_player_override = 1;
	game.endTurn();
	assert.equal(game.current, 1);
	assert.equal(game.round, round);
	game.endTurn();
	assert.equal(game.current, 2);
	assert.equal(game.round, round);
});

test("bots progress through the same bridge and expose a valid game state", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game;
	game.current = 1;
	game.draw_piles = [[], []];
	game.players[1].hand = [{ rank: "3", suit: "Clubs", deck_number: 0 }];
	game.players[1].face_up = [];
	game.players[1].face_down = [];
	game.discards[0] = [{ rank: "2", suit: "Hearts", deck_number: 0 }];
	game.pile_values[0] = 2;
	state = JSON.parse(bridge.bot_step(1));
	assert.ok(["play", "over"].includes(state.phase));
	assert.ok(game.log.some((line) => line.includes("Bot 1 played")));
});

test("Yuji's unlocked Black Flash ranks trigger, but only 7s are free", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	yuji.ability_states["Black Flash"].evolved = true;
	yuji.black_flash_ranks.push("9");
	game.discards[0] = [{ rank: "Ace", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 14;
	game.pile_value_history[0] = [14];
	game.pile_owner_history[0] = [null];
	assert.equal(game.legal({ rank: "9", suit: "Clubs", deck_number: 0 }, 0), false);
	assert.equal(game.legal({ rank: "7", suit: "Clubs", deck_number: 0 }, 0), true);
});

test("a player can land no more than four Black Flashes per round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	for (let count = 0; count < 5; count++) game.landBlackFlash(0);
	assert.equal(yuji.black_flash_count, 4);
	assert.equal(yuji.black_flash_round_count, 4);
	assert.equal(game.landBlackFlash(0), false);
	game.round++;
	assert.equal(game.landBlackFlash(0), true);
	assert.equal(yuji.black_flash_round_count, 1);
});

test("Yuji's Follow Stacking cannot switch piles and cannot queue the same follower twice", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, first = game.players[0], second = game.players[1], third = game.players[2];
	game.draw_piles = [[], []];
	first.hand = [{ rank: "7", suit: "Clubs", deck_number: 0 }];
	first.face_up = [{ rank: "2", suit: "Clubs", deck_number: 0 }];
	second.hand = [{ rank: "7", suit: "Hearts", deck_number: 0 }];
	second.face_up = [{ rank: "3", suit: "Clubs", deck_number: 0 }];
	third.hand = [{ rank: "7", suit: "Spades", deck_number: 0 }];
	third.face_up = [{ rank: "4", suit: "Clubs", deck_number: 0 }];
	second.god_rule = "Follow Stacking";
	third.god_rule = "Follow Stacking";
	game.discards[0] = [{ rank: "6", suit: "Diamonds", deck_number: 0 }];
	game.discards[1] = [{ rank: "2", suit: "Spades", deck_number: 1 }];
	game.pile_values = [6, 2];
	game.pile_value_history = [[6], [2]];
	game.pile_owner_history = [[null], [null]];
	game.current = 0;
	game.place(first.hand[0], 0, null, "hand");

	state = JSON.parse(bridge.get_state());
	assert.equal(state.viewer, 1);
	assert.equal(state.me.mode, "follow_stack");
	state = JSON.parse(bridge.act(JSON.stringify({ type: "follow_stack", answers: [0] })));
	assert.equal(game.pending_follow_stacks.length, 1);
	assert.deepEqual(game.pending_follow_stacks[0].targets, [2]);
	assert.equal(game.finished(1), false);
	assert.equal(state.viewer, 2);

	state = JSON.parse(bridge.act(JSON.stringify({ type: "follow_stack", answers: [0] })));
	assert.equal(game.pending_follow_stacks.length, 0);
	assert.equal(game.winner, null);
	assert.equal(second.hand.length, 0);
	assert.equal(third.hand.length, 0);
	assert.equal(state.phase, "play");
});

test("Chain Play allows one card within three values, then blocks another out-of-range play", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.god_rule = "Chain Play";
	game.discards[0] = [{ rank: "8", suit: "Spades", deck_number: 0 }];
	game.pile_values[0] = 8;
	game.pile_value_history[0] = [8];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	const first = { rank: "5", suit: "Clubs", deck_number: 0 };
	const second = { rank: "3", suit: "Hearts", deck_number: 0 };
	player.hand = [first, second];
	assert.equal(game.legal(first, 0), true);
	game.place(first, 0, null, "hand");
	assert.equal(player.rule_uses["Chain Play"], game.turn);
	assert.equal(game.legal(second, 0), false);
});

test("Divergent Fist respects the pile lock after the player's first card", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Yuji Itadori" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, yuji = game.players[0];
	game.draw_piles = [[], []];
	yuji.hand = [
		{ rank: "8", suit: "Clubs", deck_number: 0 },
		{ rank: "9", suit: "Hearts", deck_number: 0 },
	];
	game.discards = [
		[{ rank: "7", suit: "Spades", deck_number: 0 }],
		[{ rank: "2", suit: "Diamonds", deck_number: 0 }],
	];
	game.pile_values = [7, 2];
	game.pile_value_history = [[7], [2]];
	game.pile_owner_history = [[null], [null]];
	game.current = 0;
	game.place(yuji.hand[0], 0, null, "hand");
	assert.equal(game.legal(yuji.hand[0], 1), false);
	bridge.act(JSON.stringify({ type: "divergent_fist", answers: [0] }));
	assert.equal(game.turn_pile, 0);
	assert.equal(game.discards[1].length, 1);
	assert.equal(game.discards[0].at(-1).rank, "9");
});

test("Spider Net Cleave spends one use per action and resets its uses each round", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Bot", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.ability_states.Cleave.evolved = true;
	game.draw_piles = [[], []];
	game.discards = [
		[
			{ rank: "2", suit: "Clubs", deck_number: 0 },
			{ rank: "3", suit: "Clubs", deck_number: 0 },
			{ rank: "4", suit: "Clubs", deck_number: 0 },
		],
		[{ rank: "5", suit: "Spades", deck_number: 0 }],
	];
	game.pile_values = [4, 5];
	game.pile_value_history = [[2, 3, 4], [5]];
	game.pile_owner_history = [[null, null, null], [null]];
	game.current = 0;
	bridge.act(JSON.stringify({ type: "cleave", pile: 0 }));
	assert.equal(player.ability_states.Cleave.uses, 1);
	assert.equal(game.discards[0].length, 2);

	game.round++;
	game.pile_locks[0] = { owner: 1, set_turn: game.turn };
	bridge.act(JSON.stringify({ type: "cleave", pile: 0 }));
	assert.equal(player.ability_states.Cleave.uses, 1);
	assert.equal(game.discards[0].length, 2);
	game.pile_locks[0] = null;
	bridge.act(JSON.stringify({ type: "cleave", pile: 0 }));
	assert.equal(player.ability_states.Cleave.round, game.round);
	assert.equal(player.ability_states.Cleave.uses, 1);
	assert.equal(game.discards[0].length, 1);
});

test("Enchain schedules activation and its upgrade can reschedule it", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Sukuna" },
		{ type: "Human", character: "Gojo" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, user = game.players[0];
	bridge.act(JSON.stringify({ type: "enchain", turns: 1 }));
	assert.equal(user.enchain_scheduled_turn, game.turn + 1);
	assert.equal(user.enchain_used, true);
	assert.equal(game.enchain_remaining, 0);

	user.ability_states.Enchain.evolved = true;
	game.turn = user.enchain_scheduled_turn;
	state = JSON.parse(bridge.get_state());
	assert.equal(state.me.enchain_due, true);
	bridge.act(JSON.stringify({ type: "reschedule_enchain", turns: 2 }));
	assert.equal(user.enchain_scheduled_turn, game.turn + 2);
	game.turn = user.enchain_scheduled_turn;
	bridge.act(JSON.stringify({ type: "activate_enchain", answers: [0] }));
	assert.equal(user.enchain_scheduled_turn, null);
	assert.equal(game.enchain_player, 0);
	assert.equal(game.enchain_remaining, 2);
	assert.equal(game.current, 0);
});

test("a depleted draw pile does not prevent the next player from taking a turn", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Human", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, first = game.players[0];
	game.draw_piles = [[], []];
	first.hand = [{ rank: "5", suit: "Clubs", deck_number: 0 }];
	first.face_up = [{ rank: "8", suit: "Clubs", deck_number: 0 }];
	game.discards[0] = [{ rank: "4", suit: "Hearts", deck_number: 0 }];
	game.pile_values[0] = 4;
	game.pile_value_history[0] = [4];
	game.pile_owner_history[0] = [null];
	game.current = 0;
	state = JSON.parse(bridge.act(JSON.stringify({ type: "play", card: 0, pile: 0 })));
	state = JSON.parse(bridge.act(JSON.stringify({ type: "end_turn" })));
	assert.equal(state.phase, "play");
	assert.equal(game.current, 1);
	assert.equal(game.winner, null);
});

test("the active player's negative effects are included in their own status tags", () => {
	const bridge = createBridge();
	let state = JSON.parse(bridge.new_game(settings([
		{ type: "Human", character: "Gojo" },
		{ type: "Bot", character: "Sukuna" },
	])));
	state = finishSetup(bridge, state);
	const game = bridge.game, player = game.players[0];
	player.hand_lock_until_round = game.round;
	player.revealed_cards.push(player.hand[0]);
	state = JSON.parse(bridge.get_state());
	assert.ok(state.players[state.viewer].tags.includes("Hand locked"));
	assert.ok(state.players[state.viewer].tags.includes("1 card(s) revealed"));
});

test("the HTML loads only the local JavaScript engine before the UI", () => {
	const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
	const app = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");
	assert.doesNotMatch(html, /pyodide|PALACE_FILES|palacegames\.py|web_bridge\.py/i);
	assert.ok(html.indexOf('src="game-engine.js"') < html.indexOf('src="script.js"'));
	assert.match(html, /start-with-joker/);
	assert.match(html, /href="#characters"/);
	assert.match(html, /href="#action-log"/);
	assert.match(app, /function renderPage/);
	assert.match(app, /function askOptionNode/);
	assert.match(app, /if \(known\) return cardNode/);
	assert.match(app, /seen_hand/);
});
