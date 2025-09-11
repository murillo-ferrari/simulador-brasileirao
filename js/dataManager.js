import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { TeamService } from './teamService.js';
import { MatchService } from './matchService.js';

// Gerenciamento de dados
export const state = {
	standings: [],
	currentRound: CONFIG.MIN_ROUND,
	matches: [],
	loading: true,
	simulatedMatches: new Map(),
	allMatches: {},
	initialStandings: []
};

// Carregamento dos dados via fetch dos arquivos JSON
export const DataManager = {
	async loadData() {
		try {
			const [standingsRes, fixturesRes] = await Promise.all([
				fetch('data/initial_standings.json'),
				fetch('data/round_fixtures.json')
			]);
			if (!standingsRes.ok || !fixturesRes.ok) {
				console.error('DataManager: fetch failed', standingsRes.status, fixturesRes.status);
				throw new Error('Fetch failed');
			}
			const initialStandings = await standingsRes.json();
			const roundFixtures = await fixturesRes.json();
			state.initialStandings = Utils.deepClone(initialStandings);
			state.standings = state.initialStandings.map(team => TeamService.ensureTeamStats(team));
			state.allMatches = Object.keys(roundFixtures).reduce((acc, round) => {
				acc[round] = roundFixtures[round].matches.map(MatchService.initializeMatch);
				return acc;
			}, {});
			state.matches = state.allMatches[state.currentRound] || [];
			return true;
		} catch (e) {
			console.error('DataManager.loadData error:', e);
			alert('Erro ao carregar dados iniciais. Veja o console para detalhes.');
			return false;
		}
	},
	resetChampionship() {
		if (confirm('Tem certeza que deseja resetar todo o campeonato? Todos os resultados serão perdidos.')) {
			state.simulatedMatches.clear();
			state.currentRound = CONFIG.MIN_ROUND;
			return this.loadData();
		}
		return Promise.resolve(false);
	}
};