document.addEventListener('DOMContentLoaded', () => {
    // --- Get Common DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');
    const newSessionButton = document.getElementById('new-session-button');
    const appTitle = document.querySelector('.app-title');

    // --- URLs ---
    // const N8N_ONEPAGER_WEBHOOK_URL = 'http://localhost:5678/webhook/one-pager/message';
    // const N8N_BRIEFING_WEBHOOK_URL = 'http://localhost:5678/webhook/briefing/message';
    const N8N_ONEPAGER_WEBHOOK_URL = 'https://fpisa.app.n8n.cloud/webhook/one-pager/message';
    const N8N_BRIEFING_WEBHOOK_URL = 'https://fpisa.app.n8n.cloud/webhook/briefing/message';
    // const N8N_REPORT_WEBHOOK_URL = 'YOUR_N8N_REPORT_WEBHOOK_URL_HERE'; // Placeholder

    // --- State (Global for the app) ---
    let currentView = 'onepager'; // Default view
    let sessionIds = { onepager: null, briefing: null, report: null };
    // We will primarily use localStorage for content persistence.
    // These module-level vars can cache the *current output* for copy buttons if needed.
    let currentOnePagerOutputMd = '';
    let currentBriefingOutputMd = '';


    // --- Initialize Session IDs (from localStorage or new) ---
    function initSessionId(viewName) {
        let storedId = localStorage.getItem(`${viewName}SessionId`);
        if (!storedId) {
            storedId = `${viewName}_session_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`${viewName}SessionId`, storedId);
        }
        sessionIds[viewName] = storedId;
        console.log(`Initialized/Loaded ${viewName} session ID: ${sessionIds[viewName]}`);
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

    // --- Helper: Render Markdown to a specific output area & handle persistence ---
    function renderMarkdown(markdownContent, outputAreaElement, viewContext /* 'onePagerActive' or 'briefingOutput' */) {
        const contentToRender = markdownContent || '';

        if (viewContext === 'onePagerActive') {
            localStorage.setItem('onePagerActiveContent', contentToRender);
            currentOnePagerOutputMd = contentToRender; // For copy button
        } else if (viewContext === 'briefingOutput') {
            currentBriefingOutputMd = contentToRender; // For copy button
            // No need to save briefing *output* to localStorage unless you want it to persist on refresh
        }

        if (contentToRender && typeof marked === 'object' && typeof marked.parse === 'function') {
            try {
                outputAreaElement.innerHTML = marked.parse(contentToRender);
            } catch (e) {
                console.error(`Error parsing Markdown for ${viewContext}:`, e);
                outputAreaElement.textContent = `Error parsing. Raw: ${contentToRender}`;
            }
        } else if (contentToRender) {
            outputAreaElement.textContent = contentToRender;
        } else {
            outputAreaElement.innerHTML = (viewContext === 'briefingOutput') ? '<p><em>Briefing will appear here...</em></p>' : '<p><em>Content will appear here...</em></p>';
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

        if (!sessionIds[currentView]) {
            initSessionId(currentView);
        }

        // View-specific setup
        if (viewId === 'onepager') {
            const activeOnePagerMd = localStorage.getItem('onePagerActiveContent');
            renderMarkdown(activeOnePagerMd, onePagerOutputContent, 'onePagerActive');
            // Chat history for onepager is tied to its sessionId and AI Agent memory.
            // On refresh, chat UI is blank but AI memory (hopefully) persists.
            if (onePagerChatMessages.innerHTML.trim() === '') {
                onePagerChatMessages.innerHTML = ''; // Clear if switching, might have old view's message
                const promptMsg = activeOnePagerMd ? "Active one-pager loaded. Type to refine, or 'start' for a new one (this will clear the current one-pager)." : "Type 'start' to create a new one-pager.";
                appendMessage(promptMsg, 'bot', onePagerChatMessages);
            }
            onePagerChatInput.focus();
        } else if (viewId === 'briefing') {
            const activeOnePagerForBriefing = localStorage.getItem('onePagerActiveContent');
            let sourceForBriefing = activeOnePagerForBriefing; // Prioritize active one-pager

            if (!sourceForBriefing) { // If no active one-pager, check if briefing had its own
                sourceForBriefing = localStorage.getItem('briefingOriginalOnePager');
            }

            if (sourceForBriefing) {
                localStorage.setItem('briefingOriginalOnePager', sourceForBriefing); // Ensure it's set for briefing
                briefingOnePagerInputArea.value = sourceForBriefing; // Pre-fill for visibility
                briefingInputSection.style.display = 'none';
                briefingMainUI.style.display = 'flex';
                if (briefingChatMessages.innerHTML.trim() === '') { // Only prompt if chat is empty
                    briefingChatMessages.innerHTML = '';
                    renderMarkdown(null, briefingOutputContent, 'briefingOutput'); // Clear old briefing
                    briefingTitleElement.textContent = 'Generated Briefing';
                    appendMessage("Using loaded one-pager. Specify target audience (e.g., 'Executives').", 'bot', briefingChatMessages);
                }
                briefingChatInput.focus();
            } else {
                // No one-pager source available, show input area
                briefingInputSection.style.display = 'block';
                briefingMainUI.style.display = 'none';
                briefingOnePagerInputArea.value = '';
                localStorage.removeItem('briefingOriginalOnePager'); // Ensure it's clear
                briefingOnePagerInputArea.focus();
            }
        } else if (viewId === 'report') {
            // Placeholder for report view initialization
            const reportOutputContent = document.getElementById('report-output-content'); // Assuming it exists
            if(reportOutputContent) renderMarkdown(null, reportOutputContent, 'reportOutput');
            const reportChatMessages = document.getElementById('report-chat-messages');
            if(reportChatMessages && reportChatMessages.innerHTML.trim() === '') {
                    appendMessage("Report feature coming soon. Define inputs and tell me what to generate!", 'bot', reportChatMessages);
            }
        }
        console.log("Active view set to:", currentView, "with session ID:", sessionIds[currentView]);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const viewId = link.id.replace('nav-', '');
            // Clear chat for the view we are leaving IF it's not the one we are going to
            // This is a simple way to avoid chat messages bleeding over on switch.
            // More sophisticated would be to save/restore chat message arrays per view.
            if (currentView === 'onepager' && viewId !== 'onepager') onePagerChatMessages.innerHTML = '';
            if (currentView === 'briefing' && viewId !== 'briefing') briefingChatMessages.innerHTML = '';
            // Add for report if it has a chat

            setActiveView(viewId);
            window.location.hash = viewId; // Update URL hash for deep linking
        });
    });

    // --- New Session Button Logic ---
    newSessionButton.addEventListener('click', () => {
        console.log(`New Session clicked for view: ${currentView}`);
        const newId = `${currentView}_session_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(`${currentView}SessionId`, newId);
        sessionIds[currentView] = newId;
        console.log(`New ${currentView} session ID: ${sessionIds[currentView]}`);

        if (currentView === 'onepager') {
            localStorage.removeItem('onePagerActiveContent');
            onePagerChatMessages.innerHTML = '';
            renderMarkdown(null, onePagerOutputContent, 'onePagerActive');
            sendMessageToOnePagerN8n("start");
            onePagerChatInput.focus();
        } else if (currentView === 'briefing') {
            localStorage.removeItem('briefingOriginalOnePager');
            localStorage.removeItem('onePagerActiveContent'); // Also clear this so briefing doesn't pick it up
            currentBriefingOutputMd = ''; // Clear the briefing output cache
            briefingChatMessages.innerHTML = '';
            renderMarkdown(null, briefingOutputContent, 'briefingOutput');
            briefingOnePagerInputArea.value = '';
            briefingInputSection.style.display = 'block';
            briefingMainUI.style.display = 'none';
            briefingTitleElement.textContent = 'Generated Briefing';
            briefingOnePagerInputArea.focus();
        } else if (currentView === 'report') {
            // Reset report view
        }
    });


    // --- One-Pager Feature Logic ---
    async function sendMessageToOnePagerN8n(userInput) {
        if (userInput.toLowerCase() !== "start" && !userInput.startsWith("Active one-pager loaded")) {
            appendMessage(userInput, 'user', onePagerChatMessages);
        }
        onePagerChatInput.value = '';
        onePagerSendButton.disabled = true; onePagerSendButton.textContent = 'Processing...';

        try {
            const response = await fetch(N8N_ONEPAGER_WEBHOOK_URL, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userInput: userInput, sessionId: sessionIds.onepager })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`N8N OnePager Error ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            if (data.chatReply) appendMessage(data.chatReply, 'bot', onePagerChatMessages);
            if (data.onePagerContent !== undefined) renderMarkdown(data.onePagerContent, onePagerOutputContent, 'onePagerActive');
        } catch (error) {
            console.error("Error in sendMessageToOnePagerN8n:", error);
            appendMessage(`Error with One Pager assistant: ${error.message}`, 'bot', onePagerChatMessages);
        } finally {
            onePagerSendButton.disabled = false; onePagerSendButton.textContent = 'Send';
            onePagerChatInput.focus();
        }
    }

    if (onePagerSendButton) { /* ... same as before ... */
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
    if (onePagerCopyButton) { /* ... same as before, uses currentOnePagerOutputMd ... */
        onePagerCopyButton.addEventListener('click', () => {
            const markdownToCopy = currentOnePagerOutputMd || localStorage.getItem('onePagerActiveContent') || ''; // Fallback
            if (!markdownToCopy) {
                onePagerCopyButton.textContent = 'Nothing to Copy';
                setTimeout(() => { onePagerCopyButton.textContent = 'Copy MD'; }, 1000); return;
            }
            navigator.clipboard.writeText(markdownToCopy).then(() => { /* ... */ }).catch(err => { /* ... */});
        });
    }

    // --- Briefing Feature Logic ---
    async function sendToBriefingN8n(userInput) {
        const originalOnePager = localStorage.getItem('briefingOriginalOnePager');
        if (!originalOnePager) {
                appendMessage("Error: No one-pager loaded for briefing. Please use the 'Load One-Pager' button or switch to the 'One Pager' tab to create one.", 'bot', briefingChatMessages); return;
        }

        const payload = {
            userInput: userInput,
            sessionId: sessionIds.briefing,
            originalOnePagerContent: originalOnePager
        };

        briefingSendButton.disabled = true; briefingSendButton.textContent = 'Processing...'; briefingChatInput.disabled = true;

        try {
            const response = await fetch(N8N_BRIEFING_WEBHOOK_URL, { /* ... */ method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`N8N Briefing Error ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            if (data.chatReply) appendMessage(data.chatReply, 'bot', briefingChatMessages);
            if (data.briefingTitle) briefingTitleElement.textContent = data.briefingTitle;
            if (data.briefingContent !== undefined) renderMarkdown(data.briefingContent, briefingOutputContent, 'briefingOutput');
        } catch (error) {
            console.error("Error in sendToBriefingN8n:", error);
            appendMessage(`Error with Briefing assistant: ${error.message}`, 'bot', briefingChatMessages);
        } finally {
            briefingSendButton.disabled = false; briefingSendButton.textContent = 'Send'; briefingChatInput.disabled = false; briefingChatInput.focus();
        }
    }

    if (briefingSubmitOnePagerButton) { /* ... same as before ... */
        briefingSubmitOnePagerButton.addEventListener('click', () => {
            const onePagerContent = briefingOnePagerInputArea.value.trim();
            if (!onePagerContent) { alert("Please paste one-pager content."); return; }
            localStorage.setItem('briefingOriginalOnePager', onePagerContent);
            if (!sessionIds.briefing) initSessionId('briefing');

            briefingInputSection.style.display = 'none';
            briefingMainUI.style.display = 'flex';
            briefingChatMessages.innerHTML = '';
            renderMarkdown(null, briefingOutputContent, 'briefingOutput');
            briefingTitleElement.textContent = 'Generated Briefing';
            appendMessage("One-pager loaded. Specify target audience (e.g., 'Executives').", 'bot', briefingChatMessages);
            briefingChatInput.focus();
        });
    }

    if (briefingSendButton && briefingChatInput) { // Check both exist
        briefingSendButton.addEventListener('click', () => {
            const userInput = briefingChatInput.value.trim();
            if (userInput) {
                 appendMessage(userInput, 'user', briefingChatMessages); // Manually append here
                 briefingChatInput.value = ''; // Manually clear here
                 sendToBriefingN8n(userInput);
            }
        });
        briefingChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const userInput = briefingChatInput.value.trim();
                if (userInput) {
                    appendMessage(userInput, 'user', briefingChatMessages); // Manually append here
                    briefingChatInput.value = ''; // Manually clear here
                    sendToBriefingN8n(userInput);
                }
            }
        });
    }

    if (briefingCopyButton) { /* ... same as before, uses currentBriefingOutputMd ... */
        briefingCopyButton.addEventListener('click', () => {
            const markdownToCopy = currentBriefingOutputMd || '';
            if (!markdownToCopy) { /* ... */ return; }
            navigator.clipboard.writeText(markdownToCopy).then(() => { /* ... */ }).catch(err => { /* ... */});
        });
    }

    // --- Report Feature Logic (Placeholder) ---
    // TODO: Implement when ready

    // --- Initial App Load ---
    // Initialize all session IDs
    ['onepager', 'briefing', 'report'].forEach(viewName => initSessionId(viewName));

    // Set view based on URL hash or default to 'onepager'
    const initialHash = window.location.hash.substring(1);
    const validViews = ['onepager', 'briefing', 'report'];
    const viewToLoad = validViews.includes(initialHash) ? initialHash : 'onepager';
    setActiveView(viewToLoad); // This will also load content for the active view

    // Listen for hash changes to update view (e.g., if user uses browser back/forward)
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (validViews.includes(newHash) && newHash !== currentView) {
            setActiveView(newHash);
        }
    });

}); // End of DOMContentLoaded