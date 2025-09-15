import { MatchManager } from './matchManager.js';
import { dataManager, state } from './dataManager.js';
import { UIRenderer } from './uiRenderer.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

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
	resetChampionshipBtn: null,
	// compact/full table controls (mobile)
	compactTableBtn: null,
	fullTableBtn: null,
	standingsFixedBody: null,
	standingsScrollBody: null
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

	// compact/full table controls
	elements.compactTableBtn = document.getElementById('compact-table');
	elements.fullTableBtn = document.getElementById('full-table');
	elements.standingsFixedBody = document.getElementById('standings-fixed-body');
	elements.standingsScrollBody = document.getElementById('standings-scroll-body');
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
				UIManager.renderMatches();
				UIManager.renderStandings();
				break;
			case 'd': // Ctrl/Cmd + Shift + D -> clear (D like 'delete/clear')
				e.preventDefault();
				MatchManager.clearRound();
				UIManager.renderMatches();
				UIManager.renderStandings();
				break;
		}
	});

	// Wire compact/full controls to UIManager.toggleCompact
	if (elements.compactTableBtn) elements.compactTableBtn.addEventListener('click', () => UIManager.toggleCompact(true, true));
	if (elements.fullTableBtn) elements.fullTableBtn.addEventListener('click', () => UIManager.toggleCompact(false, true));

	// Reflect current stored preference on buttons
	UIManager.updateCompactButtons();

	// Reapply stored compact state when entering mobile viewport only.
	let lastWasMobile = window.innerWidth < 768;
	window.addEventListener('resize', () => {
		const isMobile = window.innerWidth < 768;
		if (isMobile && !lastWasMobile) {
			// just entered mobile; apply stored preference (no persistence)
			if (state && state.compactTable) UIManager.toggleCompact(true, false);
		} else if (!isMobile && lastWasMobile) {
			// just entered desktop; ensure full table is visible (do not overwrite stored preference)
			UIManager.toggleCompact(false, false);
		}
		lastWasMobile = isMobile;
	});
}

// UIManager exposes methods required by DataManager and main
export const UIManager = {
	/**
	 * Shows the loading overlay, if it exists.
	 * @private
	 */
	showLoading() {
		// Ensure we have up-to-date element references
		refreshElements();
		if (!elements.loading) return;
		elements.loading.style.display = 'flex';
	},

	/**
	 * Tries to refresh element references.
	 * @private
	 */
	tryRefreshElements() {
		try {
			refreshElements();
		} catch (e) {
			// swallow: DOM may not be ready yet; callers will re-query as needed
			console.debug('uiManager: initial refreshElements deferred', e);
		}
	},
	
	/**
	 * Hides the loading overlay, if it exists.
	 * @private
	 */
	hideLoading() {
		// Ensure we have up-to-date element references
		refreshElements();
		if (!elements.loading) return;
		elements.loading.style.display = 'none';
	},

	/**
	 * Renders the standings table by delegating to UIRenderer.renderStandings.
	 * @private
	 */
	renderStandings() {
		UIRenderer.renderStandings();
		// Reapply user's compact table preference after rendering, but only when
		// on small viewports. On desktop we respect a full-table view even if the
		// user previously chose compact on mobile.
		if (state && typeof state.compactTable !== 'undefined') {
			const isMobile = window.innerWidth < 768;
			const effectiveCompact = !!state.compactTable && isMobile;
			// Reapply without animation to avoid flicker when standings change
			UIManager.toggleCompact(effectiveCompact, false, false);
			UIManager.updateCompactButtons();
		}
	},

	/**
	 * Update visual state (active class) of compact/full buttons
	 */
	updateCompactButtons() {
		refreshElements();
		// Buttons should reflect the effective compact state (consider viewport)
		const isMobile = window.innerWidth < 768;
		const effectiveCompact = !!state.compactTable && isMobile;
		if (elements.compactTableBtn) elements.compactTableBtn.classList.toggle('active', effectiveCompact);
		if (elements.fullTableBtn) elements.fullTableBtn.classList.toggle('active', !effectiveCompact);
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
	},

	/**
	 * Show or hide middle rows to present a compact table on small viewports.
	 * When `compact` is true, only the top 4 and bottom 4 rows are shown.
	 * @param {boolean} compact
	 * @param {boolean} [compact]
	 * @param {boolean} [persist=true] whether to store the user's choice in `state`
	 * @param {boolean} [animate=true] whether to use animated collapse/expand
	 */
	toggleCompact(compact, persist = true, animate = true) {
		refreshElements();
		// Only apply compact behavior on small viewports. On desktop we always
		// show the full table (but we still persist the user's mobile choice).
		const isMobile = window.innerWidth < 768;
		const applyCompact = isMobile && !!compact;
		const fixedBody = elements.standingsFixedBody || document.getElementById('standings-fixed-body');
		const scrollBody = elements.standingsScrollBody || document.getElementById('standings-scroll-body');
		if (!fixedBody || !scrollBody) return;
		const fixedRows = Array.from(fixedBody.querySelectorAll('tr'));
		const scrollRows = Array.from(scrollBody.querySelectorAll('tr'));
		const fixedLen = fixedRows.length;
		const scrollLen = scrollRows.length;
		if (fixedLen === 0 && scrollLen === 0) return;

		const topCount = 4;
		const bottomCount = 4;

		const collapseRow = (row) => {
			if (!row) return;
			if (animate) return Utils.collapseElement(row);
			row.style.display = 'none';
		};
		const expandRow = (row) => {
			if (!row) return;
			if (animate) return Utils.expandElement(row);
			row.style.display = '';
		};

		// operate on each body independently so mismatched row counts don't cause wrong hiding
		for (let i = 0; i < fixedLen; i++) {
			// when applyCompact is false, showFixed will always be true
			const showFixed = !applyCompact || i < topCount || i >= fixedLen - bottomCount;
			const fr = fixedRows[i];
			if (showFixed) {
				if (fr && fr.style.display === 'none') expandRow(fr);
			} else {
				if (fr && fr.style.display !== 'none') collapseRow(fr);
			}
		}

		for (let i = 0; i < scrollLen; i++) {
			const showScroll = !applyCompact || i < topCount || i >= scrollLen - bottomCount;
			const sr = scrollRows[i];
			if (showScroll) {
				if (sr && sr.style.display === 'none') expandRow(sr);
			} else {
				if (sr && sr.style.display !== 'none') collapseRow(sr);
			}
		}

		// persist user's choice in application state if requested
		if (persist) {
			// persist the user's choice (mobile preference) but do not force it
			// to apply on desktop — applyCompact already handles that.
			state.compactTable = !!compact;
			// update visual state
			UIManager.updateCompactButtons();
		}
	},
};

export { setupEventListeners };

