import { MatchManager } from './matchManager.js';
import { DataManager, state } from './dataManager.js';
import { UIRenderer } from './uiRenderer.js';
import { CONFIG } from './config.js';

// UI management: rendering and event handling
export const elements = {
	matchesList: document.getElementById('matches-list'),
	prevRoundBtn: document.getElementById('prev-round'),
	nextRoundBtn: document.getElementById('next-round'),
	roundTitle: document.getElementById('round-title'),
	roundDate: document.getElementById('round-date'),
	loading: document.getElementById('loading'),
	simulateRoundBtn: document.getElementById('simulate-round'),
	clearRoundBtn: document.getElementById('clear-round'),
	resetChampionshipBtn: document.getElementById('reset-championship')
};

/**
 * Sets up event listeners for the app's UI elements, such as buttons and keyboard shortcuts.
 * Called once on initialization.
 * @private
 */
function setupEventListeners() {
	// Navigation buttons
	elements.prevRoundBtn.addEventListener('click', () => UIManager.changeRound('prev'));
	elements.nextRoundBtn.addEventListener('click', () => UIManager.changeRound('next'));

	// Action buttons
	elements.simulateRoundBtn.addEventListener('click', () => {
		MatchManager.simulateRound();
		UIManager.renderMatches();
		UIManager.renderStandings();
	});
	elements.clearRoundBtn.addEventListener('click', () => {
		MatchManager.clearRound();
		UIManager.renderMatches();
		UIManager.renderStandings();
	});
	elements.resetChampionshipBtn.addEventListener('click', async () => {
		const ok = await DataManager.resetChampionship();
		if (ok) {
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
		UIRenderer.renderMatches();
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
		if (elements.roundTitle) elements.roundTitle.textContent = `Rodada ${state.currentRound}`;
		if (elements.prevRoundBtn) elements.prevRoundBtn.disabled = state.currentRound <= min;
		if (elements.nextRoundBtn) elements.nextRoundBtn.disabled = state.currentRound >= max;

		// Retrieve and update the round date for the new round and keep state in sync
		const newDate = (state.allMatches[state.currentRound] && state.allMatches[state.currentRound].date) || '';
		state.currentRoundDate = newDate;
		if (elements.roundDate) elements.roundDate.textContent = state.currentRoundDate;

		UIManager.renderMatches();
	}
};

export { setupEventListeners };

