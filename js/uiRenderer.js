// Renders UI components based on the current state
import { TeamService } from './teamService.js';
import { MatchService } from './matchService.js';
import { CONFIG } from './config.js';
import { state } from './dataManager.js';
import { StandingsCalculator } from './standingsCalculator.js';
import { MatchManager } from './matchManager.js';

export const UIRenderer = {
    /**
     * Renders a match card based on the given match object.
     * If the match is not already in the state.matches array, it is added.
     * The rendered card contains two input fields for score editing and
     * a brief summary of the match.
     * @param {Object} match - The match to be rendered
     * @param {number} match.id - The match id
     * @param {Object} match.homeTeam - The home team object
     * @param {number} match.homeTeam.id - The home team id
     * @param {Object} match.awayTeam - The away team object
     * @param {number} match.awayTeam.id - The away team id
     * @param {number} [match.homeScore] - The home team score
     * @param {number} [match.awayScore] - The away team score
     * @returns {string} The rendered match card HTML
     */
    renderMatchCard(match) {
        const homeTeam = TeamService.getTeamById(match.homeTeam.id, state) || match.homeTeam;
        const awayTeam = TeamService.getTeamById(match.awayTeam.id, state) || match.awayTeam;
        const matchId = match.id;
        const isComplete = MatchService.isMatchComplete(match);
        return `
            <div class="min-w-[450px] bg-gray-50 rounded-lg p-4 border border-gray-200 ${isComplete ? 'ring-2 ring-green-200' : ''}" data-match-complete="${isComplete}" data-match-id="${matchId}">
                <div class="flex gap-2 items-center">
                    <div class="flex min-w-[9.375rem] items-center justify-between gap-2">
                        <div class="flex-1 text-right">
                            <span class="block truncate font-medium">${homeTeam.name}</span>
                        </div>
                        <div class="flex items-center justify-end">
                            <img class="w-7 h-7 object-contain" src="${TeamService.getTeamLogo(homeTeam)}" alt="${homeTeam.name}">
                        </div>
                    </div>
                    <div class="flex items-center content-center gap-2">
                        <input type="number" min="0" max="${CONFIG.MAX_GOALS}" value="${match.homeScore ?? ''}" id="home-score-${matchId}" data-match-id="${matchId}" data-field="homeScore" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Placar do ${homeTeam.name}">
                        <span aria-hidden="true">×</span>
                        <input type="number" min="0" max="${CONFIG.MAX_GOALS}" value="${match.awayScore ?? ''}" id="away-score-${matchId}" data-match-id="${matchId}" data-field="awayScore" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Placar do ${awayTeam.name}">
                    </div>
                    <div class="flex min-w-[9.375rem] items-center justify-between gap-2">
                        <div class="flex items-center">
                            <img class="w-7 h-7 object-contain" src="${TeamService.getTeamLogo(awayTeam)}" alt="${awayTeam.name}">
                        </div>
                        <div class="flex-1 text-left">
                            <span class="block truncate font-medium">${awayTeam.name}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renders a message indicating that there are no matches available for the current round.
     * @returns {string} HTML string
     */
    renderEmptyMatches() {
        return `
            <div class="flex flex-col items-center justify-center p-8 text-gray-400">
                <svg class="w-12 h-12 opacity-50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <p>Nenhum jogo disponível para esta rodada</p>
            </div>
        `;
    },

    /**
     * Renders the standings table based on the current state.standings.
     * Handles both fixed and scrollable columns. If the previous standings
     * are stored, it also applies position changes (up, down, or none) to
     * the rendered rows.
     * @public
     */
    renderStandings() {
        try {
            const fixedBody = document.getElementById('standings-fixed-body');
            fixedBody.classList.add('flex', 'flex-col');
            const scrollBody = document.getElementById('standings-scroll-body');

            if (!fixedBody || !scrollBody) return;

            const standings = Array.isArray(state && state.standings) ? state.standings : [];
            const sorted = StandingsCalculator.sortStandings(standings || []);
            const previous = state.previousStandings || [];
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
                        changeIndicator = `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-green-600 font-bold" title="Subiu ${change.positionsChanged} posição(ões)" aria-hidden="true">↑</span>`;
                    } else if (change.direction === 'down') {
                        changeIndicator = `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-red-600 font-bold" title="Desceu ${change.positionsChanged} posição(ões)" aria-hidden="true">↓</span>`;
                    } else if (change.direction === 'none') {
                        changeIndicator = `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-gray-400 font-bold" title="Manteve a posição" aria-hidden="true">-</span>`;
                    }
                }

                // Fixed columns: position, team (logo + name), points
                const fixedRow = document.createElement('tr');
                fixedRow.classList.add('h-12', 'border-b', 'grid', 'grid-cols-[15%_70%_15%]');
                fixedRow.innerHTML = `
                    <td class="flex items-center justify-center content-center relative">
                        <span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">${team.position}</span>
                    </td>
                    <td class="flex items-center content-center gap-2">
                        <div class="relative w-2 h-6 flex items-center justify-center" aria-hidden="true">
                            ${changeIndicator}
                        </div>
                        <div class="flex items-center gap-2" data-team-name="${team.name}">
                            <div class="hidden sm:flex team-logo">
                                    <img class="w-7 h-7 object-contain" src="${TeamService.getTeamLogo(team)}" alt="${team.name}">
                                </div>
                            <div>
                                ${team.name}
                            </div>
                        </div>
                    </td>
                    <td class="text-center content-center font-bold">
                        ${team.points}
                    </td>
                `;
                fixedBody.appendChild(fixedRow);

                // Scrollable columns: games, wins, draws, losses, gp, gc, sg
                const scrollRow = document.createElement('tr');
                scrollRow.classList.add('h-12', 'border-b', 'grid', 'grid-cols-7');
                scrollRow.innerHTML = `
                    <td class="text-center content-center">${team.games || 0}</td>
                    <td class="text-center content-center">${team.draws || 0}</td>
                    <td class="text-center content-center">${team.victories || 0}</td>
                    <td class="text-center content-center">${team.defeats || 0}</td>
                    <td class="text-center content-center">${team.goal_pro || 0}</td>
                    <td class="text-center content-center">${team.goal_against || 0}</td>
                    <td class="text-center content-center ${team.balance_goals >= 0 ? 'text-green-600' : 'text-red-600'}">${team.balance_goals >= 0 ? '+' : ''}${team.balance_goals || 0}</td>
                `;
                scrollBody.appendChild(scrollRow);
            });

            // After rendering, update previous standings snapshot to the new sorted list
            state.previousStandings = JSON.parse(JSON.stringify(sorted || []));

            // Trigger a brief animation for visible indicators, then remove the animation class so it doesn't loop forever
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
     * @public
     */
    renderMatches() {
        try {
            const list = document.getElementById('matches-list');
            if (!list) return;
            const matches = (state && state.matches) || [];
            if (!matches || matches.length === 0) {
                UIRenderer.renderEmptyMatches();
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
                    } else if (state && state.matches) {
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
    }
};
