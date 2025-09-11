import { MatchService } from './matchService.js';
import { StandingsCalculator } from './standingsCalculator.js';
import { state } from './dataManager.js';

// Gerenciamento de partidas: simulação e aplicação de resultados
export const MatchManager = {
    simulateRound() {
        if (!state.matches || state.matches.length === 0) return;
        // simulate each match that doesn't have a result
        state.matches.forEach(match => {
            if (!MatchService.isMatchComplete(match)) {
                const result = MatchService.simulateMatch(match);
                // if there was a previously applied result, reverse it first
                if (state.simulatedMatches.has(match.id)) {
                    const prev = state.simulatedMatches.get(match.id);
                    MatchManager._reverseMatchResultByValues(match, prev.homeScore, prev.awayScore);
                }
                match.homeScore = result.homeScore;
                match.awayScore = result.awayScore;
                // apply to standings
                MatchManager._applyMatchResult(match);
                // store applied result
                state.simulatedMatches.set(match.id, { homeScore: match.homeScore, awayScore: match.awayScore });
            }
        });
    // UI will be refreshed by caller (UIManager) after simulateRound completes
    },

    clearRound() {
        if (!state.matches) return;
        // reverse any applied results for this round
        state.matches.forEach(match => {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);
                // reverse the stored result
                MatchManager._reverseMatchResultByValues(match, prev.homeScore, prev.awayScore);
                // clear stored flag
                state.simulatedMatches.delete(match.id);
                // clear inputs to empty string (null/empty state)
                match.homeScore = "";
                match.awayScore = "";
            }
        });
    // UI will be refreshed by caller (UIManager) after clearRound completes
    return;
    },

    updateMatchScore(matchId, field, value) {
        const match = state.matches.find(m => String(m.id) === String(matchId));
        if (!match) return;
        // set the value
        if (field === 'homeScore') match.homeScore = value;
        if (field === 'awayScore') match.awayScore = value;

        // If either field is empty (user cleared), reverse any previously-applied result and stop
        if (match.homeScore === "" || match.awayScore === "") {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);
                MatchManager._reverseMatchResultByValues(match, prev.homeScore, prev.awayScore);
                state.simulatedMatches.delete(match.id);
            }
            // UI will be refreshed by caller
            return;
        }

        // Both fields present — apply result. Reverse previous if present first.
        if (MatchService.isMatchComplete(match)) {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);
                MatchManager._reverseMatchResultByValues(match, prev.homeScore, prev.awayScore);
            }
            MatchManager._applyMatchResult(match);
            const applied = MatchService.createMatchResult(match);
            state.simulatedMatches.set(match.id, { homeScore: applied.homeScore, awayScore: applied.awayScore });
            // UI will be refreshed by caller
        }
    },

    _applyMatchResult(match) {
        // build a matchResult shape and apply it
        const matchResult = MatchService.createMatchResult(match);
        state.standings = StandingsCalculator.processMatchResult(state.standings, matchResult, false);
    },
    _reverseMatchResultByValues(match, homeScore, awayScore) {
        const matchResult = {
            matchId: match.id,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0
        };
        state.standings = StandingsCalculator.processMatchResult(state.standings, matchResult, true);
    }
};