import { TeamService } from './teamService.js';
import { MatchManager } from './matchManager.js';
import { DataManager, state } from './dataManager.js';
import { StandingsCalculator } from './standingsCalculator.js';
import { UIRenderer } from './uiRenderer.js';
import { CONFIG } from './config.js';

// Gerenciamento de UI
const elements = {
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
	 * Renders the standings table based on the current state.standings.
	 * Handles both fixed and scrollable columns. If the previous standings
	 * are stored, it also applies position changes (up, down, or none) to
	 * the rendered rows.
	 * @private
	 */
	renderStandings() {
		try {
			const fixedBody = document.getElementById('standings-fixed-body');
			const scrollBody = document.getElementById('standings-scroll-body');
			if (!fixedBody || !scrollBody) return;

					const standings = Array.isArray(state && state.standings) ? state.standings : [];
			const sorted = StandingsCalculator.sortStandings(standings || []);
			const previous = UIManager._previousStandings || [];
			const rawChanges = StandingsCalculator.getPositionChanges(sorted, previous);
			// Only show indicators for teams that actually moved
			const visibleChanges = {};
			Object.keys(rawChanges).forEach(id => {
				const ch = rawChanges[id];
				if (!ch) return;
				if (ch.direction !== 'none') visibleChanges[id] = ch;
			});

			fixedBody.innerHTML = '';
			scrollBody.innerHTML = '';

			sorted.forEach(team => {
				// determine position change indicator for this team (only visibleChanges are shown)
				const change = (visibleChanges && visibleChanges[team.id]) || null;
				let changeIndicator = '';
				if (change) {
					if (change.direction === 'up') {
						changeIndicator = `<span class="change-indicator absolute -left-6 w-4 h-4 flex items-center justify-center text-green-600 font-bold" title="Subiu ${change.positionsChanged} posição(ões)" aria-hidden="true">↑</span>`;
					} else if (change.direction === 'down') {
						changeIndicator = `<span class="change-indicator absolute -left-6 w-4 h-4 flex items-center justify-center text-red-600 font-bold" title="Desceu ${change.positionsChanged} posição(ões)" aria-hidden="true">↓</span>`;
					} else if (change.direction === 'none') {
						changeIndicator = `<span class="change-indicator absolute -left-6 w-4 h-4 flex items-center justify-center text-gray-400 font-bold" title="Manteve a posição" aria-hidden="true">−</span>`;
					}
				}

				// Fixed columns: position, team (logo + name), points
				const fixedRow = document.createElement('tr');
				fixedRow.innerHTML = `
					<td>
						<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${team.position <= 4 ? 'bg-green-100 text-green-800' : ''}">${team.position}</span>
					</td>
					<td>
						<div class="relative flex items-center gap-2">
							${changeIndicator}
							<img class="w-8 h-8 object-contain" src="${TeamService.getTeamLogo(team)}" alt="${team.name}" onerror="this.src='https://via.placeholder.com/50'">
							<div>${team.name}</div>
						</div>
					</td>
					<td class="text-center font-bold">${team.points}</td>
				`;
				fixedBody.appendChild(fixedRow);

				// Scrollable columns: games, wins, draws, losses, gp, gc, sg
				const scrollRow = document.createElement('tr');
				scrollRow.innerHTML = `
					<td class="text-center">${team.games || 0}</td>
					<td class="text-center">${team.victories || 0}</td>
					<td class="text-center">${team.draws || 0}</td>
					<td class="text-center">${team.defeats || 0}</td>
					<td class="text-center">${team.goal_pro || 0}</td>
					<td class="text-center">${team.goal_against || 0}</td>
					<td class="text-center ${team.balance_goals >= 0 ? 'text-green-600' : 'text-red-600'}">${team.balance_goals >= 0 ? '+' : ''}${team.balance_goals || 0}</td>
				`;
				scrollBody.appendChild(scrollRow);
			});

			// After rendering, update previous standings snapshot to the new sorted list
			UIManager._previousStandings = JSON.parse(JSON.stringify(sorted || []));

			// Trigger a brief animation for visible indicators, then remove the animation class so it doesn't loop forever
			// We add 'animate-bounce' for a short time, then remove it
			setTimeout(() => {
				const nodes = document.querySelectorAll('.change-indicator');
				nodes.forEach(n => n.classList.add('animate-bounce'));
				setTimeout(() => {
					nodes.forEach(n => n.classList.remove('animate-bounce'));
				}, 1200);
			}, 50);
		} catch (err) {
			console.error('Erro ao renderizar classificação:', err);
		}
	},
	
	/**
	 * Renders the matches table based on the current state.matches.
	 * Handles both the case where there are no matches and the case
	 * where there are matches. If there are matches, it renders the table
	 * with input fields for score editing and attaches a simple input change
	 * handler to update state.matches when numbers change. If a MatchManager
	 * instance is available, it delegates the score update to its
	 * updateMatchScore method. Otherwise, it updates the state.matches object
	 * directly.
	 * @private
	 */
	renderMatches() {
		try {
			const list = elements.matchesList || document.getElementById('matches-list');
			if (!list) return;
			const matches = (state && state.matches) || [];
			if (!matches || matches.length === 0) {
				list.innerHTML = UIRenderer.renderEmptyMatches();
				return;
			}
			list.innerHTML = matches.map(m => UIRenderer.renderMatchCard(m)).join('');

			// attach simple input change handler: update state when numbers change
			const inputs = list.querySelectorAll('.match-input');
			inputs.forEach(inp => {
				inp.addEventListener('change', (e) => {
					const id = e.target.getAttribute('data-match-id');
					const field = e.target.getAttribute('data-field');
					const raw = e.target.value;
					let value;
					if (raw === '' || raw === null) {
						value = ""; // preserve empty state
					} else {
						const n = parseInt(raw, 10);
						value = Number.isNaN(n) ? "" : n;
					}
					// delegate to MatchManager when available
					if (MatchManager && typeof MatchManager.updateMatchScore === 'function') {
						MatchManager.updateMatchScore(id, field, value);
					} else {
						const match = state.matches.find(m => String(m.id) === String(id));
						if (match && field) {
							match[field] = value;
						}
					}
				});
			});
		} catch (err) {
			console.error('Erro ao renderizar partidas:', err);
		}
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
		UIManager.renderMatches();
	}
};

export { setupEventListeners };

