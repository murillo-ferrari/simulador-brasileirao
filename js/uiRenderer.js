// Renderização de UI
import { TeamService } from './teamService.js';
import { MatchService } from './matchService.js';
import { CONFIG } from './config.js';
import { state } from './dataManager.js';

export const UIRenderer = {
    
    /**
     * Renders a table row for a team in the standings.
     * If `positionChanges` is provided, it will display an indicator
     * of the position change, if any.
     * @param {Object} team - an object with the team's data
     * @param {Object} [positionChanges] - an object with the position changes
     *   for each team, if any. Each key is the team ID and the value is an
     *   object with the properties `direction` and `positionsChanged`.
     * @returns {string} the HTML for the table row
     */
    renderStandingRow(team, positionChanges = {}) {
        const change = positionChanges[team.id];
        let changeIndicator = '';
        if (change) {
            if (change.direction === 'up') {
                changeIndicator = `<span class="absolute -left-6 w-4 h-4 flex items-center justify-center animate-bounce text-green-600 font-bold" title="Subiu ${change.positionsChanged} posição(ões)">↑</span>`;
            } else if (change.direction === 'down') {
                changeIndicator = `<span class="absolute -left-6 w-4 h-4 flex items-center justify-center animate-bounce text-red-600 font-bold" title="Desceu ${change.positionsChanged} posição(ões)">↓</span>`;
            } else if (change.direction === 'none') {
                changeIndicator = `<span class="absolute -left-6 w-4 h-4 flex items-center justify-center text-gray-400 font-bold" title="Manteve a posição">−</span>`;
            }
        }
        let badgeClass = '';
        switch (true) {
            case team.position <= 4:
                badgeClass = 'bg-green-100 text-green-800'; break;
            case team.position <= 6:
                badgeClass = 'bg-blue-100 text-blue-800'; break;
            case team.position <= 12:
                badgeClass = 'bg-orange-100 text-orange-800'; break;
            case team.position <= 16:
                badgeClass = 'bg-gray-100 text-gray-700'; break;
            default:
                badgeClass = 'bg-red-100 text-red-800'; break;
        }
        return `
            <td>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass}">
                    ${team.position}
                </span>
            </td>
            <td>
                <div class="relative flex items-center gap-2">
                    ${changeIndicator}
                    <img class="w-8 h-8 object-contain" src="${TeamService.getTeamLogo(team)}" alt="${team.name}">
                    <div>${team.name}</div>
                </div>
            </td>
            <td class="text-center font-bold">${team.points ?? 0}</td>
            <td class="text-center"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.games ?? 0}</span></td>
            <td class="text-center text-green-600"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.victories ?? 0}</span></td>
            <td class="text-center text-yellow-600"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.draws ?? 0}</span></td>
            <td class="text-center text-red-600"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.defeats ?? 0}</span></td>
            <td class="text-center"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.goal_pro ?? 0}</span></td>
            <td class="text-center"><span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${team.goal_against ?? 0}</span></td>
            <td class="text-center ${ (team.balance_goals ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' }">
                <span class="block max-w-[3rem] overflow-x-auto whitespace-nowrap">${ (team.balance_goals ?? 0) > 0 ? '+' : '' }${team.balance_goals ?? 0}</span>
            </td>
        `;
    },

    renderMatchCard(match) {
    const homeTeam = TeamService.getTeamById(match.homeTeam.id, state) || match.homeTeam;
    const awayTeam = TeamService.getTeamById(match.awayTeam.id, state) || match.awayTeam;
        const matchId = match.id;
        const isComplete = MatchService.isMatchComplete(match);
        return `
            <div class="bg-gray-50 rounded-lg p-1 border border-gray-200 mb-2 ${isComplete ? 'ring-2 ring-green-200' : ''}" data-match-complete="${isComplete}" data-match-id="${matchId}">
                <div class="flex gap-2 items-center">
                    <div class="flex min-w-[9.375rem] items-center justify-between">
                        <span class="flex-1 text-right pr-5">${homeTeam.name}</span>
                        <img class="w-8 h-8 object-contain" src="${TeamService.getTeamLogo(homeTeam)}" alt="${homeTeam.name}">
                    </div>
                    <div class="flex items-center gap-2 my-2">
                        <input type="number" min="0" max="${CONFIG.MAX_GOALS}" value="${match.homeScore ?? ''}" id="home-score-${matchId}" data-match-id="${matchId}" data-field="homeScore" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Placar do ${homeTeam.name}">
                        <span aria-hidden="true">×</span>
                        <input type="number" min="0" max="${CONFIG.MAX_GOALS}" value="${match.awayScore ?? ''}" id="away-score-${matchId}" data-match-id="${matchId}" data-field="awayScore" class="match-input w-12 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Placar do ${awayTeam.name}">
                    </div>
                    <div class="flex min-w-[9.375rem] items-center justify-between">
                        <img class="w-8 h-8 object-contain" src="${TeamService.getTeamLogo(awayTeam)}" alt="${awayTeam.name}">
                        <span class="flex-1 text-left pl-5">${awayTeam.name}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderEmptyMatches() {
        return `
            <div class="flex flex-col items-center justify-center p-8 text-gray-400">
                <svg class="w-12 h-12 opacity-50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <p>Nenhum jogo disponível para esta rodada</p>
            </div>
        `;
    }
};
