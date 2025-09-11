import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// Serviço de partidas
export const MatchService = {
    initializeMatch(match) {
        return {
            ...match,
            homeScore: "",
            awayScore: "",
            simulated: false
        };
    },

    isValidScore(score) {
        if (score === "") return true;
        const numValue = parseInt(score);
        return !isNaN(numValue) && numValue >= 0 && numValue <= CONFIG.MAX_GOALS;
    },

    isMatchComplete(match) {
        return match.homeScore !== "" && match.awayScore !== "";
    },

    getMatchResult(homeScore, awayScore) {
        if (homeScore > awayScore) return 'home';
        if (awayScore > homeScore) return 'away';
        return 'draw';
    },

    simulateMatch() {
        return {
            homeScore: Utils.generateRandomScore(),
            awayScore: Utils.generateRandomScore()
        };
    },

    createMatchResult(match) {
        return {
            matchId: match.id,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            homeScore: parseInt(match.homeScore) || 0,
            awayScore: parseInt(match.awayScore) || 0
        };
    }
};
