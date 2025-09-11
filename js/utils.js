// Funções utilitárias
export const Utils = {
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
    }
};
