// Configuration constants for the football table application
export const CONFIG = {
    MIN_ROUND: 16,
    MAX_ROUND: 38,
    MAX_GOALS: 20,
    
    ANIM: {
        // Row collapse/expand settings
        rowCollapseDuration: 260,
        rowEasing: 'ease',
        rowOpacityEasing: 'linear',
        // Multipliers used to derive specific timing for height/opacity/padding
        rowHeightRatio: 0.92,
        rowOpacityRatio: 0.62,
        rowPaddingRatio: 0.77,

        // FLIP animation duration and easing
        flipDuration: 330,
        flipEasing: 'cubic-bezier(.2,.8,.2,1)'
    }
};