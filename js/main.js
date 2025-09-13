// Use ES module imports. main.js becomes the single entrypoint; include it in index.html as
// <script type="module" src="js/main.js"></script>
import { CONFIG } from "./config.js";
import { UIManager, setupEventListeners } from "./uiManager.js";
import { state, dataManager } from "./dataManager.js";

/**
 * Initializes the app by loading data and setting up event listeners. If the
 * loading is successful, it renders the initial UI (standings and matches) and
 * hides the loading overlay. Additionally, it logs a table with useful shortcuts
 * available in the console.
 * @async
 * @function
 * @since 0.1.0
 */
async function init() {
	try {
		// Ensure currentRound default
		state.currentRound = state.currentRound || CONFIG.MIN_ROUND;
		if (UIManager && typeof UIManager.showLoading === "function")
			UIManager.showLoading();

		const ok = await dataManager.loadData();
		if (!ok) {
			if (UIManager && typeof UIManager.hideLoading === "function")
				UIManager.hideLoading();
			return;
		}
		// setup event listeners
		if (typeof setupEventListeners === "function") setupEventListeners();
		// ensure UI shows the loaded round title and date
		if (UIManager && typeof UIManager.updateRoundInfo === "function") {
			UIManager.updateRoundInfo(state.currentRound, state.currentRoundDate);
		}

		// render initial UI
		if (UIManager && typeof UIManager.renderStandings === "function")
			UIManager.renderStandings();
		if (UIManager && typeof UIManager.renderMatches === "function")
			UIManager.renderMatches();
		if (UIManager && typeof UIManager.hideLoading === "function")
			UIManager.hideLoading();

		// Log useful shortcuts
		console.table(
			[
				{ shortcut: "Ctrl + ←", description: "Rodada anterior" },
				{ shortcut: "Ctrl + →", description: "Próxima rodada" },
				{ shortcut: "Ctrl + Shift + S", description: "Simular rodada" },
				{ shortcut: "Ctrl + Shift + D", description: "Limpar rodada" },
			],
			["shortcut", "description"],
			{ columns: { index: false } }
		);
	} catch (error) {
		console.error("Erro na inicialização:", error);
		alert("Erro ao carregar o simulador. Recarregue a página.");
	}
}

// Initialize app on DOM ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => init());
} else {
	init();
}
