import { Utils } from "./utils.js";
import { TeamService } from './teamService.js';
import { state } from './dataManager.js';

// Standings calculation and sorting
export const StandingsCalculator = {
    /**
     * Updates the team's stats according to the result of a single match, using the given scores and whether the team is home or away.
     * If the match is a simulated match, the multiplier parameter can be used to multiply the effects of the match on the team's stats.
     * @param {Object} team - The team object to update.
     * @param {Number} homeScore - The score of the home team.
     * @param {Number} awayScore - The score of the away team.
     * @param {Boolean} isHomeTeam - Whether the team is the home team or not.
     * @param {Number} [multiplier=1] - The multiplier to apply to the stats changes (default is 1).
     * @returns {Object} The updated team object.
     */
    updateTeamStats(team, homeScore, awayScore, isHomeTeam, multiplier = 1) {
        const updatedTeam = Utils.deepClone(team);
        const goalsFor = isHomeTeam ? homeScore : awayScore;
        const goalsAgainst = isHomeTeam ? awayScore : homeScore;
        updatedTeam.games += 1 * multiplier;
        updatedTeam.goal_pro += goalsFor * multiplier;
        updatedTeam.goal_against =
            (updatedTeam.goal_against || 0) + goalsAgainst * multiplier;
        updatedTeam.balance_goals = updatedTeam.goal_pro - updatedTeam.goal_against;
        let result;
        if (homeScore > awayScore) {
            result = isHomeTeam ? "win" : "loss";
        } else if (awayScore > homeScore) {
            result = isHomeTeam ? "loss" : "win";
        } else {
            result = "draw";
        }
        this.updateResultStats(updatedTeam, result, multiplier);
        return updatedTeam;
    },

    /**
     * Updates the team's stats according to the result of a single match.
     * @param {Object} team - The team object to update.
     * @param {String} result - The result of the match, one of "win", "loss" or "draw".
     * @param {Number} [multiplier=1] - The multiplier to apply to the stats changes (default is 1).
     */
    updateResultStats(team, result, multiplier) {
        switch (result) {
            case "win":
                team.victories += 1 * multiplier;
                team.points += 3 * multiplier;
                break;
            case "loss":
                team.defeats = (team.defeats || 0) + 1 * multiplier;
                break;
            case "draw":
                team.draws = (team.draws || 0) + 1 * multiplier;
                team.points += 1 * multiplier;
                break;
        }
    },


    /**
     * Sorts the given array of team standings objects in descending order, according to
     * the following rules, in order of priority:
     * 1. Points
     * 2. Victories
     * 3. Goal Balance
     * 4. Goals For
     * 5. Goals Against
     * 6. Team Name
     * Returns a new array with the sorted teams, with each team having a new 'position' property
     * set according to its position in the sorted array.
     * @param {Array<Object>} standings - the array of team standings objects to sort
     * @returns {Array<Object>} - the sorted team standings array
     */
    sortStandings(standings) {
        return [...standings]
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.victories !== a.victories) return b.victories - a.victories;
                if (b.balance_goals !== a.balance_goals)
                    return b.balance_goals - a.balance_goals;
                if (b.goal_pro !== a.goal_pro) return b.goal_pro - a.goal_pro;
                const aGoalsAgainst = a.goal_against || 0;
                const bGoalsAgainst = b.goal_against || 0;
                if (aGoalsAgainst !== bGoalsAgainst)
                    return aGoalsAgainst - bGoalsAgainst;
                // Tie-breaker by canonical team name
                try {
                    const aMeta = TeamService.getTeamById(a.id, state) || a;
                    const bMeta = TeamService.getTeamById(b.id, state) || b;
                    const aName = (aMeta && aMeta.name) ? aMeta.name : (a.name || '');
                    const bName = (bMeta && bMeta.name) ? bMeta.name : (b.name || '');
                    return aName.localeCompare(bName);
                } catch (err) {
                    return (a.name || '').localeCompare(b.name || '');
                }
            })
            .map((team, index) => ({ ...team, position: index + 1 }));
    },

    /**
     * Updates the standings array given a match result, by updating the stats of the
     * two teams involved in the match, and then sorting the array again.
     * @param {Array<Object>} standings - the array of team standings objects
     * @param {Object} matchResult - an object with the following properties:
     *   - homeTeamId: the id of the home team
     *   - awayTeamId: the id of the away team
     *   - homeScore: the score of the home team
     *   - awayScore: the score of the away team
     * @param {boolean} isReversing - whether or not this is a reversal of a previously
     *   applied match result. If true, the match result is "undone" instead of "done".
     *   Defaults to false.
     * @returns {Array<Object>} the updated standings array
     */
    processMatchResult(standings, matchResult, isReversing = false) {
        const { homeTeamId, awayTeamId, homeScore, awayScore } = matchResult;
        const multiplier = isReversing ? -1 : 1;
        const newStandings = standings.map((team) => {
            if (team.id === homeTeamId) {
                return this.updateTeamStats(
                    team,
                    homeScore,
                    awayScore,
                    true,
                    multiplier
                );
            }
            if (team.id === awayTeamId) {
                return this.updateTeamStats(
                    team,
                    homeScore,
                    awayScore,
                    false,
                    multiplier
                );
            }
            return team;
        });
        return this.sortStandings(newStandings);
    },

    /**
     * Computes the position changes for each team between the old and new standings arrays.
     * Returns an object where the keys are the team ids and the values are objects with two properties:
     * - direction: one of "up", "down" or "none", indicating whether the team went up or down in the standings or not.
     * - positionsChanged: the number of positions the team changed in the standings.
     * @param {Array<Object>} newStandings - the new standings array
     * @param {Array<Object>} oldStandings - the old standings array
     * @returns {Object} - an object with the position changes for each team
     */
    getPositionChanges(newStandings, oldStandings) {
        const changes = {};
        const oldPositions = {};
        oldStandings.forEach((team) => {
            oldPositions[team.id] = team.position;
        });

        // Prepare a set of simulated match ids for quick lookup
        const simulatedMatchIds = new Set();
        try {
            if (state && state.simulatedMatches && typeof state.simulatedMatches.forEach === 'function') {
                state.simulatedMatches.forEach((v, k) => simulatedMatchIds.add(String(k)));
            }
        } catch (err) {
            // ignore
        }
        newStandings.forEach((team) => {
            const oldPosition = oldPositions[team.id];
            if (oldPosition !== undefined) {
                // determine if this team was involved in any simulated match
                let simulatedAffected = false;
                try {
                    if (simulatedMatchIds.size > 0 && state && Array.isArray(state.matches)) {
                        for (const mid of simulatedMatchIds) {
                            const m = state.matches.find(x => String(x.id) === String(mid));
                            if (m) {
                                const hid = m.homeTeam && m.homeTeam.id;
                                const aid = m.awayTeam && m.awayTeam.id;
                                if (String(hid) === String(team.id) || String(aid) === String(team.id)) {
                                    simulatedAffected = true;
                                    break;
                                }
                            }
                        }
                    }
                } catch (err) {
                    simulatedAffected = false;
                }

                if (team.position !== oldPosition) {
                    changes[team.id] = {
                        direction: team.position < oldPosition ? "up" : "down",
                        positionsChanged: Math.abs(team.position - oldPosition),
                        simulated: simulatedAffected,
                    };
                } else {
                    changes[team.id] = {
                        direction: "none",
                        positionsChanged: 0,
                        simulated: simulatedAffected,
                    };
                }
            }
        });
        return changes;
    },
};
