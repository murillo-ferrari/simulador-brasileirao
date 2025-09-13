import { MatchManager } from './matchManager.js';
import { dataManager, state } from './dataManager.js';
import { UIRenderer } from './uiRenderer.js';
import { CONFIG } from './config.js';

// Elements are queried lazily to avoid timing issues when modules load
const elements = {
	matchesList: null,
	prevRoundBtn: null,
	nextRoundBtn: null,
	roundTitle: null,
	roundDate: null,
	loading: null,
	simulateRoundBtn: null,
	clearRoundBtn: null,
	resetChampionshipBtn: null
};

/**
 * Retrieves fresh references to the UI elements needed by UIManager.
 * Lazily reloads the elements from the DOM, so this can be called at any
 * time to ensure the elements are current.
 * @private
 */
function refreshElements() {
	elements.matchesList = document.getElementById('matches-list');
	elements.prevRoundBtn = document.getElementById('prev-round');
	elements.nextRoundBtn = document.getElementById('next-round');
	elements.roundTitle = document.getElementById('round-title');
	elements.roundDate = document.getElementById('round-date');
	elements.loading = document.getElementById('loading');
	elements.simulateRoundBtn = document.getElementById('simulate-round');
	elements.clearRoundBtn = document.getElementById('clear-round');
	elements.resetChampionshipBtn = document.getElementById('reset-championship');
}

/**
 * Sets up event listeners for the app's UI elements, such as buttons and keyboard shortcuts.
 * Called once on initialization.
 * @private
 */
function setupEventListeners() {
	// Ensure elements are current
	refreshElements();

	// Navigation buttons
	if (elements.prevRoundBtn) elements.prevRoundBtn.addEventListener('click', () => UIManager.changeRound('prev'));
	if (elements.nextRoundBtn) elements.nextRoundBtn.addEventListener('click', () => UIManager.changeRound('next'));

	// Action buttons
	if (elements.simulateRoundBtn) elements.simulateRoundBtn.addEventListener('click', () => {
		MatchManager.simulateRound();
		UIManager.renderMatches();
		UIManager.renderStandings();
	});

	if (elements.clearRoundBtn) elements.clearRoundBtn.addEventListener('click', () => {
		MatchManager.clearRound();
		UIManager.renderMatches();
		UIManager.renderStandings();
	});

	if (elements.resetChampionshipBtn) elements.resetChampionshipBtn.addEventListener('click', async () => {
		const ok = await dataManager.resetChampionship();
		if (ok) {
			// Update round title/date from state, then re-render
			UIManager.updateRoundInfo(state.currentRound, state.currentRoundDate);
			UIManager.renderStandings();
			UIManager.renderMatches();
		}
	});

	// Keyboard shortcuts
	// Use Ctrl/Cmd + Arrow to navigate, and Ctrl/Cmd + Shift + S / D for simulate / clear to avoid browser shortcuts
	document.addEventListener('keydown', (e) => {
		if (!(e.ctrlKey || e.metaKey)) return;

		// Arrow navigation (no Shift required)
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (state.currentRound > CONFIG.MIN_ROUND) {
				UIManager.changeRound('prev');
			}
			return;
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			if (state.currentRound < CONFIG.MAX_ROUND) {
				UIManager.changeRound('next');
			}
			return;
		}

		// Use Shift + key to avoid conflicting with browser shortcuts (e.g., Ctrl+S, Ctrl+R)
		if (!e.shiftKey) return;
		const k = (e.key || '').toLowerCase();
		switch (k) {
			case 's': // Ctrl/Cmd + Shift + S -> simulate
				e.preventDefault();
				MatchManager.simulateRound();
				break;
			case 'd': // Ctrl/Cmd + Shift + D -> clear (D like 'delete/clear')
				e.preventDefault();
				MatchManager.clearRound();
				break;
		}
	});
}

// UIManager exposes methods required by DataManager and main
export const UIManager = {
	/**
	 * Shows the loading overlay, if it exists.
	 * @private
	 */
	showLoading() {
		if (elements.loading) elements.loading.style.display = 'flex';
	},

	/**
	 * Hides the loading overlay, if it exists.
	 * @private
	 */
	hideLoading() {
		if (elements.loading) elements.loading.style.display = 'none';
	},

	/**
	 * Renders the standings table by delegating to UIRenderer.renderStandings.
	 * @private
	 */
	renderStandings() {
		UIRenderer.renderStandings();
	},

	/**
	 * Renders the matches table by delegating to UIRenderer.renderMatches.
	 * @private
	 */
	renderMatches() {
		// keep UI in sync with state before rendering
		refreshElements();
		if (elements.roundTitle) elements.roundTitle.textContent = `Rodada ${state.currentRound}`;
		if (elements.roundDate) elements.roundDate.textContent = state.currentRoundDate || '';
		const list = elements.matchesList;
		if (!list) return;
		const matches = (state && state.matches) || [];
		if (!matches || matches.length === 0) {
			list.innerHTML = UIRenderer.renderEmptyMatches();
			return;
		}
		// render match cards
		list.innerHTML = matches.map(m => UIRenderer.renderMatchCard(m)).join('');

		// attach input change handlers so manual input updates standings immediately
		const inputs = list.querySelectorAll('.match-input');
		inputs.forEach(inp => {
			inp.addEventListener('change', (e) => {
				const id = e.target.getAttribute('data-match-id');
				const field = e.target.getAttribute('data-field');
				const raw = e.target.value;
				let value;
				if (raw === '' || raw === null) {
					value = "";
				} else {
					const n = parseInt(raw, 10);
					value = Number.isNaN(n) ? "" : n;
				}
				// delegate to MatchManager and then refresh UI
				if (MatchManager && typeof MatchManager.updateMatchScore === 'function') {
					MatchManager.updateMatchScore(id, field, value);
				}
				UIManager.renderMatches();
				UIManager.renderStandings();
			});
		});
	},

	/**
	 * Changes the current round by one, either going to the previous or
	 * next round, depending on the given direction. Updates the state.matches
	 * array with the new matches for the changed round, and updates the UI by
	 * re-rendering the matches table and updating the round title and next/prev
	 * buttons.
	 * @param {string} direction - either 'prev' or 'next' to change the round
	 * @private
	 */
	changeRound(direction) {
		const min = CONFIG.MIN_ROUND || 1;
		const max = CONFIG.MAX_ROUND || 38;
		if (direction === 'prev' && state.currentRound > min) state.currentRound -= 1;
		if (direction === 'next' && state.currentRound < max) state.currentRound += 1;
		state.matches = state.allMatches[state.currentRound] || [];

		// Update UI
		refreshElements();
		if (elements.roundTitle) elements.roundTitle.textContent = `Rodada ${state.currentRound}`;
		if (elements.prevRoundBtn) elements.prevRoundBtn.disabled = state.currentRound <= min;
		if (elements.nextRoundBtn) elements.nextRoundBtn.disabled = state.currentRound >= max;

		// Retrieve and update the round date for the new round and keep state in sync
		const newDate = (state.allMatches[state.currentRound] && state.allMatches[state.currentRound].date) || '';
		state.currentRoundDate = newDate;
		if (elements.roundDate) elements.roundDate.textContent = state.currentRoundDate;

		UIManager.renderMatches();
	}
,

	/**
	 * Update the round title and date in the UI
	 * @param {number} round
	 * @param {string} date
	 */
	updateRoundInfo(round, date) {
		refreshElements();
		if (elements.roundTitle) elements.roundTitle.textContent = `Rodada ${round}`;
		if (elements.roundDate) elements.roundDate.textContent = date || '';
	},

	/**
	 * Reset round title/date to defaults
	 */
	resetRoundInfo(date) {
		refreshElements();
		if (elements.roundTitle) elements.roundTitle.textContent = `Rodada ${CONFIG.MIN_ROUND}`;
		if (elements.roundDate) elements.roundDate.textContent = date || '';
	}
};

export { setupEventListeners };

