import { CONFIG } from "./config.js";
import { Utils } from "./utils.js";

// Match services: initialization, validation, simulation, result creation
export const MatchService = {
    /**
     * Initialize a match with scores and simulated flag
     * @param {Object} match - Match object to be initialized
     * @returns {Object} Initialized match object
     */
    initializeMatch(match) {
        return {
            ...match,
            homeScore: "",
            awayScore: "",
            simulated: false,
        };
    },

    /**
     * Checks if a given score is valid.
     * A score is valid if it is empty, or if it is a number between 0 and MAX_GOALS.
     * @param {string} score - The score to be validated
     * @returns {boolean} True if the score is valid, false otherwise
     */
    isValidScore(score) {
        if (score === "") return true;
        const numValue = parseInt(score);
        return !isNaN(numValue) && numValue >= 0 && numValue <= CONFIG.MAX_GOALS;
    },

    /**
     * Checks if a given match is complete.
     * A match is complete if both the home and away scores are non-empty.
     * @param {Object} match - The match to be checked
     * @returns {boolean} True if the match is complete, false otherwise
     */
    isMatchComplete(match) {
        return match.homeScore !== "" && match.awayScore !== "";
    },

    /**
     * Given home and away scores, returns the result of the match as one of "home", "away", or "draw"
     * @param {number} homeScore - The score of the home team
     * @param {number} awayScore - The score of the away team
     * @returns {string} The result of the match
     */
    getMatchResult(homeScore, awayScore) {
        if (homeScore > awayScore) return "home";
        if (awayScore > homeScore) return "away";
        return "draw";
    },

    /**
     * Simulates a match by generating random scores for the home and away teams.
     * The scores are generated using a weighted distribution to make the results more
     * realistic.
     * @returns {Object} An object containing the simulated scores for the home and away teams.
     */
    simulateMatch() {
        return {
            homeScore: Utils.generateRandomScore(),
            awayScore: Utils.generateRandomScore(),
        };
    },

    /**
     * Creates a match result object from a given match.
     * @param {Object} match - The match object to be converted
     * @returns {Object} The match result object
     */
    createMatchResult(match) {
        return {
            matchId: match.id,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            homeScore: parseInt(match.homeScore) || 0,
            awayScore: parseInt(match.awayScore) || 0,
        };
    },
};
