/* ========================================
   FraudGuard AI — Client-Side Logic
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const clearBtn = document.getElementById("clear-chat-btn");
    const resizeHandle = document.getElementById("resize-handle");
    const pdfPanel = document.getElementById("pdf-panel");
    const chatPanel = document.getElementById("chat-panel");
    const welcomeTime = document.getElementById("welcome-time");

    // Set welcome time
    welcomeTime.textContent = formatTime(new Date());

    // --- Chat Input Handling ---
    chatInput.addEventListener("input", () => {
        autoResize(chatInput);
        sendBtn.disabled = chatInput.value.trim() === "";
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim()) {
                sendMessage();
            }
        }
    });

    sendBtn.addEventListener("click", () => {
        if (chatInput.value.trim()) {
            sendMessage();
        }
    });

    clearBtn.addEventListener("click", clearChat);

    // --- Send Message ---
    async function sendMessage() {
        const question = chatInput.value.trim();
        if (!question) return;

        // Add user message
        appendMessage("user", question);
        chatInput.value = "";
        autoResize(chatInput);
        sendBtn.disabled = true;

        // Show thinking indicator
        const thinkingEl = showThinking();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();

            // Remove thinking indicator
            thinkingEl.remove();

            if (response.ok) {
                appendMessage("bot", data.answer, data.sources);
            } else {
                appendMessage("bot", `⚠️ Error: ${data.error || "Something went wrong. Please try again."}`);
            }
        } catch (err) {
            thinkingEl.remove();
            appendMessage("bot", "⚠️ Could not connect to the server. Please make sure the backend is running.");
        }
    }

    // --- Append Message to Chat ---
    function appendMessage(role, text, sources = []) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${role === "user" ? "user-message" : "bot-message"}`;

        const avatar = document.createElement("div");
        avatar.className = `message-avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;

        if (role === "user") {
            avatar.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>`;
        } else {
            avatar.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>`;
        }

        const content = document.createElement("div");
        content.className = "message-content";

        const header = document.createElement("div");
        header.className = "message-header";
        header.innerHTML = `
            <span class="message-sender">${role === "user" ? "You" : "FraudGuard AI"}</span>
            <span class="message-time">${formatTime(new Date())}</span>
        `;

        const textDiv = document.createElement("div");
        textDiv.className = "message-text";
        textDiv.innerHTML = formatBotText(text);

        // Add source badges
        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement("div");
            sourcesDiv.className = "source-badges";
            sources.forEach((src) => {
                const badge = document.createElement("span");
                badge.className = "source-badge";
                badge.textContent = `📄 ${src}`;
                sourcesDiv.appendChild(badge);
            });
            textDiv.appendChild(sourcesDiv);
        }

        content.appendChild(header);
        content.appendChild(textDiv);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Thinking Indicator ---
    function showThinking() {
        const thinkingDiv = document.createElement("div");
        thinkingDiv.className = "message bot-message thinking-message";
        thinkingDiv.innerHTML = `
            <div class="message-avatar bot-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">FraudGuard AI</span>
                    <span class="message-time">${formatTime(new Date())}</span>
                </div>
                <div class="message-text">
                    <div class="thinking-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span style="color: var(--text-muted); font-size: 0.82rem;">Analyzing document...</span>
                </div>
            </div>
        `;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return thinkingDiv;
    }

    // --- Clear Chat ---
    function clearChat() {
        // Keep only the welcome message
        const messages = chatMessages.querySelectorAll(".message:not(.welcome-message)");
        messages.forEach((msg) => {
            msg.style.animation = "fadeOut 0.2s ease forwards";
            setTimeout(() => msg.remove(), 200);
        });
    }

    // --- Format Bot Text ---
    function formatBotText(text) {
        // Convert markdown-like bold
        let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Convert newlines to paragraphs
        const paragraphs = formatted.split("\n\n");
        if (paragraphs.length > 1) {
            formatted = paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
        } else {
            formatted = `<p>${formatted.replace(/\n/g, "<br>")}</p>`;
        }

        // Convert numbered lists
        formatted = formatted.replace(/(\d+)\.\s/g, '<span style="color: var(--accent-primary); font-weight: 600;">$1.</span> ');

        return formatted;
    }

    // --- Auto Resize Textarea ---
    function autoResize(textarea) {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }

    // --- Format Time ---
    function formatTime(date) {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }

    // --- Resizable Panels ---
    let isResizing = false;

    resizeHandle.addEventListener("mousedown", (e) => {
        isResizing = true;
        resizeHandle.classList.add("active");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        // Add overlay to prevent iframe from capturing mouse events
        const overlay = document.createElement("div");
        overlay.id = "resize-overlay";
        overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;cursor:col-resize;";
        document.body.appendChild(overlay);

        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;

        const containerRect = document.getElementById("main-content").getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        const totalWidth = containerRect.width;
        const handleWidth = 6;

        const leftPercent = (offsetX / totalWidth) * 100;
        const rightPercent = 100 - leftPercent;

        // Constraints
        if (leftPercent < 20 || leftPercent > 70) return;

        pdfPanel.style.flex = `0 0 calc(${leftPercent}% - ${handleWidth / 2}px)`;
        chatPanel.style.flex = `0 0 calc(${rightPercent}% - ${handleWidth / 2}px)`;
    });

    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove("active");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            const overlay = document.getElementById("resize-overlay");
            if (overlay) overlay.remove();
        }
    });

    // Add fadeOut animation
    const style = document.createElement("style");
    style.textContent = `@keyframes fadeOut { to { opacity: 0; transform: translateY(-10px); } }`;
    document.head.appendChild(style);
});

// --- Global: Ask Suggestion (clicked from chips) ---
function askSuggestion(chipEl) {
    const question = chipEl.textContent.trim();
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    chatInput.value = question;
    sendBtn.disabled = false;
    sendBtn.click();
}
