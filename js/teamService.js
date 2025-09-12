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
        if (!state || !Array.isArray(state.standings)) return null;
        return state.standings.find(team => team.id === id || team.name === id);
    },

    /**
     * Returns the URL of the team's logo.
     * @param {object} team - team
     * @returns {string} - URL of the team's logo
     */
    getTeamLogo(team) {
        return team && team.image ? team.image : '';
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
