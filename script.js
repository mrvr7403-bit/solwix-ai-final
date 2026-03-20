const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить просто', icon: 'sparkles', prompt: 'Объясни просто: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши по шагам: ' },
    { name: 'Создать тест', icon: 'help-circle', prompt: 'Сделай тест по теме: ' },
    { name: 'Конспект', icon: 'book-open', prompt: 'Сделай краткий конспект: ' }
];

let currentUser = null;
let chats = []; 
let currentChatId = null;
let currentAbortController = null;
let isThinking = false;

const chatMessages = document.getElementById('chat-messages');
const chatScrollArea = document.getElementById('chat-scroll-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('ai-typing-indicator');

function init() {
    loadUser();
    loadChats();
    renderTools();
    
    document.getElementById('subject-select').addEventListener('change', saveChats);
    document.getElementById('level-select').addEventListener('change', saveChats);
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });
}

// --- АВТОРИЗАЦИЯ ---
window.showAuthModal = () => document.getElementById('auth-modal').classList.remove('hidden');
window.hideAuthModal = () => document.getElementById('auth-modal').classList.add('hidden');

window.handleAuth = () => {
    const login = document.getElementById('auth-login').value.trim();
    if (login) {
        currentUser = login;
        localStorage.setItem('solwix_user', login);
        updateProfileUI();
        hideAuthModal();
        currentChatId = null; 
        loadChats();
    }
};

function loadUser() {
    const saved = localStorage.getItem('solwix_user');
    if (saved) currentUser = saved;
    updateProfileUI();
}

function updateProfileUI() {
    const display = document.getElementById('username-display');
    const avatar = document.getElementById('user-avatar');
    const btnText = document.getElementById('auth-btn-text');
    
    if (currentUser) {
        display.innerText = currentUser;
        avatar.innerText = currentUser[0].toUpperCase();
        btnText.innerText = "Сменить аккаунт";
    } else {
        display.innerText = "Гость";
        avatar.innerText = "G";
        btnText.innerText = "Войти в аккаунт";
    }
}

// --- ЧАТЫ ---
function loadChats() {
    const key = currentUser ? `chats_${currentUser}` : 'chats_guest';
    const saved = localStorage.getItem(key);
    chats = saved ? JSON.parse(saved) : [];
    
    if (chats.length === 0) createNewChat();
    else selectChat(chats[0].id);
}

function saveChats() {
    const key = currentUser ? `chats_${currentUser}` : 'chats_guest';
    localStorage.setItem(key, JSON.stringify(chats));
}

window.createNewChat = () => {
    const newChat = {
        id: Date.now(),
        title: 'Новый диалог',
        messages: [{ role: 'model', parts: [{ text: "Привет! Я **Solwix AI**. Выбери предмет сверху и задай мне любой вопрос!" }] }],
        language: 'ru'
    };
    chats.unshift(newChat);
    selectChat(newChat.id);
};

window.selectChat = (id) => {
    currentChatId = id;
    renderChatsList();
    renderMessages();
    setTimeout(() => { chatScrollArea.scrollTop = chatScrollArea.scrollHeight; }, 50);
};

window.deleteChat = (id, event) => {
    event.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    if (chats.length === 0) createNewChat();
    else if (currentChatId === id) selectChat(chats[0].id);
    else renderChatsList();
    saveChats();
};

function renderChatsList() {
    const container = document.getElementById('chats-list');
    container.innerHTML = chats.map(chat => `
        <div onclick="selectChat(${chat.id})" class="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentChatId === chat.id ? 'bg-indigo-50/80 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}">
            <div class="flex items-center gap-3 overflow-hidden">
                <i data-lucide="message-square" class="w-4 h-4 shrink-0 ${currentChatId === chat.id ? 'text-indigo-600' : 'text-slate-400'}"></i>
                <span class="text-xs font-semibold text-slate-600 truncate">${chat.title}</span>
            </div>
            <button onclick="deleteChat(${chat.id}, event)" class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-all">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function renderTools() {
    document.getElementById('tools-container').innerHTML = TOOLS.map(tool => `
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
            <i data-lucide="${tool.icon}" class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors"></i>
            <span class="text-[11px] font-bold text-slate-600">${tool.name}</span>
        </button>
    `).join('');
}

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

function renderMessages() {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;
    
    chatMessages.innerHTML = activeChat.messages.map(msg => `
        <div class="flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in duration-300">
            ${msg.role === 'system' ? '' : `
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-4 h-4 text-indigo-500"></i>' : LOGO_CHAT}
            </div>
            `}
            <div class="${msg.role === 'user' ? 'user-bubble' : msg.role === 'system' ? 'mx-auto' : 'ai-bubble'} px-5 py-3 shadow-sm text-sm leading-relaxed ${msg.role === 'system' ? 'bg-transparent shadow-none border-none p-0' : 'max-w-[85%]'}">
                ${formatContent(msg.parts[0].text)}
            </div>
        </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

// --- ЛОГИКА ОТПРАВКИ И АНИМАЦИИ ПЕЧАТИ ---
function detectLanguage(text) {
    return /^[A-Za-z0-9\s.,!?-]+$/.test(text.slice(0, 20)) ? 'en' : 'ru';
}

function updateButtonState(thinking) {
    isThinking = thinking;
    document.getElementById('btn-icon-container').innerHTML = thinking 
        ? `<div class="stop-square"></div>` 
        : `<i data-lucide="send" class="w-5 h-5"></i>`;
    if (!thinking && window.lucide) lucide.createIcons();
}

async function sendMessage() {
    const activeChat = chats.find(c => c.id === currentChatId);
    const text = chatInput.value.trim();
    
    // ЛОГИКА ОСТАНОВКИ
    if (isThinking) {
        if (currentAbortController) currentAbortController.abort();
        
        const lastMsg = activeChat.messages[activeChat.messages.length - 1];
        if (lastMsg && lastMsg.role === 'model') activeChat.messages.pop(); // Удаляем обрывок ИИ
        activeChat.messages.pop(); // Удаляем запрос пользователя
        
        typingIndicator.classList.add('hidden');
        activeChat.messages.push({ 
            role: 'system', 
            parts: [{ text: `<span class="text-slate-400 italic text-[10px] opacity-50 tracking-widest uppercase aborted-message bg-slate-100 px-3 py-1 rounded-full">Запрос отменен</span>` }] 
        });
        
        updateButtonState(false);
        renderMessages();
        saveChats();
        chatInput.focus();
        return;
    }

    if (!text) return;

    if (activeChat.messages.length <= 1) {
        activeChat.title = text.slice(0, 15) + (text.length > 15 ? '...' : '');
        activeChat.language = detectLanguage(text);
        renderChatsList();
    }

    document.getElementById('typing-text').innerText = activeChat.language === 'en' ? 'Processing...' : 'Обработка...';
    
    currentAbortController = new AbortController();
    updateButtonState(true);
    
    activeChat.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();
    typingIndicator.classList.remove('hidden');
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: currentAbortController.signal,
            body: JSON.stringify({ 
                message: text, 
                subject: document.getElementById('subject-select').value, 
                level: document.getElementById('level-select').value, 
                history: activeChat.messages.slice(0, -1).slice(-5) 
            })
        });

        const data = await response.json();
        typingIndicator.classList.add('hidden');
        
        // --- ЭФФЕКТ ПЕЧАТАНИЯ ---
        const aiMessage = { role: 'model', parts: [{ text: "" }] };
        activeChat.messages.push(aiMessage);
        renderMessages();

        const messageNodes = chatMessages.querySelectorAll('.ai-bubble');
        const targetNode = messageNodes[messageNodes.length - 1];
        
        let fullText = data.text || "Ошибка получения текста.";
        let currentText = "";
        let i = 0;
        const chunkSize = 2; // Символов за раз

        await new Promise((resolve) => {
            const typeInterval = setInterval(() => {
                if (!isThinking) { // Если нажали СТОП во время печати
                    clearInterval(typeInterval);
                    resolve();
                    return;
                }

                currentText += fullText.slice(i, i + chunkSize);
                i += chunkSize;
                aiMessage.parts[0].text = currentText;
                
                // Курсор
                targetNode.innerHTML = formatContent(currentText) + '<span class="inline-block w-1 h-3 ml-1 bg-indigo-400 animate-pulse align-middle rounded-sm"></span>';

                if (i >= fullText.length) {
                    clearInterval(typeInterval);
                    aiMessage.parts[0].text = fullText;
                    targetNode.innerHTML = formatContent(fullText); // Убираем курсор
                    resolve();
                }
            }, 10); // Скорость печати (10 мс на кадр)
        });
        
    } catch (err) {
        if (err.name !== 'AbortError') {
            typingIndicator.classList.add('hidden');
            activeChat.messages.push({ role: 'system', parts: [{ text: `<span class="text-red-400 text-[10px] uppercase">Ошибка API</span>` }] });
            renderMessages();
        }
    } finally {
        if (isThinking) { 
            updateButtonState(false);
            saveChats();
        }
    }
}

window.shareChat = async () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;

    const chatText = activeChat.messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'Я' : 'Solwix AI'}: ${m.parts[0].text}`)
        .join('\n\n');

    if (navigator.share) {
        try { await navigator.share({ title: `Solwix AI: ${activeChat.title}`, text: chatText }); } 
        catch (err) { console.log('Шаринг отменен'); }
    } else {
        navigator.clipboard.writeText(chatText);
        alert('Чат скопирован в буфер обмена!');
    }
};

document.addEventListener('DOMContentLoaded', init);