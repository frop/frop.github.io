document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessagesDiv = document.getElementById('chat-messages');
    const onePagerContentDiv = document.getElementById('one-pager-content');
    const newDocButton = document.getElementById('new-doc-button');
    const copyButton = document.getElementById('copy-markdown-button');

    // --- Configuration ---
    const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/one-pager/message';

    // --- State Variables ---
    let sessionId = localStorage.getItem('onePagerSessionId');
    let currentRawMarkdown = ''; // Store the latest raw Markdown

    // --- Initialize Session ID ---
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('onePagerSessionId', sessionId);
    }
    console.log("Initial session ID:", sessionId);

    // --- UI Update Functions ---

    /**
     * Appends a message to the chat display area.
     * @param {string} text - The message text.
     * @param {'user' | 'bot'} sender - Who sent the message.
     */
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text; // Using textContent is safer for user-generated content
        chatMessagesDiv.appendChild(messageDiv);
        // Auto-scroll to the bottom
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    /**
     * Renders Markdown content into the one-pager panel using marked.js
     * and updates the currentRawMarkdown state.
     * @param {string | null} markdownContent - The raw Markdown string, or null to clear.
     */
    function renderOnePager(markdownContent) {
        // Store the raw markdown (or empty string if null/undefined)
        currentRawMarkdown = markdownContent || '';
        console.log("renderOnePager called. Raw Markdown stored:", currentRawMarkdown ? currentRawMarkdown.substring(0, 50) + '...' : '(empty)'); // Log stored value

        // Debugging logs for marked.js availability
        console.log("Is marked an object?", typeof marked === 'object');
        if (typeof marked === 'object') {
            console.log("Is marked.parse a function?", typeof marked.parse === 'function');
        }

        // Attempt to render using marked.js
        if (currentRawMarkdown && typeof marked === 'object' && typeof marked.parse === 'function') {
            try {
                const htmlContent = marked.parse(currentRawMarkdown);
                // console.log("Parsed HTML:", htmlContent); // Optional: log parsed HTML
                onePagerContentDiv.innerHTML = htmlContent;
            } catch (e) {
                console.error("Error during marked.parse():", e);
                onePagerContentDiv.textContent = "Error parsing Markdown. Raw content:\n" + currentRawMarkdown; // Display error and raw content
            }
        } else if (currentRawMarkdown) {
            // Fallback to displaying raw text if marked.js is not available or content exists
            console.warn("Falling back to textContent (marked.js might not be loaded correctly or markdownContent is just text).");
            onePagerContentDiv.textContent = currentRawMarkdown;
        } else {
            // Clear the panel if markdownContent is null or empty
            console.log("Clearing onePagerContentDiv.");
            onePagerContentDiv.innerHTML = '';
        }
    }

    // --- Communication with n8n Backend ---

    /**
     * Sends user input to the n8n webhook and handles the response.
     * @param {string} userInput - The text entered by the user.
     */
    async function sendMessageToN8n(userInput) {
        // Avoid echoing certain system/auto-generated messages
        if (userInput && userInput.toLowerCase() !== "start" && !userInput.startsWith("Error:")) {
                appendMessage(userInput, 'user');
        }
        chatInput.value = ''; // Clear input field
        // Consider adding a loading indicator here

        try {
            console.log(`Sending to n8n with sessionId: ${sessionId}, userInput: ${userInput}`); // Log outgoing request
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userInput: userInput,
                    sessionId: sessionId // Pass the current session ID
                })
            });

                // Consider removing loading indicator here

            if (!response.ok) {
                // Handle HTTP errors from n8n
                const errorText = await response.text();
                console.error('Error from n8n:', response.status, errorText);
                appendMessage(`Error: ${response.status}. Failed to get response from assistant.`, 'bot');
                return; // Stop processing on error
            }

            const data = await response.json();
            console.log("Received from n8n:", data); // Log incoming response

            // Update chat with bot's reply
            if (data.chatReply) {
                appendMessage(data.chatReply, 'bot');
            }

            // Update the one-pager panel (renderOnePager handles null/undefined)
            if (data.onePagerContent !== undefined) {
                    renderOnePager(data.onePagerContent);
            }
            // Note: If n8n sends neither chatReply nor onePagerContent, nothing happens visually on the frontend.

        } catch (error) {
            // Handle network errors or other issues with the fetch call
            console.error('Error sending/receiving message:', error);
            appendMessage('Network error or issue connecting to the assistant. Please check console and try again.', 'bot');
                // Consider removing loading indicator here
        }
    }

    // --- Event Listeners ---

    // Send button click
    sendButton.addEventListener('click', () => {
        const userInput = chatInput.value.trim();
        if (userInput) {
            sendMessageToN8n(userInput);
        }
    });

    // Enter key in chat input
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const userInput = chatInput.value.trim();
            if (userInput) {
                sendMessageToN8n(userInput);
            }
        }
    });

    // New One-Pager button click
    if (newDocButton) {
        newDocButton.addEventListener('click', () => {
            console.log("New Document button clicked.");
            // 1. Generate and store a new session ID
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('onePagerSessionId', sessionId);
            console.log("NEW SESSION STARTED. ID:", sessionId);

            // 2. Clear the UI (renderOnePager(null) also clears currentRawMarkdown)
            renderOnePager(null);
            chatMessagesDiv.innerHTML = '';

            // 3. Send "start" to n8n to initialize the new session
            sendMessageToN8n("start");

            // Focus the input field
            chatInput.focus();
        });
    } else {
        console.warn("New Document button not found.");
    }

    // Copy Markdown button click
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            if (!currentRawMarkdown) {
                console.warn("Copy button clicked, but no markdown content available.");
                // Optionally provide feedback that there's nothing to copy
                copyButton.textContent = 'Nothing to Copy';
                    setTimeout(() => { copyButton.textContent = 'Copy MD'; }, 1000);
                return;
            }

            navigator.clipboard.writeText(currentRawMarkdown).then(() => {
                // Success feedback
                const originalText = copyButton.textContent; // Might not be 'Copy MD' if recently clicked
                    if (copyButton.textContent !== 'Copied!') { // Avoid resetting if clicked rapidly
                        copyButton.dataset.originalText = 'Copy MD'; // Store original
                    }
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                console.log("Markdown copied to clipboard.");

                // Revert button text and style after a short delay
                setTimeout(() => {
                    copyButton.textContent = copyButton.dataset.originalText || 'Copy MD';
                    copyButton.classList.remove('copied');
                }, 1500); // Revert after 1.5 seconds

            }).catch(err => {
                // Error feedback
                console.error('Failed to copy Markdown to clipboard: ', err);
                alert('Could not copy text. Check browser permissions or console for errors.');
            });
        });
    } else {
        console.warn("Copy Markdown button not found.");
    }

    // --- Initial Load ---
    // Optional: You could add logic here to fetch the state for the existing sessionId
    // or display a welcome message, but currently it waits for user input ("start").
        appendMessage("Welcome! Type 'start' to begin a new one-pager, or continue where you left off if you have an existing session.", 'bot');
        chatInput.focus();

}); // End of DOMContentLoaded