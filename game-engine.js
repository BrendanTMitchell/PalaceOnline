"use strict";

(() => {
	const SUITS = ["Clubs", "Diamonds", "Hearts", "Spades"];
	const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
	const VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 2]));
	const MAX_PLAYERS = 12;
	const DEFAULTS = { players: 6, decks: 3, jokers: 8 };
	const RANDOM = "Random";
	const RULES = {
		"Immunity": "Choose I-T, I-D, or I-S. I-T blocks all negative effects for this round. I-D blocks a negative effect unless its source has a higher highest-value card. I-S blocks the selected number of effects (3 by default). Immunity never prevents picking up discard piles.",
		"I-T": "True immunity: block all negative effects from other players while active.",
		"Stack destroy": "When you stack at least two cards of the same value, destroy the entire discard pile as a 10 would. This is not a default rule unless an ability grants it.",
		"Quick Grab": "When another player plays a specific card value, this player can take that card into their hand.",
		"Soul Swap": "Two players swap all their cards, including face-up and face-down cards.",
		"Card Swapping": "At the start of your turn, swap a card of the selected value for a face-up card or any card in a discard or destroyed pile.",
		"Under Play": "You may play a card exactly one value lower than the top of a discard pile.",
		"Skip Play": "You may play a card within two values above or below the top of a discard pile. This stacks with Under Play.",
		"Value Inversion": "After you play the selected rank, reverse card values until the round ends (3 becomes an Ace, an Ace becomes a 3, and a 2 stays a 2). Value increases and decreases are doubled while inverted.",
		"Turn Reversal": "The player who took the turn immediately before you gets the next turn; normal turn order resumes after that.",
		"Follow Stacking": "Once per round, when another player plays a rank you hold, you may stack a matching card on that pile. It cannot be used during a canceled turn.",
		"Top card discard": "On your turn, move the top card from one chosen discard pile to the destroyed pile. This rule can be used once per turn.",
		"Turn Cancel": "Cancel one player's next turn. For 3 rounds (this round and the next two), you cannot be turn-canceled or have your effects removed.",
		"Free Cards": "Choose a card value. Once per turn, a card of that value can be played on any discard pile regardless of its value.",
		"Black Flash": "Play the card value chosen for this round to land a Black Flash. Each Black Flash can temporarily evolve one unused ability for this round.",
		"Meters": "Gain one visible meter. Meters are a currency for character abilities that use them.",
		"Value Decrease": "Decrease every discard-pile card value by one. Cards reduced to 1 are destroyed along with the cards beneath them.",
		"Value Increase": "Increase every discard-pile card value by one. A pile raised above Ace accepts any next card, even during the same turn.",
		"Hand Lock": "For the next two rounds, a chosen player cannot draw up to their hand limit or change their hand through swapping.",
		"Pile Lock": "Protect one discard pile from destruction until your next turn.",
		"Chain Play": "Once per turn, play a card up to three values above or below the top card.",
		"Discard Swap": "Once per turn, put a card from your hand at the bottom of a chosen discard pile and take that pile's top card.",
		"Sneak Peek": "View the top two cards of a draw pile and return them in either order.",
		"Swap 1": "Once per turn after drawing, swap one drawn card with another player's hand. If it would be your highest or lowest card, swap with their matching extreme; otherwise they choose a non-extreme card unless you can see their hand.",
		"Pile Boost": "Once per round, add the other discard pile's value to the pile you are playing on. A value above Ace accepts any next card.",
		"Burn One": "Discard a face-up card; a player of your choice gives you one card.",
		"Reveal": "Once per round, each player chooses one hidden card to reveal until it is played. If you can see a hand, you may also choose one of its cards to reveal.",
		"Rescue Draw": "Once every 2 rounds you can choose to draw 2 cards from the draw pile or if the draw pile is gone you can take 1 card of your choice from the destroyed pile.",
		"Swap Pair": "Once per round, choose a player and swap two cards from each of your hands. If you select your highest or lowest card, they must select their matching extreme.",
		"Stack Steal": "When another player destroys a discard pile by stacking, take one card from the destroyed pile.",
		"Top Swap": "Once per round, swap the top values of the two discard piles.",
		"Tie Break": "Choose a discard pile. The next player to play there must match its exact top value or forfeit their turn.",
		"Peek Swap": "Once per round, view the top three cards of a draw pile and swap one with a card from your hand.",
		"Split Steal": "When you destroy a discard pile, take one card from each discard pile. You cannot take a 10.",
		"Delay Destroy": "Once per round, delay a discard-pile destruction until the next round.",
		"Forced Play": "Once per round on your turn, choose another player to play one card on either discard pile.",
		"Limit Play": "For one round, you can play at most five cards per turn. This does not override another character's card-play requirements.",
	};
	const DOMAIN_RULE = "Domain Clashing: Each unlocked ability with (Domain) in its name can open a domain. Opening a second domain starts a clash.\n- A domain's refinement decreases naturally only while at least two domains are clashing. A domain at 0 refinement breaks; the domain with greater remaining refinement survives the clash.\n- Each turn while clashing, a domain owner may draw a card: a royal card (Jack, Queen, King, or Ace) shields their domain from the next refinement decrease, a Joker adds 1 refinement, and a 2-5 removes 1 refinement.\n- Domain effects are disabled during a clash. Simple Domain is not a domain and does not reduce or clash with a domain's refinement; it protects its user from domain effects, and its own refinement decreases while it protects against an active domain.\n- With 3 or more domains open, a player who doesn't own a clashing domain can expend a Joker to decrease one domain's refinement by 1.\n- A domain stays open until it breaks, shatters, a player picks up the piles or has a turn canceled, or its time limit runs out.";
	const CHARACTERS = {
		Sukuna: [
			{ ability: "Cleave", description: "This player can use top card discard once per round.", rules: ["Top card discard"], evolution: { ability: "Spider Net Cleave", description: "Your top card discard from Cleave gains 5 uses per round and now whenever it causes a pile to lose all of its card the other pile will be destroy for free and you can replace both piles for free forcing them to place 1 card from their hand in each pile." } },
			{ ability: "World Cutting Slash", description: "Whenever this player plays a King, they can choose a card to delete from the game, then choose another player and increase their Cut Meter by 1. At 9, that player is eliminated and gets last place.", evolution: { ability: "Waffle Cutting Slash", description: "Whenever this player uses World Cutting Slash, it counts as using it 3 times. This player's Kings can be played on top of any card regardless of when in the turn it is." } },
			{ ability: "Enchain", description: "Once per game, schedule Enchain to activate after a chosen number of turns. When it activates, this player Soul Swaps with another player and must play 2 cards in a row while immune to other players' effects.", rules: ["Soul Swap"], evolution: { ability: "Rule Workaround", description: "This player may choose to activate Enchain or reschedule it when it becomes due. During the 2 cards played from Soul Swapping, this player can ignore card values.", rules: ["Soul Swap"] } },
			{ ability: "Binding Vow", description: "In exchange for passing up a turn, any of your cards can be played as a king.", evolution: { ability: "Binding Vow Merchant", description: "Any of this player's cards can be stacked on top of a king." } },
			{ ability: "God of Jujutsu", description: "This player can once per round use 1 multi use rule of their choice. This player is also completley immune to having other players swap card with them or use soul swap on them." },
		],
		Gojo: [
			{ ability: "Hollow Purple", description: "This player gains the ability to stack destroy", rules: ["Stack destroy"], evolution: { ability: "Max Purple", description: "When this player plays 3 cards in a row it will activate stack destroy as if they stacked 2 cards in a row." } },
			{ ability: "Limitless Barrier", description: "Whenever this player plays an Ace, they will gain a passive for however many they stacked. For 1 Ace, the player will gain I-T for 2 rounds. For 2 Aces, they will gain all of the previously listed abilities along with being able to pick up one of their face-down cards. For 3 Aces, the player will be able to pick up all of their face-down cards, along with I-T being applied for 3 rounds. Should 4 Aces be played, this player will be able to replace their hand with cards from the deleted pile along with this ability instantly being upgraded.", rules: ["I-T"], evolution: { ability: "Perfected Limitless", description: "When this ability is evolved this player will gain I-T for the rest of the game along with gaining the Quick Grab ability for Aces.", rules: ["I-T", "Quick Grab"] } },
			{ ability: "Lapse Blue", description: "Card Swapping with 5's and apply reveal on every other player when swapping cards.", rules: ["Card Swapping", "Reveal"], evolution: { ability: "Reversal Red", description: "The user can use card swapping with the card values of 6 and 9 now along with gaining rescue draw.", rules: ["Card Swapping", "Rescue Draw"] } },
			{ ability: "Six Eyes", description: "Once per round on their turn, this player can view one of their face-down cards or see another player's hand.", evolution: { ability: "Mastered Six Eyes", description: "This player gains Full Hand and can automatically check opponents' cards at the start of each turn. The manual Six Eyes view remains limited to once per round. Before drawing, they can view the top 3 cards in both draw piles and choose 1 to draw.", rules: ["Full Hand"] } },
			{ ability: "Simple Domain", description: "This player grants themselves a domain refinement of 3. This player can also 1 time per round discard a card in their hand to remove a negative effect from themselves." },
		],
		"Yuji Itadori": [
			{ ability: "Black Flash", description: "Every time this player plays a 7, they land a Black Flash. This player's 7s are free cards.", evolution: { ability: "Blessed By The Sparks Of Black", description: "Whenever any player lands a Black Flash, this player gains an extra turn, up to 3 extra turns per round. Each Black Flash lets this player choose one additional card rank that will trigger their Black Flash. This player can also spend a Joker to expand the triggering ranks." } },
			{ ability: "Divergent Fist", description: "This player has Follow Stacking and can choose one card per turn to play regardless of the pile's top value.", evolution: { ability: "Delayed Black Flash", description: "Whenever this player Follow Stacks, it counts as a Black Flash. Once per round this player can choose a card that they played, that is currently in the pile, and that didn't activate Black Flash to instantly activate Black Flash and to destroy the pile." } },
			{ ability: "Cleave", description: "This ability is unavailable until this player has landed a Black Flash within the past round. While available, this player gains Stack Destroy and may delete one card from their hand whenever they Stack Destroy.", evolution: { ability: "Soul Slashing Dismantles", description: "This ability is unavailable until this player has landed a Black Flash within the past round. Whenever this player Follow Stacks, the target gains 1 Soul Separation. Every 2 marks remove an upgraded ability; every 3 marks remove a base ability. The target chooses which ability is lost. If the target has no abilities left, a Black Flash from Follow Stacking eliminates them." } },
			{ ability: "Blood Manipulation", description: "While this player has more than 3 cards in hand, they may destroy any card in their hand. This ability may be used without a limit.", evolution: { ability: "Reversed Cursed Technique", description: "Whenever this player picks up a card, they draw one extra card. The first Black Flash they land each round also draws 3 cards." } },
			{ ability: "Prisoners Soul", description: "Other players cannot interact with this player's cards. Once per round, if another player attempts to interact with one, this player may delete a card from their hand. Attempts to Soul Swap with this player or remove one of their abilities instead jump to this player's turn and grant them 2 extra turns." },
		],
		"Aoi Todo": [
			{ ability: "Boogie Woogie", description: "At the start of this player's turn, they can swap one card of any value. Once per game, this player can Soul Swap with any player.", rules: ["Card Swapping"], evolution: { ability: "Vibraslap", description: "This player gains one swap for every turn that passes after gaining Vibraslap. This player loses access to Boogie Woogie.", rules: ["Card Swapping"] } },
			{ ability: "Black Flash", description: "Whenever this player plays an 8, they land a Black Flash and gain Follow Stacking for 2 rounds.", evolution: { ability: "Best Brother", description: "Whenever this player is turn canceled, they may choose another player to be turn canceled instead. That player chooses one of their cards and one of this player's revealed hand, face-up, or face-down cards to swap." } },
			{ ability: "Built Different", description: "This player gains Stack Destroy. They may spend one available swap to use one multi-use rule once, up to 3 times per round.", rules: ["Stack destroy"], evolution: { ability: "What's Your Type?", description: "Whenever another player swaps one of this player's cards, this player may destroy the card swapped to them. This can be used without a limit, but must be resolved before a card is played or another card is swapped.", rules: ["Stack destroy"] } },
			{ ability: "Arm Sacrifice", description: "When an effect would eliminate this player, they automatically avoid it by losing access to Boogie Woogie. This ability cannot be used after gaining Vibraslap.", evolution: { ability: "Vivid Imagination", description: "Whenever any player plays a Queen, gain one Takada-Chan's Biggest Fan meter. Spend a meter to skip to this player's turn, up to 3 times per game. Spend a Joker to increase this limit by 1." } },
			{ ability: "Simple Domain", description: "This player gains a domain refinement of 3. Once per round, they may discard a card from their hand to remove a negative effect." },
		],
		Mahito: [
			{ ability: "Body Manipulation", description: "Once at the start of each turn, choose the total size of this player's hand, face-up, and face-down zones. Face-down cards are automatically moved first; this player chooses which face-up cards to keep. Removed cards go into a private draw pile only this player can draw from.", evolution: { ability: "Self Clones", description: "At 4 or more hand cards, this player gains one extra turn per two cards in hand, rounded down. For example, 15 cards grant 7 extra turns." } },
			{ ability: "Transfigured Humans", description: "Once per round, change the value of the next card this player plays to any value without ending the turn.", evolution: { ability: "Transfigured Army", description: "Once during every player's turn, change the top value of both discard piles. Set an automatic value to apply it without choosing each time." } },
			{ ability: "Idle Transfiguration", description: "Remove one of this player's abilities to remove one ability from another player.", evolution: { ability: "Self Embodiment of Perfection (Domain)", description: "Open a refinement-1 domain for 3 rounds. While it is not clashing, cancel up to 2 players' turns and remove 1 unlocked ability from a player each round. When it ends, this player enters 3 rounds of burnout, losing all abilities except Black Flash. Shattering the domain cancels every unprotected opponent's turn, removes one ability from each, and defeats clashing domains with refinement below 5." } },
			{ ability: "Soul Touch", description: "Once per round, set another player's hand size to 2-6 for 3 rounds.", evolution: { ability: "Refined Soul", description: "Whenever another player's hand size is altered, apply Hand Lock to them." } },
			{ ability: "Black Flash", description: "Whenever this player plays a Jack, they land a Black Flash and recover all abilities suppressed by burnout." },
		],
	};
	const characterCatalog = Object.entries(CHARACTERS).map(([name, tracks]) => ({
		name,
		tracks: tracks.map((track) => ({
			...track,
			rules: track.rules || [],
			evolution: track.evolution ? { ...track.evolution, rules: track.evolution.rules || [] } : undefined,
		})),
	}));

	const rankValue = (card, jokerValue = null) => card.rank === "Joker" ? (jokerValue || 14) : VALUES[card.rank];
	const cardText = (card) => card.rank === "Joker" ? "Joker" : `${card.rank} of ${card.suit}`;
	const shuffle = (items) => {
		for (let i = items.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[items[i], items[j]] = [items[j], items[i]];
		}
		return items;
	};
	const card = (rank, suit = "", deck_number = 0) => ({ rank, suit, deck_number });
	const playerName = (index, bots, humanCount) => bots[index] ? `Bot ${bots.slice(0, index + 1).filter(Boolean).length}` : humanCount === 1 ? "You" : `Player ${index + 1}`;

	class Game {
		constructor(rows, decks, jokers, startWithJoker = false) {
			const bots = rows.map((row) => row.type === "Bot");
			const humanCount = bots.filter((isBot) => !isBot).length;
			let deck = [];
			for (let n = 0; n < decks; n++) for (const suit of SUITS) for (const rank of RANKS) deck.push(card(rank, suit, n));
			for (let n = 0; n < jokers; n++) deck.push(card("Joker", "", 3));
			shuffle(deck);
			this.log = [];
			this.start_with_joker = startWithJoker;
			this.players = rows.map((row, index) => {
				const character = row.character === RANDOM ? Object.keys(CHARACTERS)[Math.floor(Math.random() * Object.keys(CHARACTERS).length)] : row.character;
				return {
					name: playerName(index, bots, humanCount), character, bot: bots[index],
					hand: [], face_up: [], face_down: [], ability_states: Object.fromEntries(CHARACTERS[character].map((track) => [track.ability, { removed: false, evolved: false, uses: 0, round: 0 }])),
					cut_meter: 0, is_eliminated: false, enchain_used: false, enchain_scheduled_turn: null, vow_card: null, god_rule: "", god_round: 0,
					revealed_cards: [], known_cards: [], it_until_round: 0, simple_domain_active: false, simple_domain_used: false,
					cleanse_round: 0, rescue_round: -99, pending_world_slashes: 0, pending_limitless_effects: [], ace_streak: 0,
					god_rule_used: false, god_rule_param: null, immunity: null, cancel_immunity_until: 0,
					turn_cancelled: false, meter: 0, hand_lock_until_round: 0,
					allow_next_effect: false,
					full_hand_round: 0, full_hand_plays: 0, limit_play_until_round: 0, temporary_evolutions: {}, rule_uses: {},
					black_flash_ranks: character === "Yuji Itadori" ? ["7"] : character === "Aoi Todo" ? ["8"] : character === "Mahito" ? ["Jack"] : [],
					last_black_flash_round: -99, black_flash_count: 0, black_flash_round: 1, black_flash_round_count: 0,
					black_flash_turns: 0, black_flash_turns_granted: 0,
					black_flash_turn_round: 1, soul_separation: 0, soul_upgrades_lost: 0, soul_bases_lost: 0,
					prisoner_soul_used_round: -1,
					aoi_follow_until_round: 0, boogie_swap_used_turn: -1, boogie_soul_swap_used: false,
					vibraslap_acquired_turn: null, vibraslap_swaps_spent: 0, built_different_round: -1,
					built_different_uses: 0, takada_meter: 0, vivid_uses: 0, vivid_limit_bonus: 0,
					arm_sacrifice_used: false, built_different_rule: null, built_different_rule_used: false,
					todo_built_different_resolving: false,
					personal_draw_pile: [], body_manipulation_turn: -1, self_clone_turns: 0, self_clone_turns_used: 0, self_clone_round: -1,
					transfigured_next_value: null, transfigured_used_round: -1,
					transfigured_army_used_turn: -1, transfigured_army_auto_value: null,
					hand_size_override: null, hand_size_until_round: -1, hand_size_source: null,
					mahito_domain_cancel_round: -1, mahito_domain_cancel_count: 0, mahito_domain_remove_round: -1,
					mahito_burnout_until_round: -1, simple_domain_refinement: 3, domain_draw_turn: -1,
				};
			});
			for (const p of this.players) {
				p.face_down = [deck.pop(), deck.pop(), deck.pop()];
				p.hand = Array.from({ length: 6 }, () => deck.pop());
			}
			this.draw_piles = [[], []];
			deck.forEach((c, i) => this.draw_piles[i % 2].push(c));
			this.draw_piles.forEach(shuffle);
			this.discards = [[], []];
			this.play_metadata = new WeakMap();
			this.destroyed = [];
			for (let i = 0; i < 2; i++) {
				if (!this.draw_piles[i].length) continue;
				let c = this.draw_piles[i].pop();
				while (c.rank === "Joker" && this.draw_piles[i].some((x) => x.rank !== "Joker")) {
					this.draw_piles[i].push(c); shuffle(this.draw_piles[i]); c = this.draw_piles[i].pop();
				}
				if (c.rank === "10") this.destroyed.push(c);
				else this.discards[i].push(c);
			}
			this.pile_values = this.discards.map((pile) => pile.length ? rankValue(pile.at(-1)) : 14);
			this.pile_last_player = [null, null];
			this.pile_value_history = this.discards.map((pile) => pile.length ? [rankValue(pile.at(-1))] : []);
			this.pile_owner_history = this.discards.map((pile) => pile.length ? [null] : []);
			this.deleted = [];
			this.current = 0;
			this.turn = 1;
			this.round = 1;
			this.cards_played = 0;
			this.turn_pile = null;
			this.turn_pile_destroyed = false;
			this.winner = null;
			this.finish_order = [];
			this.last_drawn = [];
			this.domains = [];
			this.enchain_player = null;
			this.enchain_remaining = 0;
			this.pending_quick_grabs = [];
			this.pending_reveals = [];
			this.pending_stack_steals = [];
			this.pending_black_flash_evolutions = [];
			this.pending_follow_stacks = [];
			this.pending_swap_one = [];
			this.pile_locks = [null, null];
			this.pile_over_ace = [false, false];
			this.delayed_destruction = [null, null];
			this.tie_breaks = [null, null];
			this.value_inversion = null;
			this.next_player_override = null;
			this.forced_play = null;
			this.next_player_override_skip_bonus = false;
			this.pending_card_choice = null;
			this.pending_black_flash_expansions = [];
			this.pending_ability_losses = [];
			this.pending_hand_deletes = [];
			this.pending_cleave_deletes = [];
			this.pending_best_brothers = [];
			this.pending_best_brother_swaps = [];
			this.pending_todo_swap_destroys = [];
			this.next_player_override_crosses_round = false;
			this.drawPref = null;
			this.human_has_played = false;
			this.notice = "Choose three cards to keep face-up for later.";
			this.popup = null;
			this.bot_messages = [];
			this.record("Game started.");
		}
		record(message) { this.log.push(`${new Date().toLocaleString()} | ${message}`); }
		effective(index, base = null) {
			const p = this.players[index];
			if (p.character === "Mahito" && this.round <= p.mahito_burnout_until_round && base !== "Black Flash") return null;
			for (const track of CHARACTERS[p.character]) {
				if (track.ability !== base && track.evolution?.ability !== base) continue;
				const state = p.ability_states[track.ability];
				if (p.temporary_evolutions?.[track.ability] >= this.round) return track.evolution.ability;
				if (state.evolved) return track.evolution.ability;
				if (state.removed || state.base_lost || track.ability !== base) return null;
				return track.ability;
			}
			return null;
		}
		has(index, ability) { return this.effective(index, ability) !== null; }
		immune(index) {
			const p = this.players[index];
			return this.effective(index, "Limitless Barrier") === "Perfected Limitless"
				|| this.round <= p.it_until_round || p.god_rule === "I-T"
				|| p.immunity?.type === "I-T" && p.immunity.until_round >= this.round
				|| this.enchain_player === index && this.enchain_remaining > 0;
		}
		highestValue(index) {
			return [...this.players[index].hand, ...this.players[index].face_up, ...this.players[index].face_down]
				.reduce((highest, current) => Math.max(highest, this.cardValue(index, current)), 0);
		}
		blocksEffect(target, source, consumeShield = false, effect = null) {
			if (target === source) return false;
			const player = this.players[target];
			if (player.allow_next_effect) {
				if (consumeShield) player.allow_next_effect = false;
				return false;
			}
			if (effect === "Turn Cancel" && player.cancel_immunity_until >= this.round) return true;
			if (this.immune(target)) return true;
			if (player.immunity?.type === "I-D" && player.immunity.until_round >= this.round) {
				return source !== null && this.highestValue(source) <= this.highestValue(target);
			}
			if (player.immunity?.type === "I-S" && player.immunity.until_round >= this.round) {
				if (player.immunity.shields > 0) {
					if (consumeShield) player.immunity.shields--;
					return true;
				}
				player.immunity = null;
			}
			return false;
		}
		hasBlackFlashRecently(index) {
			const player = this.players[index];
			return player.character === "Yuji Itadori" && this.round - player.last_black_flash_round <= 1;
		}
		blackFlashOptions(index) {
			const player = this.players[index];
			return CHARACTERS[player.character].filter((track) => {
				const state = player.ability_states[track.ability];
				return track.evolution && state && !state.removed && !state.evolution_lost && !state.evolved
					&& player.temporary_evolutions[track.ability] !== this.round;
			});
		}
		canLandBlackFlash(index) {
			const player = this.players[index];
			return player.black_flash_round !== this.round || player.black_flash_round_count < 4;
		}
		blackFlashTriggeredBy(index, rank) {
			const player = this.players[index];
			const characterTrigger = ["Yuji Itadori", "Aoi Todo", "Mahito"].includes(player.character)
				&& this.effective(index, "Black Flash") && player.black_flash_ranks.includes(rank);
			const chosenTrigger = player.god_rule === "Black Flash" && player.god_round === this.round
				&& player.god_rule_param === rank;
			const builtTrigger = player.built_different_rule === "Black Flash" && !player.built_different_rule_used
				&& player.god_rule_param === rank;
			return this.canLandBlackFlash(index) && Boolean(characterTrigger || chosenTrigger || builtTrigger);
		}
		hasReversedCursedTechnique(index) {
			return this.effective(index, "Blood Manipulation") === "Reversed Cursed Technique";
		}
		drawReversedCursedTechnique(index) {
			const player = this.players[index];
			if (!this.hasReversedCursedTechnique(index)
				|| player.rule_uses["Reversed Cursed Technique"] === this.round) return;
			player.rule_uses["Reversed Cursed Technique"] = this.round;
			for (let drawnCount = 0; drawnCount < 3; drawnCount++) {
				const pile = this.draw_piles.find((entry) => entry.length);
				if (!pile) break;
				player.hand.push(pile.pop());
			}
		}
		drawPickupBonus(index, count) {
			if (!this.hasReversedCursedTechnique(index)) return;
			const player = this.players[index];
			for (let drawnCount = 0; drawnCount < count; drawnCount++) {
				const pile = this.draw_piles.find((entry) => entry.length);
				if (!pile) break;
				player.hand.push(pile.pop());
			}
		}
		landBlackFlash(index, playedCard = null) {
			const player = this.players[index];
			if (!this.canLandBlackFlash(index)) return false;
			if (player.black_flash_round !== this.round) {
				player.black_flash_round = this.round;
				player.black_flash_round_count = 0;
			}
			player.black_flash_round_count++;
			this.consumeBuiltRule(index, "Black Flash");
			if (playedCard) this.play_metadata.set(playedCard, {
				player: index,
				black_flash_activated: true,
			});
			player.last_black_flash_round = this.round;
			player.black_flash_count++;
			this.record(`${player.name} landed a Black Flash.`);
			if (player.character === "Mahito" && this.round <= player.mahito_burnout_until_round) {
				player.mahito_burnout_until_round = this.round - 1;
				this.record(`${player.name} recovered their abilities from burnout with Black Flash.`);
			}
			if (player.character === "Aoi Todo" && this.effective(index, "Black Flash")) {
				player.aoi_follow_until_round = Math.max(player.aoi_follow_until_round, this.round + 1);
			}
			const blackFlashOptions = this.blackFlashOptions(index);
			if (blackFlashOptions.length) {
				this.pending_black_flash_evolutions.push({
					target: index,
					choices: blackFlashOptions.map((track) => track.ability),
				});
			}
			this.drawReversedCursedTechnique(index, 3);
			for (let target = 0; target < this.players.length; target++) {
				const yuji = this.players[target];
				if (yuji.character !== "Yuji Itadori"
					|| this.effective(target, "Black Flash") !== "Blessed By The Sparks Of Black") continue;
				if (yuji.black_flash_turn_round !== this.round) {
					yuji.black_flash_turn_round = this.round;
					yuji.black_flash_turns_granted = 0;
				}
				if (yuji.black_flash_turns_granted < 3) {
					yuji.black_flash_turns++;
					yuji.black_flash_turns_granted++;
				}
				const choices = RANKS.filter((rank) => !yuji.black_flash_ranks.includes(rank));
				if (choices.length) this.pending_black_flash_expansions.push({ target, choices });
			}
			return true;
		}
		hasRule(index, rule) {
			const player = this.players[index];
			if (player.built_different_rule === rule && !player.built_different_rule_used) return true;
			if (player.god_rule === rule) return true;
			if (player.character === "Aoi Todo" && rule === "Follow Stacking"
				&& player.aoi_follow_until_round >= this.round) return true;
			if (player.character === "Yuji Itadori") {
				if (rule === "Stack destroy" && this.effective(index, "Cleave") && this.hasBlackFlashRecently(index)) return true;
				if (rule === "Follow Stacking" && this.effective(index, "Divergent Fist")) return true;
			}
			return CHARACTERS[player.character].some((track) => {
				const state = player.ability_states[track.ability];
				if (!state || state.removed) return false;
				const granted = state.evolved ? track.evolution.rules : track.rules;
				const active = state.evolved ? track.evolution.ability : track.ability;
				return active === rule || (granted || []).includes(rule);
			});
		}
		consumeBuiltRule(index, rule) {
			const player = this.players[index];
			if (player.built_different_rule !== rule || player.built_different_rule_used) return false;
			player.built_different_rule_used = true;
			return true;
		}
		tryArmSacrifice(index) {
			const player = this.players[index];
			const boogie = player.ability_states["Boogie Woogie"];
			if (player.character !== "Aoi Todo" || !["Arm Sacrifice", "Vivid Imagination"].includes(this.effective(index, "Arm Sacrifice"))
				|| !boogie || boogie.removed || boogie.evolved || boogie.base_lost || player.arm_sacrifice_used) return false;
			boogie.base_lost = true;
			player.arm_sacrifice_used = true;
			player.cut_meter = 0;
			this.record(`${player.name} used Arm Sacrifice, lost access to Boogie Woogie, and avoided elimination.`);
			return true;
		}
		cardInteractionBlocked(target, source, kind = "card") {
			const player = this.players[target];
			if (target === source || !this.effective(target, "Prisoners Soul")) return false;
			if (player.prisoner_soul_used_round !== this.round && player.hand.length) {
				player.prisoner_soul_used_round = this.round;
				this.pending_hand_deletes.push({ target, reason: "Prisoner's Soul retaliation" });
			}
			if (kind === "soul_swap" || kind === "ability_loss") {
				player.black_flash_turns += 2;
				this.next_player_override = target;
			}
			this.record(`${this.players[source].name} tried to interact with ${player.name}'s cards; Prisoner's Soul blocked it.`);
			return true;
		}
		cardValue(index, cardObj, jokerValue = null) {
			const value = rankValue(cardObj, jokerValue);
			const inversion = this.value_inversion && this.value_inversion.until_round >= this.round;
			return inversion && value !== 2 ? 17 - value : value;
		}
		isPileLocked(pile) { return Boolean(this.pile_locks[pile] && this.pile_locks[pile].owner !== null); }
		tieBreakApplies(pile, player) {
			return this.tie_breaks[pile] !== null && this.tie_breaks[pile] !== player;
		}
		canUsePileForCurrentTurn(pile) {
			return !(this.cards_played && this.turn_pile !== null && pile !== this.turn_pile
				&& (this.turn_pile_destroyed || !this.pile_over_ace[pile]));
		}
		syncPile(pile) {
			this.pile_values[pile] = this.pile_value_history[pile].at(-1) ?? 14;
			this.pile_last_player[pile] = this.pile_owner_history[pile].at(-1) ?? null;
			this.pile_over_ace[pile] = this.pile_value_history[pile].some((value) => value > 14);
		}
		modifyPileValues(delta) {
			if (this.value_inversion && this.value_inversion.until_round >= this.round) delta *= 2;
			for (let pileIndex = 0; pileIndex < 2; pileIndex++) {
				const pile = this.discards[pileIndex], history = this.pile_value_history[pileIndex];
				for (let index = 0; index < history.length; index++) {
					history[index] += delta;
					if (history[index] <= 1) {
						if (!this.isPileLocked(pileIndex)) {
							this.destroyed.push(...pile.splice(0, index + 1));
							history.splice(0, index + 1);
							this.pile_owner_history[pileIndex].splice(0, index + 1);
							break;
						}
					}
				}
				this.pile_over_ace[pileIndex] = history.some((value) => value > 14);
				this.pile_values[pileIndex] = history.at(-1) ?? 14;
			}
		}
		destroyPile(pileIndex, source, reason, stackDestroy = false) {
			const pile = this.discards[pileIndex], owner = this.players[source];
			if (!pile.length || this.isPileLocked(pileIndex)) return false;
			const delayer = this.players.findIndex((player, index) => this.hasRule(index, "Delay Destroy")
				&& player.rule_uses["Delay Destroy"] !== this.round);
			if (delayer >= 0) {
				this.players[delayer].rule_uses["Delay Destroy"] = this.round;
				this.consumeBuiltRule(delayer, "Delay Destroy");
				this.delayed_destruction[pileIndex] = { due_round: this.round + 1 };
				this.record(`${this.players[delayer].name} delayed destruction of discard pile ${pileIndex + 1}.`);
				return false;
			}
			if (this.delayed_destruction[pileIndex] && this.delayed_destruction[pileIndex].due_round > this.round) return false;
			if (source === this.current && this.cards_played > 0) {
				this.turn_pile = pileIndex;
				this.turn_pile_destroyed = true;
			}
			if (this.hasRule(source, "Split Steal")) {
				this.consumeBuiltRule(source, "Split Steal");
				for (let targetPile = 0; targetPile < 2; targetPile++) {
					const available = this.discards[targetPile];
					const index = available.findIndex((entry) => entry.rank !== "10");
					if (index < 0) continue;
					const [taken] = available.splice(index, 1);
					owner.hand.push(taken);
					this.pile_value_history[targetPile].splice(index, 1);
					this.pile_owner_history[targetPile].splice(index, 1);
					this.pile_values[targetPile] = this.pile_value_history[targetPile].at(-1) ?? 14;
					this.pile_last_player[targetPile] = this.pile_owner_history[targetPile].at(-1) ?? null;
				}
			}
			const destroyedCards = pile.splice(0);
			this.destroyed.push(...destroyedCards);
			this.pile_values[pileIndex] = 14;
			this.pile_last_player[pileIndex] = null;
			this.pile_value_history[pileIndex] = [];
			this.pile_owner_history[pileIndex] = [];
			this.pile_over_ace[pileIndex] = false;
			this.delayed_destruction[pileIndex] = null;
			this.record(reason);
			const stealers = stackDestroy ? this.players.map((player, index) => index)
				.filter((index) => index !== source && this.hasRule(index, "Stack Steal")
					&& !this.blocksEffect(index, source)) : [];
			stealers.forEach((index) => this.consumeBuiltRule(index, "Stack Steal"));
			if (stealers.length && destroyedCards.length) this.pending_stack_steals.push({ cards: destroyedCards, targets: stealers });
			return true;
		}
		finished(index) {
			const p = this.players[index];
			return p.is_eliminated || this.finish_order.some((row) => row.index === index);
		}
		bindingVowCards(index) {
			const p = this.players[index];
			if (p.hand.length) return p.hand;
			return this.draw_piles.some((pile) => pile.length) ? [] : p.face_up;
		}
		source(index) {
			const p = this.players[index];
			if (p.hand.length) return ["hand", p.hand];
			if (this.draw_piles.some((pile) => pile.length)) return ["hand", p.hand];
			if (p.face_up.length) return ["face_up", p.face_up];
			if (p.face_down.length) return ["face_down", p.face_down];
			return [null, []];
		}
		mustEnchain(index) {
			if (this.enchain_player !== index || this.enchain_remaining <= 0) return false;
			const p = this.players[index];
			if (!p.hand.length && this.draw_piles.some((pile) => pile.length)) return false;
			const [, cards] = this.source(index);
			return cards.some((c) => [0, 1].some((pile) => this.legal(c, pile, c.rank === "Joker" ? 14 : null)));
		}
		legal(cardObj, pile, jokerValue = null) {
			if (!this.canUsePileForCurrentTurn(pile)) return false;
			const p = this.players[this.current];
			if ((p.limit_play_until_round >= this.round || this.hasRule(this.current, "Limit Play"))
				&& this.cards_played >= 5 && this.enchain_player !== this.current) return false;
			const value = p.transfigured_next_value !== null
				? p.transfigured_next_value : this.cardValue(this.current, cardObj, jokerValue);
			const pileValue = this.pile_values[pile];
			if (this.tieBreakApplies(pile, this.current)) return value === pileValue;
			if (p.character === "Yuji Itadori" && this.effective(this.current, "Black Flash")
				&& cardObj.rank === "7") return true;
			if (this.pile_over_ace[pile] || this.hasRule(this.current, "Free Cards")
				&& this.freeCardMatches(this.current, value) && p.rule_uses["Free Cards"] !== this.turn) return true;
			if (this.enchain_remaining && this.enchain_player === this.current && this.effective(this.current, "Enchain") === "Rule Workaround") return true;
			if (!this.discards[pile].length) return true;
			const playsAsVow = p.vow_card === cardObj;
			const effectiveValue = playsAsVow ? 13 : value;
			const delta = effectiveValue - pileValue;
			const multiplier = this.value_inversion && this.value_inversion.until_round >= this.round ? 2 : 1;
			if (this.hasRule(this.current, "Under Play") && delta === -1 * multiplier) return true;
			if (this.hasRule(this.current, "Skip Play") && Math.abs(delta) <= 2 * multiplier) return true;
			if (this.discards[pile].length && this.hasRule(this.current, "Chain Play") && p.rule_uses["Chain Play"] !== this.turn
				&& Math.abs(delta) <= 3 * multiplier) return true;
			if (this.hasRule(this.current, "Free Cards") && this.freeCardMatches(this.current, value)
				&& p.rule_uses["Free Cards"] !== this.turn) return true;
			if (this.effective(this.current, "World Cutting Slash") === "Waffle Cutting Slash" && effectiveValue === 13) return true;
			if (this.effective(this.current, "Binding Vow") === "Binding Vow Merchant" && this.pile_last_player[pile] === this.current && this.pile_values[pile] === 13) return true;
			if (effectiveValue === 2) return this.cards_played === 0 || [2, 14].includes(pileValue);
			if (effectiveValue === 10 && this.cards_played === 0) return true;
			if (this.cards_played && this.pile_last_player[pile] === this.current) return delta >= 0 && delta <= multiplier;
			return cardObj.rank === "Joker" || effectiveValue >= pileValue;
		}
		refill(index) {
			const p = this.players[index];
			if (p.hand_lock_until_round >= this.round) {
				this.last_drawn = [];
				return;
			}
			this.last_drawn = [];
			while (p.hand.length < this.handSize(index) && (p.personal_draw_pile.length || this.draw_piles.some((pile) => pile.length))) {
				let drawn = p.personal_draw_pile.pop() || null;
				if (index === this.current && this.drawPref) {
					if (!drawn) {
						const [preferredPile, depth] = this.drawPref;
						const pile = this.draw_piles[preferredPile];
						if (pile && pile.length > depth) {
							[drawn] = pile.splice(pile.length - 1 - depth, 1);
						}
					}
					this.drawPref = null;
				}
				if (!drawn) {
					const pileIndex = this.draw_piles.findIndex((pile) => pile.length);
					drawn = this.draw_piles[pileIndex].pop();
				}
				p.hand.push(drawn);
				this.last_drawn.push(drawn);
				if (this.hasReversedCursedTechnique(index)) {
					const extraPile = this.draw_piles.find((pile) => pile.length);
					if (extraPile) {
						const extra = extraPile.pop();
						p.hand.push(extra);
						this.last_drawn.push(extra);
					}
				}
			}
		}
		refillUnderfilledHands() {
			for (let index = 0; index < this.players.length; index++) {
				const player = this.players[index];
				if (this.finished(index) || player.hand.length >= this.handSize(index)
					|| player.hand_lock_until_round >= this.round) continue;
				const previousDraws = this.last_drawn;
				this.refill(index);
				this.last_drawn = previousDraws;
			}
		}
		freeCardMatches(index, value) {
			const player = this.players[index];
			const selectedRank = (player.god_rule === "Free Cards" && player.god_round === this.round)
				|| (player.built_different_rule === "Free Cards" && !player.built_different_rule_used)
				? player.god_rule_param : null;
				return selectedRank !== null && VALUES[selectedRank] === value;
		}
		remember(viewer, c, owner = viewer) {
			const known = this.players[viewer].known_cards;
			this.players[viewer].known_cards = known.filter((row) => row.c !== c);
			this.players[viewer].known_cards.push({ c, owner });
		}
		known(viewer, c) { return this.players[viewer].known_cards.some((row) => row.c === c); }
		handSize(index) {
			const player = this.players[index];
			return player.hand_size_override !== null && player.hand_size_until_round >= this.round
				? player.hand_size_override : 3;
		}
		roundHandSize(index) {
			const player = this.players[index];
			if (player.hand_size_override !== null && player.hand_size_until_round < this.round) {
				player.hand_size_override = null;
				player.hand_size_source = null;
				if (player.hand.length > 3) {
					const returned = player.hand.splice(3);
					returned.forEach((entry, offset) => this.draw_piles[offset % this.draw_piles.length].push(entry));
					this.draw_piles.forEach(shuffle);
				}
			}
		}
		mahitoExtraTurns(index) {
			const player = this.players[index];
			if (this.effective(index, "Body Manipulation") !== "Self Clones" || player.hand.length < 4) return 0;
			return Math.floor(player.hand.length / 2);
		}
		prepareMahitoTurn(index) {
			const player = this.players[index];
			if (player.character !== "Mahito") return;
			if (player.self_clone_round !== this.round) {
				player.self_clone_round = this.round;
				player.self_clone_turns_used = 0;
			}
			if (this.effective(index, "Body Manipulation") !== "Self Clones") {
				player.self_clone_turns = 0;
				return;
			}
			player.self_clone_turns = Math.max(0, this.mahitoExtraTurns(index) - player.self_clone_turns_used);
		}
		place(c, pileIndex, jokerValue = null, source = "hand") {
			if (!this.canUsePileForCurrentTurn(pileIndex)) return null;
			const pile = this.discards[pileIndex];
			const p = this.players[this.current];
			const actual = p[source];
			const previous = this.pile_values[pileIndex];
			const vow = p.vow_card === c;
			const transfigured = p.transfigured_next_value !== null;
			const value = vow ? this.cardValue(this.current, card("King"))
				: transfigured ? p.transfigured_next_value : this.cardValue(this.current, c, jokerValue);
			const playedRank = c.rank === "Joker" ? RANKS[rankValue(c, jokerValue) - 2] : c.rank;
			const blackFlashTriggered = this.blackFlashTriggeredBy(this.current, playedRank);
			this.play_metadata.set(c, { player: this.current, black_flash_activated: Boolean(blackFlashTriggered) });
			const sameStack = pile.length && pile.at(-1).rank === c.rank
				&& Number.isInteger(this.pile_owner_history[pileIndex].at(-1));
			const delta = value - previous;
			const inverted = this.value_inversion && this.value_inversion.until_round >= this.round;
			const multiplier = inverted ? 2 : 1;
			if (this.hasRule(this.current, "Chain Play") && p.rule_uses["Chain Play"] !== this.turn
				&& Math.abs(delta) <= 3 * multiplier && (delta < 0 || delta > multiplier)) {
				p.rule_uses["Chain Play"] = this.turn;
				this.consumeBuiltRule(this.current, "Chain Play");
			}
			if (delta < 0 && this.hasRule(this.current, "Under Play") && delta >= -1 * multiplier) {
				this.consumeBuiltRule(this.current, "Under Play");
			}
			if (delta < 0 && this.hasRule(this.current, "Skip Play") && Math.abs(delta) <= 2 * multiplier) {
				this.consumeBuiltRule(this.current, "Skip Play");
			}
			const maxPurple = this.effective(this.current, "Hollow Purple") === "Max Purple" && this.cards_played % 3 === 2;
			const stackDestroy = Boolean(maxPurple || (sameStack && (this.has(this.current, "Hollow Purple") || this.hasRule(this.current, "Stack destroy"))));
			if (stackDestroy) this.consumeBuiltRule(this.current, "Stack destroy");
			pile.push(c);
			this.pile_values[pileIndex] = value;
			this.pile_last_player[pileIndex] = this.current;
			this.pile_value_history[pileIndex].push(value);
			this.pile_owner_history[pileIndex].push(this.current);
			this.pile_over_ace[pileIndex] = false;
			this.turn_pile = pileIndex;
			this.cards_played++;
			if (["face_up", "face_down"].includes(source) && p.full_hand_round === this.round && this.cards_played > 1) p.full_hand_plays++;
			if (this.enchain_player === this.current && this.enchain_remaining > 0) this.enchain_remaining--;
			if (source !== "draw") actual.splice(actual.indexOf(c), 1);
			if (transfigured) p.transfigured_next_value = null;
			for (const player of this.players) {
				player.known_cards = player.known_cards.filter((known) => known.c !== c);
				player.revealed_cards = player.revealed_cards.filter((known) => known !== c);
			}
			if (vow) p.vow_card = null;
			if (!vow && value === 10) {
				this.destroyPile(pileIndex, this.current, `${p.name} played ${c.rank === "10" ? "a 10" : "a Joker as 10"}; discard pile ${pileIndex + 1} was destroyed.`);
			} else if (stackDestroy) {
				const destroyed = this.destroyPile(pileIndex, this.current, `${p.name} triggered Stack Destroy on discard pile ${pileIndex + 1}.`, true);
				if (destroyed) {
					if (this.effective(this.current, "Cleave") && this.hasBlackFlashRecently(this.current) && p.hand.length) {
						this.pending_cleave_deletes.push({ target: this.current });
					}
				}
			} else {
				const label = vow ? `${cardText(c)} as a King (Binding Vow)` : c.rank === "Joker" ? `Joker as ${RANKS[value - 2]}` : cardText(c);
				this.record(`${p.name} played ${label} on discard pile ${pileIndex + 1}.`);
			}
			const inversionActivated = p.god_rule === "Value Inversion" && p.god_rule_param === playedRank
				|| p.built_different_rule === "Value Inversion" && !p.built_different_rule_used
					&& p.god_rule_param === playedRank;
			if (inversionActivated) {
				this.value_inversion = { until_round: this.round };
				for (let targetPile = 0; targetPile < 2; targetPile++) {
					this.pile_value_history[targetPile] = this.pile_value_history[targetPile]
						.map((entry) => entry === 2 ? 2 : 17 - entry);
					this.pile_values[targetPile] = this.pile_value_history[targetPile].at(-1) ?? 14;
				}
				this.consumeBuiltRule(this.current, "Value Inversion");
			}
			if (this.hasRule(this.current, "Free Cards") && this.freeCardMatches(this.current, value)
				&& p.rule_uses["Free Cards"] !== this.turn) {
				p.rule_uses["Free Cards"] = this.turn;
				this.consumeBuiltRule(this.current, "Free Cards");
			}
			this.refill(this.current);
			if (value === 13 && this.has(this.current, "World Cutting Slash")) p.pending_world_slashes += this.effective(this.current, "World Cutting Slash") === "Waffle Cutting Slash" ? 3 : 1;
			if (value === 14 && ["Limitless Barrier", "Perfected Limitless"].includes(this.effective(this.current, "Limitless Barrier"))) {
				p.ace_streak++;
				if (p.ace_streak <= 2) p.it_until_round = Math.max(p.it_until_round, this.round + 1);
				else if (p.ace_streak === 3) p.it_until_round = Math.max(p.it_until_round, this.round + 2);
				if (p.ace_streak === 2) p.pending_limitless_effects.push("pick_one_face_down");
				else if (p.ace_streak === 3) p.pending_limitless_effects.push("pick_all_face_down");
				else if (p.ace_streak === 4 && this.effective(this.current, "Limitless Barrier") !== "Perfected Limitless") {
					p.ability_states["Limitless Barrier"].evolved = true;
					p.pending_limitless_effects.push("replace_hand_from_deleted");
				}
			} else if (!stackDestroy) p.ace_streak = 0;
			if (blackFlashTriggered) this.landBlackFlash(this.current, c);
			if (playedRank === "Queen") {
				for (let index = 0; index < this.players.length; index++) {
					if (this.players[index].character === "Aoi Todo"
						&& this.effective(index, "Arm Sacrifice") === "Vivid Imagination") {
						this.players[index].takada_meter++;
						this.record(`${this.players[index].name} gained a Takada-Chan's Biggest Fan meter.`);
					}
				}
			}
			const targets = this.players.map((target, index) => ({ target, index })).filter(({ target, index }) =>
				index !== this.current && !target.is_eliminated && !this.finished(index)
				&& (this.effective(index, "Limitless Barrier") === "Perfected Limitless" && value === 14
					|| this.hasRule(index, "Quick Grab") && target.god_grab_value === value));
			for (const target of targets) this.consumeBuiltRule(target.index, "Quick Grab");
			if (targets.length) this.pending_quick_grabs.push({
				card: c,
				pile_index: pileIndex,
				played_by: this.current,
				zone: this.destroyed.includes(c) ? "destroyed_pile" : "discard_pile",
				targets: targets.map(({ index }) => index),
			});
			const followers = this.players.map((target, index) => index).filter((index) =>
				index !== this.current && !this.finished(index) && !this.players[index].is_eliminated
				&& !this.players[index].turn_cancelled
				&& this.hasRule(index, "Follow Stacking")
				&& this.players[index].rule_uses["Follow Stacking"] !== this.round
				&& !this.pending_follow_stacks.some((event) => event.targets.includes(index))
				&& this.players[index].hand.some((entry) => entry.rank === c.rank));
			if (followers.length) this.pending_follow_stacks.push({
				rank: c.rank, pile: pileIndex, played_by: this.current, targets: followers,
			});
			this.checkWinner();
			return c;
		}
		play(index, source, cardIndex, pile, jokerValue = null) {
			const p = this.players[index];
			const c = p[source][cardIndex];
			if (!c) return null;
			if (!this.legal(c, pile, jokerValue)) {
				if (!this.cards_played) this.takePiles(index);
				return null;
			}
			return this.place(c, pile, jokerValue, source);
		}
		playDown(index, cardIndex, pile) {
			const p = this.players[index];
			const c = p.face_down.splice(cardIndex, 1)[0];
			if (!c) return [null, false];
			if (!this.legal(c, pile, c.rank === "Joker" ? 14 : null)) {
				p.hand.push(c);
				this.takePiles(index);
				return [c, false];
			}
			p.face_down.splice(cardIndex, 0, c);
			return [this.place(c, pile, 14, "face_down"), true];
		}
		takePiles(index) {
			const p = this.players[index];
			let pickedUp = 0;
			for (const pile of this.discards) {
				pickedUp += pile.length;
				p.hand.push(...pile.splice(0));
			}
			this.pile_values = [14, 14];
			this.pile_last_player = [null, null];
			this.pile_value_history = [[], []];
			this.pile_owner_history = [[], []];
			this.cards_played = 0;
			this.turn_pile = null;
			this.turn_pile_destroyed = false;
			this.drawPickupBonus(index, pickedUp);
			this.shatterDomain(index);
			this.record(`${p.name} picked up both discard piles.`);
		}
		checkWinner() {
			if (this.draw_piles.some((pile) => pile.length) || this.players.some((player) => player.personal_draw_pile.length)
				|| this.pending_quick_grabs.length
				|| this.pending_follow_stacks.length || this.pending_stack_steals.length
				|| this.pending_black_flash_evolutions.length || this.pending_black_flash_expansions.length || this.pending_ability_losses.length
				|| this.pending_hand_deletes.length || this.pending_cleave_deletes.length
				|| this.pending_best_brothers.length || this.pending_best_brother_swaps.length
				|| this.pending_todo_swap_destroys.length
				|| this.pending_reveals.length || this.pending_card_choice
				|| this.players.some((player) => player.pending_world_slashes || player.pending_limitless_effects.length)) return;
			const completed = new Set(this.finish_order.map((row) => row.index));
			for (let index = 0; index < this.players.length; index++) {
				const p = this.players[index];
				if (!completed.has(index) && !p.is_eliminated && !p.hand.length && !p.face_up.length && !p.face_down.length) {
					this.finish_order.push({ index, rank: this.finish_order.length + 1, status: "finished", round: this.round, turn: this.turn });
				}
			}
			const finished = new Set(this.finish_order.map((row) => row.index));
			const remaining = this.players.map((_, index) => index).filter((index) => !finished.has(index) && !this.players[index].is_eliminated);
			const eliminated = this.players.map((_, index) => index).filter((index) => !finished.has(index) && this.players[index].is_eliminated);
			if (remaining.length <= 1) {
				const lastRank = this.finish_order.length + 1;
				if (remaining.length) this.finish_order.push({ index: remaining[0], rank: lastRank, status: "last remaining", round: this.round, turn: this.turn });
				for (const index of eliminated) this.finish_order.push({ index, rank: lastRank, status: "last place (Cut Meter)", round: this.round, turn: this.turn });
				this.winner = this.finish_order[0]?.index ?? remaining[0] ?? null;
			}
		}
		endTurn() {
			if (this.winner !== null) return;
			this.checkWinner();
			if (this.winner !== null) return;
			this.record(`${this.players[this.current].name} ended their turn.`);
			this.refill(this.current);
			if (this.enchain_return) {
				const saved = this.enchain_return;
				this.enchain_return = null;
				this.enchain_player = null;
				this.enchain_remaining = 0;
				this.current = saved.current;
				this.cards_played = saved.cards_played;
				this.turn_pile = saved.turn_pile;
				this.turn_pile_destroyed = saved.turn_pile_destroyed;
				this.human_has_played = saved.human_has_played;
				return;
			}
			this.cards_played = 0; this.turn_pile = null; this.turn_pile_destroyed = false;
			this.enchain_player = null;
			this.enchain_remaining = 0;
			const endingPlayer = this.players[this.current];
			this.prepareMahitoTurn(this.current);
			if (endingPlayer.black_flash_turns > 0 && !this.next_player_override_skip_bonus) {
				endingPlayer.black_flash_turns--;
				this.turn++;
				this.human_has_played = false;
				if (!(endingPlayer && !endingPlayer.bot && this.effective(this.current, "Six Eyes") === "Mastered Six Eyes" && endingPlayer.hand.length < this.handSize(this.current))) this.refill(this.current);
				return;
			}
			if (endingPlayer.self_clone_turns > 0 && this.effective(this.current, "Body Manipulation") === "Self Clones") {
				endingPlayer.self_clone_turns--;
				endingPlayer.self_clone_turns_used++;
				this.turn++;
				this.human_has_played = false;
				this.refill(this.current);
				return;
			}
			const old = this.current;
			const count = this.players.length;
			const override = this.next_player_override;
			this.current = override ?? (this.current + 1) % count;
			this.next_player_override = null;
			this.next_player_override_skip_bonus = false;
			let crossedRound = override === null && old === count - 1 || this.next_player_override_crosses_round;
			this.next_player_override_crosses_round = false;
			let steps = 0;
			while (steps < count && (this.finished(this.current) || this.players[this.current].turn_cancelled)) {
				const skipped = this.players[this.current];
				if (skipped.turn_cancelled) {
					skipped.turn_cancelled = false;
					this.shatterDomain(this.current);
					this.record(`${skipped.name}'s turn was canceled.`);
				}
				const previous = this.current;
				this.current = (this.current + 1) % count;
				if (previous === count - 1 && this.current === 0) crossedRound = true;
				steps++;
			}
			if (crossedRound) {
				this.round++;
				for (const p of this.players) {
					if (p.god_round < this.round) p.god_rule = "";
					p.built_different_rule = null;
					p.built_different_rule_used = false;
					p.black_flash_turn_round = this.round;
					p.black_flash_turns_granted = 0;
				}
				for (let index = 0; index < this.players.length; index++) this.roundHandSize(index);
				this.tickDomains();
			}
			this.turn++;
			this.human_has_played = false;
			for (let pile = 0; pile < 2; pile++) {
				const lock = this.pile_locks[pile];
				if (lock && lock.owner === this.current && lock.set_turn < this.turn) this.pile_locks[pile] = null;
				const delayed = this.delayed_destruction[pile];
				if (delayed && delayed.due_round <= this.round) {
					if (this.isPileLocked(pile)) delayed.due_round++;
					else {
						const cards = this.discards[pile].splice(0);
						this.destroyed.push(...cards);
						this.pile_values[pile] = 14; this.pile_last_player[pile] = null;
						this.pile_value_history[pile] = []; this.pile_owner_history[pile] = [];
						this.pile_over_ace[pile] = false; this.delayed_destruction[pile] = null;
						this.record(`Delayed destruction moved discard pile ${pile + 1} to the destroyed pile.`);
					}
				}
			}
			const p = this.players[this.current];
			this.prepareMahitoTurn(this.current);
			if (this.effective(this.current, "Six Eyes") === "Mastered Six Eyes") {
				for (let owner = 0; owner < this.players.length; owner++) {
					if (owner !== this.current) {
						for (const c of [...this.players[owner].hand, ...this.players[owner].face_down]) this.remember(this.current, c, owner);
					}
				}
			}
			if (!(p && !p.bot && this.effective(this.current, "Six Eyes") === "Mastered Six Eyes" && p.hand.length < this.handSize(this.current))) this.refill(this.current);
		}
		shatterDomain(index) {
			const shattered = this.domains.filter((domain) => domain.owner === index);
			this.domains = this.domains.filter((domain) => domain.owner !== index);
			for (const domain of shattered) if (domain.mahito) this.finishMahitoDomain(index);
			this.players[index].simple_domain_active = false;
		}
		tickDomains() {
			const mahitoDomains = this.domains.filter((domain) => domain.mahito);
			if (this.domains.length) {
				for (let index = 0; index < this.players.length; index++) {
					const player = this.players[index];
					if (!player.simple_domain_active
						|| this.domains.every((domain) => domain.owner === index)
						|| !mahitoDomains.length) continue;
					player.simple_domain_refinement--;
					if (player.simple_domain_refinement <= 0) player.simple_domain_active = false;
				}
			}
			for (const domain of this.domains) {
				if (domain.duration !== null) domain.duration--;
				if (this.domains.length > 1) {
					if (domain.shield) domain.shield = false;
					else domain.refinement--;
				}
			}
			const expired = this.domains.filter((domain) => domain.duration !== null && domain.duration <= 0
				|| this.domains.length > 1 && domain.refinement <= 0);
			this.domains = this.domains.filter((domain) => !expired.includes(domain));
			for (const domain of expired) if (domain.mahito) this.finishMahitoDomain(domain.owner);
		}
		openMahitoDomain(index, duration) {
			const player = this.players[index];
			if (this.domains.some((domain) => domain.owner === index && domain.mahito)) return;
			if (player.mahito_domain_cancel_round !== this.round) {
				player.mahito_domain_cancel_round = -1;
				player.mahito_domain_cancel_count = 0;
			}
			if (player.mahito_domain_remove_round !== this.round) player.mahito_domain_remove_round = -1;
			this.domains.push({
				owner: index, name: "Self Embodiment of Perfection (Domain)", refinement: 1,
				duration, mahito: true,
			});
			this.record(`${player.name} opened Self Embodiment of Perfection with refinement 1.`);
		}
		finishMahitoDomain(index) {
			const player = this.players[index];
			player.ability_states["Idle Transfiguration"].evolved = false;
			player.mahito_burnout_until_round = this.round + 2;
			this.record(`${player.name} entered 3 rounds of burnout after their domain ended.`);
		}
		releaseMahitoPrivateDeck(index) {
			const player = this.players[index];
			if (player.character !== "Mahito") return;
			const privateCards = new Set(player.personal_draw_pile);
			player.personal_draw_pile.forEach((entry, offset) => this.draw_piles[offset % this.draw_piles.length].push(entry));
			player.personal_draw_pile = [];
			for (const other of this.players) other.known_cards = other.known_cards.filter((entry) => !privateCards.has(entry.c));
			if (player.hand_size_source === index) {
				player.hand_size_override = null;
				player.hand_size_until_round = -1;
				player.hand_size_source = null;
				if (player.hand.length > 3) {
					const returned = player.hand.splice(3);
					returned.forEach((entry, offset) => this.draw_piles[offset % this.draw_piles.length].push(entry));
				}
			}
			this.draw_piles.forEach(shuffle);
		}
	}

	class Bridge {
		constructor() {
			this.reset();
			this.admin = false;
			let currentNotice = this.notice;
			Object.defineProperty(this, "notice", {
				configurable: true,
				get: () => currentNotice,
				set: (message) => {
					currentNotice = message;
					if (typeof message !== "string" || !message.trim() || !this.game) return;
					if (!this.game.log.at(-1)?.endsWith(`| ${message}`)) this.game.record(message);
				},
			});
		}
		reset() {
			this.game = null; this.setupQueue = []; this.setupPlayer = 0; this.setupComplete = false; this.lastHuman = 0;
			this.notice = ""; this.popup = null; this.autoEnd = false; this.drawPref = null;
		}
		humans() { return this.game.players.map((p, i) => !p.bot ? i : -1).filter((i) => i >= 0); }
		hotSeat() { return this.humans().length > 1; }
		viewer() {
			if (!this.setupComplete) return this.setupPlayer;
			const grab = this.quickGrabTarget();
			if (grab !== null) return grab;
			const follow = this.game.pending_follow_stacks.find((event) => event.targets.some((i) => !this.game.players[i].bot));
			if (follow) return follow.targets.find((i) => !this.game.players[i].bot);
			const steal = this.game.pending_stack_steals.find((event) => event.targets.some((i) => !this.game.players[i].bot));
			if (steal) return steal.targets.find((i) => !this.game.players[i].bot);
			const blackFlashEvolution = this.game.pending_black_flash_evolutions.find((event) => !this.game.players[event.target].bot);
			if (blackFlashEvolution) return blackFlashEvolution.target;
			const bestBrother = this.game.pending_best_brothers.find((event) => !this.game.players[event.aoi].bot);
			if (bestBrother) return bestBrother.aoi;
			const bestBrotherSwap = this.game.pending_best_brother_swaps.find((event) => !this.game.players[event.target].bot);
			if (bestBrotherSwap) return bestBrotherSwap.target;
			const todoSwapDestroy = this.game.pending_todo_swap_destroys.find((event) => !this.game.players[event.target].bot);
			if (todoSwapDestroy) return todoSwapDestroy.target;
			const blackFlash = this.game.pending_black_flash_expansions.find((event) => !this.game.players[event.target].bot);
			if (blackFlash) return blackFlash.target;
			const abilityLoss = this.game.pending_ability_losses.find((event) => !this.game.players[event.target].bot);
			if (abilityLoss) return abilityLoss.target;
			const handDelete = this.game.pending_hand_deletes.concat(this.game.pending_cleave_deletes)
				.find((event) => !this.game.players[event.target].bot);
			if (handDelete) return handDelete.target;
			if (this.game.pending_card_choice && !this.game.players[this.game.pending_card_choice.target].bot) return this.game.pending_card_choice.target;
			const revealed = this.game.pending_reveals.find((i) => !this.game.players[i].bot);
			if (revealed !== undefined) return revealed;
			const current = this.game.current;
			if (!this.game.players[current].bot) this.lastHuman = current;
			return this.lastHuman;
		}
		you(index) { return this.hotSeat() ? this.game.players[index].name : "You"; }
		get_catalog() {
			return JSON.stringify({ characters: characterCatalog, rules: RULES, domain_rule: DOMAIN_RULE, max_players: MAX_PLAYERS, defaults: DEFAULTS, random: RANDOM });
		}
		new_game(settingsText) {
			const settings = JSON.parse(settingsText);
			try {
				const rows = settings.players || [];
				const decks = Number(settings.decks), jokers = Number(settings.jokers);
				if (rows.length < 2 || rows.length > MAX_PLAYERS) throw Error(`Players must be between 2 and ${MAX_PLAYERS}`);
				if (!Number.isInteger(decks) || decks < 1) throw Error("At least one deck is required");
				if (!Number.isInteger(jokers) || jokers < 0) throw Error("Jokers cannot be negative");
				const count = decks * 52 + jokers, needed = rows.length * 9 + 4;
				if (count < needed) throw Error(`${rows.length} players need at least ${needed} cards, but only ${count} are in the deck`);
				if (rows.some((row) => !["Human", "Bot"].includes(row.type))) throw Error("Choose Human or Bot for each player");
				if (rows.every((row) => row.type === "Bot")) throw Error("At least one player must be a human");
				if (rows.some((row) => row.character !== RANDOM && !CHARACTERS[row.character])) throw Error("Choose a valid character");
				this.reset(); this.game = new Game(rows, decks, jokers, settings.start_with_joker === true);
				const humans = this.humans();
				for (const i of rows.map((_, i) => i).filter((i) => this.game.players[i].bot)) {
					const p = this.game.players[i];
					p.face_up = [...p.hand].sort((a, b) => rankValue(b) - rankValue(a)).slice(0, 3);
					p.hand = p.hand.filter((c) => !p.face_up.includes(c));
					if (this.game.start_with_joker) p.hand.push(card("Joker", "", 3));
				}
				this.setupQueue = humans; this.setupPlayer = humans[0]; this.lastHuman = humans[0];
				return this.get_state();
			} catch (error) { return JSON.stringify({ error: error.message }); }
		}
		get_state() {
			const g = this.game;
			if (!g) return JSON.stringify({ phase: "none" });
			if (this.setupComplete && g.winner === null) g.prepareMahitoTurn(g.current);
			const viewer = this.viewer(), me = g.players[viewer];
			const state = {
				notice: this.notice, popup: this.popup, round: g.round, turn: g.turn, current: g.current, viewer,
				turn_pile: g.turn_pile, turn_pile_destroyed: g.turn_pile_destroyed,
				pile_over_ace: [...g.pile_over_ace],
				hot_seat: this.hotSeat(), draw_piles: g.draw_piles.map((pile) => pile.length),
				discards: g.discards.map((pile, i) => ({ top: pile.length ? this.playedLabel(pile.at(-1), g.pile_values[i]) : null, count: pile.length, cards: pile.map(cardText) })),
				destroyed: g.destroyed.map(cardText), deleted: g.deleted.map(cardText), log: g.log.slice(-80),
				players: g.players.map((p, i) => ({
					index: i, name: p.name, character: p.character, bot: p.bot, current: i === g.current && g.winner === null,
					hand: p.hand.length, face_down: p.face_down.length, face_up: p.face_up.map((c) => this.cardInfo(c)),
					vivid_available: !p.bot && p.character === "Aoi Todo" && g.effective(i, "Arm Sacrifice") === "Vivid Imagination"
						&& p.takada_meter > 0 && p.vivid_uses < 3 + p.vivid_limit_bonus,
					vivid_expand_available: !p.bot && p.character === "Aoi Todo" && g.effective(i, "Arm Sacrifice") === "Vivid Imagination"
						&& p.hand.some((entry) => entry.rank === "Joker"),
					mahito_army_available: !p.bot && p.character === "Mahito" && i !== viewer && this.canMahitoArmy(i),
					mahito_army_auto_value: p.character === "Mahito" && p.transfigured_army_auto_value !== null
						? RANKS[p.transfigured_army_auto_value - 2] : null,
					revealed: p.revealed_cards.map(cardText),
					seen_hand: i === viewer ? [] : g.players[viewer].known_cards
						.filter((row) => p.hand.includes(row.c) && !p.revealed_cards.includes(row.c))
						.map((row) => cardText(row.c)),
					seen_face_down: i === viewer ? [] : g.players[viewer].known_cards
						.filter((row) => p.face_down.includes(row.c))
						.map((row) => cardText(row.c)),
					tags: this.tags(i),
					soul_separation: p.soul_separation,
					takada_meter: p.takada_meter,
				})),
			};
			this.popup = null;
			if (g.winner !== null) {
				state.phase = "over"; state.winner = g.players[g.winner].name;
				state.standings = g.finish_order.map((row) => ({ rank: row.rank, name: g.players[row.index].name, status: row.status === "last remaining" ? "last player standing" : "finished", round: row.round, turn: row.turn }));
				return JSON.stringify(state);
			}
			if (!this.setupComplete) {
				state.phase = "setup"; state.me = { name: me.name, hand: me.hand.map((c) => this.cardInfo(c)), face_up: [], face_down: [], source: "setup" };
				return JSON.stringify(state);
			}
			const current = g.current === viewer;
			const [source] = current ? g.source(viewer) : [null];
			state.phase = "play";
			state.me = {
				name: me.name, hand: me.hand.map((c) => this.cardInfo(c)), face_up: me.face_up.map((c) => this.cardInfo(c)),
				hand_size: g.handSize(viewer),
				face_down: me.face_down.map((c) => ({ known: g.known(viewer, c) ? cardText(c) : null })),
				turns_remaining: current ? me.black_flash_turns + me.self_clone_turns + 1 : 0,
				enchain_due: current && me.enchain_scheduled_turn !== null && g.turn >= me.enchain_scheduled_turn
					&& g.effective(viewer, "Enchain") === "Rule Workaround",
				source, pending: current && Boolean(me.pending_world_slashes || me.pending_limitless_effects.length),
				can_end: current && (g.human_has_played || me.black_flash_turns > 0 || me.self_clone_turns > 0)
					&& !me.pending_world_slashes && !me.pending_limitless_effects.length
					&& !g.mustEnchain(viewer) && !g.pending_quick_grabs.length && !g.pending_follow_stacks.length
					&& !g.pending_stack_steals.length && !g.pending_card_choice && !g.pending_reveals.length
					&& !g.pending_black_flash_evolutions.length && !g.pending_black_flash_expansions.length && !g.pending_ability_losses.length
					&& !g.pending_hand_deletes.length && !g.pending_cleave_deletes.length
					&& !g.pending_best_brothers.length && !g.pending_best_brother_swaps.length && !g.pending_todo_swap_destroys.length,
				can_pickup: current && !g.forced_play && !g.finished(viewer) && !me.pending_world_slashes && !me.pending_limitless_effects.length
					&& !g.pending_quick_grabs.length && !g.pending_follow_stacks.length && !g.pending_stack_steals.length
					&& !g.pending_card_choice && !g.pending_reveals.length && !g.mustEnchain(viewer)
					&& !g.pending_black_flash_evolutions.length && !g.pending_black_flash_expansions.length && !g.pending_ability_losses.length
					&& !g.pending_hand_deletes.length && !g.pending_cleave_deletes.length
					&& !g.pending_best_brothers.length && !g.pending_best_brother_swaps.length && !g.pending_todo_swap_destroys.length,
				is_current: current,
			};
			if (g.pending_reveals.includes(viewer)) state.me.mode = "reveal";
			if (g.pending_follow_stacks.some((event) => event.targets.includes(viewer))) state.me.mode = "follow_stack";
			if (g.pending_stack_steals.some((event) => event.targets.includes(viewer))) state.me.mode = "stack_steal";
			if (g.pending_ability_losses.some((event) => event.target === viewer)) state.me.mode = "ability_loss";
			if (g.pending_hand_deletes.some((event) => event.target === viewer)
				|| g.pending_cleave_deletes.some((event) => event.target === viewer)) state.me.mode = "hand_delete";
			if (g.pending_black_flash_expansions.some((event) => event.target === viewer)) state.me.mode = "black_flash_expansion";
			if (g.pending_black_flash_evolutions.some((event) => event.target === viewer)) state.me.mode = "black_flash_evolution";
			if (g.pending_card_choice?.target === viewer) state.me.mode = g.pending_card_choice.kind;
			if (g.pending_best_brothers.some((event) => event.aoi === viewer)) state.me.mode = "best_brother";
			if (g.pending_best_brother_swaps.some((event) => event.target === viewer)) state.me.mode = "best_brother_swap";
			if (g.pending_todo_swap_destroys.some((event) => event.target === viewer)) state.me.mode = "todo_swap_destroy";
			if (g.pending_card_choice?.target === viewer) {
				state.me.choice_indices = g.pending_card_choice.indices;
				state.me.choice_count = g.pending_card_choice.count;
				state.me.required_indices = g.pending_card_choice.required_indices || [];
			}
			state.buttons = this.buttons(viewer);
			state.all_humans_finished = this.humans().every((i) => g.finished(i));
			state.needs_bot = this.needsBot();
			if (this.needsDrawChoice()) state.draw_choice = g.draw_piles.flatMap((pile, pi) => pile.slice(-3).reverse().map((c, depth) => ({ pile: pi, depth, label: cardText(c) })));
			return JSON.stringify(state);
		}
		cardInfo(c) { return { label: cardText(c), rank: c.rank, suit: c.suit }; }
		playedLabel(c, value) { return c.rank === "Joker" ? `Joker (${RANKS[(value || 14) - 2]})` : cardText(c); }
		tags(i) {
			const g = this.game, p = g.players[i], tags = [];
			if (p.character === "Sukuna" || p.cut_meter > 0) tags.push(`Cut Meter ${p.cut_meter}/9`);
			if (g.effective(i, "Limitless Barrier") === "Perfected Limitless") tags.push("I-T permanent");
			else if (g.round <= p.it_until_round || p.god_rule === "I-T") tags.push("I-T active");
			if (p.immunity?.type === "I-D" && p.immunity.until_round >= g.round) tags.push("I-D active");
			if (p.immunity?.type === "I-T" && p.immunity.until_round >= g.round) tags.push("I-T immunity");
			if (p.immunity?.type === "I-S" && p.immunity.shields > 0) tags.push(`I-S shields ${p.immunity.shields}`);
			if (p.meter > 0) tags.push(`Meter ${p.meter}`);
			if (p.hand_lock_until_round >= g.round) tags.push("Hand locked");
			if (p.turn_cancelled) tags.push("Next turn canceled");
			if (p.cancel_immunity_until >= g.round) tags.push("Turn Cancel immunity");
			if (p.is_eliminated) tags.push("ELIMINATED"); else if (this.setupComplete && g.finished(i)) tags.push("Finished");
			if (p.soul_separation) tags.push(`Soul Separation ${p.soul_separation}`);
			if (p.character === "Aoi Todo" && p.takada_meter) tags.push(`Takada-Chan's Biggest Fan ${p.takada_meter}`);
			if (p.character === "Mahito" && p.personal_draw_pile.length) tags.push(`Private draw pile ${p.personal_draw_pile.length}`);
			if (p.character === "Mahito" && p.hand_size_override !== null && p.hand_size_until_round >= g.round) {
				tags.push(`Hand size ${p.hand.length}/${p.hand_size_override}`);
			}
			if (p.character === "Mahito" && p.mahito_burnout_until_round >= g.round) {
				tags.push(`Burnout ${p.mahito_burnout_until_round - g.round + 1} round(s)`);
			}
			if (p.character === "Mahito" && p.self_clone_turns) tags.push(`Self Clones: ${p.self_clone_turns} extra turn(s)`);
			if (p.character === "Mahito" && p.transfigured_next_value !== null) {
				tags.push(`Next card value ${RANKS[p.transfigured_next_value - 2]}`);
			}
			if (p.character === "Aoi Todo" && p.aoi_follow_until_round >= g.round) tags.push("Follow Stacking active");
			if (p.character === "Aoi Todo" && g.effective(i, "Arm Sacrifice") === "Vivid Imagination") {
				tags.push(`Vivid Imagination uses ${p.vivid_uses}/${3 + p.vivid_limit_bonus}`);
			}
			if (["Yuji Itadori", "Aoi Todo", "Mahito"].includes(p.character)) {
				tags.push(`Black Flash ranks: ${p.black_flash_ranks.join(", ")}`);
				if (p.last_black_flash_round >= g.round - 1) tags.push("Black Flash landed recently");
			}
			if (p.black_flash_round === g.round && p.black_flash_round_count > 0) {
				tags.push(`Black Flash ${p.black_flash_round_count}/4 this round`);
			}
			if (p.god_rule === "Black Flash" && p.god_round === g.round) {
				tags.push(`Black Flash triggers on ${p.god_rule_param}`);
			}
			if (p.revealed_cards.length) tags.push(`${p.revealed_cards.length} card(s) revealed`);
			if (g.forced_play?.target === i) tags.push("Forced to play");
			g.tie_breaks.forEach((owner, pile) => {
				if (owner !== null && owner !== i) tags.push(`Tie Break on discard pile ${pile + 1}`);
			});
			if (p.simple_domain_active) tags.push(`Simple Domain (refinement ${p.simple_domain_refinement})`);
			for (const d of g.domains.filter((item) => item.owner === i)) tags.push(`${d.name}: refinement ${d.refinement}${g.domains.length > 1 ? " (clashing)" : ""}${d.duration === null ? "" : `, ${d.duration} round(s) left`}`);
			return tags;
		}
		godRuleReady(index) {
			const g = this.game, p = g.players[index], rule = p.god_rule;
			const used = p.rule_uses[rule];
			if (rule === "Black Flash") return false;
			if (rule === "Top card discard" || rule === "Discard Swap" || rule === "Swap 1") {
				if (used === g.turn) return false;
				if (rule === "Swap 1") return Boolean(g.last_drawn.length && p.hand_lock_until_round < g.round);
				return true;
			}
			if (rule === "Burn One") return Boolean(p.face_up.length);
			if (["Pile Boost", "Turn Cancel", "Swap Pair", "Reveal", "Top Swap", "Tie Break", "Peek Swap", "Forced Play"].includes(rule)) return used !== g.round;
			if (rule === "Rescue Draw") return this.canRescue(index);
			if (rule === "Card Swapping") return this.canCardSwap(index);
			if (rule === "Full Hand") return g.cards_played > 0 && (p.full_hand_round !== g.round || p.full_hand_plays < 3) && Boolean(p.face_up.length || p.face_down.length);
			if (rule === "Stack Steal") return g.pending_stack_steals.some((event) => event.targets.includes(index));
			if (rule === "Follow Stacking") return g.pending_follow_stacks.some((event) => event.targets.includes(index));
			return true;
		}
		needsDrawChoice() {
			const g = this.game, p = g.players[g.current];
			return this.setupComplete && g.winner === null && !p.bot && g.cards_played === 0 && p.hand.length < g.handSize(g.current) && g.draw_piles.some((pile) => pile.length) && !this.drawPref && g.effective(g.current, "Six Eyes") === "Mastered Six Eyes" && !g.finished(g.current);
		}
		needsBot() {
			const g = this.game;
			if (!g || !this.setupComplete || g.winner !== null || this.quickGrabTarget() !== null
				|| [...g.pending_best_brothers.map((event) => event.aoi),
					...g.pending_best_brother_swaps.map((event) => event.target),
					...g.pending_todo_swap_destroys.map((event) => event.target)].some((i) => !g.players[i].bot)
				|| g.pending_follow_stacks.some((event) => event.targets.some((i) => !g.players[i].bot))
				|| g.pending_stack_steals.some((event) => event.targets.some((i) => !g.players[i].bot))
				|| [...g.pending_black_flash_evolutions, ...g.pending_black_flash_expansions, ...g.pending_ability_losses, ...g.pending_hand_deletes, ...g.pending_cleave_deletes]
					.some((event) => !g.players[event.target].bot)) return false;
			const pendingChoice = [...g.pending_black_flash_evolutions, ...g.pending_black_flash_expansions, ...g.pending_ability_losses,
				...g.pending_hand_deletes, ...g.pending_cleave_deletes].find((event) => g.players[event.target].bot);
			if (pendingChoice) return true;
			const todoPendingBot = [...g.pending_best_brothers.map((event) => event.aoi),
				...g.pending_best_brother_swaps.map((event) => event.target),
				...g.pending_todo_swap_destroys.map((event) => event.target)].some((i) => g.players[i].bot);
			if (todoPendingBot) return true;
			if (g.pending_card_choice) return g.players[g.pending_card_choice.target].bot;
			if (g.pending_reveals.some((i) => !g.players[i].bot)) return false;
			if (g.players.some((player, index) => player.bot && this.canMahitoArmy(index))) return true;
			return g.players[g.current].bot || g.finished(g.current);
		}
		quickGrabTarget() {
			const event = this.game?.pending_quick_grabs[0];
			return event?.targets.find((i) => !this.game.players[i].bot) ?? null;
		}
		delayedBlackFlashChoices(index) {
			const g = this.game;
			return g.discards.flatMap((pile, pileIndex) => pile.flatMap((card, cardIndex) => {
				const metadata = g.play_metadata.get(card);
				return g.pile_owner_history[pileIndex][cardIndex] === index
					&& metadata?.player === index
					&& !metadata.black_flash_activated
					&& !g.isPileLocked(pileIndex)
					? [{ card, cardIndex, pile: pileIndex }]
					: [];
			}));
		}
		delayedBlackFlash(answers, specifiedViewer = null) {
			const g = this.game, index = specifiedViewer ?? g.current, player = g.players[index];
			if (index !== g.current || g.effective(index, "Divergent Fist") !== "Delayed Black Flash"
				|| player.rule_uses["Delayed Black Flash"] === g.round || !g.canLandBlackFlash(index)) return;
			const choices = this.delayedBlackFlashChoices(index);
			if (!choices.length) return;
			const choice = choices[this.ask("Choose one of your cards in a discard pile that has not activated Black Flash", choices.map((entry) =>
				`Discard pile ${entry.pile + 1}: ${cardText(entry.card)}`), answers)];
			if (!g.landBlackFlash(index, choice.card)) return;
			player.rule_uses["Delayed Black Flash"] = g.round;
			g.destroyPile(choice.pile, index, `${player.name} used Delayed Black Flash to destroy discard pile ${choice.pile + 1}.`);
			this.notice = `${this.you(index)} used Delayed Black Flash to activate Black Flash and destroy discard pile ${choice.pile + 1}.`;
		}
		buttons(i) {
			const g = this.game, p = g.players[i], current = g.current === i, buttons = [];
			const add = (id, label, enabled = true, info = false, extra = {}) => buttons.push({ id, label, enabled, info, ...extra });
			const cleave = g.effective(i, "Cleave");
			if (cleave && p.character !== "Yuji Itadori") {
				const uses = p.ability_states.Cleave || { round: -1, uses: 0 };
				const remaining = uses.round === g.round ? Math.max(0, (cleave === "Spider Net Cleave" ? 5 : 1) - uses.uses) : (cleave === "Spider Net Cleave" ? 5 : 1);
				add("cleave", `Use ${cleave} (${remaining} left) - pick a discard pile first`, current && remaining > 0);
			}
			if (g.effective(i, "World Cutting Slash")) add("info", `${g.effective(i, "World Cutting Slash")} active`, false, true);
			if (g.effective(i, "Hollow Purple")) add("info", `${g.effective(i, "Hollow Purple")} active`, false, true);
			if (p.character === "Yuji Itadori") {
				const cleaveReady = g.hasBlackFlashRecently(i);
				if (current && g.effective(i, "Cleave")) add("yuji_cleave", cleaveReady ? "Cleave (active)" : "Cleave (Land a Black Flash to use)", true, false, { inactive: !cleaveReady });
				if (current && g.effective(i, "Divergent Fist") && p.rule_uses["Divergent Fist"] !== g.turn
					&& g.source(i)[1].length) add("divergent_fist", "Divergent Fist: play one card freely");
				if (current && g.effective(i, "Divergent Fist") === "Delayed Black Flash"
					&& p.rule_uses["Delayed Black Flash"] !== g.round
					&& g.canLandBlackFlash(i)
					&& this.delayedBlackFlashChoices(i).length) add("delayed_black_flash", "Delayed Black Flash: activate a played card");
				if (current && g.effective(i, "Blood Manipulation") && p.hand.length > 3) add("blood_manipulation", "Blood Manipulation: destroy a card from your hand");
				if (current && g.effective(i, "Black Flash") === "Blessed By The Sparks Of Black"
					&& p.hand.some((card) => card.rank === "Joker")
					&& RANKS.some((rank) => !p.black_flash_ranks.includes(rank))) add("expand_black_flash_joker", "Spend a Joker to expand Black Flash ranks");
			}
			if (p.character === "Mahito") {
				if (this.canBodyManipulation(i)) {
					add("body_manipulation", `Body Manipulation: set hand and table cards (max ${this.bodyManipulationMax(i)})`);
				}
				if (current && g.effective(i, "Transfigured Humans") === "Transfigured Humans"
					&& p.transfigured_used_round !== g.round && !this.mahitoBusy()) {
					add("transfigured_humans", `Transfigured Humans: set next card value${p.transfigured_next_value === null ? "" : ` (${RANKS[p.transfigured_next_value - 2]} set)`}`);
				}
				if (current && g.effective(i, "Transfigured Humans") === "Transfigured Army"
					&& this.canMahitoArmy(i)) {
					add("transfigured_army", `Transfigured Army: change both pile tops${p.transfigured_army_auto_value === null ? "" : ` to ${RANKS[p.transfigured_army_auto_value - 2]}`}`, true, false, { target: i });
					add("transfigured_army_auto", "Set automatic Transfigured Army value");
				}
				if (current && g.effective(i, "Idle Transfiguration") === "Idle Transfiguration"
					&& !this.mahitoBusy()
					&& CHARACTERS.Mahito.some((track) => !p.ability_states[track.ability].removed)
					&& g.players.some((target, targetIndex) => targetIndex !== i && !target.is_eliminated
						&& !g.finished(targetIndex) && !g.blocksEffect(targetIndex, i)
						&& CHARACTERS[target.character].some((track) => !target.ability_states[track.ability].removed))) {
					add("idle_transfiguration", "Idle Transfiguration: sacrifice an ability to remove one");
				}
				if (current && g.effective(i, "Soul Touch") && p.rule_uses["Soul Touch"] !== g.round && !this.mahitoBusy()) {
					add("soul_touch", "Soul Touch: alter a player's hand size");
				}
				const domain = this.mahitoDomain(i);
				if (domain && current) {
					if (this.canMahitoDomainCancel(i)) add("mahito_domain_cancel", `Domain: cancel a turn (${2 - (p.mahito_domain_cancel_round === g.round ? p.mahito_domain_cancel_count : 0)} left this round)`);
					if (this.canMahitoDomainRemove(i)) add("mahito_domain_remove", "Domain: remove an unlocked ability");
					if (g.effective(i, "Idle Transfiguration") === "Self Embodiment of Perfection (Domain)" && !this.mahitoBusy()) {
						add("mahito_domain_shatter", "Shatter domain: cancel turns and remove abilities");
					}
				}
				if (p.mahito_domain_cancel_round === g.round && p.mahito_domain_cancel_count) {
					add("info", `Domain turn cancels used: ${p.mahito_domain_cancel_count}/2 this round`, false, true);
				}
			}
			if (p.character === "Aoi Todo") {
				const boogie = g.effective(i, "Boogie Woogie");
				const arm = g.effective(i, "Arm Sacrifice");
				const built = g.effective(i, "Built Different");
				if (boogie === "Boogie Woogie" && this.swapCredits(i)) {
					add("info", `Boogie Woogie: ${this.swapCredits(i)} swap available`, false, true);
				}
				if (boogie === "Vibraslap" && this.swapCredits(i)) {
					add("info", `Vibraslap: ${this.swapCredits(i)} swap(s) available`, false, true);
				}
				if (current && boogie === "Boogie Woogie" && !p.boogie_soul_swap_used) {
					add("boogie_soul_swap", "Boogie Woogie: Soul Swap (once per game)");
				}
				if (current && built && (p.built_different_round !== g.round || p.built_different_uses < 3)
					&& this.swapCredits(i) > 0) {
					const uses = p.built_different_round === g.round ? p.built_different_uses : 0;
					add("built_different", `Built Different: use a rule (${3 - uses} activation${uses === 2 ? "" : "s"} left)`);
				}
				if (arm === "Vivid Imagination" && p.takada_meter > 0 && p.vivid_uses < 3 + p.vivid_limit_bonus) {
					add("vivid_skip", `Vivid Imagination: spend a meter to skip to ${p.name}'s turn`, true, false, { target: i });
				}
				if (arm === "Vivid Imagination" && p.hand.some((entry) => entry.rank === "Joker")) {
					add("vivid_expand", "Vivid Imagination: spend a Joker for one more use", true, false, { target: i });
				}
				for (const event of g.pending_best_brothers.filter((entry) => entry.aoi === i)) {
					add("best_brother", "Best Brother: redirect turn cancel");
					add("decline_best_brother", "Let the turn cancel affect you");
				}
				if (g.pending_best_brother_swaps.some((event) => event.target === i)) {
					add("best_brother_swap", "Choose cards for the Best Brother swap");
				}
				if (g.pending_todo_swap_destroys.some((event) => event.target === i)) {
					add("todo_swap_destroy", "What's Your Type?: destroy the incoming card");
					add("todo_swap_keep", "Keep the incoming card");
				}
			}
			const abilityLoss = g.pending_ability_losses.find((event) => event.target === i);
			if (abilityLoss) {
				for (const option of this.abilityLossOptions(abilityLoss)) add("lose_ability", `${abilityLoss.kind === "upgrade" ? "Lose upgrade" : "Lose ability"}: ${option.label}`, true, false, { ability: option.ability });
			}
			if (g.pending_black_flash_expansions.some((event) => event.target === i)) {
				const event = g.pending_black_flash_expansions.find((entry) => entry.target === i);
				for (const rank of event.choices) add("expand_black_flash", `Black Flash rank: ${rank}`, true, false, { rank });
			}
			if (g.pending_black_flash_evolutions.some((event) => event.target === i)) {
				const event = g.pending_black_flash_evolutions.find((entry) => entry.target === i);
				event.choices = g.blackFlashOptions(i).map((track) => track.ability);
				for (const ability of event.choices) {
					const track = CHARACTERS[p.character].find((entry) => entry.ability === ability);
					if (track) add("black_flash_evolve", `Black Flash: temporarily evolve ${ability} into ${track.evolution.ability}`, true, false, { ability });
				}
			}
			const handDelete = g.pending_hand_deletes.find((event) => event.target === i);
			const cleaveDelete = g.pending_cleave_deletes.find((event) => event.target === i);
			if (handDelete || cleaveDelete) add(handDelete ? "prisoner_delete" : "cleave_delete", handDelete?.reason || "Delete a card after Stack Destroy");
			if (this.canEnchain(i)) add("enchain", "Schedule Enchain (once per game)");
			if (p.enchain_scheduled_turn !== null) {
				const turnsLeft = Math.max(0, p.enchain_scheduled_turn - g.turn);
				add("info", `Enchain scheduled in ${turnsLeft} turn(s)`, false, true);
			}
			if (current && this.canCardSwap(i)) {
				const label = p.character === "Aoi Todo"
					? `Card Swapping (any rank; ${this.swapCredits(i)} swap${this.swapCredits(i) === 1 ? "" : "s"})`
					: `Card Swapping (${this.swapRanks(i).join("/") }s)`;
				add("card_swap", label);
			}
			if (current && this.canRescue(i)) add("rescue", "Rescue Draw");
			if (current && this.canUseSixEyes(i)) add("six_eyes", "Six Eyes");
			if (current && g.hasRule(i, "Full Hand") && g.cards_played > 0
				&& (p.full_hand_round !== g.round || p.full_hand_plays < 3) && (p.face_up.length || p.face_down.length)) add("full_hand", "Full Hand");
			if (current && p.domain_draw_turn !== g.turn && g.domains.length > 1 && g.domains.some((domain) => domain.owner === i)
				&& g.draw_piles.some((pile) => pile.length)) add("domain", "Domain clash: draw a card");
			else if (current && g.domains.length >= 3 && p.hand.some((entry) => entry.rank === "Joker")) {
				add("domain", "Domain clash: weaken a domain with a Joker");
			}
			if (g.effective(i, "Simple Domain") && !p.simple_domain_used) add("simple_domain", "Simple Domain (once per game)");
			else if (g.effective(i, "Simple Domain") && p.simple_domain_active && p.cleanse_round !== g.round && p.hand.length && (p.cut_meter > 0 || p.revealed_cards.length)) add("simple_domain", "Simple Domain: discard a card to remove an effect");
			if (current && g.effective(i, "God of Jujutsu") && p.god_round !== g.round) add("god", "God of Jujutsu (choose a rule for this round)");
			if (current && p.god_rule && GOD_ACTION_RULES.has(p.god_rule) && this.godRuleReady(i)) add("god_rule", `Use God of Jujutsu: ${p.god_rule}`);
			if (p.god_rule) add("info", `God of Jujutsu: ${p.god_rule} this round`, false, true);
			if (current && g.effective(i, "Binding Vow") && !p.vow_card && g.bindingVowCards(i).length) add("vow", "Binding Vow (pass turn, one card plays as a King)");
			if (p.vow_card) add("info", `Binding Vow: ${cardText(p.vow_card)} plays as a King`, false, true);
			if (current && p.pending_world_slashes) add("resolve_slash", `Resolve World Cutting Slash (${p.pending_world_slashes})`);
			if (current && p.pending_limitless_effects.length) add("resolve_limitless", `Resolve Limitless effect (${p.pending_limitless_effects.length})`);
			if (g.pending_quick_grabs[0]?.targets.includes(i)) {
				add("quick_grab", "Quick Grab the card");
				add("decline_quick_grab", "Decline Quick Grab");
			}
			if (g.pending_follow_stacks[0]?.targets.includes(i)) {
				add("follow_stack", "Follow Stack");
				add("decline_follow_stack", "Decline Follow Stack");
			}
			if (g.pending_stack_steals[0]?.targets.includes(i)) add("stack_steal", "Take a card with Stack Steal");
			if (this.canAllowEffect(i)) add("allow_effect", "Allow the next negative effect", true);
			if (current && g.cards_played === 0 && this.evolvable(i).length && p.hand.some((c) => c.rank === "Joker")) add("evolve", "Evolve ability (ends turn): " + this.evolvable(i).map((t) => t.evolution.ability).join(", "));
			return buttons;
		}
		evolvable(i) {
			const p = this.game.players[i];
			if (p.character === "Mahito" && this.game.round <= p.mahito_burnout_until_round) return [];
			return CHARACTERS[p.character].filter((track) => track.evolution && !p.ability_states[track.ability].removed
				&& !p.ability_states[track.ability].evolution_lost && !p.ability_states[track.ability].evolved);
		}
		canEnchain(i) {
			const g = this.game, p = g.players[i], ability = g.effective(i, "Enchain");
			return Boolean(g.current === i && !p.bot && g.cards_played === 0
				&& g.winner === null && ability && !p.enchain_used && p.enchain_scheduled_turn === null && !g.finished(i)
				&& !g.pending_quick_grabs.length && !g.players.some((player) => player.pending_world_slashes || player.pending_limitless_effects.length)
				&& this.enchainTargets(i, ability).length);
		}
		mahitoBusy() {
			const g = this.game;
			return Boolean(g.forced_play || g.pending_quick_grabs.length || g.pending_follow_stacks.length
				|| g.pending_stack_steals.length || g.pending_reveals.length || g.pending_card_choice
				|| g.pending_black_flash_evolutions.length || g.pending_black_flash_expansions.length
				|| g.pending_ability_losses.length || g.pending_hand_deletes.length || g.pending_cleave_deletes.length
				|| g.pending_best_brothers.length || g.pending_best_brother_swaps.length
				|| g.pending_todo_swap_destroys.length || g.players.some((player) =>
					player.pending_world_slashes || player.pending_limitless_effects.length));
		}
		canBodyManipulation(index) {
			const g = this.game, player = g.players[index];
			return Boolean(player?.character === "Mahito" && g.current === index && g.cards_played === 0
				&& g.effective(index, "Body Manipulation") && player.body_manipulation_turn !== g.turn
				&& this.bodyManipulationMax(index) > 0 && player.hand_lock_until_round < g.round
				&& !g.forced_play && !this.mahitoBusy() && !g.finished(index));
		}
		bodyManipulationMax(index) {
			const g = this.game, player = g.players[index];
			const drawCards = player.personal_draw_pile.length
				+ g.draw_piles.reduce((count, pile) => count + pile.length, 0);
			const availableCards = drawCards + player.hand.length + player.face_up.length + player.face_down.length;
			return Math.min(Math.floor(drawCards / 3), Math.floor(availableCards / 3));
		}
		mahitoDomain(index) {
			return this.game.domains.find((domain) => domain.mahito && domain.owner === index) || null;
		}
		canMahitoDomainEffect(index) {
			const g = this.game;
			return Boolean(g.current === index && g.effective(index, "Idle Transfiguration") === "Self Embodiment of Perfection (Domain)"
				&& this.mahitoDomain(index) && g.domains.length === 1 && !this.mahitoBusy());
		}
		canMahitoArmy(index) {
			const g = this.game, player = g.players[index];
			return Boolean(player?.character === "Mahito" && g.effective(index, "Transfigured Humans") === "Transfigured Army"
				&& !g.finished(index) && !player.is_eliminated && player.transfigured_army_used_turn !== g.turn && !this.mahitoBusy()
				&& g.discards.some((pile) => pile.length));
		}
		bodyManipulation(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (!this.canBodyManipulation(index)) return;
			const maxSize = this.bodyManipulationMax(index);
			const size = this.ask("Body Manipulation: choose a hand size (face-up and face-down will match)",
				Array.from({ length: maxSize }, (_, n) => `${n + 1} card(s)`), answers) + 1;
			const hand = [...player.hand, ...player.face_up], faceUp = [], faceDown = [...player.face_down];
			const privatePile = [...player.personal_draw_pile];
			const drawPiles = g.draw_piles.map((pile) => [...pile]);
			const drawOne = () => privatePile.pop() || drawPiles.find((pile) => pile.length)?.pop() || null;
			const privateCards = new Set();
			const storePrivately = (entry) => {
				privatePile.push(entry);
				privateCards.add(entry);
			};
			if (faceDown.length > size) {
				faceDown.splice(size).forEach(storePrivately);
			}
			while (faceDown.length < size) {
				const drawn = drawOne();
				if (!drawn) throw new Error("Not enough cards are available to set that hand size.");
				faceDown.push(drawn);
			}
			while (hand.length > size * 2) {
				const cardIndex = this.ask("Choose a hand card to put in your private draw pile", hand.map(cardText), answers);
				storePrivately(hand.splice(cardIndex, 1)[0]);
			}
			while (hand.length < size * 2) {
				const drawn = drawOne();
				if (!drawn) throw new Error("Not enough cards are available to set that hand size.");
				hand.push(drawn);
			}
			for (let count = 0; count < size; count++) {
				const cardIndex = this.ask("Choose a hand card to set face-up", hand.map(cardText), answers);
				faceUp.push(hand.splice(cardIndex, 1)[0]);
			}
			for (const entry of privatePile) privateCards.add(entry);
			for (const entry of faceDown) privateCards.add(entry);
			player.hand = hand;
			player.face_up = faceUp;
			player.face_down = faceDown;
			player.personal_draw_pile = shuffle(privatePile);
			g.draw_piles = drawPiles;
			for (const other of g.players) other.known_cards = other.known_cards.filter((entry) => !privateCards.has(entry.c));
			player.body_manipulation_turn = g.turn;
			player.hand_size_override = size;
			player.hand_size_until_round = Number.MAX_SAFE_INTEGER;
			player.hand_size_source = index;
			this.applyRefinedSoulLocks(index);
			this.notice = `${this.you(index)} used Body Manipulation to set their hand, face-up, and face-down sizes to ${size}.`;
		}
		transfiguredHumans(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (player.character !== "Mahito" || g.effective(index, "Transfigured Humans") !== "Transfigured Humans"
				|| player.transfigured_used_round === g.round || this.mahitoBusy()) return;
			const rank = RANKS[this.ask("Choose the value for your next card", RANKS, answers)];
			player.transfigured_next_value = VALUES[rank];
			player.transfigured_used_round = g.round;
			this.notice = `${this.you(index)} set their next card's value to ${rank}.`;
		}
		transfiguredArmy(answers, specifiedIndex = null) {
			const g = this.game, index = specifiedIndex ?? this.viewer(), player = g.players[index];
			if (!player || !this.canMahitoArmy(index)) return;
			const piles = g.discards.map((pile, pileIndex) => pile.length ? pileIndex : -1).filter((pileIndex) => pileIndex >= 0);
			const value = player.transfigured_army_auto_value
				?? VALUES[RANKS[this.ask("Choose a value for both discard piles", RANKS, answers)]];
			for (const pileIndex of piles) {
				g.pile_value_history[pileIndex][g.pile_value_history[pileIndex].length - 1] = value;
				g.syncPile(pileIndex);
			}
			player.transfigured_army_used_turn = g.turn;
			this.notice = `${player.name} changed the top value of both discard piles to ${RANKS[value - 2]}.`;
		}
		setTransfiguredArmyValue(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (player.character !== "Mahito" || g.effective(index, "Transfigured Humans") !== "Transfigured Army"
				|| this.mahitoBusy()) return;
			const rank = RANKS[this.ask("Choose the automatic Transfigured Army value", RANKS, answers)];
			player.transfigured_army_auto_value = VALUES[rank];
			this.notice = `${this.you(index)} set Transfigured Army to automatically use ${rank}.`;
		}
		idleTransfiguration(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (player.character !== "Mahito" || g.effective(index, "Idle Transfiguration") !== "Idle Transfiguration"
				|| this.mahitoBusy()) return;
			const ownOptions = CHARACTERS.Mahito.filter((track) => !player.ability_states[track.ability].removed)
				.map((track) => ({ ability: track.ability, label: player.ability_states[track.ability].evolved ? track.evolution.ability : track.ability }));
			const targets = g.players.map((target, targetIndex) => targetIndex).filter((targetIndex) => {
				const target = g.players[targetIndex];
				return targetIndex !== index && !target.is_eliminated && !g.finished(targetIndex)
					&& !g.blocksEffect(targetIndex, index)
					&& CHARACTERS[target.character].some((track) => !target.ability_states[track.ability].removed);
			});
			if (!ownOptions.length || !targets.length) return;
			const cost = ownOptions[this.ask("Choose one of your abilities to sacrifice", ownOptions.map((option) => option.label), answers)];
			const target = targets[this.ask("Choose a player to lose an ability", targets.map((targetIndex) => g.players[targetIndex].name), answers)];
			const targetOptions = CHARACTERS[g.players[target].character].filter((track) =>
				!g.players[target].ability_states[track.ability].removed);
			const loss = targetOptions[this.ask(`${g.players[target].name}: choose an ability to remove`,
				targetOptions.map((track) => g.players[target].ability_states[track.ability].evolved ? track.evolution.ability : track.ability), answers)];
			player.ability_states[cost.ability].removed = true;
			player.ability_states[cost.ability].evolved = false;
			if (cost.ability === "Body Manipulation") g.releaseMahitoPrivateDeck(index);
			if (g.cardInteractionBlocked(target, index, "ability_loss")) {
				this.notice = `${this.you(index)} sacrificed ${cost.label}, but Prisoner's Soul blocked the ability removal.`;
				return;
			}
			const lost = g.players[target].ability_states[loss.ability];
			lost.removed = true;
			lost.evolved = false;
			if (g.players[target].character === "Mahito" && loss.ability === "Body Manipulation") g.releaseMahitoPrivateDeck(target);
			if (loss.ability === "Simple Domain") g.players[target].simple_domain_active = false;
			if (g.players[target].character === "Mahito" && loss.ability === "Idle Transfiguration") g.shatterDomain(target);
			this.notice = `${this.you(index)} sacrificed ${cost.label} to remove ${g.players[target].name}'s ${loss.ability}.`;
		}
		soulTouch(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (player.character !== "Mahito" || !g.effective(index, "Soul Touch")
				|| player.rule_uses["Soul Touch"] === g.round || this.mahitoBusy()) return;
			const targets = g.players.map((target, targetIndex) => targetIndex).filter((targetIndex) => {
				const target = g.players[targetIndex];
				return targetIndex !== index && !target.is_eliminated && !g.finished(targetIndex)
					&& target.hand_lock_until_round < g.round && !g.blocksEffect(targetIndex, index);
			});
			if (!targets.length) return;
			const target = targets[this.ask("Choose a player whose hand size to alter", targets.map((targetIndex) => g.players[targetIndex].name), answers)];
			const size = this.ask("Choose their new hand size (2-6)", ["2 cards", "3 cards", "4 cards", "5 cards", "6 cards"], answers) + 2;
			const affected = g.players[target];
			if (affected.hand.length > size) {
				const removed = affected.hand.splice(size);
				removed.forEach((entry, offset) => g.draw_piles[offset % g.draw_piles.length].push(entry));
				g.draw_piles.forEach(shuffle);
			} else {
				while (affected.hand.length < size) {
					const pile = g.draw_piles.find((entry) => entry.length);
					const drawn = (affected.character === "Mahito" && affected.personal_draw_pile.pop()) || pile?.pop();
					if (!drawn) break;
					affected.hand.push(drawn);
				}
			}
			affected.hand_size_override = size;
			affected.hand_size_until_round = g.round + 2;
			affected.hand_size_source = index;
			this.applyRefinedSoulLocks(target);
			player.rule_uses["Soul Touch"] = g.round;
			this.notice = `${this.you(index)} used Soul Touch to set ${affected.name}'s hand size to ${size} for 3 rounds.`;
		}
		canMahitoDomainCancel(index) {
			const g = this.game, player = g.players[index];
			return this.canMahitoDomainEffect(index)
				&& (player.mahito_domain_cancel_round !== g.round || player.mahito_domain_cancel_count < 2)
				&& g.players.some((target, targetIndex) => targetIndex !== index && !target.is_eliminated
					&& !g.finished(targetIndex) && !target.turn_cancelled
					&& !(target.simple_domain_active && target.simple_domain_refinement > 0));
		}
		mahitoDomainCancel(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (!this.canMahitoDomainCancel(index)) return;
			const targets = g.players.map((target, targetIndex) => targetIndex).filter((targetIndex) => {
				const target = g.players[targetIndex];
				return targetIndex !== index && !target.is_eliminated && !g.finished(targetIndex) && !target.turn_cancelled
					&& !(target.simple_domain_active && target.simple_domain_refinement > 0);
			});
			const target = targets[this.ask("Choose a player to turn cancel through the domain", targets.map((targetIndex) => g.players[targetIndex].name), answers)];
			if (player.mahito_domain_cancel_round !== g.round) {
				player.mahito_domain_cancel_round = g.round;
				player.mahito_domain_cancel_count = 0;
			}
			player.mahito_domain_cancel_count++;
			g.players[target].turn_cancelled = true;
			this.notice = `${this.you(index)} canceled ${g.players[target].name}'s turn through Self Embodiment of Perfection.`;
		}
		canMahitoDomainRemove(index) {
			const g = this.game, player = g.players[index];
			return this.canMahitoDomainEffect(index) && player.mahito_domain_remove_round !== g.round
				&& g.players.some((target, targetIndex) => targetIndex !== index && !target.is_eliminated
					&& !g.finished(targetIndex) && !(target.simple_domain_active && target.simple_domain_refinement > 0)
					&& CHARACTERS[target.character].some((track) => !target.ability_states[track.ability].removed));
		}
		mahitoDomainRemove(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (!this.canMahitoDomainRemove(index)) return;
			const targets = g.players.map((target, targetIndex) => targetIndex).filter((targetIndex) => {
				const target = g.players[targetIndex];
				return targetIndex !== index && !target.is_eliminated && !g.finished(targetIndex)
					&& !(target.simple_domain_active && target.simple_domain_refinement > 0)
					&& CHARACTERS[target.character].some((track) => !target.ability_states[track.ability].removed);
			});
			const target = targets[this.ask("Choose a player to lose an ability to the domain", targets.map((targetIndex) => g.players[targetIndex].name), answers)];
			const options = CHARACTERS[g.players[target].character].filter((track) => !g.players[target].ability_states[track.ability].removed);
			const track = options[this.ask(`${g.players[target].name}: choose an unlocked ability to remove`,
				options.map((entry) => g.players[target].ability_states[entry.ability].evolved ? entry.evolution.ability : entry.ability), answers)];
			const state = g.players[target].ability_states[track.ability];
			state.removed = true;
			state.evolved = false;
			if (g.players[target].character === "Mahito" && track.ability === "Body Manipulation") g.releaseMahitoPrivateDeck(target);
			if (track.ability === "Simple Domain") g.players[target].simple_domain_active = false;
			if (g.players[target].character === "Mahito" && track.ability === "Idle Transfiguration") g.shatterDomain(target);
			player.mahito_domain_remove_round = g.round;
			this.notice = `${this.you(index)} removed ${g.players[target].name}'s ${track.ability} through the domain.`;
		}
		mahitoDomainShatter(answers) {
			const g = this.game, index = g.current;
			const domain = this.mahitoDomain(index);
			if (!domain || g.effective(index, "Idle Transfiguration") !== "Self Embodiment of Perfection (Domain)"
				|| this.mahitoBusy()) return;
			const targets = g.players.map((target, targetIndex) => targetIndex).filter((targetIndex) => {
				const target = g.players[targetIndex];
				return targetIndex !== index && !target.is_eliminated && !g.finished(targetIndex)
					&& !(target.simple_domain_active && target.simple_domain_refinement > 0);
			});
			const losses = targets.map((target) => {
				const options = CHARACTERS[g.players[target].character].filter((track) => !g.players[target].ability_states[track.ability].removed);
				if (!options.length) return { target, track: null };
				const selected = options[this.ask(`${g.players[target].name}: choose an ability to remove`, options.map((track) =>
					g.players[target].ability_states[track.ability].evolved ? track.evolution.ability : track.ability), answers)];
				return { target, track: selected };
			});
			for (const target of targets) g.players[target].turn_cancelled = true;
			for (const { target, track } of losses) {
				if (!track) continue;
				const state = g.players[target].ability_states[track.ability];
				state.removed = true;
				state.evolved = false;
				if (g.players[target].character === "Mahito" && track.ability === "Body Manipulation") g.releaseMahitoPrivateDeck(target);
				if (track.ability === "Simple Domain") g.players[target].simple_domain_active = false;
				if (g.players[target].character === "Mahito" && track.ability === "Idle Transfiguration") g.shatterDomain(target);
			}
			g.domains = g.domains.filter((entry) => {
				if (entry.owner === index || entry.refinement >= 5) return true;
				if (entry.mahito) g.finishMahitoDomain(entry.owner);
				return false;
			});
			g.shatterDomain(index);
			this.notice = `${this.you(index)} shattered their domain, canceling turns and removing abilities from unprotected opponents.`;
		}
		enchainTargets(i, ability = this.game.effective(i, "Enchain")) {
			const g = this.game;
			return g.players.map((target, index) => index).filter((index) => index !== i
				&& !g.players[index].is_eliminated && !g.finished(index)
				&& !g.has(index, "God of Jujutsu")
				&& g.players[index].hand_lock_until_round < g.round
				&& (ability === "Rule Workaround" || !g.blocksEffect(index, i)));
		}
		abilityLossOptions(event) {
			const player = this.game.players[event.target];
			return CHARACTERS[player.character].flatMap((track) => {
				const state = player.ability_states[track.ability];
				if (state.removed) return [];
				if (event.kind === "upgrade") return state.evolved ? [{ ability: track.ability, label: track.evolution.ability }] : [];
				return [{ ability: track.ability, label: track.ability }];
			});
		}
		hasAbilities(index) {
			return Object.values(this.game.players[index].ability_states).some((ability) => !ability.removed);
		}
		queueSoulSeparation(target, source) {
			const g = this.game, player = g.players[target];
			player.soul_separation++;
			g.record(`${player.name} gained 1 Soul Separation (${player.soul_separation}).`);
			const upgradeThreshold = (player.soul_upgrades_lost + 1) * 2;
			if (player.soul_separation >= upgradeThreshold
				&& CHARACTERS[player.character].some((track) => player.ability_states[track.ability].evolved)) {
				player.soul_upgrades_lost++;
				g.pending_ability_losses.push({ target, source, kind: "upgrade", fatalIfNoAbilities: true });
			}
			const baseThreshold = (player.soul_bases_lost + 1) * 3;
			if (player.soul_separation >= baseThreshold) {
				if (this.hasAbilities(target)) {
					player.soul_bases_lost++;
					g.pending_ability_losses.push({ target, source, kind: "base", fatalIfNoAbilities: true });
				} else {
					if (!this.tryArmSacrifice(target)) player.is_eliminated = true;
				}
			}
		}
		yujiCleave() {
			const g = this.game, index = g.current;
			if (!g.effective(index, "Cleave")) return;
			this.notice = g.hasBlackFlashRecently(index)
				? "Cleave is active. Stack Destroy triggers it automatically."
				: "Land a Black Flash to use.";
		}
		divergentFist(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			const [source, cards] = g.source(index);
			if (!g.effective(index, "Divergent Fist") || !source || !cards.length
				|| player.rule_uses["Divergent Fist"] === g.turn) return;
			const cardIndex = this.ask("Divergent Fist: choose one card to play freely", cards.map((entry, n) =>
				source === "face_down" ? `Face-down card ${n + 1}` : cardText(entry)), answers);
			const selected = cards[cardIndex];
			const availablePiles = [0, 1].filter((index) => g.canUsePileForCurrentTurn(index));
			if (!availablePiles.length) return;
			const pile = availablePiles.length === 1
				? availablePiles[0]
				: availablePiles[this.ask("Choose a discard pile", availablePiles.map((index) => `Discard pile ${index + 1}`), answers)];
			if (g.tieBreakApplies(pile, index) && g.cardValue(index, selected) !== g.pile_values[pile]) {
				this.notice = "Tie Break requires an exact-value play on that pile.";
				return;
			}
			player.rule_uses["Divergent Fist"] = g.turn;
			g.place(selected, pile, selected.rank === "Joker" ? 14 : null, source);
			g.human_has_played = true;
			this.notice = `${this.you(index)} used Divergent Fist to play ${cardText(selected)}.`;
		}
		bloodManipulation(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (!g.effective(index, "Blood Manipulation") || player.hand.length <= 3 || player.bot) return;
			const cardIndex = this.ask("Blood Manipulation: choose a card to destroy", player.hand.map(cardText), answers);
			const [removed] = player.hand.splice(cardIndex, 1);
			g.destroyed.push(removed);
			this.notice = `${this.you(index)} destroyed ${cardText(removed)} with Blood Manipulation.`;
		}
		expandBlackFlashWithJoker(answers) {
			const g = this.game, index = g.current, player = g.players[index];
			if (g.effective(index, "Black Flash") !== "Blessed By The Sparks Of Black") return;
			const jokerIndex = player.hand.findIndex((entry) => entry.rank === "Joker");
			const choices = RANKS.filter((rank) => !player.black_flash_ranks.includes(rank));
			if (jokerIndex < 0 || !choices.length) return;
			const rank = choices[this.ask("Choose a rank to add to Black Flash", choices, answers)];
			player.hand.splice(jokerIndex, 1);
			player.black_flash_ranks.push(rank);
			this.notice = `${this.you(index)} expanded Black Flash to include ${rank}s.`;
		}
		blackFlashEvolve(action, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer();
			const pending = g.pending_black_flash_evolutions.find((event) => event.target === target);
			const track = CHARACTERS[g.players[target].character].find((entry) => entry.ability === action.ability);
			if (!pending || !g.blackFlashOptions(target).some((option) => option.ability === action.ability) || !track) return;
			const state = g.players[target].ability_states[action.ability];
			if (state.removed || state.evolution_lost || state.evolved) return;
			g.players[target].temporary_evolutions[action.ability] = g.round;
			if (g.players[target].character === "Mahito" && action.ability === "Idle Transfiguration") {
				g.openMahitoDomain(target, 1);
			}
			if (g.players[target].character === "Mahito" && action.ability === "Body Manipulation") {
				g.prepareMahitoTurn(target);
			}
			g.pending_black_flash_evolutions.splice(g.pending_black_flash_evolutions.indexOf(pending), 1);
			const remainingChoices = g.blackFlashOptions(target).map((option) => option.ability);
			for (const queued of [...g.pending_black_flash_evolutions].filter((event) => event.target === target)) {
				queued.choices = remainingChoices;
				if (!remainingChoices.length) g.pending_black_flash_evolutions.splice(g.pending_black_flash_evolutions.indexOf(queued), 1);
			}
			g.checkWinner();
			this.notice = `${this.you(target)} temporarily evolved ${action.ability} into ${track.evolution.ability} with Black Flash.`;
		}
		expandBlackFlash(action, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer();
			const pending = g.pending_black_flash_expansions.find((event) => event.target === target);
			if (!pending || !pending.choices.includes(action.rank)) return;
			g.players[target].black_flash_ranks.push(action.rank);
			g.pending_black_flash_expansions.splice(g.pending_black_flash_expansions.indexOf(pending), 1);
			g.checkWinner();
			this.notice = `${this.you(target)} can now land Black Flash with ${action.rank}s.`;
		}
		loseAbility(action, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer();
			const pending = g.pending_ability_losses.find((event) => event.target === target);
			if (!pending || !this.abilityLossOptions(pending).some((option) => option.ability === action.ability)) return;
			if (g.cardInteractionBlocked(target, pending.source, "ability_loss")) {
				g.pending_ability_losses.splice(g.pending_ability_losses.indexOf(pending), 1);
				if (g.current !== target) this.finishTurn();
				return;
			}
			const player = g.players[target], state = player.ability_states[action.ability];
			if (pending.kind === "upgrade") {
				state.evolved = false;
				state.evolution_lost = true;
			} else {
				state.removed = true;
				state.evolved = false;
				if (player.character === "Mahito" && action.ability === "Body Manipulation") g.releaseMahitoPrivateDeck(target);
				if (player.character === "Mahito" && action.ability === "Idle Transfiguration") g.shatterDomain(target);
			}
			g.pending_ability_losses.splice(g.pending_ability_losses.indexOf(pending), 1);
			this.notice = `${player.name} lost ${pending.kind === "upgrade" ? "the upgrade to " : ""}${action.ability}.`;
			if (pending.fatalIfNoAbilities && !this.hasAbilities(target) && !g.tryArmSacrifice(target)) player.is_eliminated = true;
			g.checkWinner();
		}
		deleteSelectedHandCard(type, answers, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer(), queue = type === "prisoner_delete"
				? g.pending_hand_deletes : g.pending_cleave_deletes;
			const pending = queue.find((event) => event.target === target);
			const player = g.players[target];
			if (!pending || !player.hand.length) return;
			const index = this.ask(pending.reason || "Choose a card to delete", player.hand.map(cardText), answers);
			const [removed] = player.hand.splice(index, 1);
			g.deleted.push(removed);
			queue.splice(queue.indexOf(pending), 1);
			g.checkWinner();
			this.notice = `${player.name} deleted ${cardText(removed)}.`;
		}
		canRescue(i) {
			const g = this.game;
			return g.hasRule(i, "Rescue Draw") && g.round - g.players[i].rescue_round >= 2;
		}
		canAllowEffect(i) {
			const g = this.game, p = g.players[i];
			const activeImmunity = g.immune(i) || p.immunity?.until_round >= g.round
				&& (p.immunity.type === "I-D" || p.immunity.type === "I-S" && p.immunity.shields > 0);
			return Boolean(activeImmunity && !p.allow_next_effect);
		}
		swapRanks(i) {
			const g = this.game, ability = g.effective(i, "Lapse Blue"), ranks = new Set();
			if (ability === "Lapse Blue") ranks.add("5");
			if (ability === "Reversal Red") ["5", "6", "9"].forEach((rank) => ranks.add(rank));
			if (["Boogie Woogie", "Vibraslap"].includes(g.effective(i, "Boogie Woogie"))) {
				["Joker", ...RANKS].forEach((rank) => ranks.add(rank));
			}
			if (g.players[i].god_rule === "Card Swapping" && g.players[i].god_grab_value >= 2) ranks.add(RANKS[g.players[i].god_grab_value - 2]);
			return [...ranks];
		}
		swapCredits(i) {
			const g = this.game, p = g.players[i], ability = g.effective(i, "Boogie Woogie");
			if (ability === "Boogie Woogie") return p.boogie_swap_used_turn === g.turn ? 0 : 1;
			if (ability === "Vibraslap" && p.vibraslap_acquired_turn !== null) {
				return Math.max(0, g.turn - p.vibraslap_acquired_turn - p.vibraslap_swaps_spent);
			}
			return 0;
		}
		spendSwapCredit(i) {
			const g = this.game, p = g.players[i], ability = g.effective(i, "Boogie Woogie");
			if (ability === "Boogie Woogie") p.boogie_swap_used_turn = g.turn;
			else if (ability === "Vibraslap") p.vibraslap_swaps_spent++;
		}
		cardSwapChoices(i) {
			const g = this.game, player = g.players[i], ranks = this.swapRanks(i);
			const own = ["hand", "face_up", "face_down"].flatMap((zone) => player[zone].flatMap((card, index) =>
				ranks.includes(card.rank) && (zone !== "face_down" || g.known(i, card)) ? [{ zone, index, card }] : []));
			const targets = [];
			for (let owner = 0; owner < g.players.length; owner++) {
				const target = g.players[owner];
				if (owner === i || target.is_eliminated || g.finished(owner) || g.blocksEffect(owner, i) || g.has(owner, "God of Jujutsu")) continue;
				target.face_up.forEach((card, index) => targets.push({ owner, zone: "face_up", index, card }));
				if (target.hand_lock_until_round < g.round) target.hand.forEach((card, index) => {
					if (target.revealed_cards.includes(card) || g.known(i, card)) targets.push({ owner, zone: "hand", index, card });
				});
				target.face_down.forEach((card, index) => {
					if (g.known(i, card)) targets.push({ owner, zone: "face_down", index, card });
				});
			}
			g.discards.forEach((cards, pile) => cards.forEach((card, index) => targets.push({ owner: -1, zone: "discard_pile", pile, index, card })));
			g.destroyed.forEach((card, index) => targets.push({ owner: -1, zone: "destroyed", index, card }));
			return { own, targets };
		}
		canCardSwap(i) {
			const g = this.game, p = g.players[i];
			if (g.current !== i || g.cards_played !== 0 || p.hand_lock_until_round >= g.round) return false;
			if (!this.swapRanks(i).length || g.finished(i)) return false;
			if (p.character === "Aoi Todo" && this.swapCredits(i) <= 0) return false;
			const options = this.cardSwapChoices(i);
			return Boolean(options.own.length && options.targets.length);
		}
		ask(title, options, answers) {
			const index = answers.pos < answers.values.length ? answers.values[answers.pos++] : -1;
			if (index < 0) throw { title, options };
			if (!Number.isInteger(index) || index >= options.length) throw new Error("That choice is no longer available");
			return index;
		}
		act(actionText) {
			const action = JSON.parse(actionText);
			const g = this.game;
			if (!g) return this.get_state();
			const answers = { values: action.answers || [], pos: 0 };
			try {
				const type = action.type;
				if (g.forced_play && g.current === g.forced_play.target
					&& !["play", "resolve_slash", "resolve_limitless", "quick_grab", "decline_quick_grab",
						"follow_stack", "decline_follow_stack", "stack_steal", "choose_card", "reveal", "allow_effect",
						"black_flash_evolve", "expand_black_flash", "lose_ability", "prisoner_delete", "cleave_delete",
						"delayed_black_flash", "best_brother", "best_brother_swap", "todo_swap_destroy", "todo_swap_keep"].includes(type)) return this.get_state();
				if (g.pending_best_brothers.length && type !== "best_brother") return this.get_state();
				if (g.pending_best_brother_swaps.length && type !== "best_brother_swap") return this.get_state();
				if (g.pending_todo_swap_destroys.length && !["todo_swap_destroy", "todo_swap_keep"].includes(type)) return this.get_state();
				if (type === "setup") this.setup(action);
				else if (type === "play") this.playAction(action, answers);
				else if (type === "end_turn") this.endAction();
				else if (type === "draw_pref") {
						if (!this.needsDrawChoice() || !g.draw_piles[action.pile] || action.depth < 0 || action.depth >= g.draw_piles[action.pile].length) return this.get_state();
					this.drawPref = [action.pile, action.depth];
					g.drawPref = this.drawPref;
					this.notice = "Mastered Six Eyes: chosen card will be drawn.";
					g.refill(g.current);
					this.drawPref = null;
				}
				else if (type === "take_piles") this.takePilesAction();
				else if (type === "cleave") this.cleave(action, answers);
				else if (type === "enchain") this.enchain(action);
				else if (type === "activate_enchain") this.activateEnchain(answers);
				else if (type === "reschedule_enchain") this.rescheduleEnchain(action);
				else if (type === "card_swap") this.cardSwap(answers);
				else if (type === "boogie_soul_swap") this.boogieSoulSwap(answers);
				else if (type === "built_different") this.builtDifferent(answers);
				else if (type === "vivid_skip") this.vividSkip(Number(action.target));
				else if (type === "vivid_expand") this.vividExpand(Number(action.target));
				else if (type === "body_manipulation") this.bodyManipulation(answers);
				else if (type === "transfigured_humans") this.transfiguredHumans(answers);
				else if (type === "transfigured_army") this.transfiguredArmy(answers, Number(action.target));
				else if (type === "transfigured_army_auto") this.setTransfiguredArmyValue(answers);
				else if (type === "idle_transfiguration") this.idleTransfiguration(answers);
				else if (type === "soul_touch") this.soulTouch(answers);
				else if (type === "mahito_domain_cancel") this.mahitoDomainCancel(answers);
				else if (type === "mahito_domain_remove") this.mahitoDomainRemove(answers);
				else if (type === "mahito_domain_shatter") this.mahitoDomainShatter(answers);
				else if (type === "best_brother") this.bestBrother(answers);
				else if (type === "decline_best_brother") this.declineBestBrother();
				else if (type === "best_brother_swap") this.bestBrotherSwap(answers);
				else if (type === "todo_swap_destroy" || type === "todo_swap_keep") this.resolveTodoSwapDestroy(type === "todo_swap_destroy");
				else if (type === "reveal") this.reveal(action);
				else if (type === "six_eyes") this.sixEyes(answers);
				else if (type === "full_hand") this.fullHand(answers);
				else if (type === "rescue") this.rescue(answers);
				else if (type === "god") this.god(answers);
				else if (type === "god_rule") this.useGodRule(answers);
				else if (type === "vow") this.vow(answers);
				else if (type === "evolve") this.evolve(answers);
				else if (type === "simple_domain") this.simpleDomain(answers);
				else if (type === "domain") this.domain(answers);
				else if (type === "quick_grab" || type === "decline_quick_grab") this.quickGrab(type === "quick_grab");
				else if (type === "follow_stack" || type === "decline_follow_stack") this.followStack(type === "follow_stack", answers);
				else if (type === "stack_steal") this.stackSteal(answers);
				else if (type === "choose_card") this.chooseCard(action);
				else if (type === "allow_effect") this.allowNextEffect();
				else if (type === "resolve_slash") this.resolveSlash(answers);
				else if (type === "resolve_limitless") this.resolveLimitless(answers);
				else if (type === "yuji_cleave") this.yujiCleave();
				else if (type === "divergent_fist") this.divergentFist(answers);
				else if (type === "blood_manipulation") this.bloodManipulation(answers);
				else if (type === "delayed_black_flash") this.delayedBlackFlash(answers);
				else if (type === "expand_black_flash_joker") this.expandBlackFlashWithJoker(answers);
				else if (type === "black_flash_evolve") this.blackFlashEvolve(action);
				else if (type === "expand_black_flash") this.expandBlackFlash(action);
				else if (type === "lose_ability") this.loseAbility(action);
				else if (type === "prisoner_delete" || type === "cleave_delete") this.deleteSelectedHandCard(type, answers);
				this.autoProgress();
				g.refillUnderfilledHands();
			} catch (error) {
				if (error && error.options) return JSON.stringify({ ask: { title: error.title, options: error.options } });
				this.notice = error.message || String(error);
			}
			return this.get_state();
		}
		setup(action) {
			if (this.setupComplete) return;
			const picks = [...new Set(action.cards || [])].sort((a, b) => a - b);
			if (picks.length !== 3 || picks.some((i) => i < 0 || i >= this.game.players[this.setupPlayer].hand.length)) throw new Error("Choose three different cards");
			const p = this.game.players[this.setupPlayer], selected = new Set(picks);
			p.face_up = p.hand.filter((_, i) => selected.has(i));
			p.hand = p.hand.filter((_, i) => !selected.has(i));
			if (this.game.start_with_joker) p.hand.push(card("Joker", "", 3));
			const position = this.setupQueue.indexOf(this.setupPlayer);
			if (position + 1 < this.setupQueue.length) {
				this.setupPlayer = this.setupQueue[position + 1];
				this.notice = "Choose three cards to keep face-up for later.";
			} else {
				this.setupComplete = true;
				this.notice = "Select a card and a discard pile, then play.";
			}
		}
		playAction(action, answers) {
			const g = this.game, current = g.current, p = g.players[current];
			if (p.bot || this.needsDrawChoice() || g.pending_reveals.length) return;
			const [source, cards] = g.source(current), cardIndex = Number(action.card), pile = Number(action.pile);
			if (!source || cardIndex < 0 || cardIndex >= cards.length || ![0, 1].includes(pile) || p.pending_world_slashes || p.pending_limitless_effects.length) return;
			const c = cards[cardIndex];
			if (source === "face_down") {
				const value = p.transfigured_next_value !== null
					? p.transfigured_next_value : g.cardValue(current, c, c.rank === "Joker" ? 14 : null);
				if (g.tieBreakApplies(pile, current) && value !== g.pile_values[pile]) {
					g.tie_breaks[pile] = null;
					this.notice = `${this.you(current)} forfeited their turn on Tie Break.`;
					this.finishTurn();
					return;
				}
				const [played, success] = g.playDown(current, cardIndex, pile);
				if (!success) {
					this.notice = `${this.you(current)} revealed ${cardText(played)} and picked up both discard piles.`;
					this.finishTurn();
					return;
				}
				this.notice = `${this.you(current)} revealed and played ${this.playedLabel(played, 14)}.`;
				if (g.tieBreakApplies(pile, current)) g.tie_breaks[pile] = null;
				this.autoEnd = true;
				g.human_has_played = true;
				return;
			}
			const useTransfiguredValue = p.transfigured_next_value !== null;
			const jokerValue = c.rank === "Joker" && !useTransfiguredValue ? this.ask("Joker value", RANKS, answers) + 2 : null;
			if (g.tieBreakApplies(pile, current) && g.cardValue(current, c, jokerValue) !== g.pile_values[pile]) {
				g.tie_breaks[pile] = null;
				this.notice = `${this.you(current)} forfeited their turn on Tie Break.`;
				this.finishTurn();
				return;
			}
			const first = g.cards_played === 0;
			const played = g.play(current, source, cardIndex, pile, jokerValue);
			if (!played) {
				this.notice = first ? `Illegal first play. ${this.you(current)} picked up both discard piles.` : "Illegal follow-up blocked. The piles were left unchanged.";
				this.finishTurn();
				return;
			}
			if (g.tieBreakApplies(pile, current)) g.tie_breaks[pile] = null;
			g.human_has_played = true;
			this.notice = `${this.you(current)} played ${this.playedLabel(played, jokerValue)}.${source === "hand" && g.last_drawn.length ? ` Drew ${g.last_drawn.length} card(s).` : ""}`;
			if (g.forced_play) g.forced_play.played = true;
		}
		finishTurn() {
			const g = this.game;
			this.autoEnd = false;
			if (g.winner !== null) return;
			if (g.forced_play) {
				const forced = g.forced_play;
				g.forced_play = null;
				g.current = forced.owner; g.cards_played = forced.cards_played;
				g.turn_pile = forced.turn_pile; g.turn_pile_destroyed = forced.turn_pile_destroyed;
				g.human_has_played = forced.human_has_played;
				this.lastHuman = forced.owner;
				return;
			}
			g.endTurn();
			g.human_has_played = g.cards_played > 0;
		}
		endAction() {
			const g = this.game, i = g.current, p = g.players[i];
			if ((!g.human_has_played && p.black_flash_turns <= 0 && p.self_clone_turns <= 0)
				|| p.pending_world_slashes || p.pending_limitless_effects.length || g.mustEnchain(i)
				|| g.pending_quick_grabs.length || g.pending_follow_stacks.length || g.pending_stack_steals.length
				|| g.pending_card_choice || g.pending_reveals.length || g.pending_black_flash_evolutions.length || g.pending_black_flash_expansions.length
				|| g.pending_ability_losses.length || g.pending_hand_deletes.length || g.pending_cleave_deletes.length
				|| g.pending_best_brothers.length || g.pending_best_brother_swaps.length || g.pending_todo_swap_destroys.length) return;
			this.finishTurn();
		}
		takePilesAction() {
			const g = this.game, i = g.current;
			if (g.players[i].bot || g.winner !== null || g.finished(i) || g.pending_quick_grabs.length
				|| g.pending_reveals.length || g.players[i].pending_world_slashes
				|| g.players[i].pending_limitless_effects.length || g.mustEnchain(i) || g.forced_play
				|| g.pending_follow_stacks.length || g.pending_stack_steals.length || g.pending_card_choice
				|| g.pending_black_flash_evolutions.length || g.pending_black_flash_expansions.length || g.pending_ability_losses.length
				|| g.pending_hand_deletes.length || g.pending_cleave_deletes.length
				|| g.pending_best_brothers.length || g.pending_best_brother_swaps.length || g.pending_todo_swap_destroys.length) return;
			g.takePiles(i); this.notice = `${this.you(i)} picked up both discard piles and ended their turn.`; this.finishTurn();
		}
		autoProgress() {
			const g = this.game;
			for (let count = 0; count < 50 && g && this.setupComplete && g.winner === null; count++) {
				const abilityLoss = g.pending_ability_losses[0];
				if (abilityLoss) {
					if (!g.players[abilityLoss.target].bot) return;
					const option = this.abilityLossOptions(abilityLoss)[0];
					if (option) this.loseAbility({ ability: option.ability }, abilityLoss.target);
					else g.pending_ability_losses.shift();
					continue;
				}
				const blackFlashEvolution = g.pending_black_flash_evolutions[0];
				if (blackFlashEvolution) {
					if (!g.players[blackFlashEvolution.target].bot) return;
					const option = g.blackFlashOptions(blackFlashEvolution.target)[0];
					if (option) this.blackFlashEvolve({ ability: option.ability }, blackFlashEvolution.target);
					else g.pending_black_flash_evolutions.shift();
					continue;
				}
				const expansion = g.pending_black_flash_expansions[0];
				if (expansion) {
					if (!g.players[expansion.target].bot) return;
					this.expandBlackFlash({ rank: expansion.choices[0] }, expansion.target);
					continue;
				}
				const handDelete = g.pending_hand_deletes[0] || g.pending_cleave_deletes[0];
				if (handDelete) {
					if (!g.players[handDelete.target].bot) return;
					this.deleteSelectedHandCard(g.pending_hand_deletes[0] === handDelete ? "prisoner_delete" : "cleave_delete", { values: [0], pos: 0 }, handDelete.target);
					continue;
				}
				if (g.pending_best_brothers.length) {
					const pending = g.pending_best_brothers[0];
					if (!g.players[pending.aoi].bot) return;
					this.bestBrother({ values: [0], pos: 0 }, pending.aoi);
					continue;
				}
				if (g.pending_best_brother_swaps.length) {
					const pending = g.pending_best_brother_swaps[0];
					if (!g.players[pending.target].bot) return;
					this.bestBrotherSwap({ values: [0, 0], pos: 0 }, pending.target);
					continue;
				}
				if (g.pending_todo_swap_destroys.length) {
					const pending = g.pending_todo_swap_destroys[0];
					if (!g.players[pending.target].bot) return;
					this.resolveTodoSwapDestroy(true, pending.target);
					continue;
				}
				if (g.pending_card_choice) {
					if (!g.players[g.pending_card_choice.target].bot) return;
					const choice = g.pending_card_choice, selected = [...(choice.required_indices || [])];
					for (const index of choice.indices) if (selected.length < choice.count && !selected.includes(index)) selected.push(index);
					this.chooseCard({ cards: selected }, choice.target);
					continue;
				}
				while (g.pending_quick_grabs.length && !g.pending_quick_grabs[0].targets.some((i) => !g.players[i].bot)) {
					this.resolveQuickGrab(g.pending_quick_grabs[0].targets[0], true);
				}
				if (this.quickGrabTarget() !== null) return;
				while (g.pending_follow_stacks.length && !g.pending_follow_stacks[0].targets.some((i) => !g.players[i].bot)) {
					const target = g.pending_follow_stacks[0].targets[0];
					this.followStack(g.players[target].hand.some((c) => c.rank === g.pending_follow_stacks[0].rank), { values: [0], pos: 0 }, target);
				}
				if (g.pending_follow_stacks.some((event) => event.targets.some((i) => !g.players[i].bot))) return;
				while (g.pending_stack_steals.length && !g.pending_stack_steals[0].targets.some((i) => !g.players[i].bot)) {
					this.stackSteal({ values: [0], pos: 0 }, g.pending_stack_steals[0].targets[0]);
				}
				if (g.pending_stack_steals.some((event) => event.targets.some((i) => !g.players[i].bot))) return;
				const i = g.current, p = g.players[i];
				if (p.enchain_scheduled_turn !== null && g.turn >= p.enchain_scheduled_turn) {
					if (p.bot || g.effective(i, "Enchain") !== "Rule Workaround") {
						this.activateEnchain({ values: [], pos: 0 });
						continue;
					}
					return;
				}
				if (p.bot || this.needsDrawChoice() || g.pending_reveals.length) return;
				if (p.hand.length < 3 && g.draw_piles.some((pile) => pile.length)) g.refill(i);
				if (this.autoEnd && !p.pending_world_slashes && !p.pending_limitless_effects.length) { this.finishTurn(); continue; }
				if (p.pending_world_slashes || p.pending_limitless_effects.length) return;
				if (g.forced_play?.played) { this.finishTurn(); continue; }
				const [source, cards] = g.source(i);
				if (!source) {
					if (g.finished(i)) { this.finishTurn(); continue; }
					if (g.forced_play) { this.finishTurn(); continue; }
					this.notice = "No cards available. Use an ability or pick up the discard piles.";
					return;
				}
				if (source !== "face_down" && !cards.some((c) => [0, 1].some((pile) => g.legal(c, pile, c.rank === "Joker" ? 14 : null)))) {
					if (g.forced_play) { this.finishTurn(); continue; }
					if (g.enchain_return && g.cards_played < 2) { this.finishTurn(); continue; }
					this.notice = g.cards_played
						? "No legal follow-up plays. End your turn or pick up the discard piles."
						: `No legal plays. ${this.you(i)} may use an ability or pick up both discard piles.`;
				}
				return;
			}
		}
		evolve(answers) {
			const g = this.game, i = g.current, p = g.players[i], options = this.evolvable(i);
			if (p.bot || g.cards_played || !options.length) return;
			const jokerIndex = p.hand.findIndex((c) => c.rank === "Joker");
			if (jokerIndex < 0) return;
			const option = options[this.ask("Choose an ability to evolve", options.map((t) => `${t.ability} → ${t.evolution.ability}`), answers)];
			p.hand.splice(jokerIndex, 1);
			p.ability_states[option.ability].evolved = true;
			if (option.ability === "Boogie Woogie") {
				p.vibraslap_acquired_turn = g.turn;
				p.vibraslap_swaps_spent = 0;
			}
			if (p.character === "Mahito" && option.ability === "Body Manipulation") g.prepareMahitoTurn(i);
			if (p.character === "Mahito" && option.ability === "Idle Transfiguration") g.openMahitoDomain(i, 3);
			if (p.character === "Mahito" && option.ability === "Soul Touch") {
				for (let target = 0; target < g.players.length; target++) {
					if (target !== i && g.players[target].hand_size_override !== null
						&& g.players[target].hand_size_until_round >= g.round) {
						g.players[target].hand_lock_until_round = Math.max(g.players[target].hand_lock_until_round, g.round + 2);
					}
				}
			}
			this.notice = `${this.you(i)} evolved ${option.ability} into ${option.evolution.ability} and ended their turn.`;
			this.finishTurn();
		}
		applyRefinedSoulLocks(target) {
			const g = this.game;
			for (let index = 0; index < g.players.length; index++) {
				if (index !== target && g.effective(index, "Soul Touch") === "Refined Soul") {
					g.players[target].hand_lock_until_round = Math.max(g.players[target].hand_lock_until_round, g.round + 2);
				}
			}
		}
		cleave(action, answers) {
			const g = this.game, i = g.current, p = g.players[i], pileIndex = action.pile;
			if (p.character === "Yuji Itadori") return;
			if (![0, 1].includes(pileIndex) || !g.effective(i, "Cleave")) return;
			const ability = g.effective(i, "Cleave");
			if (!ability) return;
			const uses = p.ability_states.Cleave || { round: -1, uses: 0 };
			if (uses.round === g.round && (ability === "Spider Net Cleave" ? uses.uses >= 5 : uses.uses >= 1)) return;
			if (!g.discards[pileIndex].length || g.isPileLocked(pileIndex)) return;
			let replacements = null;
			const available = ["hand", "face_up", "face_down"].flatMap((zone) => p[zone].map((c, index) => ({ zone, index, c })));
			if (ability === "Spider Net Cleave" && g.discards[pileIndex].length === 1 && available.length >= 2) {
				const picked = [];
				for (let n = 0; n < 2; n++) {
					const options = available.filter((row) => !picked.includes(row));
					const choice = options[this.ask(`Spider Net Cleave: choose a card for discard pile ${n + 1}`, options.map((row) => `${row.zone.replace("_", " ")}: ${row.zone === "face_down" ? "Face-down card" : cardText(row.c)}`), answers)];
					const jokerValue = choice.c.rank === "Joker" ? this.ask(`Joker value for discard pile ${n + 1}`, RANKS, answers) + 2 : null;
					picked.push(choice);
					choice.jokerValue = jokerValue;
				}
				replacements = picked;
			}
			const removed = g.discards[pileIndex].pop();
			g.destroyed.push(removed);
			g.pile_value_history[pileIndex].pop();
			g.pile_owner_history[pileIndex].pop();
			g.syncPile(pileIndex);
			if (replacements) {
				const other = 1 - pileIndex;
				g.destroyed.push(...g.discards[other].splice(0));
				g.pile_values[other] = 14; g.pile_last_player[other] = null;
				g.pile_value_history[other] = []; g.pile_owner_history[other] = [];
				for (const row of replacements) {
					const zone = p[row.zone], index = zone.indexOf(row.c);
					if (index >= 0) zone.splice(index, 1);
				}
				for (let n = 0; n < 2; n++) {
					const row = replacements[n], targetPile = n === 0 ? pileIndex : other;
					g.discards[targetPile].push(row.c);
					g.pile_values[targetPile] = rankValue(row.c, row.jokerValue);
					g.pile_last_player[targetPile] = i;
					g.pile_value_history[targetPile] = [g.pile_values[targetPile]];
					g.pile_owner_history[targetPile] = [i];
				}
			}
			if (uses.round !== g.round) uses.uses = 0;
			uses.round = g.round; uses.uses++;
			if (!p.ability_states.Cleave) p.ability_states.Cleave = uses;
			this.notice = replacements
				? `${ability} destroyed both piles and replaced them with two cards.`
				: `${ability} destroyed ${cardText(removed)}.`;
		}
		enchain(action) {
			const g = this.game, user = this.viewer();
			if (!this.canEnchain(user)) return;
			const turns = Number(action.turns);
			if (!Number.isInteger(turns) || turns < 1) throw new Error("Choose a positive number of turns.");
			const player = g.players[user];
			player.enchain_used = true;
			player.enchain_scheduled_turn = g.turn + turns;
			this.notice = `${this.you(user)} scheduled Enchain to activate in ${turns} turn(s).`;
		}
		rescheduleEnchain(action) {
			const g = this.game, index = g.current, player = g.players[index];
			if (g.effective(index, "Enchain") !== "Rule Workaround"
				|| player.enchain_scheduled_turn === null || g.turn < player.enchain_scheduled_turn) return;
			const turns = Number(action.turns);
			if (!Number.isInteger(turns) || turns < 1) throw new Error("Choose a positive number of turns.");
			player.enchain_scheduled_turn = g.turn + turns;
			this.notice = `${this.you(index)} rescheduled Enchain for ${turns} turn(s) from now.`;
		}
		activateEnchain(answers = { values: [], pos: 0 }, specifiedUser = null) {
			const g = this.game, user = specifiedUser ?? g.current, player = g.players[user];
			if (player.enchain_scheduled_turn === null || g.turn < player.enchain_scheduled_turn) return;
			const ability = g.effective(user, "Enchain");
			if (!ability) return;
			const targets = this.enchainTargets(user, ability);
			if (!targets.length) {
				player.enchain_scheduled_turn = null;
				this.notice = `${this.you(user)}'s Enchain had no valid target and did not activate.`;
				return;
			}
			const target = player.bot
				? targets[0]
				: targets[this.ask(`${player.name}: choose a player to Soul Swap with. You must then play 2 cards`, targets.map((i) => g.players[i].name), answers)];
			this.startEnchain(user, target, ability);
		}
		startEnchain(user, target, ability = this.game.effective(user, "Enchain")) {
			const g = this.game, a = g.players[user], b = g.players[target];
			if (!a || !b || !this.enchainTargets(user, ability).includes(target)) return false;
			if (ability !== "Rule Workaround" && g.blocksEffect(target, user, true)) {
				a.enchain_scheduled_turn = null;
				return false;
			}
			a.enchain_scheduled_turn = null;
			if (g.cardInteractionBlocked(target, user, "soul_swap")) {
				if (user === g.current) this.finishTurn();
				return false;
			}
			[a.hand, b.hand] = [b.hand, a.hand]; [a.face_up, b.face_up] = [b.face_up, a.face_up]; [a.face_down, b.face_down] = [b.face_down, a.face_down];
			if (user !== g.current) {
				g.enchain_return = {
					current: g.current, cards_played: g.cards_played, turn_pile: g.turn_pile,
					turn_pile_destroyed: g.turn_pile_destroyed, human_has_played: g.human_has_played,
				};
				g.current = user; g.cards_played = 0; g.turn_pile = null; g.turn_pile_destroyed = false;
			}
			g.enchain_player = user; g.enchain_remaining = 2;
			if (!a.bot) this.lastHuman = user;
			g.human_has_played = false;
			this.notice = `${this.you(user)} soul swapped with ${g.players[target].name}. Play 2 cards in a row.`;
			return true;
		}
		canUseSixEyes(index) {
			const g = this.game, p = g.players[index];
			return g.current === index && !p.bot && !g.finished(index)
				&& Boolean(g.effective(index, "Six Eyes"))
				&& p.rule_uses["Six Eyes"] !== g.round;
		}
		sixEyes(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!this.canUseSixEyes(i)) return;
			const choice = this.ask("Six Eyes", ["View one of your face-down cards", "See another player's hand"], answers);
			if (choice === 0 && p.face_down.length) {
				const cardIndex = this.ask("Choose a face-down card", p.face_down.map((_, n) => `Face-down card ${n + 1}`), answers);
				g.remember(i, p.face_down[cardIndex], i);
				this.notice = `Six Eyes saw ${cardText(p.face_down[cardIndex])}.`;
			} else {
				const targets = g.players.map((entry, n) => n).filter((n) => n !== i && !g.players[n].is_eliminated);
				if (targets.length) {
					const target = targets[this.ask("Choose a player", targets.map((n) => g.players[n].name), answers)];
					for (const c of g.players[target].hand) g.remember(i, c, target);
					this.notice = `Six Eyes viewed ${g.players[target].name}'s hand.`;
				}
			}
			p.rule_uses["Six Eyes"] = g.round;
		}
		fullHand(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!g.hasRule(i, "Full Hand") || p.bot || g.cards_played === 0
				|| p.full_hand_round === g.round && p.full_hand_plays >= 3) return;
			const zones = ["face_up", "face_down"].filter((zone) => p[zone].length);
			if (!zones.length) return;
			const zone = zones[this.ask("Full Hand: choose a card zone", zones.map((entry) => entry.replace("_", " ")), answers)];
			const cardIndex = this.ask(`Full Hand: choose a ${zone.replace("_", " ")} card`,
				p[zone].map((c, index) => zone === "face_down" ? `Face-down card ${index + 1}` : cardText(c)), answers);
			const c = p[zone][cardIndex];
			const value = c.rank === "Joker" ? this.ask("Joker value", RANKS, answers) + 2 : null;
			const pile = g.turn_pile ?? this.ask("Choose a discard pile", ["Discard pile 1", "Discard pile 2"], answers);
			if (!g.legal(c, pile, value)) {
				this.notice = "That card is not legal on the selected pile.";
				return;
			}
			if (p.full_hand_round !== g.round) p.full_hand_plays = 0;
			p.full_hand_round = g.round;
			g.place(c, pile, value, zone);
			g.human_has_played = true;
			this.notice = `${this.you(i)} used Full Hand to play ${this.playedLabel(c, value)}.`;
		}
		boogieSoulSwap(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (p.character !== "Aoi Todo" || g.effective(i, "Boogie Woogie") !== "Boogie Woogie"
				|| p.boogie_soul_swap_used || g.forced_play) return;
			const targets = g.players.map((_, index) => index).filter((index) => index !== i
				&& !g.players[index].is_eliminated && !g.finished(index) && !g.has(index, "God of Jujutsu")
				&& g.players[index].hand_lock_until_round < g.round && !g.blocksEffect(index, i));
			if (!targets.length) return;
			const targetIndex = targets[this.ask("Choose a player to Soul Swap with", targets.map((index) => g.players[index].name), answers)];
			const target = g.players[targetIndex];
			if (g.blocksEffect(targetIndex, i, true) || g.cardInteractionBlocked(targetIndex, i, "soul_swap")) return;
			[p.hand, target.hand] = [target.hand, p.hand];
			[p.face_up, target.face_up] = [target.face_up, p.face_up];
			[p.face_down, target.face_down] = [target.face_down, p.face_down];
			p.boogie_soul_swap_used = true;
			this.notice = `${this.you(i)} used Boogie Woogie to Soul Swap with ${target.name}.`;
		}
		vividSkip(index) {
			const g = this.game, p = g.players[index];
			if (!p || p.character !== "Aoi Todo" || g.effective(index, "Arm Sacrifice") !== "Vivid Imagination"
				|| !p.takada_meter || p.vivid_uses >= 3 + p.vivid_limit_bonus || g.forced_play
				|| g.enchain_return || g.mustEnchain(g.current)
				|| g.pending_quick_grabs.length || g.pending_follow_stacks.length || g.pending_stack_steals.length
				|| g.pending_card_choice || g.pending_reveals.length || g.pending_black_flash_evolutions.length
				|| g.pending_black_flash_expansions.length || g.pending_ability_losses.length
				|| g.pending_hand_deletes.length || g.pending_cleave_deletes.length || g.pending_best_brothers.length
				|| g.pending_best_brother_swaps.length || g.pending_todo_swap_destroys.length
				|| g.players.some((player) => player.pending_world_slashes || player.pending_limitless_effects.length)) return;
			p.takada_meter--;
			p.vivid_uses++;
			p.turn_cancelled = false;
			g.next_player_override = index;
			g.next_player_override_crosses_round = g.current === index || g.current > index;
			g.next_player_override_skip_bonus = true;
			if (g.current === index) p.black_flash_turns = 0;
			this.notice = `${p.name} spent a Takada-Chan's Biggest Fan meter to skip to their turn.`;
			this.finishTurn();
		}
		vividExpand(index = this.viewer()) {
			const p = this.game.players[index];
			if (!p || p.character !== "Aoi Todo" || this.game.effective(index, "Arm Sacrifice") !== "Vivid Imagination") return;
			const joker = p.hand.findIndex((entry) => entry.rank === "Joker");
			if (joker < 0) return;
			p.hand.splice(joker, 1);
			p.vivid_limit_bonus++;
			this.notice = `${p.name} spent a Joker to increase the Vivid Imagination use limit to ${3 + p.vivid_limit_bonus}.`;
		}
		builtDifferent(answers, specifiedPlayer = null) {
			const g = this.game, i = specifiedPlayer ?? g.current, p = g.players[i];
			const used = p.built_different_round === g.round ? p.built_different_uses : 0;
			if (g.current !== i || p.character !== "Aoi Todo" || !g.effective(i, "Built Different")
				|| used >= 3 || this.swapCredits(i) < 1 || g.forced_play) return;
			const rule = RULE_NAMES[this.ask("Choose a multi-use rule to use with Built Different", RULE_NAMES, answers)];
			const actionRules = new Set([
				"Top card discard", "Soul Swap", "Card Swapping", "Reveal", "Rescue Draw", "Full Hand",
				"Turn Cancel", "Discard Swap", "Sneak Peek", "Swap 1", "Pile Boost", "Burn One",
				"Swap Pair", "Top Swap", "Tie Break", "Peek Swap", "Forced Play",
			]);
			if (actionRules.has(rule)) {
				const previous = { god_rule: p.god_rule, god_round: p.god_round, resolving: p.todo_built_different_resolving };
				if (!this.godRuleReadyForBuiltDifferent(i, rule)) return;
				p.god_rule = rule;
				p.god_round = g.round;
				p.todo_built_different_resolving = true;
				let success = false;
				try {
					success = this.useGodRule(answers, true);
				} finally {
					p.god_rule = previous.god_rule;
					p.god_round = previous.god_round;
					p.todo_built_different_resolving = previous.resolving;
				}
				if (!success) return;
			} else if (!this.applyBuiltDifferentRule(i, rule, answers)) return;
			this.spendSwapCredit(i);
			p.built_different_round = g.round;
			p.built_different_uses = used + 1;
			this.notice = `${this.you(i)} used Built Different to use ${rule}.`;
		}
		godRuleReadyForBuiltDifferent(i, rule) {
			const p = this.game.players[i], previous = p.god_rule;
			p.god_rule = rule;
			try {
				return this.godRuleReady(i);
			} finally {
				p.god_rule = previous;
			}
		}
		applyBuiltDifferentRule(i, rule, answers) {
			const g = this.game, p = g.players[i];
			let parameter = null, target = null, pile = null, immunity = null;
			if (rule === "Black Flash") parameter = RANKS[this.ask("Choose a card value that activates Black Flash", RANKS, answers)];
			else if (rule === "Quick Grab") parameter = this.ask("Choose a value for Quick Grab", RANKS, answers) + 2;
			else if (rule === "Value Inversion" || rule === "Free Cards") {
				parameter = RANKS[this.ask(`Choose the rank for ${rule}`, RANKS, answers)];
			}
			else if (rule === "Immunity") {
				const selection = this.ask("Choose an immunity type", ["I-T (true immunity)", "I-D (highest-card comparison)", "I-S (3 shields)"], answers);
				const type = ["I-T", "I-D", "I-S"][selection];
				immunity = { type, until_round: type === "I-S" ? Number.MAX_SAFE_INTEGER : g.round, shields: type === "I-S" ? 3 : 0 };
			} else if (rule === "Hand Lock") {
				const targets = g.players.map((_, index) => index).filter((index) => index !== i
					&& !g.finished(index) && !g.players[index].is_eliminated && !g.blocksEffect(index, i));
				if (!targets.length) return false;
				target = targets[this.ask("Choose a player to Hand Lock", targets.map((index) => g.players[index].name), answers)];
				if (g.blocksEffect(target, i, true)) return false;
			} else if (rule === "Pile Lock") {
				pile = this.ask("Choose a discard pile to protect", ["Discard pile 1", "Discard pile 2"], answers);
			}
			switch (rule) {
				case "Black Flash":
				case "Quick Grab":
				case "Value Inversion":
					p.built_different_rule = rule;
					p.built_different_rule_used = false;
					p.god_rule_param = parameter;
					if (rule === "Quick Grab") p.god_grab_value = parameter;
					break;
				case "Immunity": p.immunity = immunity; break;
				case "I-T": p.it_until_round = Math.max(p.it_until_round, g.round); break;
				case "Stack destroy":
				case "Free Cards":
				case "Under Play":
				case "Skip Play":
				case "Chain Play":
				case "Follow Stacking":
				case "Stack Steal":
				case "Split Steal":
				case "Delay Destroy":
					p.built_different_rule = rule;
					p.built_different_rule_used = false;
					break;
				case "Turn Reversal": {
					let previous = (i - 1 + g.players.length) % g.players.length;
					while (g.finished(previous) && previous !== i) previous = (previous - 1 + g.players.length) % g.players.length;
					g.next_player_override = previous;
					break;
				}
				case "Meters": p.meter++; break;
				case "Value Decrease": g.modifyPileValues(-1); break;
				case "Value Increase":
					g.modifyPileValues(1);
					g.pile_over_ace = g.pile_values.map((value) => value > 14);
					break;
				case "Hand Lock": g.players[target].hand_lock_until_round = g.round + 2; break;
				case "Pile Lock": g.pile_locks[pile] = { owner: i, set_turn: g.turn }; break;
				case "Limit Play": p.limit_play_until_round = g.round; break;
				default:
					p.built_different_rule = rule;
					p.built_different_rule_used = false;
			}
			return true;
		}
		cardSwap(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!this.canCardSwap(i)) return;
			const { own, targets } = this.cardSwapChoices(i);
			const ownRow = own[this.ask("Choose a card to swap", own.map((row) => `${row.zone.replace("_", " ")}: ${cardText(row.card)}`), answers)];
			const targetRow = targets[this.ask("Choose a visible card", targets.map((row) => {
				const location = row.owner < 0
					? row.zone === "destroyed" ? "Destroyed pile" : `Discard pile ${row.pile + 1}`
					: `${g.players[row.owner].name} / ${row.zone.replace("_", " ")}`;
				return `${location}: ${cardText(row.card)}`;
			}), answers)];
			const ownCards = p[ownRow.zone];
			const targetCards = targetRow.owner < 0
				? targetRow.zone === "destroyed" ? g.destroyed : g.discards[targetRow.pile]
				: g.players[targetRow.owner][targetRow.zone];
			if (targetRow.owner >= 0 && (g.blocksEffect(targetRow.owner, i, true)
				|| g.cardInteractionBlocked(targetRow.owner, i))) return;
			const old = ownCards[ownRow.index], other = targetCards[targetRow.index];
			ownCards[ownRow.index] = other;
			targetCards[targetRow.index] = old;
			if (targetRow.zone === "discard_pile") {
				g.pile_value_history[targetRow.pile][targetRow.index] = g.cardValue(i, old);
				g.pile_owner_history[targetRow.pile][targetRow.index] = i;
				g.syncPile(targetRow.pile);
			}
			if (g.effective(i, "Lapse Blue")) this.applyReveal(i);
			const location = targetRow.owner < 0 ? (targetRow.zone === "destroyed" ? "the destroyed pile" : `discard pile ${targetRow.pile + 1}`) : `${g.players[targetRow.owner].name}'s ${targetRow.zone.replace("_", " ")}`;
			this.notice = `${this.you(i)} swapped ${cardText(old)} with ${location} (${cardText(other)}).`;
			if (p.character === "Aoi Todo" && !p.todo_built_different_resolving) this.spendSwapCredit(i);
			if (g.effective(i, "Built Different") === "What's Your Type?") {
				g.pending_todo_swap_destroys.push({ target: i, zone: ownRow.zone, card: other, source: i });
			} else if (targetRow.owner >= 0 && targetRow.owner !== i
				&& g.effective(targetRow.owner, "Built Different") === "What's Your Type?") {
				g.pending_todo_swap_destroys.push({
					target: targetRow.owner, zone: targetRow.zone, card: old,
					source: i,
				});
			}
		}
		bestBrother(answers, specifiedAoi = null) {
			const g = this.game, aoi = specifiedAoi ?? this.viewer();
			const pending = g.pending_best_brothers.find((event) => event.aoi === aoi);
			if (!pending) return;
			const aoiPlayer = g.players[aoi];
			const targets = g.players.map((_, index) => index).filter((index) => index !== aoi
				&& !g.players[index].is_eliminated && !g.finished(index) && !g.players[index].turn_cancelled
				&& !g.blocksEffect(index, pending.source, false, "Turn Cancel")
				&& ["hand", "face_up", "face_down"].some((zone) => g.players[index][zone].length)
				&& ["hand", "face_up", "face_down"].some((zone) => aoiPlayer[zone].length));
			if (!targets.length) {
				g.pending_best_brothers.splice(g.pending_best_brothers.indexOf(pending), 1);
				aoiPlayer.turn_cancelled = true;
				this.notice = "Best Brother could not redirect the turn cancel; Aoi's turn was canceled.";
				return;
			}
			const target = targets[this.ask("Choose a player to receive the turn cancel", targets.map((index) => g.players[index].name), answers)];
			g.players[target].turn_cancelled = true;
			g.pending_best_brothers.splice(g.pending_best_brothers.indexOf(pending), 1);
			g.pending_best_brother_swaps.push({ aoi, target });
			this.notice = `${aoiPlayer.name} redirected the turn cancel to ${g.players[target].name}.`;
		}
		declineBestBrother() {
			const g = this.game, aoi = this.viewer();
			const pending = g.pending_best_brothers.find((event) => event.aoi === aoi);
			if (!pending) return;
			g.players[aoi].turn_cancelled = true;
			g.pending_best_brothers.splice(g.pending_best_brothers.indexOf(pending), 1);
			this.notice = `${g.players[aoi].name} allowed the turn cancel to affect them.`;
		}
		bestBrotherSwap(answers, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer();
			const pending = g.pending_best_brother_swaps.find((event) => event.target === target);
			if (!pending) return;
			const aoi = g.players[pending.aoi], other = g.players[target];
			const own = ["hand", "face_up", "face_down"].flatMap((zone) =>
				other[zone].map((card, index) => ({ zone, index, card })));
			const aoiCards = ["hand", "face_up", "face_down"].flatMap((zone) =>
				aoi[zone].map((card, index) => ({ zone, index, card })));
			if (!own.length || !aoiCards.length) {
				g.pending_best_brother_swaps.splice(g.pending_best_brother_swaps.indexOf(pending), 1);
				this.notice = "Best Brother's card swap could not be completed because a player no longer had cards.";
				return;
			}
			const ownIndex = this.ask("Choose one of your cards to swap", own.map((row) =>
				`${row.zone.replace("_", " ")}: ${row.zone === "face_down" ? `Face-down card ${row.index + 1}` : cardText(row.card)}`), answers);
			const aoiIndex = this.ask(`Choose one of ${aoi.name}'s cards to swap`, aoiCards.map((row) =>
				`${row.zone.replace("_", " ")}: ${row.zone === "face_down" ? `Face-down card ${row.index + 1} (${cardText(row.card)})` : cardText(row.card)}`), answers);
			const ownRow = own[ownIndex], aoiRow = aoiCards[aoiIndex];
			other[ownRow.zone][ownRow.index] = aoiRow.card;
			aoi[aoiRow.zone][aoiRow.index] = ownRow.card;
			g.remember(target, aoiRow.card, pending.aoi);
			g.remember(pending.aoi, aoiRow.card, target);
			g.pending_best_brother_swaps.splice(g.pending_best_brother_swaps.indexOf(pending), 1);
			if (g.effective(pending.aoi, "Built Different") === "What's Your Type?") {
				g.pending_todo_swap_destroys.push({
					target: pending.aoi, zone: aoiRow.zone, card: ownRow.card, source: target,
				});
			}
			this.notice = `${other.name} chose cards to swap with ${aoi.name}.`;
		}
		resolveTodoSwapDestroy(destroy, specifiedTarget = null) {
			const g = this.game, target = specifiedTarget ?? this.viewer();
			const pending = g.pending_todo_swap_destroys.find((event) => event.target === target);
			if (!pending) return;
			const zone = g.players[target][pending.zone], index = zone.indexOf(pending.card);
			if (destroy && index >= 0) {
				zone.splice(index, 1);
				g.destroyed.push(pending.card);
				this.notice = `${g.players[target].name} destroyed the card swapped to them with What's Your Type?.`;
			} else this.notice = `${g.players[target].name} kept the card swapped to them.`;
			g.pending_todo_swap_destroys.splice(g.pending_todo_swap_destroys.indexOf(pending), 1);
		}
		applyReveal(source) {
			const g = this.game;
			g.pending_reveals = [];
			for (let i = 0; i < g.players.length; i++) {
				const target = g.players[i];
				if (i === source || target.is_eliminated || g.finished(i) || !target.hand.length || target.revealed_cards.length
					|| g.blocksEffect(i, source, true) || g.cardInteractionBlocked(i, source)) continue;
				if (target.bot) target.revealed_cards.push(target.hand[Math.floor(Math.random() * target.hand.length)]);
				else g.pending_reveals.push(i);
			}
		}
		reveal(action) {
			const i = this.viewer(), p = this.game.players[i], index = Number(action.card);
			if (!this.game.pending_reveals.includes(i) || index < 0 || index >= p.hand.length) return;
			const c = p.hand[index]; p.revealed_cards.push(c); this.game.pending_reveals = this.game.pending_reveals.filter((n) => n !== i);
			this.notice = `${p.name} revealed ${cardText(c)}.`;
		}
		rescue(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!this.canRescue(i)) return;
			if (g.draw_piles.some((pile) => pile.length)) {
				for (let n = 0; n < 2; n++) {
					const available = g.draw_piles.map((pile, index) => pile.length ? index : -1).filter((index) => index >= 0);
					if (!available.length) break;
					p.hand.push(g.draw_piles[available[Math.floor(Math.random() * available.length)]].pop());
				}
			} else if (g.destroyed.length) {
				const choice = this.ask("Choose a card from the destroyed pile", g.destroyed.map(cardText), answers);
				p.hand.push(g.destroyed.splice(choice, 1)[0]);
			}
			p.rescue_round = g.round;
			this.notice = `${this.you(i)} used Rescue Draw.`;
		}
		requestCardChoice(kind, source, target, indices, extra = {}) {
			const g = this.game, count = kind === "swap_pair" ? 2 : 1;
			g.pending_card_choice = { kind, source, target, indices, count, ...extra };
			if (g.players[target].bot) {
				const chosen = [...(extra.required_indices || [])];
				const available = indices.filter((index) => !chosen.includes(index));
				while (chosen.length < count && available.length) {
					const index = Math.floor(Math.random() * available.length);
					chosen.push(available.splice(index, 1)[0]);
				}
				this.chooseCard({ cards: chosen }, target);
			}
		}
		chooseCard(action, specifiedTarget = null) {
			const g = this.game, choice = g.pending_card_choice, target = specifiedTarget ?? this.viewer();
			if (!choice || target !== choice.target) return;
			const indices = [...new Set(action.cards || [Number(action.card)])];
			if (indices.length !== choice.count || indices.some((index) => !Number.isInteger(index)
				|| !choice.indices.includes(index) || index < 0 || index >= g.players[target].hand.length)
				|| choice.required_indices?.some((index) => !indices.includes(index))) return;
			const targetPlayer = g.players[target], sourcePlayer = g.players[choice.source];
			if (choice.kind === "give_card") {
				const [given] = targetPlayer.hand.splice(indices[0], 1);
				sourcePlayer.hand.push(given);
			} else if (choice.kind === "swap_one") {
				const [received] = targetPlayer.hand.splice(indices[0], 1);
				const handIndex = sourcePlayer.hand.indexOf(choice.exchange_card);
				if (handIndex >= 0) {
					targetPlayer.hand.push(choice.exchange_card);
					sourcePlayer.hand[handIndex] = received;
				} else targetPlayer.hand.push(received);
			} else if (choice.kind === "swap_pair") {
				this.exchangePair(choice.source, target, choice.source_indices, choice.source_cards, indices);
			}
			g.pending_card_choice = null;
			this.notice = `${targetPlayer.name} chose a card for ${choice.kind.replace("_", " ")}.`;
		}
		allowNextEffect() {
			const index = this.viewer(), player = this.game.players[index];
			if (!this.canAllowEffect(index)) return;
			player.allow_next_effect = true;
			this.notice = `${player.name} will allow the next negative effect to pass through their immunity.`;
		}
		swapOne(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (p.hand_lock_until_round >= g.round || !g.last_drawn.length || p.rule_uses["Swap 1"] === g.turn) return;
			const drawn = g.last_drawn[this.ask("Choose one of the cards you just drew", g.last_drawn.map(cardText), answers)];
			const targets = g.players.map((_, index) => index).filter((index) => index !== i && !g.finished(index)
				&& !g.players[index].is_eliminated && g.players[index].hand.length && g.players[index].hand_lock_until_round < g.round
				&& !g.blocksEffect(index, i));
			if (!targets.length) return;
			const target = targets[this.ask("Choose a player to Swap 1 with", targets.map((index) => g.players[index].name), answers)];
			if (g.blocksEffect(target, i, true) || g.cardInteractionBlocked(target, i)) return;
			const other = g.players[target], value = g.cardValue(i, drawn);
			const values = other.hand.map((c) => g.cardValue(target, c)), ownValues = p.hand.map((c) => g.cardValue(i, c));
			const highest = Math.max(...ownValues), lowest = Math.min(...ownValues);
			let targetIndex = null;
			if (value === highest || value === lowest) {
				const extreme = value === highest ? Math.max(...values) : Math.min(...values);
				targetIndex = values.indexOf(extreme);
			} else {
				const allowed = values.map((entry, index) => ({ entry, index }))
					.filter((row) => row.entry !== Math.max(...values) && row.entry !== Math.min(...values)).map((row) => row.index);
				if (!allowed.length) return;
				const known = allowed.every((index) => g.known(i, other.hand[index]) || other.revealed_cards.includes(other.hand[index]));
				if (known) targetIndex = allowed[this.ask("Choose a non-extreme card to swap", allowed.map((index) => cardText(other.hand[index])), answers)];
				else {
					this.requestCardChoice("swap_one", i, target, allowed, { exchange_card: drawn });
					p.rule_uses["Swap 1"] = g.turn;
					return;
				}
			}
			if (targetIndex !== null) {
				const received = other.hand[targetIndex], handIndex = p.hand.indexOf(drawn);
				other.hand[targetIndex] = drawn; p.hand[handIndex] = received;
			}
			p.rule_uses["Swap 1"] = g.turn;
		}
		swapPair(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (p.hand_lock_until_round >= g.round || p.hand.length < 2 || p.rule_uses["Swap Pair"] === g.round) return;
			const sourceIndices = [];
			for (let pick = 0; pick < 2; pick++) {
				const available = p.hand.map((_, index) => index).filter((index) => !sourceIndices.includes(index));
				sourceIndices.push(available[this.ask("Choose two cards from your hand", available.map((index) => cardText(p.hand[index])), answers)]);
			}
			const targets = g.players.map((_, index) => index).filter((index) => index !== i && !g.finished(index)
				&& !g.players[index].is_eliminated && g.players[index].hand.length >= 2
				&& g.players[index].hand_lock_until_round < g.round && !g.blocksEffect(index, i));
			if (!targets.length) return;
			const target = targets[this.ask("Choose a player for Swap Pair", targets.map((index) => g.players[index].name), answers)];
			if (g.blocksEffect(target, i, true) || g.cardInteractionBlocked(target, i)) return;
			const other = g.players[target], values = other.hand.map((c) => g.cardValue(target, c));
			const ownValues = p.hand.map((c) => g.cardValue(i, c)), chosenValues = sourceIndices.map((index) => ownValues[index]);
			const required = [];
			if (chosenValues.includes(Math.max(...ownValues))) required.push(values.indexOf(Math.max(...values)));
			if (chosenValues.includes(Math.min(...ownValues))) {
				const index = values.indexOf(Math.min(...values));
				if (!required.includes(index)) required.push(index);
			}
			const allowed = other.hand.map((_, index) => index);
			const known = allowed.every((index) => g.known(i, other.hand[index]) || other.revealed_cards.includes(other.hand[index]));
			const sourceCards = sourceIndices.map((index) => p.hand[index]);
			if (known) {
				const chosen = [...required];
				while (chosen.length < 2) {
					const remaining = allowed.filter((index) => !chosen.includes(index));
					chosen.push(remaining[this.ask("Choose two cards from their hand", remaining.map((index) => cardText(other.hand[index])), answers)]);
				}
				this.exchangePair(i, target, sourceIndices, sourceCards, chosen);
			} else this.requestCardChoice("swap_pair", i, target, allowed, {
				source_indices: sourceIndices, source_cards: sourceCards, required_indices: required,
			});
			p.rule_uses["Swap Pair"] = g.round;
		}
		exchangePair(source, target, sourceIndices, sourceCards, targetIndices) {
			const g = this.game, a = g.players[source], b = g.players[target];
			const targetCards = targetIndices.map((index) => b.hand[index]);
			for (const index of [...targetIndices].sort((x, y) => y - x)) b.hand.splice(index, 1);
			for (let index = 0; index < sourceIndices.length; index++) a.hand[sourceIndices[index]] = targetCards[index];
			b.hand.push(...sourceCards);
		}
		god(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!g.effective(i, "God of Jujutsu") || p.god_round === g.round || p.bot) return;
			const rule = RULE_NAMES[this.ask("Choose a rule for this round", RULE_NAMES, answers)];
			const grabValue = ["Quick Grab", "Card Swapping"].includes(rule)
				? this.ask(`Choose a value for ${rule}`, RANKS, answers) + 2
				: null;
			let immunity = null, ruleParam = null, lockedPlayer = null, lockedPile = null;
			if (rule === "Immunity") {
				const type = ["I-T", "I-D", "I-S"][this.ask("Choose an immunity type", ["I-T (true immunity)", "I-D (highest-card comparison)", "I-S (3 shields)"], answers)];
				immunity = { type, until_round: type === "I-S" ? Number.MAX_SAFE_INTEGER : g.round, shields: type === "I-S" ? 3 : 0 };
			} else if (rule === "Black Flash") {
				ruleParam = RANKS[this.ask("Choose the card value that activates Black Flash this round", RANKS, answers)];
			} else if (rule === "Value Inversion" || rule === "Free Cards") {
				ruleParam = RANKS[this.ask(`Choose the rank for ${rule}`, RANKS, answers)];
			} else if (rule === "Hand Lock") {
				const targets = g.players.map((_, index) => index).filter((index) => index !== i
					&& !g.finished(index) && !g.players[index].is_eliminated && !g.blocksEffect(index, i));
				if (!targets.length) return;
				lockedPlayer = targets[this.ask("Choose a player to Hand Lock", targets.map((index) => g.players[index].name), answers)];
				if (g.blocksEffect(lockedPlayer, i, true)) return;
			} else if (rule === "Pile Lock") {
				lockedPile = this.ask("Choose a discard pile to protect", ["Discard pile 1", "Discard pile 2"], answers);
			}
			p.god_rule = rule; p.god_round = g.round;
			if (grabValue !== null) p.god_grab_value = grabValue;
			if (immunity) p.immunity = immunity;
			if (ruleParam !== null) p.god_rule_param = ruleParam;
			if (lockedPlayer !== null) g.players[lockedPlayer].hand_lock_until_round = g.round + 2;
			if (lockedPile !== null) g.pile_locks[lockedPile] = { owner: i, set_turn: g.turn };
			if (rule === "Turn Reversal") {
				let previous = (i - 1 + g.players.length) % g.players.length;
				while (g.finished(previous) && previous !== i) previous = (previous - 1 + g.players.length) % g.players.length;
				g.next_player_override = previous;
			} else if (rule === "Limit Play") {
				p.limit_play_until_round = g.round;
			} else if (rule === "Meters") p.meter++;
			else if (rule === "Value Decrease") g.modifyPileValues(-1);
			else if (rule === "Value Increase") {
				g.modifyPileValues(1);
				g.pile_over_ace = g.pile_values.map((value) => value > 14);
			}
			this.notice = `${this.you(i)} chose ${rule} for this round.`;
		}
		useGodRule(answers, builtDifferent = false) {
			const g = this.game, i = g.current, p = g.players[i];
			if ((!builtDifferent && p.bot) || (!builtDifferent && !this.godRuleReady(i))) return false;
			const rule = p.god_rule;
			const useTurn = () => { p.rule_uses[rule] = g.turn; };
			const useRound = () => { p.rule_uses[rule] = g.round; };
			switch (p.god_rule) {
				case "Top card discard": {
					const piles = g.discards.map((pile, index) => pile.length && !g.isPileLocked(index) ? index : -1).filter((index) => index >= 0);
					if (!piles.length) return;
					const pileIndex = piles[this.ask("Choose a discard pile", piles.map((index) => `Discard pile ${index + 1}`), answers)];
					const pile = g.discards[pileIndex], removed = pile.pop();
					g.destroyed.push(removed);
					g.pile_value_history[pileIndex].pop();
					g.pile_owner_history[pileIndex].pop();
					g.syncPile(pileIndex);
					useTurn();
					break;
				}
				case "Soul Swap": {
					const targets = g.players.map((_, index) => index).filter((index) => index !== i && !g.players[index].is_eliminated && !g.finished(index) && !g.blocksEffect(index, i) && !g.has(index, "God of Jujutsu")
						&& g.players[index].hand_lock_until_round < g.round);
					if (!targets.length) return;
					const targetIndex = targets[this.ask("Choose a player to soul swap with", targets.map((index) => g.players[index].name), answers)];
					const target = g.players[targetIndex];
					if (g.blocksEffect(targetIndex, i, true)) return;
					if (g.cardInteractionBlocked(targetIndex, i, "soul_swap")) {
						this.finishTurn();
						return;
					}
					[p.hand, target.hand] = [target.hand, p.hand]; [p.face_up, target.face_up] = [target.face_up, p.face_up]; [p.face_down, target.face_down] = [target.face_down, p.face_down];
					break;
				}
				case "Card Swapping": this.cardSwap(answers); break;
				case "Reveal": {
					const reveals = [];
					for (let target = 0; target < g.players.length; target++) {
						const other = g.players[target];
						if (other.is_eliminated || g.finished(target) || !other.hand.length || other.revealed_cards.length || g.blocksEffect(target, i)) continue;
						if (target === i) {
							const selected = this.ask("Reveal: choose one of your cards", other.hand.map(cardText), answers);
							reveals.push({ target, card: other.hand[selected] });
						} else if (other.hand.some((c) => g.known(i, c))) {
							const known = other.hand.map((c, index) => ({ c, index })).filter((row) => g.known(i, row.c));
							if (known.length) {
								const selected = known[this.ask(`Choose an additional ${other.name} card to reveal`, known.map((row) => cardText(row.c)), answers)];
								reveals.push({ target, card: selected.c });
							}
							if (other.bot) reveals.push({ target, card: other.hand.find((c) => !reveals.some((entry) => entry.target === target && entry.card === c)) || other.hand[0] });
							else reveals.push({ target, pending: true });
						} else if (other.bot) reveals.push({ target, card: other.hand[Math.floor(Math.random() * other.hand.length)] });
						else reveals.push({ target, pending: true });
					}
					for (const entry of reveals) {
						if (g.blocksEffect(entry.target, i, true)) continue;
						if (entry.card) g.players[entry.target].revealed_cards.push(entry.card);
						else if (entry.pending) g.pending_reveals.push(entry.target);
					}
					useRound();
					break;
				}
				case "Rescue Draw": this.rescue(answers); break;
				case "Full Hand": this.fullHand(answers); break;
				case "Turn Cancel": {
					const targets = g.players.map((_, index) => index).filter((index) => index !== i && !g.players[index].is_eliminated
						&& !g.finished(index) && !g.players[index].turn_cancelled && !g.blocksEffect(index, i, false, "Turn Cancel"));
					if (!targets.length) return;
					const target = targets[this.ask("Choose a player whose next turn to cancel", targets.map((index) => g.players[index].name), answers)];
					if (g.players[target].cancel_immunity_until >= g.round || g.blocksEffect(target, i, true)) return;
					if (g.effective(target, "Black Flash") === "Best Brother") {
						g.pending_best_brothers.push({ aoi: target, source: i });
					} else g.players[target].turn_cancelled = true;
					p.cancel_immunity_until = g.round + 2;
					useRound();
					break;
				}
				case "Discard Swap": {
					if (p.hand_lock_until_round >= g.round || !p.hand.length) return;
					const pileChoices = g.discards.map((pile, index) => pile.length && !g.isPileLocked(index) ? index : -1).filter((index) => index >= 0);
					if (!pileChoices.length) return;
					const cardIndex = this.ask("Choose a card from your hand to put at the bottom", p.hand.map(cardText), answers);
					const pileIndex = pileChoices[this.ask("Choose a discard pile", pileChoices.map((index) => `Discard pile ${index + 1}`), answers)];
					const [incoming] = g.discards[pileIndex].splice(-1);
					const [outgoing] = p.hand.splice(cardIndex, 1);
					g.discards[pileIndex].unshift(outgoing);
					p.hand.push(incoming);
					g.pile_value_history[pileIndex].pop();
					g.pile_owner_history[pileIndex].pop();
					g.pile_value_history[pileIndex].unshift(g.cardValue(i, outgoing));
					g.pile_owner_history[pileIndex].unshift(i);
					g.syncPile(pileIndex);
					useTurn();
					break;
				}
				case "Sneak Peek": {
					const piles = g.draw_piles.map((pile, index) => pile.length ? index : -1).filter((index) => index >= 0);
					if (!piles.length) return;
					const pileIndex = piles[this.ask("Choose a draw pile to peek at", piles.map((index) => `Draw pile ${index + 1}`), answers)];
					const pile = g.draw_piles[pileIndex], count = Math.min(2, pile.length);
					if (count === 2) {
						const top = pile.slice(-2);
						const order = this.ask("Sneak Peek: choose the card that will be on top", [cardText(top[1]), cardText(top[0])], answers);
						if (order === 1) [pile[pile.length - 1], pile[pile.length - 2]] = [pile[pile.length - 2], pile[pile.length - 1]];
						this.notice = `${this.you(i)} used Sneak Peek to view and order the top two cards.`;
					} else this.notice = `${this.you(i)} used Sneak Peek and saw ${cardText(pile.at(-1))}.`;
					break;
				}
				case "Swap 1": this.swapOne(answers); break;
				case "Pile Boost": {
					const available = [0, 1].filter((index) => g.discards[index].length && !g.isPileLocked(index));
					if (!available.length) return;
					const pile = available[this.ask("Choose the discard pile to boost", available.map((index) => `Discard pile ${index + 1}`), answers)];
					const other = 1 - pile;
					if (!g.discards[other].length) return;
					const multiplier = g.value_inversion && g.value_inversion.until_round >= g.round ? 2 : 1;
					const value = g.pile_values[pile] + g.pile_values[other] * multiplier;
					g.pile_values[pile] = value;
					g.pile_value_history[pile][g.pile_value_history[pile].length - 1] = value;
					g.pile_over_ace[pile] = value > 14;
					useRound();
					break;
				}
				case "Burn One": {
					if (!p.face_up.length) return;
					const index = this.ask("Choose a face-up card to discard", p.face_up.map(cardText), answers);
					const targets = g.players.map((_, target) => target).filter((target) => target !== i && !g.finished(target)
						&& !g.players[target].is_eliminated && g.players[target].hand.length
						&& g.players[target].hand_lock_until_round < g.round && !g.blocksEffect(target, i, false));
					if (!targets.length) return;
					const target = targets[this.ask("Choose a player to give you a card", targets.map((n) => g.players[n].name), answers)];
					if (g.blocksEffect(target, i, true) || g.cardInteractionBlocked(target, i)) return;
					const cardIndex = this.ask("Choose a discard pile", ["Discard pile 1", "Discard pile 2"], answers);
					const [discarded] = p.face_up.splice(index, 1);
					g.discards[cardIndex].push(discarded);
					g.pile_value_history[cardIndex].push(g.cardValue(i, discarded));
					g.pile_owner_history[cardIndex].push(i);
					g.syncPile(cardIndex);
					this.requestCardChoice("give_card", i, target, g.players[target].hand.map((_, n) => n));
					break;
				}
				case "Swap Pair": this.swapPair(answers); break;
				case "Top Swap": {
					if (g.discards.some((pile) => !pile.length)) return;
					const a = g.discards[0].length - 1, b = g.discards[1].length - 1;
					[g.pile_value_history[0][a], g.pile_value_history[1][b]] = [g.pile_value_history[1][b], g.pile_value_history[0][a]];
					g.pile_value_history.forEach((_, index) => g.syncPile(index));
					useRound();
					break;
				}
				case "Tie Break": {
					const pile = this.ask("Choose a pile for Tie Break", ["Discard pile 1", "Discard pile 2"], answers);
					g.tie_breaks[pile] = i;
					useRound();
					break;
				}
				case "Peek Swap": {
					const piles = g.draw_piles.map((pile, index) => pile.length ? index : -1).filter((index) => index >= 0);
					if (!piles.length || !p.hand.length) return;
					const pileIndex = piles[this.ask("Choose a draw pile to peek at", piles.map((index) => `Draw pile ${index + 1}`), answers)];
					const pile = g.draw_piles[pileIndex], options = pile.slice(-3).reverse();
					const depth = this.ask("Choose a card from the top three", options.map(cardText), answers);
					const handIndex = this.ask("Choose a card from your hand to swap", p.hand.map(cardText), answers);
					const drawIndex = pile.length - 1 - depth;
					[p.hand[handIndex], pile[drawIndex]] = [pile[drawIndex], p.hand[handIndex]];
					useRound();
					break;
				}
				case "Forced Play": {
					const targets = g.players.map((_, index) => index).filter((index) => index !== i && !g.players[index].is_eliminated
						&& !g.finished(index) && !g.blocksEffect(index, i, false));
					if (!targets.length) return;
					const target = targets[this.ask("Choose a player to force to play a card", targets.map((index) => g.players[index].name), answers)];
					if (g.blocksEffect(target, i, true)) return;
					this.notice = `${g.players[target].name} must play one card.`;
					g.forced_play = {
						owner: i, target, cards_played: g.cards_played, turn_pile: g.turn_pile,
						turn_pile_destroyed: g.turn_pile_destroyed, human_has_played: g.human_has_played,
					};
					g.current = target; g.cards_played = 0; g.turn_pile = null;
					g.turn_pile_destroyed = false; g.human_has_played = false;
					this.lastHuman = target;
					useRound();
					break;
				}
				default: return;
			}
			if (g.current === i) this.notice = `${this.you(i)} used God of Jujutsu: ${rule}.`;
			return true;
		}
		vow(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			const cards = g.bindingVowCards(i);
			if (!g.effective(i, "Binding Vow") || p.vow_card || p.bot || g.cards_played || !cards.length) return;
			const cardIndex = this.ask("Choose a card to play as a King this turn", cards.map(cardText), answers);
			p.vow_card = cards[cardIndex];
			this.notice = `${this.you(i)} made a Binding Vow.`;
			this.finishTurn();
		}
		simpleDomain(answers) {
			const g = this.game, i = this.viewer(), p = g.players[i];
			if (!g.effective(i, "Simple Domain")) return;
			if (!p.simple_domain_used) {
				p.simple_domain_active = true;
				p.simple_domain_used = true;
				p.simple_domain_refinement = 3;
				this.notice = `${this.you(i)} activated Simple Domain (refinement 3).`;
				return;
			}
			const effects = [];
			if (p.cut_meter > 0) effects.push("Cut Meter");
			if (p.revealed_cards.length) effects.push("Reveal");
			if (!p.simple_domain_active || p.cleanse_round === g.round || !p.hand.length || !effects.length) return;
			const effect = effects[this.ask("Choose a negative effect to remove", effects, answers)];
			const handIndex = this.ask("Choose a card from your hand to discard", p.hand.map(cardText), answers);
			const discarded = p.hand.splice(handIndex, 1)[0];
			g.destroyed.push(discarded);
			if (effect === "Cut Meter") p.cut_meter--;
			else p.revealed_cards = [];
			p.cleanse_round = g.round;
			this.notice = `${this.you(i)} discarded ${cardText(discarded)} with Simple Domain to remove ${effect}.`;
		}
		domain(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			const owned = g.domains.find((entry) => entry.owner === i);
			if (owned && p.domain_draw_turn !== g.turn && g.domains.length > 1) {
				const pile = g.draw_piles.find((entry) => entry.length);
				if (!pile) return;
				const drawn = pile.pop();
				p.hand.push(drawn);
				p.domain_draw_turn = g.turn;
				if (["Jack", "Queen", "King", "Ace"].includes(drawn.rank)) owned.shield = true;
				else if (drawn.rank === "Joker") owned.refinement++;
				else if (["2", "3", "4", "5"].includes(drawn.rank)) owned.refinement--;
				this.breakDomainAtZero(owned);
				this.notice = `${this.you(i)} drew ${cardText(drawn)} for their domain clash.`;
				return;
			}
			if (g.domains.length < 3 || owned) return;
			const joker = p.hand.findIndex((entry) => entry.rank === "Joker");
			if (joker < 0) return;
			const target = g.domains[this.ask("Choose a domain to weaken", g.domains.map((entry) =>
				`${g.players[entry.owner].name}: ${entry.name} (${entry.refinement})`), answers)];
			p.hand.splice(joker, 1);
			target.refinement--;
			this.breakDomainAtZero(target);
			this.notice = `${this.you(i)} spent a Joker to weaken ${g.players[target.owner].name}'s domain.`;
		}
		breakDomainAtZero(domain) {
			const g = this.game;
			if (domain.refinement > 0) return;
			g.domains = g.domains.filter((entry) => entry !== domain);
			if (domain.mahito) g.finishMahitoDomain(domain.owner);
		}
		quickGrab(accept) {
			const g = this.game, viewer = this.viewer(), event = g.pending_quick_grabs[0];
			if (!event || !event.targets.includes(viewer)) return;
			this.resolveQuickGrab(viewer, accept);
			this.notice = accept ? `${this.you(viewer)} took the card with Quick Grab.` : `${this.you(viewer)} declined Quick Grab.`;
		}
		resolveQuickGrab(viewer, accept) {
			const g = this.game, event = g.pending_quick_grabs[0];
			if (!event || !event.targets.includes(viewer)) return;
			if (accept) {
				const pile = event.zone === "destroyed_pile" ? g.destroyed : g.discards[event.pile_index];
				const index = pile.indexOf(event.card);
				if (index >= 0) {
					const [taken] = pile.splice(index, 1);
					g.players[viewer].hand.push(taken);
					if (event.zone === "discard_pile") {
						g.pile_value_history[event.pile_index].splice(index, 1);
						g.pile_owner_history[event.pile_index].splice(index, 1);
						g.syncPile(event.pile_index);
					}
				}
				g.pending_quick_grabs.shift();
			} else {
				event.targets = event.targets.filter((i) => i !== viewer);
				if (!event.targets.length) g.pending_quick_grabs.shift();
			}
		}
		followStack(accept, answers, specifiedViewer = null) {
			const g = this.game, viewer = specifiedViewer ?? this.viewer();
			const event = g.pending_follow_stacks.find((entry) => entry.targets.includes(viewer));
			if (!event) return;
			const player = g.players[viewer];
			const options = player.hand.map((c, index) => ({ c, index })).filter((row) => row.c.rank === event.rank);
			if (!accept || !options.length) {
				g.consumeBuiltRule(viewer, "Follow Stacking");
				event.targets = event.targets.filter((index) => index !== viewer);
				if (!event.targets.length) g.pending_follow_stacks.splice(g.pending_follow_stacks.indexOf(event), 1);
				this.notice = accept ? "No matching card remained for Follow Stacking." : `${this.you(viewer)} declined Follow Stacking.`;
				return;
			}
			const chosen = options[this.ask("Choose a matching card to stack", options.map((row) => cardText(row.c)), answers)];
			const saved = {
				current: g.current, cards_played: g.cards_played, turn_pile: g.turn_pile,
				turn_pile_destroyed: g.turn_pile_destroyed,
				human_has_played: g.human_has_played, enchain_player: g.enchain_player,
				enchain_remaining: g.enchain_remaining, last_drawn: g.last_drawn,
			};
			const flashesBefore = player.black_flash_count;
			player.rule_uses["Follow Stacking"] = g.round;
			g.consumeBuiltRule(viewer, "Follow Stacking");
			g.current = viewer; g.cards_played = 0; g.turn_pile = null;
			g.turn_pile_destroyed = false; g.human_has_played = false;
			g.place(chosen.c, event.pile, null, "hand");
			if (g.effective(viewer, "Divergent Fist") === "Delayed Black Flash") {
				const flashLanded = player.black_flash_count > flashesBefore || g.landBlackFlash(viewer, chosen.c);
				if (flashLanded && g.effective(viewer, "Cleave") === "Soul Slashing Dismantles") {
					if (!this.hasAbilities(event.played_by) && !g.tryArmSacrifice(event.played_by)) g.players[event.played_by].is_eliminated = true;
					else this.queueSoulSeparation(event.played_by, viewer);
				}
			}
			g.current = saved.current; g.cards_played = saved.cards_played; g.turn_pile = saved.turn_pile;
			g.turn_pile_destroyed = saved.turn_pile_destroyed;
			g.human_has_played = saved.human_has_played; g.enchain_player = saved.enchain_player;
			g.enchain_remaining = saved.enchain_remaining; g.last_drawn = saved.last_drawn;
			event.targets = event.targets.filter((index) => index !== viewer);
			if (!event.targets.length) g.pending_follow_stacks.splice(g.pending_follow_stacks.indexOf(event), 1);
			g.checkWinner();
			this.notice = `${this.you(viewer)} used Follow Stacking.`;
		}
		stackSteal(answers, specifiedViewer = null) {
			const g = this.game, viewer = specifiedViewer ?? this.viewer();
			const event = g.pending_stack_steals.find((entry) => entry.targets.includes(viewer));
			if (!event) return;
			const options = event.cards.filter((c) => g.destroyed.includes(c));
			if (options.length) {
				const chosen = options[this.ask("Choose a card from the destroyed pile", options.map(cardText), answers)];
				g.players[viewer].hand.push(chosen);
				g.destroyed.splice(g.destroyed.indexOf(chosen), 1);
				event.cards = event.cards.filter((c) => c !== chosen);
			}
			g.consumeBuiltRule(viewer, "Stack Steal");
			event.targets = event.targets.filter((index) => index !== viewer);
			if (!event.targets.length) g.pending_stack_steals.splice(g.pending_stack_steals.indexOf(event), 1);
			g.checkWinner();
			this.notice = `${this.you(viewer)} used Stack Steal.`;
		}
		resolveSlash(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!p.pending_world_slashes) return;
			const zones = [];
			for (let owner = 0; owner < g.players.length; owner++) {
				const target = g.players[owner];
				if (target.is_eliminated || owner !== i && g.blocksEffect(owner, i)) continue;
				for (const zone of ["hand", "face_up", "face_down"]) if (target[zone].length) zones.push({ owner, zone, cards: target[zone] });
			}
			for (let pile = 0; pile < 2; pile++) if (g.discards[pile].length) zones.push({ zone: "discard_pile", pile, cards: g.discards[pile] });
			if (g.destroyed.length) zones.push({ zone: "destroyed_pile", cards: g.destroyed });
			for (let pile = 0; pile < 2; pile++) if (g.draw_piles[pile].length) zones.push({ zone: "draw_pile", pile, cards: g.draw_piles[pile] });
			if (!zones.length) { p.pending_world_slashes = 0; return; }
			const selected = zones[this.ask("World Cutting Slash: choose a card or pile to delete", zones.map((row) => {
				const label = row.zone === "discard_pile" ? `Discard pile ${row.pile + 1}` : row.zone === "destroyed_pile" ? "Destroyed pile" : row.zone === "draw_pile" ? `Draw pile ${row.pile + 1} (random)` : `${g.players[row.owner].name}'s ${row.zone.replace("_", " ")}`;
				return `${label} (${row.cards.length})`;
			}), answers)];
			let cardIndex = null;
			if (["hand", "face_up", "discard_pile", "destroyed_pile"].includes(selected.zone)) {
				cardIndex = this.ask("World Cutting Slash: choose the card to delete", selected.cards.map(cardText), answers);
			} else cardIndex = Math.floor(Math.random() * selected.cards.length);
			const targets = g.players.map((_, n) => n).filter((n) => n !== i && !g.finished(n)
				&& !g.players[n].is_eliminated && !g.blocksEffect(n, i));
			const target = targets.length ? targets[this.ask("World Cutting Slash: choose a player to increase their Cut Meter", targets.map((n) => `${g.players[n].name} (Cut Meter ${g.players[n].cut_meter}/9)`), answers)] : null;
			if (target !== null && g.blocksEffect(target, i, true)) return;
			const removed = selected.cards.splice(cardIndex, 1)[0];
			g.deleted.push(removed);
			if (selected.zone === "discard_pile") {
				g.pile_value_history[selected.pile].splice(cardIndex, 1);
				g.pile_owner_history[selected.pile].splice(cardIndex, 1);
				g.syncPile(selected.pile);
			}
			if (target !== null) {
				const victim = g.players[target];
				victim.cut_meter++;
				if (victim.cut_meter >= 9 && !g.tryArmSacrifice(target)) {
					victim.is_eliminated = true;
					g.deleted.push(...victim.hand, ...victim.face_up, ...victim.face_down);
					victim.hand = []; victim.face_up = []; victim.face_down = [];
				}
			}
			p.pending_world_slashes--;
			this.notice = target === null ? "World Cutting Slash deleted a card; no active opponent remains for Cut Meter." : `World Cutting Slash deleted ${selected.zone === "face_down" || selected.zone === "draw_pile" ? "a hidden card" : cardText(removed)}; ${g.players[target].name}'s Cut Meter is ${g.players[target].cut_meter}/9.`;
			g.checkWinner();
		}
		resolveLimitless(answers) {
			const g = this.game, i = g.current, p = g.players[i];
			if (!p.pending_limitless_effects.length) return;
			const effect = p.pending_limitless_effects[0];
			if (effect === "pick_one_face_down" && p.face_down.length) {
				const index = this.ask("Limitless Barrier: choose one face-down card to pick up", p.face_down.map((_, n) => `Face-down card ${n + 1}`), answers);
				p.hand.push(p.face_down.splice(index, 1)[0]);
				this.notice = `Limitless Barrier picked up a face-down card.`;
			} else if (effect === "pick_all_face_down") {
				const count = p.face_down.length;
				p.hand.push(...p.face_down.splice(0));
				this.notice = `Limitless Barrier picked up ${count} face-down card(s).`;
			} else if (effect === "replace_hand_from_deleted" && p.hand.length && g.deleted.length) {
				const count = Math.min(p.hand.length, g.deleted.length), chosen = [];
				for (let n = 0; n < count; n++) {
					const available = g.deleted.map((_, index) => index).filter((index) => !chosen.includes(index));
					chosen.push(available[this.ask("Perfected Limitless: choose a Deleted card for your replacement hand", available.map((index) => cardText(g.deleted[index])), answers)]);
				}
				const replacement = chosen.map((index) => g.deleted[index]);
				g.destroyed.push(...p.hand); p.hand = [];
				for (const index of chosen.sort((a, b) => b - a)) g.deleted.splice(index, 1);
				p.hand.push(...replacement);
				this.notice = `Perfected Limitless replaced your hand with ${replacement.length} Deleted card(s).`;
			}
			p.pending_limitless_effects.shift();
			if (effect === "pick_one_face_down" && !p.face_down.length && p.hand.length === 0) this.notice = "Limitless Barrier resolved with no face-down cards.";
		}
	}

	const RULE_NAMES = Object.keys(RULES);
	const GOD_ACTION_RULES = new Set([
		"Top card discard", "Soul Swap", "Reveal",
		"Turn Cancel", "Discard Swap", "Sneak Peek", "Swap 1", "Pile Boost",
		"Burn One", "Swap Pair", "Top Swap", "Tie Break", "Peek Swap", "Forced Play",
	]);

	const bridge = new Bridge();
	const adminZones = () => {
		const g = bridge.game, zones = [];
		for (const p of g.players) for (const zone of ["hand", "face_up", "face_down"]) zones.push([`${p.name} / ${zone.replace("_", " ")}`, p[zone], "player", null]);
		for (let i = 0; i < 2; i++) zones.push([`Draw pile ${i + 1}`, g.draw_piles[i], "draw_pile", i]);
		for (let i = 0; i < 2; i++) zones.push([`Discard pile ${i + 1}`, g.discards[i], "discard_pile", i]);
		zones.push(["Destroyed pile", g.destroyed, "destroyed_pile", null], ["Deleted pile", g.deleted, "deleted_pile", null]);
		return zones;
	};
	bridge.admin_status = () => JSON.stringify({ unlocked: bridge.admin, in_game: Boolean(bridge.game) });
	bridge.admin_unlock = (password) => {
		if (password === "ZaydIsABum") bridge.admin = true;
		return bridge.admin_status();
	};
	bridge.admin_cards = () => {
		if (!bridge.admin || !bridge.game) return JSON.stringify({ error: "Admin access is locked or no game is running." });
		let id = 0; const rows = [];
		for (const [location, cards] of adminZones()) for (const c of cards) rows.push({ id: id++, location, card: cardText(c), rank: c.rank, suit: c.suit });
		return JSON.stringify({ rows, ranks: [...RANKS, "Joker"], suits: SUITS });
	};
	bridge.admin_set = (rowId, rank, suit) => {
		if (!bridge.admin || !bridge.game) return JSON.stringify({ error: "Admin access is locked or no game is running." });
		if (![...RANKS, "Joker"].includes(rank)) return JSON.stringify({ error: "Choose a valid rank." });
		let offset = 0;
		for (const [location, cards, zone, pileIndex] of adminZones()) {
			if (rowId < offset + cards.length) {
				const index = rowId - offset, old = cards[index];
				cards[index] = card(rank, rank === "Joker" ? "" : (SUITS.includes(suit) ? suit : old.suit || SUITS[0]), rank === "Joker" ? 3 : old.deck_number);
				if (zone === "discard_pile") {
					const value = rank === "Joker" ? 14 : rankValue(cards[index]);
					bridge.game.pile_value_history[pileIndex][index] = value;
					if (index === cards.length - 1) bridge.game.pile_values[pileIndex] = value;
				}
				bridge.game.record(`Admin changed ${location} card value to ${cardText(cards[index])}.`);
				return JSON.stringify({ message: `Updated to ${cardText(cards[index])}.` });
			}
			offset += cards.length;
		}
		return JSON.stringify({ error: "That card no longer exists." });
	};
	bridge.bot_step = (count = 1) => {
		const g = bridge.game;
		for (let step = 0; g && step < Math.max(1, Number(count)); step++) {
			if (!bridge.setupComplete || g.winner !== null) break;
		g.refillUnderfilledHands();
			if (g.pending_ability_losses.length) {
				const pending = g.pending_ability_losses[0];
				if (!g.players[pending.target].bot) break;
				const option = bridge.abilityLossOptions(pending)[0];
				if (option) bridge.loseAbility({ ability: option.ability }, pending.target);
				else g.pending_ability_losses.shift();
				continue;
			}
			if (g.pending_black_flash_evolutions.length) {
				const pending = g.pending_black_flash_evolutions[0];
				if (!g.players[pending.target].bot) break;
				const option = g.blackFlashOptions(pending.target)[0];
				if (option) bridge.blackFlashEvolve({ ability: option.ability }, pending.target);
				else g.pending_black_flash_evolutions.shift();
				continue;
			}
			if (g.pending_black_flash_expansions.length) {
				const pending = g.pending_black_flash_expansions[0];
				if (!g.players[pending.target].bot) break;
				bridge.expandBlackFlash({ rank: pending.choices[0] }, pending.target);
				continue;
			}
			if (g.pending_hand_deletes.length || g.pending_cleave_deletes.length) {
				const pending = g.pending_hand_deletes[0] || g.pending_cleave_deletes[0];
				if (!g.players[pending.target].bot) break;
				bridge.deleteSelectedHandCard(g.pending_hand_deletes[0] === pending ? "prisoner_delete" : "cleave_delete", { values: [0], pos: 0 }, pending.target);
				continue;
			}
			if (g.pending_best_brothers.length) {
				const pending = g.pending_best_brothers[0];
				if (!g.players[pending.aoi].bot) break;
				bridge.bestBrother({ values: [0], pos: 0 }, pending.aoi);
				continue;
			}
			if (g.pending_best_brother_swaps.length) {
				const pending = g.pending_best_brother_swaps[0];
				if (!g.players[pending.target].bot) break;
				bridge.bestBrotherSwap({ values: [0, 0], pos: 0 }, pending.target);
				continue;
			}
			if (g.pending_todo_swap_destroys.length) {
				const pending = g.pending_todo_swap_destroys[0];
				if (!g.players[pending.target].bot) break;
				bridge.resolveTodoSwapDestroy(true, pending.target);
				continue;
			}
			if (g.pending_card_choice && g.players[g.pending_card_choice.target].bot) {
				const choice = g.pending_card_choice, selected = [...(choice.required_indices || [])];
				for (const index of choice.indices) if (selected.length < choice.count && !selected.includes(index)) selected.push(index);
				bridge.chooseCard({ cards: selected }, choice.target);
				continue;
			}
			if (g.pending_follow_stacks.length && !g.pending_follow_stacks[0].targets.some((n) => !g.players[n].bot)) {
				const target = g.pending_follow_stacks[0].targets[0];
				bridge.followStack(g.players[target].hand.some((c) => c.rank === g.pending_follow_stacks[0].rank), { values: [0], pos: 0 }, target);
				continue;
			}
			if (g.pending_follow_stacks.some((event) => event.targets.some((n) => !g.players[n].bot))) break;
			if (g.pending_stack_steals.length && !g.pending_stack_steals[0].targets.some((n) => !g.players[n].bot)) {
				bridge.stackSteal({ values: [0], pos: 0 }, g.pending_stack_steals[0].targets[0]);
				continue;
			}
			if (g.pending_stack_steals.some((event) => event.targets.some((n) => !g.players[n].bot))) break;
			if (g.pending_quick_grabs.length) {
				const event = g.pending_quick_grabs[0];
				if (event.targets.some((n) => !g.players[n].bot)) break;
				bridge.resolveQuickGrab(event.targets[0], true);
				continue;
			}
			const offTurnMahito = g.players.map((player, index) => index)
				.find((index) => index !== g.current && g.players[index].bot && bridge.canMahitoArmy(index));
			if (offTurnMahito !== undefined) {
				bridge.transfiguredArmy({ values: [5], pos: 0 }, offTurnMahito);
				continue;
			}
			const i = g.current, p = g.players[i];
			if (p.enchain_scheduled_turn !== null && g.turn >= p.enchain_scheduled_turn) {
				bridge.activateEnchain({ values: [], pos: 0 });
				continue;
			}
			if (g.domains.length > 1 && g.domains.some((domain) => domain.owner === i)
				&& p.domain_draw_turn !== g.turn && g.draw_piles.some((pile) => pile.length)) {
				bridge.domain({ values: [], pos: 0 });
				continue;
			}
			if (!p.bot) {
				if (g.finished(i)) { g.endTurn(); continue; }
				break;
			}
			if (p.character === "Mahito") {
				if (bridge.canBodyManipulation(i)) {
					const size = Math.min(3, bridge.bodyManipulationMax(i));
					bridge.bodyManipulation({
						values: [size - 1, ...Array(p.hand.length + p.face_up.length + size).fill(0)],
						pos: 0,
					});
					continue;
				}
				if (g.effective(i, "Transfigured Humans") === "Transfigured Humans"
					&& p.transfigured_used_round !== g.round) {
					const pileValue = g.pile_values.find((_, pile) => g.discards[pile].length) || 9;
					bridge.transfiguredHumans({ values: [Math.max(0, Math.min(12, pileValue - 2))], pos: 0 });
					continue;
				}
				if (bridge.canMahitoArmy(i)) {
					bridge.transfiguredArmy({ values: [5], pos: 0 }, i);
					continue;
				}
				if (g.effective(i, "Idle Transfiguration") === "Idle Transfiguration"
					&& !bridge.mahitoBusy()) {
					const targets = g.players.map((target, index) => index).filter((index) => index !== i
						&& !g.players[index].is_eliminated && !g.finished(index) && !g.blocksEffect(index, i)
						&& bridge.hasAbilities(index));
					if (targets.length && bridge.hasAbilities(i)) {
						bridge.idleTransfiguration({ values: [0, 0, 0], pos: 0 });
						continue;
					}
				}
				if (g.effective(i, "Soul Touch") && p.rule_uses["Soul Touch"] !== g.round
					&& !bridge.mahitoBusy()) {
					const targets = g.players.map((target, index) => index).filter((index) => index !== i
						&& !g.players[index].is_eliminated && !g.finished(index)
						&& g.players[index].hand_lock_until_round < g.round && !g.blocksEffect(index, i));
					const target = targets.sort((a, b) => g.players[b].hand.length - g.players[a].hand.length)[0];
					if (target !== undefined) {
						bridge.soulTouch({ values: [targets.indexOf(target), 0], pos: 0 });
						continue;
					}
				}
				if (bridge.canMahitoDomainCancel(i)) {
					bridge.mahitoDomainCancel({ values: [0], pos: 0 });
					continue;
				}
				if (bridge.canMahitoDomainRemove(i)) {
					bridge.mahitoDomainRemove({ values: [0, 0], pos: 0 });
					continue;
				}
			}
			if (g.effective(i, "Divergent Fist") === "Delayed Black Flash"
				&& p.rule_uses["Delayed Black Flash"] !== g.round
				&& bridge.delayedBlackFlashChoices(i).length) {
				bridge.delayedBlackFlash({ values: [0], pos: 0 }, i);
				continue;
			}
			if (g.effective(i, "Blood Manipulation") && p.hand.length > 3) {
				const [removed] = p.hand.splice(0, 1);
				g.destroyed.push(removed);
				g.record(`${p.name} used Blood Manipulation to destroy ${cardText(removed)}.`);
			}
			if (p.character === "Aoi Todo" && g.effective(i, "Arm Sacrifice") === "Vivid Imagination"
				&& p.takada_meter > 0 && p.vivid_uses < 3 + p.vivid_limit_bonus) {
				bridge.vividSkip(i);
				continue;
			}
			if (p.pending_world_slashes) {
				bridge.resolveSlash({ values: Array(20).fill(0), pos: 0 });
				continue;
			}
			if (p.pending_limitless_effects.length) { bridge.resolveLimitless({ values: Array(20).fill(0), pos: 0 }); continue; }
			if (g.forced_play?.played) { bridge.finishTurn(); continue; }
			bridge.drawPref = null; g.refill(i);
			if (!g.cards_played && !g.forced_play) {
				const joker = p.hand.findIndex((c) => c.rank === "Joker"), track = bridge.evolvable(i)[0];
				if (joker >= 0 && track) {
					p.hand.splice(joker, 1); p.ability_states[track.ability].evolved = true;
					if (track.ability === "Boogie Woogie") {
						p.vibraslap_acquired_turn = g.turn;
						p.vibraslap_swaps_spent = 0;
					}
					bridge.notice = `${p.name} evolved ${track.ability} into ${track.evolution.ability} and ended their turn.`;
					bridge.finishTurn(); continue;
				}
				if (g.effective(i, "God of Jujutsu") === "God of Jujutsu" && p.god_round !== g.round) {
					const hasStack = p.hand.some((c) => [0, 1].some((pile) => g.discards[pile].length && g.pile_values[pile] === rankValue(c)));
					p.god_rule = hasStack ? "Stack destroy" : "I-T";
					p.god_round = g.round;
					bridge.notice = `${p.name} chose ${p.god_rule} with God of Jujutsu.`;
				}
				if (g.effective(i, "Simple Domain") === "Simple Domain" && !p.simple_domain_used
					&& (p.cut_meter >= 3 || g.domains.some((domain) => domain.owner !== i))) {
					p.simple_domain_active = true; p.simple_domain_used = true;
					bridge.notice = `${p.name} activated Simple Domain.`;
				}
				if (bridge.canRescue(i) && p.hand.length < 2) bridge.rescue({ values: [], pos: 0 });
			}
			if (p.character === "Aoi Todo" && bridge.canCardSwap(i)) {
				bridge.cardSwap({ values: [0, 0], pos: 0 });
				continue;
			}
			if (p.character === "Aoi Todo" && g.effective(i, "Built Different")
				&& bridge.swapCredits(i) > 0
				&& (p.built_different_round !== g.round || p.built_different_uses < 3)) {
				bridge.builtDifferent({ values: [RULE_NAMES.indexOf("Meters")], pos: 0 }, i);
				continue;
			}
			if (p.character === "Aoi Todo" && g.effective(i, "Boogie Woogie") === "Boogie Woogie"
				&& !p.boogie_soul_swap_used) {
				const targets = g.players.map((_, index) => index).filter((index) => index !== i
					&& !g.players[index].is_eliminated && !g.finished(index) && !g.has(index, "God of Jujutsu")
					&& g.players[index].hand_lock_until_round < g.round && !g.blocksEffect(index, i));
				const target = targets.sort((a, b) => g.players[b].hand.length - g.players[a].hand.length)[0];
				if (target !== undefined && g.players[target].hand.length > p.hand.length) {
					bridge.boogieSoulSwap({ values: [targets.indexOf(target)], pos: 0 });
					continue;
				}
			}
			const [source, cards] = g.source(i);
			if (!source) { bridge.finishTurn(); continue; }
			if (source === "face_down") {
				const ci = Math.floor(Math.random() * cards.length);
				const legal = [0, 1].filter((pile) => g.legal(cards[ci], pile, 14));
				const pile = legal[0] ?? 0;
				const [played, success] = g.playDown(i, ci, pile);
				bridge.notice = success ? `${p.name} revealed and played ${cardText(played)}.` : `${p.name} revealed ${cardText(played)} and picked up both piles.`;
				bridge.finishTurn(); continue;
			}
			const options = [];
			for (let ci = 0; ci < cards.length; ci++) for (let pile = 0; pile < 2; pile++) {
				const blackFlashRanks = ["Yuji Itadori", "Aoi Todo"].includes(p.character) && g.effective(i, "Black Flash")
					? [...p.black_flash_ranks]
					: [];
				if (p.built_different_rule === "Black Flash" && !p.built_different_rule_used && p.god_rule_param) {
					blackFlashRanks.push(p.god_rule_param);
				}
				if (p.god_rule === "Black Flash" && p.god_round === g.round && p.god_rule_param) {
					blackFlashRanks.push(p.god_rule_param);
				}
				const jokerValues = cards[ci].rank !== "Joker" ? [null]
					: [...new Set([...blackFlashRanks.map((rank) => VALUES[rank]), 14])];
				for (const jokerValue of jokerValues) {
					if (g.legal(cards[ci], pile, jokerValue)) options.push({ ci, pile, jokerValue });
				}
			}
			if (!options.length) {
				if (g.forced_play) { bridge.finishTurn(); continue; }
				if (g.effective(i, "Divergent Fist") && p.rule_uses["Divergent Fist"] !== g.turn) {
					const pile = g.turn_pile ?? 0;
					p.rule_uses["Divergent Fist"] = g.turn;
					g.place(cards[0], pile, cards[0].rank === "Joker" ? 14 : null, source);
					g.human_has_played = true;
					continue;
				}
				const tiedPile = g.tie_breaks.findIndex((_, pile) => g.tieBreakApplies(pile, i));
				if (tiedPile >= 0 && cards.every((c) => g.cardValue(i, c, c.rank === "Joker" ? 14 : null) !== g.pile_values[tiedPile])) {
					g.tie_breaks[tiedPile] = null;
					g.endTurn();
					continue;
				}
				const cleave = p.character === "Yuji Itadori" ? null : g.effective(i, "Cleave");
				const usage = p.ability_states.Cleave || { round: -1, uses: 0 };
				if (cleave && (usage.round !== g.round || usage.uses < (cleave === "Spider Net Cleave" ? 5 : 1))) {
					const pile = g.discards.findIndex((entry, index) => entry.length && !g.isPileLocked(index));
					if (pile >= 0) {
						bridge.cleave({ pile }, { values: Array(20).fill(0), pos: 0 });
						bridge.notice = `${p.name} used Cleave on pile ${pile + 1} to open up a play.`;
						continue;
					}
				}
				if (!g.cards_played && g.effective(i, "Binding Vow") && !p.vow_card && g.pile_values.some((value) => value <= 13)) {
					p.vow_card = g.bindingVowCards(i)[0] || null;
					if (p.vow_card) {
						bridge.notice = `${p.name} used Binding Vow and ended their turn.`;
						g.endTurn();
						continue;
					}
				}
				if (!g.cards_played) g.takePiles(i);
				g.endTurn(); continue;
			}
			const rank = (c) => c.rank === "Joker" ? 15 : VALUES[c.rank];
			options.sort((a, b) => rank(cards[a.ci]) - rank(cards[b.ci]));
			const choice = options[0];
			const played = g.play(i, source, choice.ci, choice.pile, choice.jokerValue);
			bridge.notice = `${p.name} played ${cardText(played)}.`;
			g.human_has_played = true;
			if (g.forced_play) g.forced_play.played = true;
			const [, remainingCards] = g.source(i);
			const canContinue = remainingCards.some((c) => [0, 1].some((pile) => g.legal(c, pile, c.rank === "Joker" ? 14 : null)));
			if (g.forced_play && !p.pending_world_slashes && !p.pending_limitless_effects.length && !g.pending_quick_grabs.length) bridge.finishTurn();
			else if (g.winner === null && !p.pending_world_slashes && !p.pending_limitless_effects.length && !g.pending_quick_grabs.length && (!remainingCards.length || !canContinue || g.finished(i))) g.endTurn();
		}
		if (g) g.refillUnderfilledHands();
		return bridge.get_state();
	};
	window.PalaceBridge = bridge;
})();
