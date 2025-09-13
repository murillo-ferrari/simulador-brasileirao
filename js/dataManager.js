import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { TeamService } from './teamService.js';
import { MatchService } from './matchService.js';
import { UIManager } from './uiManager.js';

// Data state management
export const state = {
	standings: [],
	currentRound: CONFIG.MIN_ROUND,
	currentRoundDate: null,
	matches: [],
	loading: true,
	simulatedMatches: new Map(),
	allMatches: {},
	initialStandings: [],
	previousStandings: [],
	teams: []
};

// DataManager handles loading and resetting data 
export const DataManager = {
	/**
	 * Loads the initial data for the simulator by fetching the initial standings
	 * and round fixtures from JSON files. If the fetches are successful, it will
	 * set the state properties accordingly and return true. Otherwise, it will
	 * log an error, alert the user and return false.
	 * @async
	 * @function
	 * @returns {Promise<boolean>}
	 * @since 0.1.0
	 */
	async loadData() {
		try {
			const [standingsRes, fixturesRes, teamsRes] = await Promise.all([
				fetch('data/initial_standings.json'),
				fetch('data/round_fixtures.json'),
				fetch('data/teams.json')
			]);
			if (!standingsRes.ok || !fixturesRes.ok) {
				console.error('DataManager: fetch failed', standingsRes.status, fixturesRes.status);
				throw new Error('Fetch failed');
			}
			const initialStandings = await standingsRes.json();
			const roundFixtures = await fixturesRes.json();
			let teamsList = [];
			if (teamsRes && teamsRes.ok) {
				try {
					teamsList = await teamsRes.json();
				} catch (err) {
					console.warn('DataManager: failed to parse teams.json', err);
					teamsList = [];
				}
			} else {
				teamsList = [];
			}
			state.teams = teamsList || [];
			state.initialStandings = Utils.deepClone(initialStandings);
			state.standings = state.initialStandings.map(team => TeamService.ensureTeamStats(team));
			// initialize previousStandings snapshot
			state.previousStandings = JSON.parse(JSON.stringify(state.standings || []));
			// Store the date for each round in allMatches as a property
			state.allMatches = Object.keys(roundFixtures).reduce((acc, round) => {
				const matches = roundFixtures[round].matches.map(MatchService.initializeMatch);
				// Attach the date to the array as a property
				matches.date = roundFixtures[round].date || '';
				acc[round] = matches;
				return acc;
			}, {});
			// Set matches for the current round and set the round date
			state.matches = state.allMatches[state.currentRound] || [];
			state.currentRoundDate = (roundFixtures[state.currentRound] && roundFixtures[state.currentRound].date) || '';
			// Inform UIManager so it can update round title/date immediately
			if (typeof UIManager !== 'undefined' && UIManager && typeof UIManager.updateRoundInfo === 'function') {
				UIManager.updateRoundInfo(state.currentRound, state.currentRoundDate);
			}
			return true;
		} catch (e) {
			console.error('DataManager.loadData error:', e);
			alert('Erro ao carregar dados iniciais. Veja o console para detalhes.');
			return false;
		}
	},
	
	/**
	 * Resets the entire championship state to its initial state by clearing all simulated matches
	 * and setting the current round to the minimum round. If the user confirms the reset,
	 * it will also reload the data from the JSON files and return the result of the loadData
	 * function. Otherwise, it will return a rejected promise.
	 * @since 0.1.0
	 * @returns {Promise<boolean>}
	 */
	resetChampionship() {
		if (confirm('Tem certeza que deseja resetar todo o campeonato? Todos os resultados serão perdidos.')) {
			state.simulatedMatches.clear();
			state.currentRound = CONFIG.MIN_ROUND;

			// Reset UI round title and date via UIManager
			if (UIManager && typeof UIManager.resetRoundInfo === 'function') UIManager.resetRoundInfo();

			return this.loadData();
		}
		return Promise.resolve(false);
	}
};