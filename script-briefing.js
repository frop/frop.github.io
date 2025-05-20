document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const onePagerInputArea = document.getElementById('one-pager-input-area');
    const submitOnePagerButton = document.getElementById('submit-one-pager-button');
    const inputOnePagerSection = document.getElementById('input-one-pager-section');
    const startOverButton = document.getElementById('start-over-button');

    const mainContainer = document.querySelector('.container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessagesDiv = document.getElementById('chat-messages');
    const briefingTitleElement = document.getElementById('briefing-title');
    const briefingOutputDiv = document.getElementById('briefing-output-content');
    const copyBriefingButton = document.getElementById('copy-briefing-button');

    // --- Configuration ---
    //const N8N_BRIEFING_WEBHOOK_URL = 'http://localhost:5678/webhook/briefing/message';
    const N8N_BRIEFING_WEBHOOK_URL = 'https://fpisa.app.n8n.cloud/webhook/briefing/message';

    // --- State Variables ---
    let sessionId = ''; // Session for the current briefing interaction
    let currentRawBriefingMarkdown = ''; // Stores the latest raw briefing Markdown

    // --- Initialize Session ID (Helper function) ---
    function initializeSession() {
        sessionId = 'briefing_session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        console.log("Briefing session initialized/reset with ID:", sessionId);
        // No need to store sessionId in localStorage if each "Load" starts a new conceptual session for n8n memory.
        // However, if you wanted to resume a *briefing generation chat* for a loaded one-pager, you would.
        // For now, let's keep it simple: new load = new sessionId for n8n's conversational memory about briefings.
    }

    // --- UI Update Functions ---
    function appendMessage(text, sender) { /* ... same as before ... */
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessagesDiv.appendChild(messageDiv);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    function renderBriefing(markdownContent) { /* ... same as before ... */
        currentRawBriefingMarkdown = markdownContent || '';
        if (currentRawBriefingMarkdown && typeof marked === 'object' && typeof marked.parse === 'function') {
            try {
                briefingOutputDiv.innerHTML = marked.parse(currentRawBriefingMarkdown);
            } catch (e) {
                console.error("Error parsing briefing Markdown:", e);
                briefingOutputDiv.textContent = "Error parsing briefing. Raw content:\n" + currentRawBriefingMarkdown;
            }
        } else if (currentRawBriefingMarkdown) {
            briefingOutputDiv.textContent = currentRawBriefingMarkdown;
        } else {
            briefingOutputDiv.innerHTML = '<p><em>Briefing will appear here...</em></p>';
        }
    }

    // --- Communication with n8n Backend ---
    async function sendToN8nForBriefing(userInput) {
        const originalOnePager = localStorage.getItem('originalOnePagerContent');
        if (!originalOnePager && userInput.toUpperCase() !== "LOAD_ONE_PAGER_ACTION") { // LOAD_ONE_PAGER_ACTION is hypothetical, we removed it
            appendMessage("Error: No one-pager loaded. Please load a one-pager first or click 'Start Over'.", 'bot');
            console.error("Attempted to send for briefing without a loaded one-pager.");
            return;
        }

        const payload = {
            sessionId: sessionId, // For n8n's AI Agent conversational memory about the *briefing*
            userInput: userInput, // This will be the target audience or refinement request
            originalOnePagerContent: originalOnePager // Always send the original one-pager
        };

        // Add a loading indicator to chat or button
        const originalSendButtonText = sendButton.textContent;
        sendButton.textContent = 'Generating...';
        sendButton.disabled = true;
        chatInput.disabled = true;

        try {
            console.log(`Sending to n8n briefing workflow:`, {
                sessionId: payload.sessionId,
                userInput: payload.userInput,
                originalOnePagerContent: payload.originalOnePagerContent ? payload.originalOnePagerContent.substring(0,100) + "..." : null // Log snippet
            });
            const response = await fetch(N8N_BRIEFING_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // ... (restore button state, error handling, parse response - same as before) ...
            sendButton.textContent = originalSendButtonText;
            sendButton.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error from n8n (briefing):', response.status, errorText);
                appendMessage(`Error: ${response.status}. Failed to generate briefing.`, 'bot');
                return;
            }

            const data = await response.json();
            console.log("Received from n8n (briefing):", data);

            if (data.chatReply) {
                appendMessage(data.chatReply, 'bot');
            }
            if (data.briefingTitle) {
                briefingTitleElement.textContent = data.briefingTitle;
            }
            if (data.briefingContent !== undefined) {
                renderBriefing(data.briefingContent);
            }

        } catch (error) {
            console.error('Error sending/receiving briefing message:', error);
            appendMessage('Network error or issue generating briefing. Please try again.', 'bot');
            sendButton.textContent = originalSendButtonText;
            sendButton.disabled = false;
            chatInput.disabled = false;
        }
    }

    // --- Event Listeners ---

    // Submit button for the initial one-pager content
    submitOnePagerButton.addEventListener('click', () => {
        const onePagerContent = onePagerInputArea.value.trim();
        if (!onePagerContent) {
            alert("Please paste your one-pager content first.");
            return;
        }

        // Store in localStorage
        localStorage.setItem('originalOnePagerContent', onePagerContent);
        console.log("One-pager content stored in localStorage.");

        // Initialize session for the briefing chat
        initializeSession(); // This sets the global `sessionId`

        // Hide input section, show main UI
        inputOnePagerSection.style.display = 'none';
        mainContainer.style.display = 'flex';
        startOverButton.style.display = 'inline-block';

        // Send a message to start the briefing process (n8n can reply with "Which audience?")
        // We don't need a special "LOAD_ONE_PAGER_ACTION" anymore if we always send the doc.
        // The first message to the chat after loading will be the first audience.
        appendMessage("One-pager loaded. Specify the target audience for the briefing (e.g., 'Executives', 'Technical Team', 'Marketing').", 'bot');
        renderBriefing(null); // Clear any previous briefing
        briefingTitleElement.textContent = 'Generated Briefing'; // Reset title
        chatInput.focus();
    });

    // Send button for chat messages (specifying audience, refinement)
    sendButton.addEventListener('click', () => {
        const userInput = chatInput.value.trim();
        if (userInput) {
            appendMessage(userInput, 'user'); // Display user's query
            chatInput.value = '';
            sendToN8nForBriefing(userInput); // Send audience or refinement request
        }
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const userInput = chatInput.value.trim();
            if (userInput) {
                appendMessage(userInput, 'user');
                chatInput.value = '';
                sendToN8nForBriefing(userInput);
            }
        }
    });

    // Copy Briefing button click
    copyBriefingButton.addEventListener('click', () => { /* ... same as before, uses currentRawBriefingMarkdown ... */
        if (!currentRawBriefingMarkdown) {
            copyBriefingButton.textContent = 'Nothing to Copy';
            setTimeout(() => { copyBriefingButton.textContent = 'Copy Briefing'; }, 1000);
            return;
        }
        navigator.clipboard.writeText(currentRawBriefingMarkdown).then(() => {
            const originalText = 'Copy Briefing'; // Assuming this is the default
            copyBriefingButton.textContent = 'Copied!';
            copyBriefingButton.classList.add('copied');
            setTimeout(() => {
                copyBriefingButton.textContent = originalText;
                copyBriefingButton.classList.remove('copied');
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy briefing: ', err);
            alert('Could not copy briefing.');
        });
    });

    // Start Over button click
    startOverButton.addEventListener('click', () => {
        // Clear localStorage for the one-pager
        localStorage.removeItem('originalOnePagerContent');
        console.log("originalOnePagerContent removed from localStorage.");

        // Reset state variables
        sessionId = ''; // Cleared, will be re-initialized on next load
        currentRawBriefingMarkdown = '';

        // Reset UI
        chatMessagesDiv.innerHTML = '';
        renderBriefing(null);
        briefingTitleElement.textContent = 'Generated Briefing';
        onePagerInputArea.value = '';

        // Show initial input section, hide main UI
        inputOnePagerSection.style.display = 'block'; // Or 'flex'
        mainContainer.style.display = 'none';
        startOverButton.style.display = 'none';

        onePagerInputArea.focus();
    });


    // --- Initial UI Setup ---
    // Check if there's a stored one-pager on page load (e.g., user refreshed)
    const storedOnePager = localStorage.getItem('originalOnePagerContent');
    if (storedOnePager) {
        onePagerInputArea.value = storedOnePager; // Pre-fill textarea
        // You could even auto-submit or prompt user to continue if you want
        console.log("Pre-filled textarea with stored one-pager.");
        // For now, user still needs to click "Load One-Pager" to start a session
        appendMessage("Found a previously loaded one-pager. Click 'Load One-Pager' to continue or paste new content.", 'bot')
    } else {
        onePagerInputArea.focus();
    }
    renderBriefing(null); // Ensure briefing panel is initially empty or has placeholder

}); // End of DOMContentLoaded