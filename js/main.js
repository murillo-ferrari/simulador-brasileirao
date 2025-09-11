	// Use ES module imports. main.js becomes the single entrypoint; include it in index.html as
	// <script type="module" src="js/main.js"></script>
	import { CONFIG } from './config.js';
	import { UIManager, setupEventListeners } from './uiManager.js';
	import { state, DataManager } from './dataManager.js';

	// Inicialização do app e eventos (preservada)
	async function init() {
		try {
				// ensure currentRound default
				state.currentRound = state.currentRound || CONFIG.MIN_ROUND;
				if (UIManager && typeof UIManager.showLoading === 'function') UIManager.showLoading();
				const ok = await DataManager.loadData();
				if (!ok) {
					if (UIManager && typeof UIManager.hideLoading === 'function') UIManager.hideLoading();
					return;
				}
				if (typeof setupEventListeners === 'function') setupEventListeners();
				// render initial UI
				if (UIManager && typeof UIManager.renderStandings === 'function') UIManager.renderStandings();
				if (UIManager && typeof UIManager.renderMatches === 'function') UIManager.renderMatches();
				if (UIManager && typeof UIManager.hideLoading === 'function') UIManager.hideLoading();

			// Atalhos úteis no console
			console.table([
				{ shortcut: 'Ctrl + ←', description: 'Rodada anterior' },
				{ shortcut: 'Ctrl + →', description: 'Próxima rodada' },
				{ shortcut: 'Ctrl + Shift + S', description: 'Simular rodada' },
				{ shortcut: 'Ctrl + Shift + D', description: 'Limpar rodada' }
			], ['shortcut', 'description'], { columns: { index: false } });
		} catch (error) {
			console.error('Erro na inicialização:', error);
			alert('Erro ao carregar o simulador. Recarregue a página.');
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => init());
	} else {
		init();
	}
