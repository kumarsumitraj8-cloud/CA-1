// ChatGPT Web Assistant Application Logic
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const mainContainer = document.getElementById("mainContainer");
  const chat = document.getElementById("chat");
  const hero = document.getElementById("hero");
  const suggestions = document.getElementById("suggestions");
  const userInput = document.getElementById("userInput");
  const voiceBtn = document.getElementById("voiceBtn");
  const voiceIcon = document.getElementById("voiceIcon");
  const voiceLabel = document.querySelector(".voice-label");
  const newChatBtn = document.getElementById("newChatBtn");
  
  // Model Menu
  const modelBtn = document.getElementById("modelBtn");
  const modelMenu = document.getElementById("modelMenu");
  const currentModel = document.getElementById("currentModel");
  
  // Chips
  const attachBtn = document.getElementById("attachBtn");
  const searchBtn = document.getElementById("searchBtn");
  const reasonBtn = document.getElementById("reasonBtn");
  const fileInput = document.getElementById("fileInput");
  const attachmentPreview = document.getElementById("attachmentPreview");
  const fileNameSpan = document.getElementById("fileName");
  const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");
  
  // Suggestion Pills & More Menu
  const pills = document.querySelectorAll(".pill[data-prompt]");
  const moreBtn = document.getElementById("moreBtn");
  const moreMenu = document.getElementById("moreMenu");
  const moreItems = document.querySelectorAll(".more-item");
  
  // Auth Modal
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const helpBtn = document.getElementById("helpBtn");
  const authModal = document.getElementById("authModal");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalSubmitBtn = document.getElementById("modalSubmitBtn");
  const modalToggleBtn = document.getElementById("modalToggleBtn");
  const modalToggleText = document.getElementById("modalToggleText");
  const authForm = document.getElementById("authForm");
  
  // Voice Overlay
  const voiceOverlay = document.getElementById("voiceOverlay");
  const stopVoiceBtn = document.getElementById("stopVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  // State
  let attachedFile = null;
  let isListening = false;
  let selectedModel = "ChatGPT (GPT-4o)";
  let isAuthLogin = true;

  // SVG Icons
  const voiceSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
      <path d="M4 10v4"/><path d="M8 6v12"/><path d="M12 3v18"/><path d="M16 8v8"/><path d="M20 11v2"/>
    </svg>
  `;

  const sendSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  `;

  const botAvatarSvg = `
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.28 10.37c-.17-.7-.52-1.34-1.01-1.85-.02-.38-.1-.76-.23-1.12a5.45 5.45 0 0 0-2.83-3.14 5.37 5.37 0 0 0-4.05-.18 5.42 5.42 0 0 0-3.66-1.57c-2.45 0-4.57 1.62-5.23 3.99a5.4 5.4 0 0 0-3.32 2.39 5.42 5.42 0 0 0 .52 5.92c-.17.7-.17 1.45 0 2.15.2.7.55 1.34 1.04 1.85.02.38.1.76.23 1.12a5.44 5.44 0 0 0 2.83 3.14 5.37 5.37 0 0 0 4.05.18 5.42 5.42 0 0 0 3.66 1.57c2.45 0 4.57-1.62 5.23-3.99a5.4 5.4 0 0 0 3.32-2.39 5.42 5.42 0 0 0-.54-5.92c.18-.7.18-1.45 0-2.15l-.04-.15zm-8.87 11.02a3.86 3.86 0 0 1-2.44-.86l.12-.07 4.06-2.34a.8.8 0 0 0 .4-.69v-5.71l1.71.99a.08.08 0 0 1 .04.06v5.27a3.89 3.89 0 0 1-3.89 3.35zm-8.11-4.08a3.88 3.88 0 0 1-.5-2.54c.05.02.1.05.16.08l4.06 2.34c.24.14.54.14.78 0l4.95-2.85v1.98a.07.07 0 0 1-.03.06l-4.56 2.63a3.89 3.89 0 0 1-4.86-1.7zm-1.12-8.31c.32-.73.84-1.36 1.5-1.8l-.06.12v4.69a.8.8 0 0 0 .4.69l4.95 2.85-1.71.99a.08.08 0 0 1-.07 0l-4.56-2.63a3.89 3.89 0 0 1-.45-4.91zm14.19 3.23-4.95-2.86 1.71-.99a.08.08 0 0 1 .07 0l4.56 2.63a3.89 3.89 0 0 1-.47 6.71l-.1-.05-4.06-2.35a.8.8 0 0 0-.76 0v-3.09zm2.46-3.82c-.05-.03-.1-.05-.16-.08l-4.06-2.34a.79.79 0 0 0-.78 0l-4.95 2.85v-1.98a.07.07 0 0 1 .03-.06l4.56-2.63a3.89 3.89 0 0 1 5.36 4.24zm-8.83-2.14 4.06 2.35a.8.8 0 0 0 .78 0v4.69l-.12-.07-4.06-2.34a.8.8 0 0 0-.78 0l-4.95 2.85v-1.98l4.56-2.63a3.89 3.89 0 0 1 .51-2.87z"/>
    </svg>
  `;

  // Update Voice / Send Button based on input
  function updateComposerButton() {
    const hasText = userInput.value.trim().length > 0 || attachedFile !== null;
    if (hasText) {
      voiceIcon.innerHTML = sendSvg;
      voiceLabel.textContent = "Send";
      voiceBtn.classList.add("send-mode");
      voiceBtn.title = "Send message";
    } else {
      voiceIcon.innerHTML = voiceSvg;
      voiceLabel.textContent = "Voice";
      voiceBtn.classList.remove("send-mode");
      voiceBtn.title = "Voice input";
    }
  }

  // Switch to Chat Layout
  function activateChatMode() {
    mainContainer.classList.add("chatting");
    if (hero) hero.style.display = "none";
    if (suggestions) suggestions.style.display = "none";
  }

  // Reset chat to Welcome state
  function resetChat() {
    chat.innerHTML = "";
    userInput.value = "";
    removeAttachment();
    mainContainer.classList.remove("chatting");
    if (hero) hero.style.display = "block";
    if (suggestions) suggestions.style.display = "flex";
    updateComposerButton();
    userInput.focus();
  }

  // Scroll chat to bottom
  function scrollToBottom() {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  }

  // Add User Message
  function addUserMessage(text, file) {
    const msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper user";

    let fileHtml = "";
    if (file) {
      fileHtml = `<div style="font-size: 12px; font-weight: 500; margin-bottom: 6px; padding: 4px 8px; background: rgba(0,0,0,0.06); border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">📎 ${escapeHtml(file.name)}</div><br>`;
    }

    msgWrapper.innerHTML = `
      <div class="msg-bubble">
        ${fileHtml}
        ${escapeHtml(text)}
      </div>
    `;

    chat.appendChild(msgWrapper);
    scrollToBottom();
  }

  // Add Bot Typing Indicator
  function addTypingIndicator() {
    const msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper bot typing-indicator-wrapper";
    msgWrapper.innerHTML = `
      <div class="bot-container">
        <div class="bot-avatar">${botAvatarSvg}</div>
        <div class="bot-content">
          <div class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    `;
    chat.appendChild(msgWrapper);
    scrollToBottom();
    return msgWrapper;
  }

  // Render Bot Message with Typewriter Streaming Effect
  function streamBotResponse(fullText, meta = {}) {
    const msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper bot";

    let metaHtml = "";
    if (meta.reasoning) {
      metaHtml += `
        <div class="reasoning-box">
          <strong>Thought for 2 seconds</strong><br>
          <span style="font-size: 12.5px; color: #6b7280;">• Analyzed context and user requirements<br>• Structured clear step-by-step guidance</span>
        </div>
      `;
    }

    if (meta.search) {
      metaHtml += `
        <div class="search-sources">
          <span class="source-badge">🌐 web.dev</span>
          <span class="source-badge">🌐 MDN Web Docs</span>
          <span class="source-badge">🌐 GitHub</span>
        </div>
      `;
    }

    const container = document.createElement("div");
    container.className = "bot-container";
    container.innerHTML = `
      <div class="bot-avatar">${botAvatarSvg}</div>
      <div class="bot-content">
        ${metaHtml}
        <div class="text-stream"></div>
      </div>
    `;
    msgWrapper.appendChild(container);
    chat.appendChild(msgWrapper);

    const streamTarget = container.querySelector(".text-stream");
    let index = 0;
    const speed = 12; // ms per chunk

    function typeNextChunk() {
      if (index < fullText.length) {
        const chunk = fullText.slice(0, index + 3);
        index += 3;
        streamTarget.innerHTML = formatMarkdown(chunk);
        scrollToBottom();
        setTimeout(typeNextChunk, speed);
      } else {
        streamTarget.innerHTML = formatMarkdown(fullText);
        scrollToBottom();
      }
    }

    typeNextChunk();
  }

  // Simple Markdown Formatter
  function formatMarkdown(text) {
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Code inline
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    // Bullet lists
    html = html.replace(/^\s*[-•]\s+(.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
    // Line breaks to paragraphs
    const paragraphs = html.split(/\n\n+/);
    return paragraphs.map(p => {
      if (p.startsWith("<ul>") || p.startsWith("<pre>")) return p;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Smart Context-Aware Bot Answer Generator
  function generateBotReply(prompt, hasFile, isReason, isSearch) {
    const lower = prompt.toLowerCase();

    if (lower.includes("plan") || lower.includes("learn web development")) {
      return `Here is a tailored **30-Day Web Development Mastery Plan**:\n\n` +
        `• **Week 1: Foundations** - HTML5 semantic structure, modern CSS layouts (Flexbox & Grid), responsive design principles.\n` +
        `• **Week 2: JavaScript Core** - DOM manipulation, event listeners, array methods, fetch API, and state handling.\n` +
        `• **Week 3: Interactive Web Apps** - Building interactive UIs (like this ChatGPT clone), local storage, and modular components.\n` +
        `• **Week 4: Deployment & Polish** - Git/GitHub version control, accessibility checks, and publishing to Vercel/GitHub Pages.\n\n` +
        `Would you like to start with day-by-day practice tasks or recommended resources?`;
    }

    if (lower.includes("write") || lower.includes("email") || lower.includes("follow-up")) {
      return `Here is a polite and professional follow-up email:\n\n` +
        `**Subject:** Thank You - Follow-Up on [Position Title] Interview\n\n` +
        `Dear [Interviewer's Name],\n\n` +
        `Thank you so much for taking the time to speak with me today about the [Position Title] role. I really enjoyed learning more about the team's upcoming initiatives and how this position contributes to your mission.\n\n` +
        `Our discussion further reinforced my enthusiasm for the role and my confidence that my skills in web development and problem-solving would make a positive impact.\n\n` +
        `Please let me know if you need any additional information from my side. I look forward to hearing about the next steps.\n\n` +
        `Warm regards,\n` +
        `[Your Name]`;
    }

    if (lower.includes("image") || lower.includes("vision") || lower.includes("photo")) {
      return `Computer vision models analyze images through a structured multi-layer pipeline:\n\n` +
        `1. **Feature Extraction:** Convolutional layers or Vision Transformers (ViT) scan pixel arrays for low-level features (edges, textures, colors).\n` +
        `2. **Pattern Recognition:** Higher layers combine edges into shapes, objects, textures, and facial geometries.\n` +
        `3. **Classification & Segmentation:** The neural network outputs high-confidence object boundaries and semantic descriptions.\n\n` +
        `You can use the **Attach** button to upload an image and test visual comprehension anytime!`;
    }

    if (lower.includes("brainstorm") || lower.includes("startup") || lower.includes("ideas")) {
      return `Here are **5 innovative AI + Green Energy startup ideas**:\n\n` +
        `1. **GridPulse AI:** Predictive load balancer forecasting microgrid renewable energy fluctuations with sub-minute precision.\n` +
        `2. **SolarSense Drone OS:** Autonomous drone computer vision detecting microscopic solar panel micro-cracks and dust degradation.\n` +
        `3. **EcoFleet Optimizer:** Real-time dynamic EV routing based on grid tariff lows and renewable surplus hours.\n` +
        `4. **CarbonTrace Copilot:** Automated ESG regulatory compliance auditing for supply chain emissions tracking.\n` +
        `5. **HomeWatt AI:** Smart residential breaker automation shifting high-draw appliances to solar peak hours.`;
    }

    if (lower.includes("quantum") || lower.includes("explain")) {
      return `Imagine a regular computer switch like a light switch: it can either be **OFF (0)** or **ON (1)**.\n\n` +
        `A **Quantum Computer** uses tiny particles that can be **both ON and OFF at the same time** (called *Superposition*), like a spinning coin in mid-air!\n\n` +
        `Because of this magic, it can test millions of maze pathways all at once, solving problems that would take supercomputers thousands of years in just seconds!`;
    }

    if (hasFile) {
      return `I received **${escapeHtml(attachedFile.name)}**!\n\n` +
        `I have processed the uploaded attachment alongside your query: *" ${prompt} "*.\n\n` +
        `The file is verified and parsed successfully. What specific insights, summaries, or actions would you like me to perform on this file?`;
    }

    // Default intelligent ChatGPT reply
    return `I can definitely help you with that!\n\n` +
      `Regarding **${escapeHtml(prompt)}**:\n\n` +
      `• **Key Takeaway:** Breaking complex goals into modular components ensures scalable results.\n` +
      `• **Implementation Tip:** Keep code clean, reusable, and responsive across all device sizes.\n\n` +
      `Feel free to ask follow-up questions, request code snippets, or explore alternative angles!`;
  }

  // Send Message Action
  function sendMessage() {
    const text = userInput.value.trim();
    if (!text && !attachedFile) return;

    activateChatMode();

    const currentFile = attachedFile;
    addUserMessage(text, currentFile);

    userInput.value = "";
    removeAttachment();
    updateComposerButton();

    // Check chips states
    const isReason = reasonBtn.classList.contains("active");
    const isSearch = searchBtn.classList.contains("active");

    const typingIndicator = addTypingIndicator();

    setTimeout(() => {
      typingIndicator.remove();
      const reply = generateBotReply(text, !!currentFile, isReason, isSearch);
      streamBotResponse(reply, { reasoning: isReason, search: isSearch });
    }, 700);
  }

  // File Attachment Handling
  function removeAttachment() {
    attachedFile = null;
    fileInput.value = "";
    attachmentPreview.classList.remove("show");
    fileNameSpan.textContent = "";
    updateComposerButton();
  }

  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      attachedFile = e.target.files[0];
      fileNameSpan.textContent = attachedFile.name;
      attachmentPreview.classList.add("show");
      updateComposerButton();
      userInput.focus();
    }
  });

  removeAttachmentBtn.addEventListener("click", removeAttachment);

  // Chips Toggle (Search / Reason)
  [searchBtn, reasonBtn].forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
    });
  });

  // Suggestion Pills Click
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const prompt = pill.getAttribute("data-prompt") || pill.textContent.trim();
      userInput.value = prompt;
      sendMessage();
    });
  });

  // More Menu
  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("open");
  });

  moreItems.forEach((item) => {
    item.addEventListener("click", () => {
      const prompt = item.getAttribute("data-prompt");
      moreMenu.classList.remove("open");
      userInput.value = prompt;
      sendMessage();
    });
  });

  // Model Menu
  modelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    modelMenu.classList.toggle("open");
  });

  document.querySelectorAll(".model-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".model-option").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      const modelName = opt.getAttribute("data-model");
      currentModel.textContent = modelName;
      selectedModel = modelName;
      modelMenu.classList.remove("open");
    });
  });

  // Close menus on outside click
  document.addEventListener("click", () => {
    modelMenu.classList.remove("open");
    moreMenu.classList.remove("open");
  });

  // Composer Input Events
  userInput.addEventListener("input", updateComposerButton);

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Voice / Send Button Click
  voiceBtn.addEventListener("click", () => {
    if (userInput.value.trim() || attachedFile) {
      sendMessage();
      return;
    }
    // Open Voice Modal
    voiceOverlay.classList.add("open");
    voiceStatus.textContent = "Listening... Speak now";
    isListening = true;

    // Use Web Speech Recognition if available
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        voiceOverlay.classList.remove("open");
        updateComposerButton();
        sendMessage();
      };

      recognition.onerror = () => {
        voiceStatus.textContent = "Listening simulated. Click Done to test.";
      };

      recognition.start();
    }
  });

  stopVoiceBtn.addEventListener("click", () => {
    voiceOverlay.classList.remove("open");
    if (!userInput.value.trim()) {
      userInput.value = "Hello ChatGPT, what can you do?";
      updateComposerButton();
      sendMessage();
    }
  });

  // New Chat Action
  newChatBtn.addEventListener("click", resetChat);

  // Auth Modal (Login & Signup)
  function openAuthModal(isLogin) {
    isAuthLogin = isLogin;
    modalTitle.textContent = isLogin ? "Welcome back" : "Create your account";
    modalSubtitle.textContent = isLogin ? "Log in to your ChatGPT account" : "Sign up to start chatting with ChatGPT";
    modalSubmitBtn.textContent = isLogin ? "Log in" : "Sign up";
    modalToggleText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
    modalToggleBtn.textContent = isLogin ? "Sign up" : "Log in";
    authModal.classList.add("open");
  }

  loginBtn.addEventListener("click", () => openAuthModal(true));
  signupBtn.addEventListener("click", () => openAuthModal(false));

  modalClose.addEventListener("click", () => authModal.classList.remove("open"));

  modalToggleBtn.addEventListener("click", () => openAuthModal(!isAuthLogin));

  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) authModal.classList.remove("open");
  });

  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("emailInput").value;
    alert(`Success! Logged in as ${email}`);
    authModal.classList.remove("open");
  });

  helpBtn.addEventListener("click", () => {
    alert("ChatGPT Assistant Clone.\n\n• Type any query and press Enter to chat.\n• Use suggestion pills for quick prompts.\n• Toggle Attach, Search, or Reason chips for advanced modes.\n• Click New Chat icon to start fresh.");
  });

  // Initial focus
  userInput.focus();
});
