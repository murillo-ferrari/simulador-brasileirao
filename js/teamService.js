// Serviço de times
export const TeamService = {
    /**
     * Retorna o time com o id ou nome igual ao especificado.
     * @param {number|string} id - id ou nome do time
     * @returns {object|null} - time encontrado ou null se não for encontrado
     */
    getTeamById(id, state) {
        if (!state || !Array.isArray(state.standings)) return null;
        return state.standings.find(team => team.id === id || team.name === id);
    },

    /**
     * Retorna a URL da logo do time.
     * @param {object} team - time
     * @returns {string} - URL da logo do time
     */
    getTeamLogo(team) {
        return team && team.image ? team.image : '';
    },

    /**
     * Retorna um objeto com todas as estatísticas do time, garantindo que
     * todos os campos estejam presentes, incluindo os que podem ser zero
     * (derrotas, empates e gols contra). Além disso, calcula o saldo de
     * gols.
     * @param {object} team - time
     * @returns {object} - objeto com todas as estatísticas do time
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
     * Valida se o objeto do time tem todos os campos necessários.
     * @param {object} team - time
     * @returns {boolean} - true se o time tiver todos os campos necess rios, false caso contr rio
     */
    validateTeamData(team) {
        const requiredFields = ['id', 'name', 'points', 'games', 'victories'];
        return requiredFields.every(field => team.hasOwnProperty(field));
    }
};
