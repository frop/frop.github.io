document.addEventListener('DOMContentLoaded', () => {
    // --- Get Common DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');
    const newDocumentButton = document.getElementById('new-document-button');
    const appTitle = document.querySelector('.app-title');

    const USER_ID = 'frop';
    
    const N8N_LIST_DOCUMENTS_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/mydocuments' 
        : 'https://fpisa.app.n8n.cloud/webhook/mydocuments';

    const N8N_GET_DOCUMENT_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/mydocument' 
        : 'https://fpisa.app.n8n.cloud/webhook/mydocument';

    const N8N_ONEPAGER_WEBHOOK_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/one-pager/message' 
        : 'https://fpisa.app.n8n.cloud/webhook/one-pager/message';

    const N8N_ONEPAGER_SAVE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/one-pager/save' 
        : 'https://fpisa.app.n8n.cloud/webhook/one-pager/save';

    const N8N_BRIEFING_WEBHOOK_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/briefing/message' 
        : 'https://fpisa.app.n8n.cloud/webhook/briefing/message';

    const N8N_REPORT_WEBHOOK_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5678/webhook/report/message' 
        : 'https://fpisa.app.n8n.cloud/webhook/report/message';

    // --- State (Global for the app) ---
    let currentView = 'onepager'; // Default view
    let documentIds = { onepager: null, briefing: null, report: null };
    // We will primarily use localStorage for content persistence.
    // These module-level vars can cache the *current output* for copy buttons if needed.
    let currentOnePagerOutputMd = '';
    let currentBriefingOutputMd = '';
    let currentReportOutputMd = '';

    // --- Initialize document IDs (from localStorage or new) ---
    function initDocumentId(viewName) {
        let storedId = localStorage.getItem(`${viewName}DocumentId`);
        if (!storedId) {
            storedId = `${viewName}_document_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`${viewName}DocumentId`, storedId);
        }
        documentIds[viewName] = storedId;
        console.log(`Initialized/Loaded ${viewName} document ID: ${documentIds[viewName]}`);
    }

    // --- DOM Elements for My Documents View ---
    const myDocumentsView = document.getElementById('mydocuments-view'); // The view itself
    const documentsListUL = document.getElementById('documents-list');
    const loadingDocumentsMessage = document.getElementById('loading-documents-message');
    const noDocumentsMessage = document.getElementById('no-documents-message');

    // --- DOM Elements for One-Pager View ---
    const onePagerChatInput = document.getElementById('one-pager-chat-input');
    const onePagerSendButton = document.getElementById('one-pager-send-button');
    const onePagerChatMessages = document.getElementById('one-pager-chat-messages');
    const onePagerOutputContent = document.getElementById('one-pager-output-content');
    const onePagerCopyButton = document.getElementById('one-pager-copy-button');
    const onePagerSaveButton = document.getElementById('one-pager-save-button');

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

    // --- Add to DOM Elements for Report View ---
    const reportChatInput = document.getElementById('report-chat-input');
    const reportSendButton = document.getElementById('report-send-button');
    const reportChatMessages = document.getElementById('report-chat-messages');
    const reportTitleElement = document.getElementById('report-title');
    const reportOutputContent = document.getElementById('report-output-content');
    const reportCopyButton = document.getElementById('report-copy-button');

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
        } else if (viewContext === 'reportOutput') {
            currentReportOutputMd = contentToRender;
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
            let placeholder = '<p><em>Content will appear here...</em></p>';
            if (viewContext === 'briefingOutput') placeholder = '<p><em>Briefing will appear here...</em></p>';
            if (viewContext === 'reportOutput') placeholder = '<p><em>Your generated report will appear here...</em></p>'; // ADDED
            outputAreaElement.innerHTML = placeholder;
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

        if (!documentIds[currentView]) {
            initDocumentId(currentView);
        }

        if (viewId === 'mydocuments') {
            fetchAndDisplayUserDocuments();
        } else if (viewId === 'onepager') {
            const activeOnePagerMd = localStorage.getItem('onePagerActiveContent');
            renderMarkdown(activeOnePagerMd, onePagerOutputContent, 'onePagerActive');
            // Chat history for onepager is tied to its documentId and AI Agent memory.
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
            // renderMarkdown(null, reportOutputContent, 'reportOutput'); // Clear previous report output
            if (reportChatMessages && reportChatMessages.innerHTML.trim() === '') {
                reportChatMessages.innerHTML = ''; // Clear chat if switching
                const activeOnePager = localStorage.getItem('onePagerActiveContent');
                if (activeOnePager) {
                    // Extract a title or snippet for display if possible (simple version here)
                    const titleSnippet = activeOnePager.split('\\n')[0].replace(/^##\s*/, '').substring(0, 30);
                    appendMessage(`Using active one-pager ("${titleSnippet}..."). Describe the report you need based on this document.`, 'bot', reportChatMessages);
                } else {
                    appendMessage("No active one-pager found. Describe the report you need (you might be prompted for more details or to create a one-pager first).", 'bot', reportChatMessages);
                }
            }
            if (reportChatInput) reportChatInput.focus();
        }
        console.log("Active view set to:", currentView, "with document ID:", documentIds[currentView]);
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

    // --- New Document Button Logic ---
    newDocumentButton.addEventListener('click', () => {
        console.log(`New Document clicked for view: ${currentView}`);
        const newId = `${currentView}_document_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(`${currentView}DocumentId`, newId);
        localStorage.removeItem('onePagerActiveContent');
        localStorage.removeItem('briefingOriginalOnePager');
        localStorage.removeItem('reportActiveContent');

        documentIds[currentView] = newId;
        console.log(`New ${currentView} document ID: ${documentIds[currentView]}`);

        if (onePagerChatMessages) onePagerChatMessages.innerHTML = '';
        renderMarkdown(null, onePagerOutputContent, 'onePagerActive');
        sendMessageToOnePagerN8n("start"); // This will use the new documentIds.onepager
    
        // Switch to onepager view if not already there
        if (currentView !== 'onepager') {
            setActiveView('onepager');
            window.location.hash = 'onepager';
        } else {
            // If already on onepager view, just ensure focus
            if (onePagerChatInput) onePagerChatInput.focus();
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
                body: JSON.stringify({ userInput: userInput, documentId: documentIds.onepager })
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
            documentId: documentIds.briefing,
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

    if (briefingSubmitOnePagerButton) {
        briefingSubmitOnePagerButton.addEventListener('click', () => {
            const onePagerContent = briefingOnePagerInputArea.value.trim();
            if (!onePagerContent) { alert("Please paste one-pager content."); return; }
            localStorage.setItem('briefingOriginalOnePager', onePagerContent);
            if (!documentIds.briefing) initDocumentId('briefing');

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

    // --- Report Feature Logic ---
    async function sendToReportN8n(userInput) {
        const activeOnePager = localStorage.getItem('onePagerActiveContent');

        const payload = {
            userInput: userInput,
            documentId: documentIds.report,
            onePagerSourceContent: activeOnePager || null
        };

        reportSendButton.disabled = true; reportSendButton.textContent = 'Generating...';
        if(reportChatInput) reportChatInput.disabled = true;

        try {
            const response = await fetch(N8N_REPORT_WEBHOOK_URL, { // Ensure N8N_REPORT_WEBHOOK_URL is defined
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`N8N Report Error ${response.status}: ${errorText}`);
            }
            const data = await response.json();

            if (data.chatReply) appendMessage(data.chatReply, 'bot', reportChatMessages);
            if (data.reportTitle) reportTitleElement.textContent = data.reportTitle;
            if (data.reportContent !== undefined) renderMarkdown(data.reportContent, reportOutputContent, 'reportOutput');

        } catch (error) {
            console.error("Error in sendToReportN8n:", error);
            appendMessage(`Error with Report assistant: ${error.message}`, 'bot', reportChatMessages);
        } finally {
            reportSendButton.disabled = false; reportSendButton.textContent = 'Generate Report';
            if(reportChatInput) {
                reportChatInput.disabled = false;
                reportChatInput.focus();
            }
        }
    }

    if (reportSendButton && reportChatInput) {
        reportSendButton.addEventListener('click', () => {
            const userInput = reportChatInput.value.trim();
            if (userInput) {
                appendMessage(userInput, 'user', reportChatMessages);
                reportChatInput.value = '';
                sendToReportN8n(userInput); // Call the placeholder (or future implemented) function
            }
        });
        reportChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const userInput = reportChatInput.value.trim();
                if (userInput) {
                    appendMessage(userInput, 'user', reportChatMessages);
                    reportChatInput.value = '';
                    sendToReportN8n(userInput);
                }
            }
        });
    }

    if (reportCopyButton) {
        reportCopyButton.addEventListener('click', () => {
            const markdownToCopy = currentReportOutputMd || '';
            if (!markdownToCopy) {
                reportCopyButton.textContent = 'Nothing to Copy';
                setTimeout(() => { reportCopyButton.textContent = 'Copy Report'; }, 1000);
                return;
            }
            navigator.clipboard.writeText(markdownToCopy).then(() => {
                const originalText = 'Copy Report';
                reportCopyButton.textContent = 'Copied!';
                reportCopyButton.classList.add('copied'); // Assuming you have .copied style
                setTimeout(() => {
                    reportCopyButton.textContent = originalText;
                    reportCopyButton.classList.remove('copied');
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy report: ', err);
                alert('Could not copy report.');
            });
        });
    }

    if (onePagerSaveButton) {
        onePagerSaveButton.addEventListener('click', async () => {
            const onePagerContentToSave = localStorage.getItem('onePagerActiveContent');

            if (!onePagerContentToSave || onePagerContentToSave.trim() === '') {
                appendMessage("Nothing to save. Please generate or refine a one-pager first.", 'bot', onePagerChatMessages);
                return;
            }

            const documentName = window.prompt("Enter a name for this one-pager (e.g., 'Project Phoenix Q3 Plan'):", "My One-Pager");

            if (!documentName || documentName.trim() === '') {
                appendMessage("Save cancelled. No name provided.", 'bot', onePagerChatMessages);
                return;
            }

            const originalButtonText = onePagerSaveButton.textContent;
            onePagerSaveButton.textContent = 'Saving...';
            onePagerSaveButton.disabled = true;
            onePagerSaveButton.classList.add('saving');

            try {
                const payload = {
                    name: documentName.trim(),
                    content: onePagerContentToSave,
                    userId: USER_ID,
                    documentId: documentIds.onepager
                };
                console.log("Sending to save one-pager:", payload.name);

                const response = await fetch(N8N_ONEPAGER_SAVE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json(); // Assuming n8n sends JSON errors
                    throw new Error(errorData.message || `Failed to save. Server responded with ${response.status}`);
                }

                const result = await response.json();
                appendMessage(result.message || "One-pager saved successfully!", 'bot', onePagerChatMessages);
                console.log("Save result:", result);

            } catch (error) {
                console.error("Error saving one-pager:", error);
                appendMessage(`Error: ${error.message || 'Could not save the one-pager.'}`, 'bot', onePagerChatMessages);
            } finally {
                onePagerSaveButton.textContent = originalButtonText;
                onePagerSaveButton.disabled = false;
                onePagerSaveButton.classList.remove('saving');
            }
        });
    }

    async function fetchAndDisplayUserDocuments() {
        documentsListUL.innerHTML = '';
        loadingDocumentsMessage.style.display = 'block';
        noDocumentsMessage.style.display = 'none';

        try {
            const payload = { userId: USER_ID };
            console.log("Fetching documents for user:", USER_ID);

            const response = await fetch(N8N_LIST_DOCUMENTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            loadingDocumentsMessage.style.display = 'none';

            // --- DEBUGGING STARTS HERE ---
            const rawResponseText = await response.clone().text(); // Clone to read body twice

            if (!response.ok) {
                throw new Error(`Failed to load documents: ${response.status} ${rawResponseText}`);
            }

            const documentsData = await response.json(); // Changed variable name for clarity

            if (documentsData && documentsData.length > 0) {
                documentsData.forEach(doc => { // Iterate over the correct array
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <span class="doc-name">${doc.DocumentName || 'Untitled Document'}</span>
                        <span class="doc-meta">${doc.SavedAt ? new Date(doc.SavedAt).toLocaleString() : 'N/A'}</span>
                    `;
                    listItem.dataset.docid = doc.DocumentID;
                    // If list response includes full content, store it too:
                    // listItem.dataset.doccontent = doc.Content; // Note: 'Content' not 'content' from your example

                    // Pass the actual 'Content' field
                    listItem.addEventListener('click', () => loadDocumentIntoEditor(doc.DocumentID, doc.Content));
                    documentsListUL.appendChild(listItem);
                });
            } else {
                noDocumentsMessage.style.display = 'block';
            }

        } catch (error) {
            console.error("Error fetching documents:", error);
            loadingDocumentsMessage.style.display = 'none';
            documentsListUL.innerHTML = `<li>Error loading documents: ${error.message}</li>`;
        }
    }

    async function loadDocumentIntoEditor(documentId, contentFromList = null) {
        console.log("Request to load document:", documentId);
        appendMessage("Loading selected document...", 'bot', onePagerChatMessages); // Give feedback in onepager chat
    
        let documentContent = contentFromList;
    
        if (!documentContent) { // If full content wasn't in the list, fetch it
            try {
                const payload = { userId: USER_ID, documentId: documentId };
                const response = await fetch(N8N_GET_DOCUMENT_URL, {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error("Failed to fetch document content.");
                const docData = await response.json();
                documentContent = docData.content; // Assuming n8n returns { content: "..." }
            } catch (error) {
                console.error("Error fetching full document content:", error);
                appendMessage(`Error loading document: ${error.message}`, 'bot', onePagerChatMessages);
                setActiveView('mydocuments'); // Go back to list on error
                return;
            }
        }
    
        if (documentContent) {
            localStorage.setItem('onePagerActiveDocumentID', documentId); // Store ID of active doc
            localStorage.setItem('onePagerActiveContent', documentContent);
    
            // Create a new session ID for the onepager view for this loaded document
            // This ensures the AI's memory for onepager is fresh for this document.
            const newOnePagerSessionId = `onepager_session_` + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`onepagerSessionId`, newOnePagerSessionId);
            documentIds.onepager = newOnePagerSessionId;
            console.log(`New onepager session for loaded doc ${documentId}: ${documentIds.onepager}`);
    
            // Clear current chat and render
            if (onePagerChatMessages) onePagerChatMessages.innerHTML = '';
            renderMarkdown(documentContent, onePagerOutputContent, 'onePagerActive'); // Renders and saves to onePagerActiveContent again
            appendMessage(`Loaded document: "${documentId.substring(0,10)}...". You can now refine it.`, 'bot', onePagerChatMessages);
    
            setActiveView('onepager'); // Switch to the onepager editor view
            window.location.hash = 'onepager'; // Update hash
        } else {
            appendMessage("Could not load document content.", 'bot', onePagerChatMessages);
            setActiveView('mydocuments');
        }
    }

    // --- Initial App Load ---
    // Initialize all document IDs
    ['onepager', 'briefing', 'report'].forEach(viewName => initDocumentId(viewName));

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