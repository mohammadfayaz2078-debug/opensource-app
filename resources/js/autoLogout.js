// Auto logout functionality
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const resetTimer = () => {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
        // Clear user data
        localStorage.removeItem('api_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_type');
        localStorage.removeItem('permissions');
        
        // Redirect to login
        window.location.href = '/login';
    }, INACTIVITY_TIMEOUT);
};

// Set up event listeners for user activity
const setupAutoLogout = () => {
    const events = [
        'mousemove', 'mousedown', 'keypress', 
        'scroll', 'touchstart', 'click'
    ];
    
    events.forEach(event => {
        window.addEventListener(event, resetTimer);
    });
    
    resetTimer(); // Start the timer
};

// Only run in browser environment
if (typeof window !== 'undefined') {
    setupAutoLogout();
}