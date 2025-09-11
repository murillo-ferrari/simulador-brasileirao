import { Utils } from './utils.js';

// Calculadora de classificação
export const StandingsCalculator = {
    updateTeamStats(team, homeScore, awayScore, isHomeTeam, multiplier = 1) {
        const updatedTeam = Utils.deepClone(team);
        const goalsFor = isHomeTeam ? homeScore : awayScore;
        const goalsAgainst = isHomeTeam ? awayScore : homeScore;
        updatedTeam.games += (1 * multiplier);
        updatedTeam.goal_pro += (goalsFor * multiplier);
        updatedTeam.goal_against = (updatedTeam.goal_against || 0) + (goalsAgainst * multiplier);
        updatedTeam.balance_goals = updatedTeam.goal_pro - updatedTeam.goal_against;
        let result;
        if (homeScore > awayScore) {
            result = isHomeTeam ? 'win' : 'loss';
        } else if (awayScore > homeScore) {
            result = isHomeTeam ? 'loss' : 'win';
        } else {
            result = 'draw';
        }
        this.updateResultStats(updatedTeam, result, multiplier);
        return updatedTeam;
    },

    updateResultStats(team, result, multiplier) {
        switch (result) {
            case 'win':
                team.victories += (1 * multiplier);
                team.points += (3 * multiplier);
                break;
            case 'loss':
                team.defeats = (team.defeats || 0) + (1 * multiplier);
                break;
            case 'draw':
                team.draws = (team.draws || 0) + (1 * multiplier);
                team.points += (1 * multiplier);
                break;
        }
    },

    sortStandings(standings) {
        return [...standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.victories !== a.victories) return b.victories - a.victories;
            if (b.balance_goals !== a.balance_goals) return b.balance_goals - a.balance_goals;
            if (b.goal_pro !== a.goal_pro) return b.goal_pro - a.goal_pro;
            const aGoalsAgainst = a.goal_against || 0;
            const bGoalsAgainst = b.goal_against || 0;
            if (aGoalsAgainst !== bGoalsAgainst) return aGoalsAgainst - bGoalsAgainst;
            return a.name.localeCompare(b.name);
        }).map((team, index) => ({ ...team, position: index + 1 }));
    },

    processMatchResult(standings, matchResult, isReversing = false) {
        const { homeTeamId, awayTeamId, homeScore, awayScore } = matchResult;
        const multiplier = isReversing ? -1 : 1;
        const newStandings = standings.map(team => {
            if (team.id === homeTeamId) {
                return this.updateTeamStats(team, homeScore, awayScore, true, multiplier);
            }
            if (team.id === awayTeamId) {
                return this.updateTeamStats(team, homeScore, awayScore, false, multiplier);
            }
            return team;
        });
        return this.sortStandings(newStandings);
    },

    getPositionChanges(newStandings, oldStandings) {
        const changes = {};
        const oldPositions = {};
        oldStandings.forEach(team => {
            oldPositions[team.id] = team.position;
        });
        newStandings.forEach(team => {
            const oldPosition = oldPositions[team.id];
            if (oldPosition !== undefined) {
                if (team.position !== oldPosition) {
                    changes[team.id] = {
                        direction: team.position < oldPosition ? 'up' : 'down',
                        positionsChanged: Math.abs(team.position - oldPosition)
                    };
                } else {
                    changes[team.id] = {
                        direction: 'none',
                        positionsChanged: 0
                    };
                }
            }
        });
        return changes;
    }
};
