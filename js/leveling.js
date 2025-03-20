// Leveling system configuration
const LEVELS = [
    { title: "Waste Watcher", icon: "🌱", requiredPoints: 0 },
    { title: "Eco Warrior", icon: "🌿", requiredPoints: 100 },
    { title: "Green Guardian", icon: "🌳", requiredPoints: 250 },
    { title: "Earth Protector", icon: "🌍", requiredPoints: 500 },
    { title: "Zero Waste Hero", icon: "⭐", requiredPoints: 1000 }
];

// Calculate points based on user's stats
function calculatePoints(co2Saved, itemsManaged, wastePrevented) {
    // Points formula: 
    // 1 point per kg of CO2 saved
    // 2 points per item managed
    // 5 points per kg of waste prevented
    return Math.floor(co2Saved + (itemsManaged * 2) + (wastePrevented * 5));
}

// Get current level based on points
function getCurrentLevel(points) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (points >= LEVELS[i].requiredPoints) {
            return i;
        }
    }
    return 0;
}

// Calculate progress to next level
function calculateProgress(points) {
    const currentLevelIndex = getCurrentLevel(points);
    if (currentLevelIndex === LEVELS.length - 1) {
        return 100; // Max level reached
    }

    const currentLevelPoints = LEVELS[currentLevelIndex].requiredPoints;
    const nextLevelPoints = LEVELS[currentLevelIndex + 1].requiredPoints;
    const pointsInCurrentLevel = points - currentLevelPoints;
    const pointsRequiredForNextLevel = nextLevelPoints - currentLevelPoints;

    return Math.min(100, Math.floor((pointsInCurrentLevel / pointsRequiredForNextLevel) * 100));
}

// Update the UI with level information
function updateLevelUI(points) {
    try {
        const currentLevelIndex = getCurrentLevel(points);
        const currentLevel = LEVELS[currentLevelIndex];
        const progress = calculateProgress(points);

        // Update current level title and number
        const currentLevelTitle = document.getElementById('current-level-title');
        const levelNumber = document.getElementById('level-number');
        const nextLevelTitle = document.getElementById('next-level-title');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressBar = document.getElementById('progress-bar');

        if (currentLevelTitle) currentLevelTitle.textContent = currentLevel.title;
        if (levelNumber) levelNumber.textContent = `Level ${currentLevelIndex + 1}`;

        // Update next level information if not at max level
        if (nextLevelTitle) {
            if (currentLevelIndex < LEVELS.length - 1) {
                const nextLevel = LEVELS[currentLevelIndex + 1];
                nextLevelTitle.textContent = nextLevel.title;
            } else {
                nextLevelTitle.textContent = "Max Level Reached!";
            }
        }

        // Update progress bar
        if (progressPercentage) progressPercentage.textContent = `${progress}%`;
        if (progressBar) progressBar.style.width = `${progress}%`;

        // Update level milestones to show current level
        const milestones = document.querySelectorAll('.level-milestone');
        milestones.forEach((milestone, index) => {
            if (index <= currentLevelIndex) {
                milestone.classList.add('text-green-600');
                milestone.classList.remove('text-gray-700');
            } else {
                milestone.classList.remove('text-green-600');
                milestone.classList.add('text-gray-700');
            }
        });
    } catch (error) {
        console.error('Error updating level UI:', error);
    }
}

// Initialize leveling system
function initializeLevelSystem() {
    try {
        // Get stats from the page
        const totalSaved = document.getElementById('total-saved');
        const itemsManaged = document.getElementById('items-managed');
        const wastePrevented = document.getElementById('waste-prevented');

        if (!totalSaved || !itemsManaged || !wastePrevented) {
            console.log('Stats elements not found, waiting for them to load...');
            return;
        }

        const co2Saved = parseFloat(totalSaved.textContent) || 0;
        const itemsManagedCount = parseInt(itemsManaged.textContent) || 0;
        const wastePreventedAmount = parseFloat(wastePrevented.textContent) || 0;

        // Calculate total points
        const points = calculatePoints(co2Saved, itemsManagedCount, wastePreventedAmount);

        // Update UI
        updateLevelUI(points);
    } catch (error) {
        console.error('Error initializing level system:', error);
    }
}

// Create a MutationObserver to watch for changes in the stats
function observeStatsChanges() {
    try {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    initializeLevelSystem();
                }
            });
        });

        // Observe changes in the stats elements
        const statsElements = [
            document.getElementById('total-saved'),
            document.getElementById('items-managed'),
            document.getElementById('waste-prevented')
        ];

        statsElements.forEach(element => {
            if (element) {
                observer.observe(element, {
                    characterData: true,
                    childList: true,
                    subtree: true
                });
            }
        });
    } catch (error) {
        console.error('Error setting up stats observer:', error);
    }
}

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure all elements are loaded
    setTimeout(() => {
        initializeLevelSystem();
        observeStatsChanges();
    }, 100);
});

// Export functions for use in other files
window.levelSystem = {
    calculatePoints,
    getCurrentLevel,
    calculateProgress,
    updateLevelUI,
    initializeLevelSystem
}; 