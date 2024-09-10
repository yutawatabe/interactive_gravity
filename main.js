// main.js

// Global variables to hold our model and view instances
let globalTradeModel;
let globalTradeModelView;

// Function to initialize the application
function initializeApp() {
    // Create a new TradeModel instance with a maximum of 5 countries
    globalTradeModel = new TradeModel(5);

    // Create a new TradeModelView instance, passing the canvas ID and the model
    globalTradeModelView = new TradeModelView('tradeCanvas', globalTradeModel);

    // Add an initial country
    addInitialCountry();

    // Initial draw of the view
    globalTradeModelView.redraw();

    // Set up any additional event listeners or initialization logic
    setupAdditionalListeners();
}

// Function to add an initial country at a random position
function addInitialCountry() {
    const canvas = document.getElementById('tradeCanvas');
    const padding = 50; // To avoid placing the country too close to the edges
    const x = Math.random() * (canvas.width - 2 * padding) + padding;
    const y = Math.random() * (canvas.height - 2 * padding) + padding;
    globalTradeModel.addCountry(x, y);
}

// Function to set up any additional event listeners
function setupAdditionalListeners() {
    // Example: Listen for window resize events to make the app responsive
    window.addEventListener('resize', handleResize);

    // You can add more global event listeners here if needed
}

// Function to handle window resize events
function handleResize() {
    const canvas = document.getElementById('tradeCanvas');
    canvas.width = window.innerWidth * 0.8; // Make canvas 80% of window width
    canvas.height = window.innerHeight * 0.6; // Make canvas 60% of window height
    globalTradeModelView.redraw(); // Redraw the view with new canvas dimensions
}

// Call initializeApp when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Optionally, you can expose some functions or objects to the global scope
// for debugging or advanced user interactions
window.debugModel = () => console.log(globalTradeModel);
window.debugView = () => console.log(globalTradeModelView);

// Example of a utility function that could be useful
window.resetSimulation = () => {
    globalTradeModel = new TradeModel(5);
    globalTradeModelView.model = globalTradeModel;
    addInitialCountry();
    globalTradeModelView.redraw();
};