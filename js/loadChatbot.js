// Function to load chatbot HTML
async function loadChatbot() {
    try {
        const response = await fetch('/js/chatbot.html');
        if (!response.ok) {
            throw new Error('Failed to load chatbot HTML');
        }
        const html = await response.text();
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Append the chatbot HTML to the body
        document.body.appendChild(temp.firstElementChild);
        
        // Load the chatbot.js script
        const script = document.createElement('script');
        script.src = '/js/chatbot.js';
        script.onload = () => {
            console.log('Chatbot script loaded successfully');
        };
        script.onerror = (error) => {
            console.error('Error loading chatbot script:', error);
        };
        document.body.appendChild(script);
    } catch (error) {
        console.error('Error loading chatbot:', error);
    }
}

// Load chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', loadChatbot); 