import { CONFIG } from './config.js';

// Utility functions
let _currentHighlightedMatchId = null;

export const Utils = {
    /**
     * Highlights the given team IDs in both standings tables (fixed and scrollable), tracking the matchId.
     * @param {string[]|number[]} teamIds - Array of team IDs to highlight
     * @param {string|number} matchId - The matchId for which highlight is being applied
     */
    highlightTeamsInStandings: function(teamIds, matchId) {
        _currentHighlightedMatchId = matchId;
        const bodies = [
            document.getElementById('standings-fixed-body'),
            document.getElementById('standings-scroll-body')
        ];
        bodies.forEach(body => {
            if (!body) return;
            [...body.querySelectorAll('tr[data-team-id]')].forEach(row => {
                if (teamIds.includes(row.getAttribute('data-team-id')) || teamIds.includes(Number(row.getAttribute('data-team-id')))) {
                    row.classList.add('highlighted-team', 'bg-gray-100', 'transition-colors')
                }
            });
        });
    },

    /**
     * Removes highlights only if the matchId matches the currently highlighted one.
     * @param {string|number} matchId - The matchId for which highlight should be removed
     */
    removeTeamHighlights: function(matchId) {
        if (_currentHighlightedMatchId !== null && String(_currentHighlightedMatchId) !== String(matchId)) {
            // Don't remove highlight if focus is still within the same match
            return;
        }
        _currentHighlightedMatchId = null;
        const bodies = [
            document.getElementById('standings-fixed-body'),
            document.getElementById('standings-scroll-body')
        ];
        bodies.forEach(body => {
            if (!body) return;
            [...body.querySelectorAll('tr[data-team-id]')].forEach(row => {
                row.classList.remove('highlighted-team', 'bg-gray-100', 'transition-colors')
            });
        });
    },

    /**
     * Generates a random score between 0 and 6, with a given weight distribution.
     * The weights are:
     * - 0: 30%
     * - 1: 25%
     * - 2: 20%
     * - 3: 15%
     * - 4: 5%
     * - 5: 3%
     * - 6: 2%
     * @returns {number} A random score between 0 and 6.
     */
    generateRandomScore() {
        const weights = [0.3, 0.25, 0.2, 0.15, 0.05, 0.03, 0.02];
        const random = Math.random();
        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) return i;
        }
        return 0;
    },

    /**
     * Performs a deep clone of the given object.
     * @param {object} obj The object to clone.
     * @returns {object} The cloned object.
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Returns a debounced version of the given function.
     * The given function will be invoked after `wait` milliseconds since the last time it was invoked.
     * @param {function} func The function to debounce.
     * @param {number} wait The number of milliseconds to wait before invoking the function.
     * @returns {function} The debounced function.
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Animates the FLIP (First-Layout-In-Paint) effect for the given container,
     * by comparing the current position of each row with the previous position
     * stored in `prevPositions`.
     * This function is used to animate the reordering of rows in a table
     * when the data changes.
     * @param {HTMLElement} container The container element containing the rows to animate.
     * @param {object} prevPositions An object with team id as key and previous row top position as value.
     */
    animateFLIP(container, prevPositions, changedIds = null) {
        if (!container || !prevPositions) return;
        try {
            const rows = container.querySelectorAll('tr[data-team-id]');
            rows.forEach(row => {
                const id = row.getAttribute('data-team-id');
                // If a set of changed IDs is provided, skip rows that didn't change
                if (changedIds && !changedIds.has(id)) return;
                const prevTop = prevPositions[id];
                if (typeof prevTop === 'number') {
                    const newTop = row.getBoundingClientRect().top;
                    const delta = prevTop - newTop;
                    if (delta) {
                        row.style.transition = 'none';
                        row.style.transform = `translateY(${delta}px)`;
                        row.style.willChange = 'transform';
                        requestAnimationFrame(() => {
                            row.style.transition = `transform ${CONFIG.ANIM.flipDuration}ms ${CONFIG.ANIM.flipEasing}`;
                            row.style.transform = '';
                            const cleanup = () => {
                                row.style.transition = '';
                                row.style.transform = '';
                                row.style.willChange = '';
                                row.removeEventListener('transitionend', cleanup);
                            };
                            row.addEventListener('transitionend', cleanup);
                        });
                    }
                }
            });
        } catch (err) {
            // swallow animation errors to avoid breaking rendering
        }
    },

    /**
     * Smoothly collapses an element vertically (height, opacity, padding) and sets display:none.
     * @param {HTMLElement} el
     * @param {number} durationMs
     */
    collapseElement(el, durationMs = CONFIG.ANIM.rowCollapseDuration) {
        if (!el) return;
        try {
            el.style.transition = `height ${Math.round(durationMs * CONFIG.ANIM.rowHeightRatio)}ms ${CONFIG.ANIM.rowEasing}, opacity ${Math.round(durationMs * CONFIG.ANIM.rowOpacityRatio)}ms ${CONFIG.ANIM.rowOpacityEasing}, padding ${Math.round(durationMs * CONFIG.ANIM.rowPaddingRatio)}ms ${CONFIG.ANIM.rowEasing}`;
            const rect = el.getBoundingClientRect();
            el.style.boxSizing = 'border-box';
            el.style.height = rect.height + 'px';
            // force reflow
            void el.offsetHeight;
            el.style.height = '0px';
            el.style.opacity = '0';
            el.style.paddingTop = '0px';
            el.style.paddingBottom = '0px';
            setTimeout(() => {
                el.style.display = 'none';
                // cleanup
                el.style.transition = '';
                el.style.height = '';
                el.style.opacity = '';
                el.style.paddingTop = '';
                el.style.paddingBottom = '';
            }, durationMs + 10);
        } catch (e) {
            el.style.display = 'none';
        }
    },

    /**
     * Smoothly expands an element vertically (height, opacity, padding).
     * @param {HTMLElement} el
     * @param {number} durationMs
     */
    expandElement(el, durationMs = CONFIG.ANIM.rowCollapseDuration) {
        if (!el) return;
        try {
            el.style.display = '';
            const rect = el.getBoundingClientRect();
            // start collapsed
            el.style.height = '0px';
            el.style.opacity = '0';
            el.style.paddingTop = '0px';
            el.style.paddingBottom = '0px';
            el.style.boxSizing = 'border-box';
            // force reflow
            void el.offsetHeight;
            el.style.transition = `height ${Math.round(durationMs * CONFIG.ANIM.rowHeightRatio)}ms ${CONFIG.ANIM.rowEasing}, opacity ${Math.round(durationMs * CONFIG.ANIM.rowOpacityRatio)}ms ${CONFIG.ANIM.rowOpacityEasing}, padding ${Math.round(durationMs * CONFIG.ANIM.rowPaddingRatio)}ms ${CONFIG.ANIM.rowEasing}`;
            el.style.height = rect.height + 'px';
            el.style.opacity = '1';
            el.style.paddingTop = '';
            el.style.paddingBottom = '';
            setTimeout(() => {
                // cleanup
                el.style.transition = '';
                el.style.height = '';
            }, durationMs + 10);
        } catch (e) {
            el.style.display = '';
        }
    }
};
