const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix-head)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить просто', icon: 'sparkles', prompt: 'Объясни максимально просто: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши задачу пошагово: ' },
    { name: 'Конспект', icon: 'book-open', prompt: 'Сделай краткий конспект темы: ' }
];

// --- СОСТОЯНИЕ (STATE) ---
let currentUser = null;
let chats = []; 
let currentChatId = null;
let currentAbortController = null;
let isThinking = false;
let quotaExceeded = false; // [НОВОЕ] Флаг превышения лимитов

const chatMessages = document.getElementById('chat-messages');
const chatScrollArea = document.getElementById('chat-scroll-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('ai-typing-indicator');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function init() {
    loadUser();
    loadChats();
    renderTools();
    
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });

    // Мобильное меню
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('hidden');
}

// --- АККАУНТЫ ---
window.showAuthModal = () => document.getElementById('auth-modal').classList.remove('hidden');
window.hideAuthModal = () => document.getElementById('auth-modal').classList.add('hidden');

window.handleAuth = () => {
    const login = document.getElementById('auth-login').value.trim();
    if (login) {
        currentUser = login;
        localStorage.setItem('solwix_user', login);
        location.reload(); 
    }
};

function loadUser() {
    const saved = localStorage.getItem('solwix_user');
    if (saved) {
        currentUser = saved;
        document.getElementById('username-display').innerText = currentUser;
        document.getElementById('user-avatar').innerText = currentUser[0].toUpperCase();
        document.getElementById('auth-btn-text').innerText = "Выйти";
    }
}

// --- ЛОГИКА ЧАТОВ ---
function loadChats() {
    const key = currentUser ? `chats_${currentUser}` : 'chats_guest';
    const saved = localStorage.getItem(key);
    chats = saved ? JSON.parse(saved) : [];
    if (chats.length === 0) createNewChat();
    else selectChat(chats[0].id);
}

window.createNewChat = () => {
    const newChat = {
        id: Date.now(),
        title: 'Новый диалог',
        messages: [{ role: 'model', parts: [{ text: "Привет! Я твой помощник Solwix. Выбери предмет и спрашивай!" }] }],
        language: 'ru' // Язык по умолчанию
    };
    chats.unshift(newChat);
    selectChat(newChat.id);
};

window.selectChat = (id) => {
    currentChatId = id;
    renderChatsList();
    renderMessages();
    if(window.innerWidth < 640 && sidebar.classList.contains('active')) toggleSidebar(); 
    // Мягкий скролл к последнему сообщению
    setTimeout(() => { chatScrollArea.scrollTop = chatScrollArea.scrollHeight; }, 100);
};

function renderChatsList() {
    const container = document.getElementById('chats-list');
    container.innerHTML = chats.map(chat => `
        <div onclick="selectChat(${chat.id})" class="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentChatId === chat.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}">
            <div class="flex items-center gap-3 overflow-hidden">
                <i data-lucide="message-square" class="w-4 h-4 shrink-0 ${currentChatId === chat.id ? 'text-indigo-600' : 'text-slate-400'}"></i>
                <span class="text-xs font-semibold text-slate-600 truncate">${chat.title}</span>
            </div>
            <button onclick="deleteChat(${chat.id}, event)" class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all rounded-md">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

window.deleteChat = (id, e) => {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    localStorage.setItem(currentUser ? `chats_${currentUser}` : 'chats_guest', JSON.stringify(chats));
    loadChats();
};

function renderTools() {
    document.getElementById('tools-container').innerHTML = TOOLS.map(t => `
        <button onclick="useTool('${t.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
            <i data-lucide="${t.icon}" class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors"></i>
            <span class="text-[11px] font-bold text-slate-600">${t.name}</span>
        </button>
    `).join('');
    lucide.createIcons();
}

window.useTool = (p) => { 
    // Не даем использовать инструменты, если квота превышена
    if (quotaExceeded) return;
    chatInput.value = p; 
    chatInput.focus(); 
};

function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

function renderMessages() {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;
    chatMessages.innerHTML = activeChat.messages.map(msg => `
        <div class="flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : msg.role === 'system' ? 'mx-auto' : ''}">
            ${msg.role === 'user' || msg.role === 'model' ? `
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-4 h-4 text-indigo-500"></i>' : LOGO_CHAT}
            </div>
            ` : ''}
            <div class="${msg.role === 'user' ? 'user-bubble' : msg.role === 'model' ? 'ai-bubble' : 'system-bubble'} px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm text-sm leading-relaxed ${msg.role === 'system' ? 'max-w-xl' : 'max-w-[88%]'}">
                ${formatContent(msg.parts[0].text)}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ЛОГИКА ОТПРАВКИ, СТОП И ОБРАБОТКИ Error 429 ---
function detectLanguage(text) {
    return /^[A-Za-z0-9\s.,!?-]+$/.test(text.slice(0, 20)) ? 'en' : 'ru';
}

// УПРАВЛЕНИЕ КНОПКОЙ ОТПРАВКИ (Normal / Thinking / Quota Exceeded)
function updateButtonUIState() {
    const container = document.getElementById('btn-icon-container');
    
    // Сбрасываем красное состояние по умолчанию
    sendBtn.classList.remove('quota-exceeded');
    sendBtn.disabled = false;

    if (isThinking) {
        // Режим размышления -> Показываем квадрат СТОП
        container.innerHTML = `<div class="stop-square pulse"></div>`;
    } else if (quotaExceeded) {
        // Режим превышения квот -> Самолетик, кнопка красная и не активна
        container.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i>`;
        sendBtn.classList.add('quota-exceeded');
        sendBtn.disabled = true; // Запрещаем нажатие
    } else {
        // Обычный режим -> Самолетик
        container.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i>`;
    }
    lucide.createIcons();
}

async function sendMessage() {
    // 0. Защита от случайного нажатия, если квота уже превышена
    if (quotaExceeded) return;

    const activeChat = chats.find(c => c.id === currentChatId);
    const text = chatInput.value.trim();
    
    // 1. ЛОГИКА ОСТАНОВКИ (preserve)
    if (isThinking) {
        if (currentAbortController) currentAbortController.abort();
        
        // Удаляем обрывок из истории
        const lastMsg = activeChat.messages[activeChat.messages.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.parts[0].text === "") activeChat.messages.pop(); 
        
        activeChat.messages.pop(); // Удаляем запрос пользователя

        typingIndicator.classList.add('hidden');
        activeChat.messages.push({ 
            role: 'system', 
            parts: [{ text: `<div class="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] tracking-widest uppercase aborted-message px-3 py-1 rounded-full w-fit">Запрос отменен пользователем</div>` }] 
        });
        
        isThinking = false;
        updateButtonUIState();
        renderMessages();
        saveChats();
        chatInput.focus();
        return;
    }

    if (!text) return;

    // Авто-название и язык
    if (activeChat.messages.length <= 1) {
        activeChat.title = text.slice(0, 15) + "...";
        activeChat.language = detectLanguage(text);
        renderChatsList();
    }

    // 2. Добавляем сообщение пользователя в интерфейс
    activeChat.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();
    
    // 3. Активируем режим размышления
    isThinking = true;
    updateButtonUIState(); // Станет квадратом СТОП
    typingIndicator.classList.remove('hidden');
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;

    currentAbortController = new AbortController();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: currentAbortController.signal,
            body: JSON.stringify({ 
                message: text, 
                subject: document.getElementById('subject-select').value, 
                // Предыдущие 5 сообщений истории для контекста
                history: activeChat.messages.slice(0, -1).slice(-5) 
            })
        });

        // --- ОБРАБОТКА Error 429 ---
        if (response.status === 429) {
            handleQuotaExceeded(activeChat); // Скрываем "ворчание" и блокируем UI
            return;
        }

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        typingIndicator.classList.add('hidden');

        // --- ЭФФЕКТ ПЕЧАТАНИЯ ---
        const aiMsg = { role: 'model', parts: [{ text: "" }] };
        activeChat.messages.push(aiMsg);
        renderMessages();

        const bubbles = chatMessages.querySelectorAll('.ai-bubble');
        const lastBubble = bubbles[bubbles.length - 1];
        
        let i = 0;
        const fullContent = data.text;
        
        // Плавная печать (preserve)
        const typeEffect = setInterval(() => {
            if (!isThinking) { clearInterval(typeEffect); return; }
            
            aiMsg.parts[0].text += fullContent[i];
            lastBubble.innerHTML = formatContent(aiMsg.parts[0].text) + '<span class="typing-cursor"></span>';
            i++;

            if (i >= fullContent.length) {
                clearInterval(typeEffect);
                lastBubble.innerHTML = formatContent(aiMsg.parts[0].text);
                isThinking = false;
                updateButtonUIState(); // Вернется к самолетику
                localStorage.setItem(currentUser ? `chats_${currentUser}` : 'chats_guest', JSON.stringify(chats));
            }
        }, 15);

    } catch (e) {
        if (e.name !== 'AbortError') {
            typingIndicator.classList.add('hidden');
            activeChat.messages.push({ role: 'system', parts: [{ text: `<span class="text-red-400 text-[10px] uppercase">Ошибка API</span>` }] });
            renderMessages();
            isThinking = false;
            updateButtonUIState();
        }
    }
}

// --- [НОВОЕ] ОБРАБОТКА ПРЕВЫШЕНИЯ КВОТ ---
function handleQuotaExceeded(activeChat) {
    quotaExceeded = true; // Устанавливаем флаг
    isThinking = false; // Прерываем размышление
    typingIndicator.classList.add('hidden');

    // Удаляем из истории и интерфейса сообщение пользователя, которое вызвало ошибку
    const lastMsgIdx = activeChat.messages.length - 1;
    if (activeChat.messages[lastMsgIdx].role === 'user') {
        activeChat.messages.pop();
    }

    // Добавляем красивое уведомление в чат (не ворчание!)
    let quotaFriendlyMsg = "";
    if (activeChat.language === 'en') {
        quotaFriendlyMsg = "Oops! Solwix AI is overwhelmed with questions right now. Please wait a minute and try again.";
    } else {
        quotaFriendlyMsg = "Ой! Похоже, сейчас Solwix AI завалили вопросами. Подождите минутку и попробуйте снова.";
    }

    activeChat.messages.push({ 
        role: 'system', 
        parts: [{ text: `<div class="flex items-start gap-4 p-5 rounded-2xl bg-red-50/70 border border-red-200 shadow-inner quota-message mx-auto max-w-lg">
            <i data-lucide="timer" class="w-10 h-10 text-red-500 shrink-0 mt-1"></i>
            <div class="flex flex-col gap-1">
                <span class="text-sm font-bold text-red-950">Лимиты исчерпаны</span>
                <span class="text-xs text-red-700 leading-relaxed">${quotaFriendlyMsg}</span>
            </div>
        </div>` }] 
    });

    renderMessages();
    updateButtonUIState(); // Кнопка станет красной и не активной

    // Сохраняем "чистую" историю чатов
    saveChats();

    // Запускаем таймер на 60 секунд (RPM ресет), чтобы автоматически разблокировать UI
    setTimeout(() => {
        quotaExceeded = false;
        updateButtonUIState(); // Вернется к самолетику, кнопка станет активной
    }, 60000); // 1 минута
}

// --- ПОДЕЛИТЬСЯ ---
window.shareChat = async () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;

    // Не шарим системные уведомления об отмене/квотах
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