import { MatchService } from "./matchService.js";
import { StandingsCalculator } from "./standingsCalculator.js";
import { state } from "./dataManager.js";

// Match management: simulation and application of results
export const MatchManager = {
    /**
     * Simulates all uncompleted matches in the current round.
     * Each incomplete match is simulated and the result is applied to the standings.
     * If a match result was previously simulated and applied, it is first reversed.
     * The applied result is stored in state.simulatedMatches so that it can be
     * reversed later if needed. The UI is expected to be refreshed by the caller
     * after simulateRound completes.
     */
    simulateRound() {
        if (!state.matches || state.matches.length === 0) return;

        state.matches.forEach((match) => {
            if (!MatchService.isMatchComplete(match)) {
                const result = MatchService.simulateMatch(match);
                // if there was a previously applied result, reverse it first
                if (state.simulatedMatches.has(match.id)) {
                    const prev = state.simulatedMatches.get(match.id);
                    MatchManager._reverseMatchResultByValues(
                        match,
                        prev.homeScore,
                        prev.awayScore
                    );
                }
                match.homeScore = result.homeScore;
                match.awayScore = result.awayScore;

                MatchManager._applyMatchResult(match);
                state.simulatedMatches.set(match.id, {
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                });
            }
        });
    },

    /**
     * Clears all simulated match results in the current round.
     * Reverses any applied results, clears the stored simulation flag, and
     * resets the match scores to empty string.
     * The UI is expected to be refreshed by the caller (UIManager) after
     * clearRound completes.
     */
    clearRound() {
        if (!state.matches) return;

        state.matches.forEach((match) => {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);

                MatchManager._reverseMatchResultByValues(
                    match,
                    prev.homeScore,
                    prev.awayScore
                );
                state.simulatedMatches.delete(match.id);

                match.homeScore = "";
                match.awayScore = "";
            }
        });
        return;
    },

    /**
     * Updates the score of a match in the current round with the given value, applying
     * the result to the standings if both home and away scores are present, or reversing
     * any previously-applied result if either score is removed.
     * The UI is expected to be refreshed by the caller (UIManager) after
     * updateMatchScore completes.
     * @param {number|string} matchId - id of the match to update
     * @param {string} field - either 'homeScore' or 'awayScore' to indicate which score to update
     * @param {number|string} value - the new value for the given score field
     */
    updateMatchScore(matchId, field, value) {
        const match = state.matches.find((m) => String(m.id) === String(matchId));
        if (!match) return;

        if (field === "homeScore") match.homeScore = value;
        if (field === "awayScore") match.awayScore = value;

        // If either field is empty (user cleared), reverse any previously-applied result and stop
        if (match.homeScore === "" || match.awayScore === "") {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);
                MatchManager._reverseMatchResultByValues(
                    match,
                    prev.homeScore,
                    prev.awayScore
                );
                state.simulatedMatches.delete(match.id);
            }
            return;
        }

        // Both fields present — apply result. Reverse previous if present first.
        if (MatchService.isMatchComplete(match)) {
            if (state.simulatedMatches.has(match.id)) {
                const prev = state.simulatedMatches.get(match.id);
                MatchManager._reverseMatchResultByValues(
                    match,
                    prev.homeScore,
                    prev.awayScore
                );
            }
            MatchManager._applyMatchResult(match);
            const applied = MatchService.createMatchResult(match);
            state.simulatedMatches.set(match.id, {
                homeScore: applied.homeScore,
                awayScore: applied.awayScore,
            });
        }
    },

    /**
     * Applies the result of the given match to the current standings.
     * @param {Object} match - a match object with homeScore and awayScore fields
     * @private
     */
    _applyMatchResult(match) {
        // build a matchResult shape and apply it
        const matchResult = MatchService.createMatchResult(match);
        state.standings = StandingsCalculator.processMatchResult(
            state.standings,
            matchResult,
            false
        );
    },

    /**
     * Reverses the standings impact of a previously-applied match result,
     * given the match object and the original home and away scores.
     * @param {Object} match - a match object with homeTeam and awayTeam fields
     * @param {number|string} homeScore - the original home score
     * @param {number|string} awayScore - the original away score
     * @private
     */
    _reverseMatchResultByValues(match, homeScore, awayScore) {
        const matchResult = {
            matchId: match.id,
            homeTeamId: match.homeTeam.id,
            awayTeamId: match.awayTeam.id,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0,
        };
        state.standings = StandingsCalculator.processMatchResult(
            state.standings,
            matchResult,
            true
        );
    },
};
