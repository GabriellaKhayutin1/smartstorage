// Storage tips database
const storageTips = {
    'avocado': {
        storage: 'Store unripe avocados at room temperature until ripe, then refrigerate. Cut avocado should be stored with pit and wrapped tightly.',
        shelfLife: '3-5 days',
        tips: ['Keep the pit in when storing cut avocado', 'Brush cut surface with lemon juice to prevent browning', 'Store in an airtight container'],
        commonMistakes: ['Storing unripe avocados in the fridge', 'Not wrapping cut avocados properly'],
        relatedItems: ['lemon', 'plastic wrap', 'airtight container']
    },
    'apple': {
        storage: 'Store in the refrigerator crisper drawer. Keep away from other fruits as they release ethylene gas.',
        shelfLife: '3-4 weeks',
        tips: ['Store in a plastic bag with holes', 'Keep away from bananas and other ethylene-producing fruits', 'Check for bruises before storing'],
        commonMistakes: ['Storing near bananas', 'Not checking for damage before storage'],
        relatedItems: ['crisper drawer', 'plastic bag']
    },
    'banana': {
        storage: 'Store at room temperature until ripe, then refrigerate. Wrap stem ends in plastic to slow ripening.',
        shelfLife: '5-7 days',
        tips: ['Separate bananas from the bunch to slow ripening', 'Store ripe bananas in the fridge', 'Freeze overripe bananas for smoothies'],
        commonMistakes: ['Storing unripe bananas in the fridge', 'Keeping bananas near other fruits'],
        relatedItems: ['plastic wrap', 'freezer']
    },
    'milk': {
        storage: 'Keep in the coldest part of the refrigerator, not in the door. Return to fridge immediately after use.',
        shelfLife: '5-7 days',
        tips: ['Keep temperature below 40°F', 'Store in original container', 'Don\'t store in the door'],
        commonMistakes: ['Storing in the door', 'Leaving out too long'],
        relatedItems: ['refrigerator', 'thermometer']
    },
    'chicken': {
        storage: 'Store in the coldest part of the fridge, wrapped in its original packaging or in an airtight container.',
        shelfLife: '1-2 days',
        tips: ['Keep temperature below 40°F', 'Store on bottom shelf to prevent cross-contamination', 'Freeze if not using within 2 days'],
        commonMistakes: ['Storing above other foods', 'Not freezing soon enough'],
        relatedItems: ['airtight container', 'freezer']
    },
    'spinach': {
        storage: 'After washing, dry spinach thoroughly using a salad spinner or paper towels. Store in an airtight container lined with a dry paper towel in the fridge.',
        shelfLife: '5-7 days',
        tips: ['Remove any damaged leaves before storing', 'Keep away from ethylene-producing fruits', 'Store in the crisper drawer'],
        commonMistakes: ['Storing wet spinach', 'Keeping near apples or bananas'],
        relatedItems: ['salad spinner', 'paper towels', 'airtight container']
    },
    'cheese': {
        storage: 'Wrap cheese in parchment paper and then loosely in aluminum foil or a container to allow some airflow while keeping moisture out.',
        shelfLife: '3-4 weeks',
        tips: ['Store in the cheese drawer if available', 'Keep different types of cheese separate', 'Check for mold regularly'],
        commonMistakes: ['Using plastic wrap directly', 'Storing in too airtight conditions'],
        relatedItems: ['parchment paper', 'aluminum foil', 'cheese container']
    },
    'tomato': {
        storage: 'Store ripe tomatoes stem-side down at room temperature. Once ripe, refrigerate to slow down further ripening.',
        shelfLife: '5-7 days',
        tips: ['Keep away from direct sunlight', 'Store stem-side down to prevent moisture loss', 'Check for soft spots regularly'],
        commonMistakes: ['Storing unripe tomatoes in the fridge', 'Keeping in plastic bags'],
        relatedItems: ['paper bag', 'room temperature storage']
    },
    'carrot': {
        storage: 'Remove green tops, store in a sealed bag in the crisper drawer. Keep away from ethylene-producing fruits.',
        shelfLife: '2-3 weeks',
        tips: ['Remove tops before storing', 'Keep in a sealed bag with holes', 'Store in the crisper drawer'],
        commonMistakes: ['Leaving tops attached', 'Storing near apples'],
        relatedItems: ['crisper drawer', 'sealed bag']
    },
    'lemon': {
        storage: 'Store in a sealed bag in the fridge to retain juiciness and prevent drying out.',
        shelfLife: '2-3 weeks',
        tips: ['Store in a sealed bag', 'Keep in the crisper drawer', 'Check for mold regularly'],
        commonMistakes: ['Leaving at room temperature', 'Storing in open container'],
        relatedItems: ['sealed bag', 'crisper drawer']  
    },
    'garlic': {
        storage: 'Store whole garlic bulbs in a cool, dark, and dry place with good ventilation. Once peeled, store in the refrigerator.',
        shelfLife: '3-5 months (whole), 1 week (peeled)',
        tips: ['Keep in a mesh bag or basket for ventilation', 'Store away from direct sunlight', 'Keep in a cool, dry place'],
        commonMistakes: ['Storing in plastic bags', 'Keeping in the refrigerator (whole bulbs)'],
        relatedItems: ['mesh bag', 'cool storage area']
    },
    'onion': {
        storage: 'Store whole onions in a cool, dark, and dry place with good ventilation. Once cut, store in the refrigerator.',
        shelfLife: '2-3 months (whole), 7-10 days (cut)',
        tips: ['Keep in a mesh bag or basket', 'Store away from potatoes', 'Keep in a cool, dry place'],
        commonMistakes: ['Storing near potatoes', 'Keeping in plastic bags'],
        relatedItems: ['mesh bag', 'cool storage area']
    },
    'potato': {
        storage: 'Store in a cool, dark, and dry place with good ventilation. Keep away from onions.',
        shelfLife: '2-3 months',
        tips: ['Keep in a paper bag or basket', 'Store away from onions', 'Check for sprouts regularly'],
        commonMistakes: ['Storing near onions', 'Keeping in plastic bags'],
        relatedItems: ['paper bag', 'cool storage area']
    },
    'lettuce': {
        storage: 'After washing, dry thoroughly and store in an airtight container with a paper towel in the refrigerator.',
        shelfLife: '7-10 days',
        tips: ['Remove outer leaves if damaged', 'Keep in the crisper drawer', 'Store in an airtight container'],
        commonMistakes: ['Storing wet lettuce', 'Keeping near ethylene-producing fruits'],
        relatedItems: ['salad spinner', 'paper towels', 'airtight container']
    },
    'cucumber': {
        storage: 'Store in the refrigerator crisper drawer. Keep away from ethylene-producing fruits.',
        shelfLife: '1-2 weeks',
        tips: ['Keep in the crisper drawer', 'Store away from tomatoes', 'Check for soft spots regularly'],
        commonMistakes: ['Storing at room temperature', 'Keeping near tomatoes'],
        relatedItems: ['crisper drawer', 'refrigerator']
    },
    'bell pepper': {
        storage: 'Store in the refrigerator crisper drawer. Keep away from ethylene-producing fruits.',
        shelfLife: '1-2 weeks',
        tips: ['Keep in the crisper drawer', 'Store away from apples', 'Check for soft spots regularly'],
        commonMistakes: ['Storing at room temperature', 'Keeping near apples'],
        relatedItems: ['crisper drawer', 'refrigerator']
    },
    'strawberry': {
        storage: 'Store in the refrigerator in a single layer on a paper towel-lined plate or container.',
        shelfLife: '3-7 days',
        tips: ['Do not wash until ready to eat', 'Store in a single layer to prevent bruising', 'Check for mold regularly'],
        commonMistakes: ['Washing before storing', 'Storing in a sealed container'],
        relatedItems: ['paper towel', 'plate', 'container']
    },
    'broccoli': {
        storage: 'Store in the refrigerator crisper drawer, unwashed, in a perforated plastic bag.',
        shelfLife: '3-5 days',
        tips: ['Store unwashed', 'Keep in a perforated plastic bag', 'Check for yellowing regularly'],
        commonMistakes: ['Washing before storing', 'Storing in a sealed bag'],
        relatedItems: ['perforated plastic bag', 'crisper drawer']
    },
    'bread': {
        storage: 'Store at room temperature in a bread box or paper bag. For longer storage, freeze.',
        shelfLife: '3-5 days (room temperature), 3 months (frozen)',
        tips: ['Store in a bread box or paper bag', 'Freeze for longer storage', 'Avoid storing in the refrigerator'],
        commonMistakes: ['Storing in the refrigerator', 'Not freezing for long-term storage'],
        relatedItems: ['bread box', 'paper bag', 'freezer']
    },
    'yogurt': {
        storage: 'Store in the refrigerator at or below 40°F. Keep tightly sealed.',
        shelfLife: '1-2 weeks',
        tips: ['Keep tightly sealed', 'Store at or below 40°F', 'Check for mold or off smell'],
        commonMistakes: ['Leaving out too long', 'Not sealing properly'],
        relatedItems: ['refrigerator', 'airtight container']
    },
    'egg': {
        storage: 'Store in the original carton in the coldest part of the refrigerator.',
        shelfLife: '3-5 weeks',
        tips: ['Keep in the original carton', 'Store in the coldest part of the fridge', 'Do not wash before storing'],
        commonMistakes: ['Storing in the door', 'Washing before storing'],
        relatedItems: ['egg carton', 'refrigerator']
    },
    'butter': {
        storage: 'Store in the refrigerator. Can be frozen for longer storage.',
        shelfLife: '1-3 months (refrigerator), 6-9 months (freezer)',
        tips: ['Store in the original packaging', 'Freeze for longer storage', 'Keep away from strong-smelling foods'],
        commonMistakes: ['Leaving out at room temperature', 'Not sealing properly before freezing'],
        relatedItems: ['refrigerator', 'freezer', 'airtight container']
    },
    'grape': {
        storage: 'Store unwashed in the refrigerator in a perforated plastic bag or container.',
        shelfLife: '1-2 weeks',
        tips: ['Store unwashed', 'Keep in a perforated plastic bag', 'Check for mold regularly'],
        commonMistakes: ['Washing before storing', 'Storing in a sealed container'],
        relatedItems: ['perforated plastic bag', 'refrigerator']
    },
    'mushroom': {
        storage: 'Store in the refrigerator in a paper bag or original packaging.',
        shelfLife: '4-7 days',
        tips: ['Store in a paper bag', 'Keep in the refrigerator', 'Do not wash before storing'],
        commonMistakes: ['Storing in plastic bags', 'Washing before storing'],
        relatedItems: ['paper bag', 'refrigerator']
    },
    'celery': {
        storage: 'Store in the refrigerator crisper drawer, wrapped in aluminum foil.',
        shelfLife: '1-2 weeks',
        tips: ['Wrap in aluminum foil', 'Store in the crisper drawer', 'Check for wilting regularly'],
        commonMistakes: ['Storing in plastic bags', 'Not wrapping properly'],
        relatedItems: ['aluminum foil', 'crisper drawer']
    },
    'peach': {
        storage: 'Store unripe peaches at room temperature until ripe, then refrigerate.',
        shelfLife: '3-5 days (room temperature), 1 week (refrigerator)',
        tips: ['Store unripe at room temperature', 'Refrigerate once ripe', 'Check for bruises regularly'],
        commonMistakes: ['Storing unripe peaches in the fridge', 'Not checking for bruises'],
        relatedItems: ['room temperature storage', 'refrigerator']
    },
    'zucchini': {
        storage: 'Store in the refrigerator crisper drawer in a perforated plastic bag.',
        shelfLife: '1-2 weeks',
        tips: ['Store in a perforated plastic bag', 'Keep in the crisper drawer', 'Check for soft spots regularly'],
        commonMistakes: ['Storing at room temperature', 'Storing in a sealed bag'],
        relatedItems: ['perforated plastic bag', 'crisper drawer']
    },
    'pear': {
        storage: 'Store unripe pears at room temperature until ripe, then refrigerate.',
        shelfLife: '3-5 days (room temperature), 1 week (refrigerator)',
        tips: ['Store unripe at room temperature', 'Refrigerate once ripe', 'Check for bruises regularly'],
        commonMistakes: ['Storing unripe pears in the fridge', 'Not checking for bruises'],
        relatedItems: ['room temperature storage', 'refrigerator']
    }
};

// General knowledge database
const generalKnowledge = {
    'temperature': {
        fridge: 'Keep refrigerator temperature between 35-40°F (1.7-4.4°C)',
        freezer: 'Keep freezer temperature at 0°F (-18°C) or below',
        room: 'Room temperature is typically 68-72°F (20-22°C)',
        pantry: 'Pantry temperature should be between 50-70°F (10-21°C)'
    },
    'containers': {
        airtight: 'Airtight containers prevent moisture loss and keep food fresh longer',
        glass: 'Glass containers are better for storing acidic foods',
        plastic: 'Use BPA-free plastic containers for food storage',
        mesh: 'Mesh bags provide good ventilation for produce like onions and garlic',
        paper: 'Paper bags are ideal for storing potatoes and other root vegetables'
    },
    'general_tips': {
        ethylene: 'Ethylene-producing fruits (like bananas, apples) can speed up ripening of other produce',
        moisture: 'Too much moisture can cause mold, too little can cause wilting',
        temperature: 'Most produce stays fresh longer at cooler temperatures',
        ventilation: 'Good ventilation helps prevent mold and rot in stored produce',
        organization: 'Keep similar items together and separate incompatible foods'
    },
    'categories': {
        'root vegetables': ['potato', 'onion', 'garlic', 'carrot', 'beet', 'turnip'],
        'leafy greens': ['spinach', 'lettuce', 'kale', 'arugula', 'swiss chard'],
        'fruits': ['apple', 'banana', 'tomato', 'avocado', 'lemon'],
        'dairy': ['milk', 'cheese', 'yogurt', 'butter'],
        'meat': ['chicken', 'beef', 'pork', 'fish']
    }
};

// Initialize chatbot functionality
function initializeChatbot() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatToggle || !chatWindow || !closeChat || !chatForm || !chatInput || !chatMessages) {
        console.error('Chatbot elements not found');
        return;
    }

    // Toggle chat window
    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
    });

    // Close chat window
    closeChat.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            // Add user message
            addMessage(message, 'user');
            chatInput.value = '';
            
            // Process message and get response
            const response = processMessage(message);
            addMessage(response, 'bot');
        }
    });

    // Function to add messages to chat
    function addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `bg-${sender === 'user' ? 'green' : 'gray'}-100 rounded-lg p-3 ${sender === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%]`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to process messages and get responses
    function processMessage(message) {
        message = message.toLowerCase();
        
        // Check for specific food items
        for (const [food, info] of Object.entries(storageTips)) {
            if (message.includes(food)) {
                let response = `Here's how to store ${food}:\n\n`;
                response += `Storage: ${info.storage}\n`;
                response += `Shelf Life: ${info.shelfLife}\n\n`;
                if (info.tips) response += `Additional Tips:\n${info.tips.join(', ')}\n\n`;
                if (info.commonMistakes) response += `Common Mistakes:\n${info.commonMistakes.join(', ')}\n\n`;
                if (info.relatedItems) response += `Related Items:\n${info.relatedItems.join(', ')}`;
                return response;
            }
        }

        // Check for general storage questions
        if (message.includes('temperature')) {
            return `Fridge: ${generalKnowledge.temperature.fridge}\nFreezer: ${generalKnowledge.temperature.freezer}\nRoom: ${generalKnowledge.temperature.room}\nPantry: ${generalKnowledge.temperature.pantry}`;
        }
        if (message.includes('container')) {
            return `Airtight: ${generalKnowledge.containers.airtight}\nGlass: ${generalKnowledge.containers.glass}\nPlastic: ${generalKnowledge.containers.plastic}\nMesh: ${generalKnowledge.containers.mesh}\nPaper: ${generalKnowledge.containers.paper}`;
        }
        if (message.includes('general') || message.includes('tip')) {
            return `Ethylene: ${generalKnowledge.general_tips.ethylene}\nMoisture: ${generalKnowledge.general_tips.moisture}\nTemperature: ${generalKnowledge.general_tips.temperature}\nVentilation: ${generalKnowledge.general_tips.ventilation}\nOrganization: ${generalKnowledge.general_tips.organization}`;
        }

        // Check for categories
        if (message.includes('root vegetables')) {
            return `Root Vegetables: ${generalKnowledge.categories['root vegetables'].join(', ')}`;
        }
        if (message.includes('leafy greens')) {
            return `Leafy Greens: ${generalKnowledge.categories['leafy greens'].join(', ')}`;
        }
        if (message.includes('fruits')) {
            return `Fruits: ${generalKnowledge.categories.fruits.join(', ')}`;
        }
        if (message.includes('dairy')) {
            return `Dairy: ${generalKnowledge.categories.dairy.join(', ')}`;
        }
        if (message.includes('meat')) {
            return `Meat: ${generalKnowledge.categories.meat.join(', ')}`;
        }

        // Default response
        return "I'm not sure about that. Could you please ask about a specific food item or general storage tips?";
    }
}

// Initialize chatbot when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeChatbot);