document.addEventListener('DOMContentLoaded', () => {
    // --- Get Common DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');
    const newSessionButton = document.getElementById('new-session-button');
    const appTitle = document.querySelector('.app-title'); // If we want to change it

    // --- URLs (Consider making these configurable) ---
    // const N8N_ONEPAGER_WEBHOOK_URL = 'http://localhost:5678/webhook/one-pager/message';
    // const N8N_BRIEFING_WEBHOOK_URL = 'http://localhost:5678/webhook/briefing/message';
    const N8N_ONEPAGER_WEBHOOK_URL = 'https://fpisa.app.n8n.cloud/webhook/one-pager/message';
    const N8N_BRIEFING_WEBHOOK_URL = 'https://fpisa.app.n8n.cloud/webhook/briefing/message';
    const N8N_REPORT_WEBHOOK_URL = 'YOUR_N8N_REPORT_WEBHOOK_URL_HERE'; // Placeholder

    // --- State (Global for the app) ---
    let currentView = 'onepager'; // Default view
    let sessionIds = {
        onepager: null,
        briefing: null,
        report: null
    };
    let onePagerRawMarkdown = '';
    let briefingRawMarkdown = '';
    // let reportRawMarkdown = ''; // For report feature

    // --- Initialize Session IDs (from localStorage or new) ---
    function initSessionId(viewName) {
        let storedId = localStorage.getItem(`${viewName}SessionId`);
        if (!storedId) {
            storedId = `${viewName}_session_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`${viewName}SessionId`, storedId);
        }
        sessionIds[viewName] = storedId;
        console.log(`Initialized ${viewName} session ID: ${sessionIds[viewName]}`);
    }

    // --- DOM Elements for One-Pager View ---
    const onePagerChatInput = document.getElementById('one-pager-chat-input');
    const onePagerSendButton = document.getElementById('one-pager-send-button');
    const onePagerChatMessages = document.getElementById('one-pager-chat-messages');
    const onePagerOutputContent = document.getElementById('one-pager-output-content');
    const onePagerCopyButton = document.getElementById('one-pager-copy-button');

    // --- DOM Elements for Briefing View ---
    const briefingInputSection = document.getElementById('briefing-input-one-pager-section');
    const briefingOnePagerInputArea = document.getElementById('briefing-one-pager-input-area');
    const briefingSubmitOnePagerButton = document.getElementById('briefing-submit-one-pager-button');
    const briefingMainUI = document.getElementById('briefing-main-ui');
    const briefingChatInput = document.getElementById('briefing-chat-input');
    const briefingSendButton = document.getElementById('briefing-send-button');
    const briefingChatMessages = document.getElementById('briefing-chat-messages');
    const briefingTitleElement = document.getElementById('briefing-title');
    const briefingOutputContent = document.getElementById('briefing-output-content');
    const briefingCopyButton = document.getElementById('briefing-copy-button');

    // --- Helper: Append Message to a specific chat area ---
    function appendMessage(text, sender, chatAreaElement) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatAreaElement.appendChild(messageDiv);
        chatAreaElement.scrollTop = chatAreaElement.scrollHeight;
    }

    // --- Helper: Render Markdown to a specific output area ---
    function renderMarkdown(markdownContent, outputAreaElement, rawMarkdownStorageVarName) {
        // Store raw markdown
        if (rawMarkdownStorageVarName === 'onePager') onePagerRawMarkdown = markdownContent || '';
        else if (rawMarkdownStorageVarName === 'briefing') briefingRawMarkdown = markdownContent || '';
        // else if (rawMarkdownStorageVarName === 'report') reportRawMarkdown = markdownContent || '';

        const contentToRender = markdownContent || '';

        if (contentToRender && typeof marked === 'object' && typeof marked.parse === 'function') {
            try {
                outputAreaElement.innerHTML = marked.parse(contentToRender);
            } catch (e) {
                console.error(`Error parsing Markdown for ${rawMarkdownStorageVarName}:`, e);
                outputAreaElement.textContent = `Error parsing. Raw: ${contentToRender}`;
            }
        } else if (contentToRender) {
            outputAreaElement.textContent = contentToRender;
        } else {
            outputAreaElement.innerHTML = ''; // Clear if no content
        }
    }


    // --- View Switching Logic ---
    function setActiveView(viewId) {
        views.forEach(view => {
            view.classList.remove('active-view');
            if (view.id === viewId + '-view') {
                view.classList.add('active-view');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.id === 'nav-' + viewId) {
                link.classList.add('active');
            }
        });
        currentView = viewId;
        appTitle.textContent = `AI Document Assistant - ${viewId.charAt(0).toUpperCase() + viewId.slice(1)}`;

        // Handle view-specific initializations or UI states
        if (viewId === 'briefing') {
            const storedOnePager = localStorage.getItem('briefingOriginalOnePager');
            if (!storedOnePager) {
                briefingInputSection.style.display = 'block'; // Or 'flex'
                briefingMainUI.style.display = 'none';
                briefingOnePagerInputArea.focus();
            } else {
                briefingInputSection.style.display = 'none';
                briefingMainUI.style.display = 'flex';
                // Optionally send a "resume" message or prompt for audience
                appendMessage("Loaded existing one-pager for briefing. Specify target audience.", 'bot', briefingChatMessages);
                briefingChatInput.focus();
            }
        } else if (viewId === 'onepager') {
            // appendMessage("Welcome to One-Pager! Type 'start'.", 'bot', onePagerChatMessages); // If needed
            onePagerChatInput.focus();
        }
        console.log("Active view set to:", currentView);
        // Ensure session ID for the current view is initialized
        if (!sessionIds[currentView]) {
            initSessionId(currentView);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default hash jump
            const viewId = link.id.replace('nav-', '');
            setActiveView(viewId);
        });
    });

    // --- New Session Button Logic ---
    newSessionButton.addEventListener('click', () => {
        console.log(`New Session clicked for view: ${currentView}`);
        // Generate new session ID for the current view
        const newId = `${currentView}_session_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(`${currentView}SessionId`, newId);
        sessionIds[currentView] = newId;
        console.log(`New ${currentView} session ID: ${sessionIds[currentView]}`);

        if (currentView === 'onepager') {
            onePagerChatMessages.innerHTML = '';
            renderMarkdown(null, onePagerOutputContent, 'onePager');
            sendMessageToOnePagerN8n("start"); // Auto-send "start"
            onePagerChatInput.focus();
        } else if (currentView === 'briefing') {
            briefingChatMessages.innerHTML = '';
            renderMarkdown(null, briefingOutputContent, 'briefing');
            localStorage.removeItem('briefingOriginalOnePager'); // Clear stored one-pager for briefing
            briefingOnePagerInputArea.value = '';
            briefingInputSection.style.display = 'block'; // Or 'flex'
            briefingMainUI.style.display = 'none';
            briefingTitleElement.textContent = 'Generated Briefing';
            briefingOnePagerInputArea.focus();
        } else if (currentView === 'report') {
            // Reset report view if implemented
            // reportChatMessages.innerHTML = '';
            // renderMarkdown(null, reportOutputContent, 'report');
        }
    });

    // --- One-Pager Feature Logic ---
    async function sendMessageToOnePagerN8n(userInput) {
        // ... (similar to your original sendMessageToN8n for one-pager)
        // - Use N8N_ONEPAGER_WEBHOOK_URL
        // - Use sessionIds.onepager
        // - Append messages to onePagerChatMessages
        // - Render output to onePagerOutputContent using 'onePager' as storage key
        // - Payload should be { userInput, sessionId: sessionIds.onepager }
        // - Response expected: { chatReply, onePagerContent }

        if (userInput.toLowerCase() !== "start") {
            appendMessage(userInput, 'user', onePagerChatMessages);
        }
        onePagerChatInput.value = '';

        try {
            console.log("Sending message to One-Pager N8n:", JSON.stringify({ userInput: userInput, sessionId: sessionIds.onepager }));
            const response = await fetch(N8N_ONEPAGER_WEBHOOK_URL, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userInput: userInput, sessionId: sessionIds.onepager })
            });
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data = await response.json();
            if (data.chatReply) appendMessage(data.chatReply, 'bot', onePagerChatMessages);
            if (data.onePagerContent !== undefined) renderMarkdown(data.onePagerContent, onePagerOutputContent, 'onePager');
        } catch (error) {
            console.error("Error in sendMessageToOnePagerN8n:", error);
            appendMessage("Error connecting to One Pager assistant.", 'bot', onePagerChatMessages);
        }
    }

    if (onePagerSendButton) {
        onePagerSendButton.addEventListener('click', () => {
            const userInput = onePagerChatInput.value.trim();
            if (userInput) sendMessageToOnePagerN8n(userInput);
        });
        onePagerChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const userInput = onePagerChatInput.value.trim();
                if (userInput) sendMessageToOnePagerN8n(userInput);
            }
        });
    }
    if (onePagerCopyButton) {
        onePagerCopyButton.addEventListener('click', () => {
            if (!onePagerRawMarkdown) { /* Handle no content */ return; }
            navigator.clipboard.writeText(onePagerRawMarkdown).then(() => { /* Feedback */ }).catch(err => { /* Error */});
        });
    }


    // --- Briefing Feature Logic ---
    async function sendToBriefingN8n(userInput, initialOnePager = null) {
        // ... (similar to your script-briefing.js sendToN8nForBriefing)
        // - Use N8N_BRIEFING_WEBHOOK_URL
        // - Use sessionIds.briefing
        // - `originalOnePagerContent` comes from localStorage.getItem('briefingOriginalOnePager')
        // - Append messages to briefingChatMessages
        // - Render output to briefingOutputContent using 'briefing' as storage key
        // - Payload: { userInput, sessionId: sessionIds.briefing, originalOnePagerContent }
        // - Response expected: { chatReply, briefingTitle, briefingContent }
        const originalOnePager = localStorage.getItem('briefingOriginalOnePager');
        if (!originalOnePager && !initialOnePager) {
             appendMessage("Error: No one-pager loaded for briefing.", 'bot', briefingChatMessages); return;
        }

        const payload = {
            userInput: userInput,
            sessionId: sessionIds.briefing,
            originalOnePagerContent: initialOnePager || originalOnePager
        };

        briefingSendButton.disabled = true; briefingChatInput.disabled = true;

        try {
            const response = await fetch(N8N_BRIEFING_WEBHOOK_URL, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            briefingSendButton.disabled = false; briefingChatInput.disabled = false; briefingChatInput.focus();
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data = await response.json();
            if (data.chatReply) appendMessage(data.chatReply, 'bot', briefingChatMessages);
            if (data.briefingTitle) briefingTitleElement.textContent = data.briefingTitle;
            if (data.briefingContent !== undefined) renderMarkdown(data.briefingContent, briefingOutputContent, 'briefing');
        } catch (error) {
            console.error("Error in sendToBriefingN8n:", error);
            appendMessage("Error connecting to Briefing assistant.", 'bot', briefingChatMessages);
            briefingSendButton.disabled = false; briefingChatInput.disabled = false;
        }
    }

    if (briefingSubmitOnePagerButton) {
        briefingSubmitOnePagerButton.addEventListener('click', () => {
            const onePagerContent = briefingOnePagerInputArea.value.trim();
            if (!onePagerContent) { alert("Please paste one-pager content."); return; }
            localStorage.setItem('briefingOriginalOnePager', onePagerContent);
            if (!sessionIds.briefing) initSessionId('briefing'); // Ensure session ID exists

            briefingInputSection.style.display = 'none';
            briefingMainUI.style.display = 'flex';
            briefingChatMessages.innerHTML = ''; // Clear previous chat
            renderMarkdown(null, briefingOutputContent, 'briefing'); // Clear previous briefing
            briefingTitleElement.textContent = 'Generated Briefing';
            appendMessage("One-pager loaded. Specify target audience (e.g., 'Executives').", 'bot', briefingChatMessages);
            briefingChatInput.focus();
        });
    }

    if (briefingSendButton) {
        briefingSendButton.addEventListener('click', () => {
            const userInput = briefingChatInput.value.trim();
            if (userInput) {
                 appendMessage(userInput, 'user', briefingChatMessages);
                 briefingChatInput.value = '';
                 sendToBriefingN8n(userInput);
            }
        });
        briefingChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const userInput = briefingChatInput.value.trim();
                if (userInput) {
                    appendMessage(userInput, 'user', briefingChatMessages);
                    briefingChatInput.value = '';
                    sendToBriefingN8n(userInput);
                }
            }
        });
    }
    if (briefingCopyButton) {
        briefingCopyButton.addEventListener('click', () => {
            if (!briefingRawMarkdown) { /* Handle no content */ return; }
            navigator.clipboard.writeText(briefingRawMarkdown).then(() => { /* Feedback */ }).catch(err => { /* Error */});
        });
    }


    // --- Report Feature Logic (Placeholder) ---
    // TODO: Implement when ready


    // --- Initial App Load ---
    initSessionId('onepager'); // Initialize session ID for the default view
    initSessionId('briefing');
    initSessionId('report');
    setActiveView('onepager'); // Set default view on load
    // Check if briefing one-pager is in localStorage and adjust briefing view
    const storedBriefingOnePager = localStorage.getItem('briefingOriginalOnePager');
    if (storedBriefingOnePager) {
        briefingOnePagerInputArea.value = storedBriefingOnePager;
    }
}); // End of DOMContentLoaded