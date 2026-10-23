"use strict";

const SUIT_SYMBOLS = {Clubs: "♣", Diamonds: "♦", Hearts: "♥", Spades: "♠" };
const RANK_SHORT = { Jack: "J", Queen: "Q", King: "K", Ace: "A" };
const CARD_RANK_VALUES = Object.freeze(Object.fromEntries(
	["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"]
		.map((rank, index) => [rank, index + 2])));

let bridge = null;
let catalog = null;
let selectedCharacter = null;
let state = null;
let selCard = null;
let selPile = null;
let choiceCards = new Set();
let choiceMode = "";
let setupSel = new Set();
let confirmedViewer = null;
let fastForward = false;
let botTimer = null;
let busy = false;
let adminOpen = false;
let sortHandByValue = false;
let playerRows = [];

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key === "class") node.className = value;
		else if (key === "onclick") node.addEventListener("click", value);
		else if (value !== undefined && value !== null) node[key] = value;
	}
	for (const child of children.flat()) {
		node.append(child instanceof Node ? child : document.createTextNode(child));
	}
	return node;
}

// ---------------------------------------------------------------- boot

function boot() {
	bridge = window.PalaceBridge;
	if (!bridge) throw new Error("The game engine could not be loaded.");
	catalog = JSON.parse(bridge.get_catalog());
	selectedCharacter = catalog.characters[0].name;
	$("loading").hidden = true;
	buildSetup();
	$("setup").hidden = false;
	if (location.hash === "#rules") openRules();
}

try {
	boot();
} catch (error) {
	$("loading-text").textContent = "Could not start: " + error.message;
}

// ---------------------------------------------------------------- setup screen

function showRule(name) {
	showDialog(name, el("p", {}, catalog.rules[name]), [{ label: "Close" }]);
}

// Turns known multi use rule names inside a description into clickable underlined links.
function withRules(text, rules) {
	const container = el("span");
	let pieces = [text];
	for (const rule of rules) {
		pieces = pieces.flatMap((piece) => {
			if (typeof piece !== "string") return [piece];
			const out = [];
			const lower = piece.toLowerCase();
			const needle = rule.toLowerCase();
			let position = 0;
			let found = lower.indexOf(needle, position);
			while (found !== -1) {
				out.push(piece.slice(position, found));
				out.push(el("span", { class: "rule", onclick: () => showRule(rule) }, piece.slice(found, found + rule.length)));
				position = found + rule.length;
				found = lower.indexOf(needle, position);
			}
			out.push(piece.slice(position));
			return out;
		});
	}
	container.append(...pieces.map((piece) => (typeof piece === "string" ? document.createTextNode(piece) : piece)));
	return container;
}

function renderCharacterDetails() {
	const character = catalog.characters.find((entry) => entry.name === selectedCharacter);
	const box = $("character-details");
	box.replaceChildren(characterSheet(character.name));
	box.append(el("p", { class: "hint" }, "Each evolution needs a Joker in hand before you play any cards and ends your turn. Underlined rule names can be clicked to read what they do."));
}

function characterSheet(name) {
	const character = catalog.characters.find((entry) => entry.name === name);
	const sheet = el("section", { class: "character-sheet" }, el("h3", {}, character.name));
	for (const track of character.tracks) {
		const block = el("div", { class: "track" },
			el("strong", {}, track.ability), el("br"),
			withRules(track.description, track.rules));
		if (track.evolution) {
			block.append(el("br"), el("strong", {}, "Evolution: " + track.evolution.ability), el("br"),
				withRules(track.evolution.description, track.evolution.rules));
		}
		sheet.append(block);
	}
	return sheet;
}

function buildSetup() {
	const list = $("character-list");
	list.replaceChildren(...catalog.characters.map((character) =>
		el("button", {
			class: character.name === selectedCharacter ? "selected" : "",
			onclick: () => {
				selectedCharacter = character.name;
				buildSetup();
			},
		}, character.name)));
	renderCharacterDetails();
	rebuildPlayerRows();
}

function rebuildPlayerRows() {
	const count = Math.max(2, Math.min(catalog.max_players, parseInt($("player-count").value, 10) || 2));
	while (playerRows.length < count) {
		playerRows.push({ type: playerRows.length === 0 ? "Human" : "Bot", character: catalog.random });
	}
	playerRows.length = count;
	const rows = $("player-rows");
	rows.replaceChildren();
	playerRows.forEach((row, index) => {
		const type = el("select", { onchange: (event) => { row.type = event.target.value; } },
			...["Human", "Bot"].map((value) => el("option", { value, selected: value === row.type }, value)));
		const line = el("div", { class: "row-player" }, el("span", {}, `Player ${index + 1}`), type);
		if (index === 0) {
			line.append(el("span", {}, selectedCharacter));
		} else {
			const choices = [catalog.random, ...catalog.characters.map((c) => c.name)];
			line.append(el("select", { onchange: (event) => { row.character = event.target.value; } },
				...choices.map((value) => el("option", { value, selected: value === row.character }, value))));
		}
		rows.append(line);
	});
}

$("player-count").addEventListener("change", rebuildPlayerRows);
$("restore-defaults").addEventListener("click", () => {
	$("player-count").value = catalog.defaults.players;
	$("deck-count").value = catalog.defaults.decks;
	$("joker-count").value = catalog.defaults.jokers;
	$("start-with-joker").checked = false;
	playerRows = [];
	rebuildPlayerRows();
});

$("start").addEventListener("click", () => {
	$("setup-error").textContent = "";
	const rows = playerRows.map((row, index) => ({
		type: row.type,
		character: index === 0 ? selectedCharacter : row.character,
	}));
	const result = JSON.parse(bridge.new_game(JSON.stringify({
		players: rows,
		decks: parseInt($("deck-count").value, 10),
		jokers: parseInt($("joker-count").value, 10),
		start_with_joker: $("start-with-joker").checked,
	})));
	if (result.error) {
		$("setup-error").textContent = result.error;
		return;
	}
	$("setup").hidden = true;
	$("game").hidden = false;
	confirmedViewer = null;
	fastForward = false;
	selCard = selPile = null;
	setupSel = new Set();
	applyState(result);
});

$("new-game").addEventListener("click", () => {
	if (!confirm("Abandon this game and return to setup?")) return;
	clearTimeout(botTimer);
	botTimer = null;
	state = null;
	$("game").hidden = true;
	$("setup").hidden = false;
});

// ---------------------------------------------------------------- dialogs

function showDialog(title, body, buttons) {
	$("modal-title").textContent = title;
	const bodyBox = $("modal-body");
	bodyBox.replaceChildren(body);
	const buttonBox = $("modal-buttons");
	delete buttonBox.dataset.handoff;
	buttonBox.replaceChildren(...buttons.map((button) =>
		el("button", {
			onclick: () => {
				closeDialog();
				if (button.action) button.action();
			},
		}, button.label)));
	$("modal").hidden = false;
}

function closeDialog() {
	$("modal").hidden = true;
}

function showAsk(ask, answers, action) {
	const buttons = ask.options.map((label, index) => ({
		label: askOptionNode(label),
		action: () => send(action, [...answers, index]),
	}));
	buttons.push({ label: "Cancel" });
	showDialog(ask.title, el("p", {}), buttons);
}

function showEnchainSchedule(action, title) {
	const turns = el("input", {
		type: "number",
		min: "1",
		step: "1",
		value: "1",
		required: true,
		ariaLabel: "Number of turns",
	});
	const submit = () => {
		const count = Number(turns.value);
		if (!Number.isInteger(count) || count < 1) {
			turns.setCustomValidity("Enter a whole number of turns greater than zero.");
			turns.reportValidity();
			return;
		}
		closeDialog();
		send({ type: action, turns: count });
	};
	turns.addEventListener("input", () => turns.setCustomValidity(""));
	showDialog(title, el("label", { class: "enchain-schedule" },
		"Activate in how many turns?",
		turns), [
		{ label: "Schedule", action: submit },
		{ label: "Cancel" },
	]);
}

function askOptionNode(label) {
	const cardMatch = label.match(/(Joker(?: \([^)]*\))?|(?:10|[2-9]|Jack|Queen|King|Ace) of (?:Clubs|Diamonds|Hearts|Spades))$/);
	if (!cardMatch) return label;
	const prefix = label.slice(0, cardMatch.index).replace(/\s+$/, "");
	return el("span", { class: "ask-option" },
		prefix ? el("span", {}, prefix) : "",
		cardNode(cardFromLabel(cardMatch[0]), { compact: true, inline: true }));
}

function openCharacterSheets() {
	const currentCharacter = state?.players[state.viewer]?.character || catalog.characters[0].name;
	const renderSheets = (showAll) => {
		const body = el("div", { class: "character-sheets" });
		const characters = showAll
			? catalog.characters
			: catalog.characters.filter((character) => character.name === currentCharacter);
		for (const character of characters) {
			const players = state?.players.filter((player) => player.character === character.name).map((player) => player.name) || [];
			const sheet = characterSheet(character.name);
			if (players.length) sheet.insertBefore(el("p", { class: "hint" }, `Used by: ${players.join(", ")}`), sheet.children[1] || null);
			body.append(sheet);
		}
		showDialog("Character sheets", body, [
			{ label: showAll ? `Show only ${currentCharacter}` : "Show every character", action: () => renderSheets(!showAll) },
			{ label: "Close" },
		]);
	};
	renderSheets(false);
}

$("show-log").addEventListener("click", () => {
	if (state) showDialog("Action log", el("pre", {}, state.log.join("\n")), [{ label: "Close" }]);
});

// ---------------------------------------------------------------- rules page

const RULES_SECTIONS = [
	["Goal", [
		"Get rid of all of your cards before everyone else. Cards are played from your hand first, then your face-up cards, then your face-down cards. Players who run out finish in order; the last player left is last place.",
	]],
	["Setup", [
		"Every player is dealt 3 face-down cards and 6 cards in hand, then keeps 3 of the 6 face-up on the table. The rest of the deck is split into two draw piles. One card from each draw pile starts the two discard piles (a Joker is reshuffled back; a 10 destroys its pile right away).",
		"You choose the number of players (human or bot), the number of 52-card decks and the number of Jokers before the game starts. The optional start-with-Joker setting gives every player one additional Joker after choosing face-up cards.",
	]],
	["Taking a turn", [
		"There are two discard piles. On your turn you choose one of them and play at least one card on it. Any extra cards you play in the same turn must go on that same pile. Press End turn when you are done.",
		"Your hand is topped up to 3 cards after each play while the draw piles last. Face-Up cards can only be played once your hand and both draw piles are empty, and face-down cards after that (you play them blind).",
		"The first card you play must be equal to or higher than the top card of the pile (Jack 11, Queen 12, King 13, Ace 14). An empty pile accepts anything.",
		"After your first card, you can keep stacking on the pile you just played on, as long as each card is the same value as the top card or exactly one higher.",
	]],
	["Special cards", [
		"2: can be played on anything as your first card, and later only on top of an Ace or another 2.",
		"10: as the first card of your turn it can be played on anything. Any 10 destroys the whole pile it is played on, moving it to the destroyed pile.",
		"Joker: wild. You choose its value from 2 to 14 when you play it. A Joker in hand before you play can also be spent to evolve an ability (see characters). Face-down Jokers count as Aces.",
		"Ace: the highest card. Only an Ace, a 2, a 10 or a Joker can go on top of an Ace.",
	]],
	["Picking up", [
		"You may pick up both discard piles at any time to end your turn. If you have no legal play, you may use available abilities before choosing to pick them up. An illegal opening play or illegal face-down card automatically makes you pick up both piles; an illegal follow-up is blocked.",
	]],
	["Characters, abilities and evolutions", [
		"Each player has a character with abilities. Some abilities can evolve: spend a Joker from your hand before you play any card and your turn ends, but the ability becomes its evolved version. Evolved abilities keep the base ability's behavior unless stated otherwise.",
		"Abilities whose name contains (Domain) are domains and follow Domain Clashing, below.",
	]],
];

function buildRulesPage() {
	const box = $("rules-content");
	box.replaceChildren();
	for (const [title, paragraphs] of RULES_SECTIONS) {
		box.append(el("div", { class: "panel" }, el("h2", {}, title), ...paragraphs.map((text) => el("p", {}, text))));
	}
	const multi = el("div", { class: "panel" },
		el("h2", {}, "Multi-use rules"),
		el("p", {}, "Abilities are built from these reusable rules. Characters can gain them from their abilities, and God of Jujutsu lets its owner use any of them."));
	for (const [name, text] of Object.entries(catalog.rules)) {
		multi.append(el("p", {}, el("strong", {}, name), el("br"), text));
	}
	box.append(multi);
	box.append(el("div", { class: "panel" }, el("h2", {}, "Domain Clashing"), el("pre", { class: "plain" }, catalog.domain_rule)));
}

let viewBeforeRules = "setup";

function openRules() {
	if (!$("rules-page").hidden) return;
	viewBeforeRules = !$("game").hidden ? "game" : "setup";
	$("setup").hidden = true;
	$("game").hidden = true;
	buildRulesPage();
	$("rules-page").hidden = false;
	window.scrollTo(0, 0);
	if (location.hash !== "#rules") location.hash = "rules";
}

function closeRules() {
	if ($("rules-page").hidden) return;
	$("rules-page").hidden = true;
	$(viewBeforeRules).hidden = false;
	if (location.hash === "#rules") history.replaceState(null, "", location.pathname + location.search);
}

document.querySelectorAll(".open-rules").forEach((button) => button.addEventListener("click", openRules));
$("rules-back").addEventListener("click", closeRules);
window.addEventListener("hashchange", () => {
	if (location.hash === "#rules") openRules();
	else closeRules();
});

// ---------------------------------------------------------------- settings and admin

function openAdmin() {
	const status = JSON.parse(bridge.admin_status());
	const password = el("input", { type: "password", placeholder: "Admin password" });
	const message = el("p", {}, status.unlocked ? "Admin access is unlocked for this session." : "Enter the admin password to enable card editing.");
	const editButton = el("button", {
		disabled: !(status.unlocked && status.in_game),
		onclick: () => { closeDialog(); openCardEditor(); },
	}, "Edit all card values");
	const unlock = () => {
		const result = JSON.parse(bridge.admin_unlock(password.value));
		message.textContent = result.unlocked ? "Admin access unlocked for this session." : "Incorrect password.";
		editButton.disabled = !(result.unlocked && result.in_game);
		if (result.unlocked && !result.in_game) message.textContent += " Start a game to edit cards.";
	};
	password.addEventListener("keydown", (event) => { if (event.key === "Enter") unlock(); });
	showDialog("Admin access", el("div", {}, message, password, el("button", { onclick: unlock }, "Unlock"), el("br"), editButton),
		[{ label: "Close" }]);
	password.focus();
}

function openSettings() {
	const sort = el("input", {
		type: "checkbox",
		checked: sortHandByValue,
		onchange: (event) => {
			sortHandByValue = event.target.checked;
			render();
		},
	});
	const adminButton = el("button", {
		onclick: () => { closeDialog(); openAdmin(); },
	}, "Admin access");
	showDialog("Settings", el("div", {},
		el("label", { class: "checkbox-setting" }, sort, " Sort hand by card value"),
		el("p", { class: "hint" }, "Sorts your hand for display without changing the cards' game positions."),
		adminButton), [{ label: "Close" }]);
}

function openCardEditor() {
	adminOpen = true;
	let selected = null;
	let data = null;
	const list = el("select", { size: 14, class: "admin-list" });
	const rank = el("select");
	const suit = el("select");
	const message = el("p", {});
	const label = el("strong", {}, "Select a card");

	const refill = () => {
		data = JSON.parse(bridge.admin_cards());
		if (data.error) {
			message.textContent = data.error;
			return;
		}
		list.replaceChildren(...data.rows.map((row) => el("option", { value: String(row.id), selected: row.id === selected }, `${row.location}: ${row.card}`)));
		if (!rank.options.length) {
			data.ranks.forEach((value) => rank.append(el("option", { value }, value)));
			data.suits.forEach((value) => suit.append(el("option", { value }, value)));
		}
	};
	list.addEventListener("change", () => {
		selected = parseInt(list.value, 10);
		const row = data.rows[selected];
		label.textContent = `${row.location}: ${row.card}`;
		rank.value = row.rank;
		suit.value = row.suit || data.suits[0];
		suit.disabled = row.rank === "Joker";
	});
	rank.addEventListener("change", () => { suit.disabled = rank.value === "Joker"; });
	const apply = el("button", {
		onclick: () => {
			if (selected === null) return;
			const result = JSON.parse(bridge.admin_set(selected, rank.value, suit.value));
			message.textContent = result.error || result.message;
			applyState(JSON.parse(bridge.get_state()));
			refill();
		},
	}, "Apply card change");
	refill();
	showDialog("Admin card editor", el("div", { class: "admin-editor" },
		list, el("div", {}, label, el("br"), "Rank", el("br"), rank, el("br"), "Suit", el("br"), suit, el("br"), apply, message)),
	[{ label: "Close", action: () => { adminOpen = false; scheduleBot(); } }]);
}

document.querySelectorAll(".open-settings").forEach((button) => button.addEventListener("click", openSettings));
document.querySelectorAll(".open-characters").forEach((button) => button.addEventListener("click", openCharacterSheets));

// ---------------------------------------------------------------- bridge calls

function send(action, answers = []) {
	if (busy) return;
	const result = JSON.parse(bridge.act(JSON.stringify({ ...action, answers })));
	if (result.ask) {
		showAsk(result.ask, answers, action);
		return;
	}
	selCard = null;
	applyState(result);
}

function botTick() {
	botTimer = null;
	if (adminOpen || !state || state.phase !== "play" || !state.needs_bot) return;
	const result = JSON.parse(bridge.bot_step(fastForward ? 40 : 1));
	applyState(result);
}

function scheduleBot() {
	if (adminOpen || botTimer !== null || !state || state.phase !== "play" || !state.needs_bot
		|| needsHandoff() || !$("modal").hidden) return;
	botTimer = setTimeout(botTick, fastForward ? 0 : 350);
}

function applyState(next) {
	state = next;
	if (state.phase === "over") fastForward = false;
	render();
	if (state.popup) showDialog("Six Eyes", el("p", {}, state.popup), [{ label: "OK" }]);
	else if (state.phase === "play" && state.me?.enchain_due && !needsHandoff() && $("modal").hidden) {
		showDialog("Enchain ready", el("p", {}, "Activate Enchain now, or reschedule it for a later turn."), [
			{ label: "Activate Enchain", action: () => send({ type: "activate_enchain" }) },
			{ label: "Reschedule", action: () => showEnchainSchedule("reschedule_enchain", "Reschedule Enchain") },
		]);
	}
	else if (state.phase === "play" && state.me?.mode === "follow_stack" && !needsHandoff() && $("modal").hidden) {
		showDialog("Follow Stack", el("p", {}, "You may stack a matching card on the pile."), [
			{ label: "Follow Stack", action: () => send({ type: "follow_stack" }) },
			{ label: "Decline", action: () => send({ type: "decline_follow_stack" }) },
		]);
	}
	else if (state.phase === "play" && state.me?.mode === "best_brother" && !needsHandoff() && $("modal").hidden) {
		showDialog("Best Brother", el("p", {}, "Redirect this turn cancel to another player, or let it affect you."), [
			{ label: "Redirect turn cancel", action: () => send({ type: "best_brother" }) },
			{ label: "Let it affect you", action: () => send({ type: "decline_best_brother" }) },
		]);
	}
	else if (state.phase === "play" && state.me?.mode === "best_brother_swap" && !needsHandoff() && $("modal").hidden) {
		showDialog("Best Brother card swap", el("p", {}, "Choose one of your cards and one of Aoi Todo's cards to swap. The choices reveal Aoi's hand and face-down cards temporarily."), [
			{ label: "Choose cards", action: () => send({ type: "best_brother_swap" }) },
		]);
	}
	else if (state.phase === "play" && state.me?.mode === "todo_swap_destroy" && !needsHandoff() && $("modal").hidden) {
		showDialog("What's Your Type?", el("p", {}, "Destroy the card swapped to you, or keep it."), [
			{ label: "Destroy incoming card", action: () => send({ type: "todo_swap_destroy" }) },
			{ label: "Keep incoming card", action: () => send({ type: "todo_swap_keep" }) },
		]);
	}
	scheduleBot();
	autoResolve();
}

// Pending World Cutting Slash / Limitless effects open their prompts automatically.
function autoResolve() {
	if (state.phase !== "play" || needsHandoff() || !$("modal").hidden) return;
	const ids = state.buttons.map((button) => button.id);
	if (ids.includes("resolve_slash")) setTimeout(() => send({ type: "resolve_slash" }), 0);
	else if (ids.includes("resolve_limitless")) setTimeout(() => send({ type: "resolve_limitless" }), 0);
}

function needsHandoff() {
	return Boolean(state && state.hot_seat && state.phase !== "over" && state.viewer !== confirmedViewer);
}

// ---------------------------------------------------------------- rendering

function cardFromLabel(label) {
	const joker = label.match(/^Joker(?: \((.*?)\))?$/);
	if (joker) return { rank: "Joker", suit: "", label, value: joker[1] };
	const match = label.match(/^(.*?) of (Clubs|Diamonds|Hearts|Spades)$/);
	return match ? { rank: match[1], suit: match[2], label } : { rank: label, suit: "", label };
}

function cardNode(card, options = {}) {
	const red = card.suit === "Hearts" || card.suit === "Diamonds";
	const classes = ["card"];
	if (red) classes.push("red");
	if (card.rank === "Joker") classes.push("joker");
	if (options.selected) classes.push("selected");
	if (options.compact) classes.push("compact");
	if (options.inline) classes.push("inline");
	const node = el(options.onclick ? "button" : options.inline ? "span" : "div", {
		class: classes.join(" "),
		...(options.onclick ? { type: "button", onclick: options.onclick } : {}),
		title: card.label,
		ariaLabel: card.label,
	},
	el("span", { class: "card-rank" }, RANK_SHORT[card.rank] || card.rank),
	el("span", { class: "card-suit" }, card.rank === "Joker" ? "★" : SUIT_SYMBOLS[card.suit] || ""),
	card.value ? el("small", { class: "card-value" }, card.value) : "");
	if (options.disabled) node.disabled = true;
	return node;
}

function hiddenNode(index, known, options) {
	if (known) return cardNode(cardFromLabel(known), options);
	const node = el(options.onclick ? "button" : "div", {
		class: "card hidden" + (options.selected ? " selected" : "") + (options.compact ? " compact" : ""),
		...(options.onclick ? { type: "button", onclick: options.onclick } : {}),
		ariaLabel: "Face-down card " + (index + 1),
	}, el("span", { class: "card-back-mark", ariaHidden: true }, "✦"));
	return node;
}

function cardGallery(labels) {
	if (!labels.length) return el("p", { class: "empty-pile" }, "Empty");
	return el("div", { class: "card-gallery" }, ...labels.map((label) => cardNode(cardFromLabel(label), { compact: true })));
}

function render() {
	const st = state;
	if (needsHandoff()) {
		renderHandoff();
		return;
	}
	closeHandoffIfAny();
	const phaseText = st.phase === "setup" ? "Setup"
		: st.phase === "over" ? `${st.winner} finished first.`
		: `Round ${st.round}  |  Turn ${st.turn}  |  ${st.players[st.current].name}${st.me.is_current && st.me.turns_remaining > 1 ? `  |  ${st.me.turns_remaining} turns remaining` : ""}`;
	$("status").textContent = phaseText + "\n" + st.notice;
	renderPiles();
	renderPlayers();
	renderHand();
}

function renderHandoff() {
	const name = state.players[state.viewer].name;
	$("status").textContent = "Pass the device";
	showDialog("Pass the device", el("p", { class: "handoff" }, `Hand the device to ${name}. Hands stay hidden until they are ready.`), [
		{
			label: `I'm ${name} - show my cards`,
			action: () => {
				confirmedViewer = state.viewer;
				applyState(state);
			},
		},
	]);
	$("modal-buttons").dataset.handoff = "1";
}

function closeHandoffIfAny() {
	const buttons = $("modal-buttons");
	if (buttons.dataset.handoff) {
		delete buttons.dataset.handoff;
		closeDialog();
	}
}

function renderPiles() {
	const st = state;
	const topPiles = $("top-piles");
	const drawLeft = $("draw-pile-left");
	const drawRight = $("draw-pile-right");
	const discards = $("discard-piles");
	topPiles.replaceChildren();
	drawLeft.replaceChildren();
	drawRight.replaceChildren();
	discards.replaceChildren();
	st.draw_piles.forEach((count, index) => {
		const container = index === 0 ? drawLeft : drawRight;
		container.append(el("div", { class: "pile-stack draw-pile" },
			el("strong", { class: "pile-label" }, `Draw pile ${index + 1}`),
			hiddenNode(index, null, { compact: true }),
			el("small", { class: "pile-count" }, `${count} cards`)));
	});
	[["Destroyed Pile", st.destroyed], ["Deleted Pile", st.deleted]].forEach(([title, cards]) => {
		topPiles.append(el("div", { class: "pile-stack collection-pile" },
		el("strong", { class: "pile-label" }, title),
		cards.length ? cardNode(cardFromLabel(cards.at(-1)), { compact: true }) : el("div", { class: "empty-card" }),
		el("small", { class: "pile-count" }, `${cards.length} cards`),
		el("button", {
			class: "pile-view",
			type: "button",
			ariaLabel: `View ${title.toLowerCase()}`,
			onclick: () => showDialog(title, cardGallery(cards), [{ label: "Close" }]),
		}, "View pile")));
	});
	st.discards.forEach((pile, index) => {
		const lockedToOtherPile = st.turn_pile !== null && st.turn_pile !== index
			&& (st.turn_pile_destroyed || !st.pile_over_ace[index]);
		const canPick = st.phase === "play" && st.me.is_current && !lockedToOtherPile;
		const node = el("div", { class: "pile-stack discard-pile" + (selPile === index ? " selected" : "") });
		node.append(el("strong", { class: "pile-label" }, `Discard Pile ${index + 1}`));
		const select = el("button", { class: "discard-select", type: "button", disabled: !canPick, ariaLabel: `Select discard pile ${index + 1}${pile.top ? `, ${pile.top}` : ", empty"}`, onclick: () => {
			if (canPick) {
				selPile = index;
				render();
			}
		} },
		pile.top ? cardNode(cardFromLabel(pile.top), { compact: true }) : el("div", { class: "empty-card" }));
		node.append(select, el("small", { class: "pile-count" }, `${pile.count} cards`));
		const viewButton = el("button", { onclick: (event) => {
			event.stopPropagation();
			showDialog(`Discard Pile ${index + 1}`, cardGallery(pile.cards), [{ label: "Close" }]);
		}, class: "pile-view" }, "View pile");
		node.append(viewButton);
		discards.append(node);
	});
}

function playerZone(title, count, cards) {
	return el("div", { class: "player-zone" },
		el("span", { class: "zone-label" }, `${title} · ${count}`),
		cards.length
			? el("div", { class: "mini-cards" }, ...cards)
			: el("div", { class: "mini-cards empty-zone" }, "Empty"));
}

function renderPlayers() {
	const left = $("left-players");
	const right = $("right-players");
	left.replaceChildren();
	right.replaceChildren();
	const opponents = state.players.filter((_, index) => index !== state.viewer);
	opponents.forEach((player, index) => {
		const seenHandCards = player.seen_hand.map((label) => cardNode(cardFromLabel(label), { compact: true }));
		const hiddenHandCount = Math.max(0, player.hand - player.revealed.length - seenHandCards.length);
		const handBacks = Array.from({ length: Math.min(hiddenHandCount, 6) }, (_, index) => hiddenNode(index, null, { compact: true }));
		handBacks.push(...seenHandCards);
		handBacks.push(...player.revealed.map((label) => cardNode(cardFromLabel(label), { compact: true })));
		const faceDownCards = player.seen_face_down.map((label) => cardNode(cardFromLabel(label), { compact: true }));
		faceDownCards.push(...Array.from({ length: Math.min(Math.max(0, player.face_down - player.seen_face_down.length), 3) }, (_, index) => hiddenNode(index, null, { compact: true })));
		const zones = [
			playerZone(player.seen_hand.length ? "Hand / seen" : "Hand", player.hand, handBacks),
			playerZone("Face-up", player.face_up.length, player.face_up.map((card) => cardNode(card, { compact: true }))),
			playerZone(player.seen_face_down.length ? "Face-down / seen" : "Face-down", player.face_down, faceDownCards),
		];
		const node = el("div", { class: "player" + (player.current ? " current" : "") },
			el("strong", { class: "player-name" }, player.name),
			player.character ? el("span", { class: "player-character" }, player.character) : "",
			player.current ? el("span", { class: "current-turn" }, "Turn") : "",
			el("div", { class: "player-zones" }, zones));
		if (player.tags.length) {
			node.append(el("div", { class: "player-tags" }, ...player.tags.map((tag) => el("span", { class: "tag" }, tag))));
		}
		if (player.vivid_available) {
			node.append(el("button", {
				class: "secondary",
				onclick: () => send({ type: "vivid_skip", target: player.index }),
			}, "Vivid Imagination: skip to this turn"));
		}
		if (player.vivid_expand_available) {
			node.append(el("button", {
				class: "secondary",
				onclick: () => send({ type: "vivid_expand", target: player.index }),
			}, "Spend a Joker to expand Vivid Imagination"));
		}
		if (player.mahito_army_available) {
			const targetValue = player.mahito_army_auto_value ? ` to ${player.mahito_army_auto_value}` : "";
			node.append(el("button", {
				class: "secondary",
				onclick: () => send({ type: "transfigured_army", target: player.index }),
			}, `Transfigured Army: change both pile tops${targetValue}`));
		}
		(index % 2 === 0 ? left : right).append(node);
	});
}

function renderHand() {
	const st = state;
	const cards = $("cards");
	const actions = $("actions");
	const draw = $("draw-choice");
	cards.replaceChildren();
	actions.replaceChildren();
	draw.replaceChildren();

	if (st.phase === "over") {
		$("hand-title").textContent = "Final standings";
		const table = el("table", { class: "standings" });
		st.standings.forEach((row) => {
			table.append(el("tr", {},
				el("td", {}, `${row.rank}.`), el("td", {}, row.name),
				el("td", {}, row.status), el("td", {}, `Round ${row.round}, Turn ${row.turn}`)));
		});
		cards.append(table);
		return;
	}

	if (st.phase === "setup") {
		$("hand-title").textContent = `${st.me.name}: choose 3 face-up cards | ${setupSel.size}/3 selected`;
		st.me.hand.forEach((card, index) => {
			cards.append(cardNode(card, {
				selected: setupSel.has(index),
				onclick: () => {
					if (setupSel.has(index)) setupSel.delete(index);
					else if (setupSel.size < 3) setupSel.add(index);
					render();
				},
			}));
		});
		actions.append(el("button", {
			class: "primary",
			disabled: setupSel.size !== 3,
			onclick: () => {
				const picks = [...setupSel];
				setupSel = new Set();
				send({ type: "setup", cards: picks });
			},
		}, "Set face-up cards"));
		return;
	}

	const me = st.me;
	const source = me.source;
	const revealing = me.mode === "reveal";
	const choosing = ["give_card", "swap_one", "swap_pair"].includes(me.mode);
	if (!choosing && choiceMode) {
		choiceCards = new Set();
		choiceMode = "";
	}
	if (choosing && choiceMode !== me.mode) {
		choiceMode = me.mode;
		choiceCards = new Set(me.required_indices || []);
	}
	if (choosing) {
		$("hand-title").textContent = me.mode === "swap_pair"
			? `Choose ${me.choice_count} card(s) for Swap Pair`
			: `Choose a card for ${me.mode.replace("_", " ")}`;
	} else if (!me.is_current) {
		$("hand-title").textContent = st.players[st.current].bot ? "Bots are playing" : `Waiting for ${st.players[st.current].name}`;
	} else if (revealing) {
		$("hand-title").textContent = `${me.name}: choose a card from your hand to reveal`;
	} else {
		$("hand-title").textContent = source
			? `${st.hot_seat ? me.name + "'s" : "Your"} ${source.replace("_", " ")}`
			: "No cards available";
	}
	if (!choosing && me.hand_size !== 3) $("hand-title").textContent += ` (hand size ${me.hand_size})`;
	const handEntries = me.hand.map((card, index) => ({ card, index }));
	if (sortHandByValue) handEntries.sort((a, b) =>
		(CARD_RANK_VALUES[a.card.rank] ?? 15) - (CARD_RANK_VALUES[b.card.rank] ?? 15));
	const handCards = handEntries.map(({ card, index }) => {
		const allowedChoice = !choosing || me.choice_indices.includes(index);
		const active = choosing ? allowedChoice : me.is_current && (revealing || source === "hand");
		const options = active ? {
			selected: choosing ? choiceCards.has(index) : !revealing && selCard === index,
			disabled: choosing && choiceCards.size >= me.choice_count && !choiceCards.has(index),
			onclick: () => {
				if (choosing && me.mode !== "swap_pair") send({ type: "choose_card", card: index });
				else if (choosing) {
					if (choiceCards.has(index)) choiceCards.delete(index);
					else if (choiceCards.size < me.choice_count) choiceCards.add(index);
					render();
				} else if (revealing) send({ type: "reveal", card: index });
				else { selCard = index; render(); }
			},
		} : {};
		return cardNode(card, options);
	});
	const faceUpCards = me.face_up.map((card, index) => {
		const active = me.is_current && !revealing && source === "face_up";
		const options = active ? { selected: selCard === index, onclick: () => { selCard = index; render(); } } : {};
		return cardNode(card, options);
	});
	const faceDownCards = me.face_down.map((card, index) => {
		const active = me.is_current && !revealing && source === "face_down";
		const options = active ? { selected: selCard === index, onclick: () => { selCard = index; render(); } } : {};
		return hiddenNode(index, card.known, options);
	});
	cards.append(el("div", { class: "own-card-zones" },
		playerZone("Hand", me.hand.length, handCards),
		playerZone("Face-Up", me.face_up.length, faceUpCards),
		playerZone("Face-Down", me.face_down.length, faceDownCards)));
	const ownTags = st.players[st.viewer]?.tags || [];
	if (ownTags.length) {
		cards.append(el("div", { class: "player-tags own-player-tags" },
			...ownTags.map((tag) => el("span", { class: "tag" }, tag))));
	}

	if (st.draw_choice) {
		draw.append(el("p", { class: "draw-prompt" }, "Mastered Six Eyes: choose a card to draw."));
		for (let pileIndex = 0; pileIndex < st.draw_piles.length; pileIndex++) {
			const choices = st.draw_choice.filter((choice) => choice.pile === pileIndex);
			if (!choices.length) continue;
			draw.append(el("div", { class: "draw-choice-group" },
				el("strong", {}, `Pile ${pileIndex + 1}`),
				...choices.map((choice) => cardNode(cardFromLabel(choice.label), {
					compact: true,
					onclick: () => send({ type: "draw_pref", pile: choice.pile, depth: choice.depth }),
				}))));
		}
	}

	if (!revealing && st.all_humans_finished) {
		actions.append(el("button", { class: "primary", onclick: () => { fastForward = true; applyState(state); } }, "Skip to results"));
		return;
	}
	if (choosing && me.mode === "swap_pair") {
		actions.append(el("button", {
			class: "primary",
			disabled: choiceCards.size !== me.choice_count || (me.required_indices || []).some((index) => !choiceCards.has(index)),
			onclick: () => send({ type: "choose_card", cards: [...choiceCards] }),
		}, "Confirm Swap Pair cards"));
		return;
	}
	if (choosing) return;
	if (me.is_current && !revealing) {
		const canPlay = source && selCard !== null && selPile !== null && !me.pending && !st.draw_choice;
		const moreTurns = Math.max(0, (me.turns_remaining || 1) - 1);
		const endTurnLabel = moreTurns
			? `End current turn (${moreTurns} more turn${moreTurns === 1 ? "" : "s"})`
			: "End turn";
		actions.append(
			el("button", {
				class: "primary",
				disabled: !canPlay,
				onclick: () => send({ type: "play", card: selCard, pile: selPile }),
			}, source === "face_down" ? "Reveal and play" : "Play selected card"),
			el("button", { disabled: !st.me.can_pickup, onclick: () => send({ type: "take_piles" }) }, "Pick up discard piles (end turn)"),
			el("button", { disabled: !me.can_end, onclick: () => send({ type: "end_turn" }) }, endTurnLabel),
		);
	}
	if (revealing) return;
	st.buttons.forEach((button) => {
		if (button.info) {
			actions.append(el("span", { class: "info" }, button.label));
			return;
		}
		const extra = button.id === "cleave" ? { pile: selPile }
			: Object.fromEntries(["ability", "rank", "target"].filter((key) => button[key] !== undefined).map((key) => [key, button[key]]));
		const enabled = button.enabled && (button.id !== "cleave" || (selPile !== null && st.discards[selPile].count > 0));
		actions.append(el("button", {
			class: button.inactive ? "locked-ability" : "",
			disabled: !enabled,
			onclick: () => button.id === "enchain"
				? showEnchainSchedule("enchain", "Schedule Enchain")
				: send({ type: button.id, ...extra }),
		}, button.label));
	});
}
