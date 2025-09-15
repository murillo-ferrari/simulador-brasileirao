// Renders UI components based on the current state
import { TeamService } from './teamService.js';
import { MatchService } from './matchService.js';
import { state } from './dataManager.js';
import { StandingsCalculator } from './standingsCalculator.js';
import { MatchManager } from './matchManager.js';
import { Utils } from './utils.js';

export const UIRenderer = {


    /**
     * Renders a single match card based on the given match data.
     * Resolves canonical team metadata (name, acronym, logo) and renders
     * the match card with input fields for score editing.
     * @param {Object} match - match data object with homeTeam and awayTeam
     * @returns {string} - rendered match card HTML string
     */
    renderMatchCard(match) {
        // Resolve canonical metadata (may return null if not available)
        const homeMeta = TeamService.getTeamById(match.homeTeam?.id, state) || match.homeTeam || {};
        const awayMeta = TeamService.getTeamById(match.awayTeam?.id, state) || match.awayTeam || {};

        const homeName = homeMeta.name || match.homeTeam?.name || '';
        const awayName = awayMeta.name || match.awayTeam?.name || '';
        const homeAcronym = homeMeta.acronym || match.homeTeam?.acronym || '';
        const awayAcronym = awayMeta.acronym || match.awayTeam?.acronym || '';
        const homeLogo = TeamService.getTeamLogo(homeMeta, state) || '';
        const awayLogo = TeamService.getTeamLogo(awayMeta, state) || '';

        const matchId = match.id;
        const isComplete = MatchService.isMatchComplete(match);

        // Left column: home team
        const leftCol = `
            <div class="flex lg:min-w-[9.375rem] items-center justify-between gap-2">
                    <div class="flex-1 text-right">
                    <span class="block truncate font-medium text-lg"><span class="lg:hidden">${homeAcronym || homeName}</span><span class="hidden lg:inline">${homeName}</span></span>
                </div>
                <div class="flex items-center justify-end">
                    <img class="w-7 h-7 object-contain flex-shrink-0" src="${homeLogo}" alt="${homeName}">
                </div>
            </div>`;

        // Middle column: inputs for scores
        const middleCol = `
            <div class="flex items-center content-center gap-2">
                <input value="${match.homeScore ?? ''}" data-match-id="${matchId}" data-field="homeScore" data-team-id="${homeMeta.id}" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" aria-label="Placar do ${homeName}">
                <span aria-hidden="true">×</span>
                <input value="${match.awayScore ?? ''}" data-match-id="${matchId}" data-field="awayScore" data-team-id="${awayMeta.id}" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" aria-label="Placar do ${awayName}">
            </div>`;

        // Right column: away team
        const rightCol = `
            <div class="flex lg:min-w-[9.375rem] items-center justify-between gap-2">
                <div class="flex items-center">
                    <img class="w-7 h-7 object-contain flex-shrink-0" src="${awayLogo}" alt="${awayName}">
                </div>
                <div class="flex-1 text-left">
                    <span class="block truncate font-medium text-lg"><span class="lg:hidden">${awayAcronym || awayName}</span><span class="hidden lg:inline">${awayName}</span></span>
                </div>
            </div>`;

        return `
            <div class="lg:min-w-[450px] md:min-w-[300px] bg-gray-50 rounded-lg p-4 ${isComplete ? 'border border-green-200' : 'border border-gray-100'}" data-match-complete="${isComplete}" data-match-id="${matchId}">
                <div class="flex gap-2 items-center justify-center">
                    ${leftCol}
                    ${middleCol}
                    ${rightCol}
                </div>
            </div>`;
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
     * Renders the Standings table by delegating to UIRenderer.renderStandings.
     * It populates the table with the current sorted standings list and animates the rows that
     * changed position using FLIP animation.
     * @private
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
            // Compute position changes, but allow suppression on initial load/reset
            const rawChanges = StandingsCalculator.getPositionChanges(sorted, previous);

            // If DataManager requested to skip indicators (first render after load/reset), do not expose changes
            const visibleChanges = {};
            if (!state._skipStandingsIndicators) {
                Object.keys(rawChanges).forEach(id => {
                    const ch = rawChanges[id];
                    if (!ch) return;
                    visibleChanges[id] = ch;
                });
            }

            // Capture previous DOM positions for FLIP animation
            const prevPositions = {};
            try {
                const prevFixed = fixedBody.querySelectorAll('tr[data-team-id]');
                prevFixed.forEach(r => {
                    const id = r.getAttribute('data-team-id');
                    try {
                        const rect = r.getBoundingClientRect();
                        // only record visible rows (height > 0)
                        if (id && rect && rect.height > 0) prevPositions[id] = rect.top;
                    } catch (e) { /* ignore */ }
                });
                const prevScroll = scrollBody.querySelectorAll('tr[data-team-id]');
                prevScroll.forEach(r => {
                    const id = r.getAttribute('data-team-id');
                    try {
                        const rect = r.getBoundingClientRect();
                        if (id && rect && rect.height > 0) prevPositions[id] = rect.top;
                    } catch (e) { /* ignore */ }
                });
            } catch (err) {
                // ignore measurement errors
            }

            fixedBody.innerHTML = '';
            scrollBody.innerHTML = '';

            // Helper: build the small change indicator HTML
            const buildChangeIndicator = (change) => {
                if (!change) return '';
                if (change.direction === 'up') return `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-green-600 font-bold" title="Subiu ${change.positionsChanged} posição(ões)" aria-hidden="true">↑</span>`;
                if (change.direction === 'down') return `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-red-600 font-bold" title="Desceu ${change.positionsChanged} posição(ões)" aria-hidden="true">↓</span>`;
                if (change.direction === 'none' && change.simulated === true) return `<span class="change-indicator absolute w-4 h-4 flex items-center justify-center text-gray-400 font-bold" title="Manteve a posição" aria-hidden="true">-</span>`;
                return '';
            };

            // Helper: create the fixed (left) row
            const createFixedRow = (team, canonical, changeIndicatorHtml) => {
                let badgeClass = '';
                switch (true) {
                    case team.position <= 4:
                        badgeClass = 'text-green-600'; break;
                    case team.position <= 6:
                        badgeClass = 'text-green-300'; break;
                    case team.position <= 12:
                        badgeClass = 'text-blue-600'; break;
                    case team.position <= 16:
                        badgeClass = 'text-gray-400'; break;
                    default:
                        badgeClass = 'text-red-600'; break;
                }
                const row = document.createElement('tr');
                row.classList.add('h-12', 'border-b', 'grid', 'grid-cols-[15%_70%_15%]');
                row.setAttribute('data-team-id', String(team.id));
                row.innerHTML = `
                    <td class="flex items-center justify-center content-center relative">
                        <span class="px-2 py-1 text-xs ${badgeClass}">${team.position}</span>
                    </td>
                    <td class="flex items-center content-center gap-2">
                        <div class="relative w-2 h-6 flex items-center justify-center" aria-hidden="true">
                            ${changeIndicatorHtml}
                        </div>
                        <div class="flex items-center gap-2" data-team-name="${canonical.name || team.name || ''}">
                            <div class="hidden md:flex team-logo">
                                <img class="w-7 h-7 object-contain flex-shrink-0" src="${TeamService.getTeamLogo(canonical, state)}" alt="${canonical.name || ''}">
                            </div>
                            <div>
                                <span class="lg:hidden">${canonical.acronym || team.acronym || canonical.name || team.name || ''}</span>
                                <span class="hidden lg:inline">${canonical.name || team.name || ''}</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-center content-center font-bold">
                        ${team.points}
                    </td>
                `;
                return row;
            };

            // Helper: create the scrollable (right) row
            const createScrollRow = (team) => {
                const row = document.createElement('tr');
                row.classList.add('h-12', 'border-b', 'grid', 'grid-cols-7');
                row.setAttribute('data-team-id', String(team.id));
                row.innerHTML = `
                    <td class="text-sm text-center content-center">${team.games || 0}</td>
                    <td class="text-sm text-center content-center">${team.victories || 0}</td>
                    <td class="text-sm text-center content-center">${team.draws || 0}</td>
                    <td class="text-sm text-center content-center">${team.defeats || 0}</td>
                    <td class="text-sm text-center content-center">${team.goal_pro || 0}</td>
                    <td class="text-sm text-center content-center">${team.goal_against || 0}</td>
                    <td class="text-sm text-center content-center ${team.balance_goals >= 0 ? 'text-green-600' : 'text-red-600'}">${team.balance_goals >= 0 ? '+' : ''}${team.balance_goals || 0}</td>
                `;
                return row;
            };

            // Render rows using helpers
            sorted.forEach((team, idx) => {
                const canonical = TeamService.getTeamById(team.id, state) || team;
                const change = (visibleChanges && visibleChanges[team.id]) || null;
                const changeIndicatorHtml = buildChangeIndicator(change);

                const fixedRow = createFixedRow(team, canonical, changeIndicatorHtml);
                const scrollRow = createScrollRow(team);

                // Determine effective compact mode: only apply compact on small viewports
                const compact = !!state.compactTable && window.innerWidth < 768;
                const topCount = 4;
                const bottomCount = 4;
                const show = !compact || idx < topCount || idx >= sorted.length - bottomCount;
                if (!show) {
                    fixedRow.style.display = 'none';
                    scrollRow.style.display = 'none';
                }

                fixedBody.appendChild(fixedRow);
                scrollBody.appendChild(scrollRow);
            });

            // After rendering, animate rows that changed position using FLIP
            try {
                // build a set of team ids that actually changed position (visibleChanges)
                const changedIds = new Set(Object.keys(visibleChanges || {}));
                Utils.animateFLIP(fixedBody, prevPositions, changedIds);
                Utils.animateFLIP(scrollBody, prevPositions, changedIds);
            } catch (err) {
                // ignore animation errors
            }

            // After rendering, update previous standings snapshot to the new sorted list
            state.previousStandings = JSON.parse(JSON.stringify(sorted || []));

            // Clear the transient skip flag so future renders will show indicators
            if (state._skipStandingsIndicators) {
                state._skipStandingsIndicators = false;
            }

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
