// Team data management and validation
export const TeamService = {
    /**
     * Returns a team object matching the given id or name from the state standings.
     * Returns null if the team is not found or if the state is not valid.
     * @param {number|string} id - id or name of the team
     * @param {object} state - state object containing standings
     * @returns {object|null} - team object matching the given id or name, or null
     */
    getTeamById(id, state) {
        if (!state) return null;
        // Try canonical teams list first
        if (Array.isArray(state.teams)) {
            const found = state.teams.find(team => team.id === id || team.name === id);
            if (found) {
                // merge with standings stats if available
                if (Array.isArray(state.standings)) {
                    const standing = state.standings.find(s => s.id === id);
                    return standing ? { ...found, ...standing } : { ...found };
                }
                return { ...found };
            }
        }
        // Fallback to standings-only entry (may lack metadata but contains stats)
        if (Array.isArray(state.standings)) {
            const st = state.standings.find(team => team.id === id || team.name === id);
            return st || null;
        }
        return null;
    },


    /**
     * Returns the logo URL of a team given its id or name.
     * If the team is not found in the state, it returns an empty string.
     * If the team does not have an image, it returns an empty string.
     * @param {(number|string)} teamOrId - id or name of the team
     * @param {object} state - state object containing Standing
     * @returns {string} - the logo URL of the team, or an empty string if not found
     */
    getTeamLogo(teamOrId, state) {
        if (!teamOrId) return '';
        let teamObj = null;
        if (typeof teamOrId === 'number' || typeof teamOrId === 'string') {
            if (!state) return '';
            teamObj = this.getTeamById(Number(teamOrId), state) || this.getTeamById(teamOrId, state);
        } else {
            teamObj = teamOrId;
            if ((!teamObj || !teamObj.image) && state && teamObj && teamObj.id) {
                teamObj = this.getTeamById(teamObj.id, state) || teamObj;
            }
        }
        return teamObj && teamObj.image ? teamObj.image : '';
    },

    /**
     * Returns an object with all the team's statistics, ensuring that
     * all fields are present, including those that may be zero
     * (defeats, draws and goals against). In addition, it calculates the balance of
     * goals.
     * @param {object} team - team
     * @returns {object} - object with all the team's statistics
     */
    ensureTeamStats(team) {
        return {
            defeats: 0,
            draws: 0,
            goal_against: 0,
            ...team,
            balance_goals: team.goal_pro - (team.goal_against || 0)
        };
    },

    /**
     * Validates if the team object has all the required fields.
     * @param {object} team - team
     * @returns {boolean} - true if the team has all the required fields, false otherwise
     */
    validateTeamData(team) {
        const requiredFields = ['id', 'name', 'points', 'games', 'victories'];
        return requiredFields.every(field => team.hasOwnProperty(field));
    }
};
