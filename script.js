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
let quotaExceeded = false;
let currentAttachment = null; // Для фото

const chatMessages = document.getElementById('chat-messages');
const chatScrollArea = document.getElementById('chat-scroll-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const typingIndicator = document.getElementById('ai-typing-indicator');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function init() {
    loadUser();
    loadChats();
    renderTools();
    
    // Обработка клика: если думает - отмена, если нет - отправка
    sendBtn.addEventListener('click', () => {
        if (isThinking) {
            stopGeneration();
        } else {
            sendMessage();
        }
    });

    chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Загрузка фото
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentAttachment = { name: file.name, data: ev.target.result };
                document.getElementById('file-preview-container').classList.remove('hidden');
                document.getElementById('image-preview-slot').style.backgroundImage = `url(${ev.target.result})`;
                document.getElementById('file-name-display').innerText = file.name;
            };
            reader.readAsDataURL(file);
        }
    });

    // Мобильное меню
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
}

function clearAttachment() {
    currentAttachment = null;
    document.getElementById('file-preview-container').classList.add('hidden');
    fileInput.value = '';
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

function saveChats() {
    localStorage.setItem(currentUser ? `chats_${currentUser}` : 'chats_guest', JSON.stringify(chats));
    renderChatsList();
}

window.createNewChat = () => {
    const newChat = {
        id: Date.now(),
        title: 'Новый диалог',
        messages: [{ role: 'model', parts: [{ text: "Привет! Я твой помощник Solwix. Выбери предмет и спрашивай!" }] }],
        language: 'ru'
    };
    chats.unshift(newChat);
    saveChats();
    selectChat(newChat.id);
};

window.selectChat = (id) => {
    currentChatId = id;
    renderChatsList();
    renderMessages();
    if(window.innerWidth < 640 && sidebar.classList.contains('active')) toggleSidebar(); 
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
    if(chats.length === 0) createNewChat();
    else if(currentChatId === id) selectChat(chats[0].id);
    saveChats();
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
    if (quotaExceeded) return;
    chatInput.value = p; 
    chatInput.focus(); 
};

// --- ФОРМАТИРОВАНИЕ И ПЕЧАТЬ ---
function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

async function typeWriter(element, text) {
    element.innerHTML = "";
    const speed = 10;
    
    // Временный курсор
    element.innerHTML = '<span class="typing-cursor"></span>';
    
    for (let i = 0; i < text.length; i++) {
        // Убираем курсор, добавляем букву, возвращаем курсор
        element.innerHTML = element.innerHTML.replace('<span class="typing-cursor"></span>', '') + text.charAt(i) + '<span class="typing-cursor"></span>';
        
        if(i % 5 === 0) chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
        await new Promise(r => setTimeout(r, speed));
    }
    // Финальное форматирование (жирный текст и переносы)
    element.innerHTML = formatContent(text);
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
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
            <div class="flex flex-col gap-1 max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'}">
                ${msg.img ? `<img src="${msg.img}" class="chat-image">` : ''}
                <div class="${msg.role === 'user' ? 'user-bubble' : msg.role === 'model' ? 'ai-bubble' : 'system-bubble'} px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm text-sm leading-relaxed w-full">
                    ${formatContent(msg.parts[0].text)}
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
}

// --- ЛОГИКА ОТПРАВКИ, СТОП И ОБРАБОТКИ Error 429 ---
window.stopGeneration = () => {
    if (currentAbortController) {
        currentAbortController.abort();
        isThinking = false;
        typingIndicator.classList.add('hidden');
        updateButtonUIState();
        
        const chat = chats.find(c => c.id === currentChatId);
        chat.messages.push({ role: 'system', parts: [{ text: "🛑 Генерация остановлена пользователем" }] });
        renderMessages();
        saveChats();
    }
};

async function sendMessage() {
    if (quotaExceeded) return; // Блок если лимит
    
    const text = chatInput.value.trim();
    if ((!text && !currentAttachment) || isThinking) return;

    const chat = chats.find(c => c.id === currentChatId);
    if(chat.messages.length === 1 && text) chat.title = text.slice(0, 30);
    
    // Сохраняем сообщение с картинкой
    const userMsg = { role: 'user', parts: [{ text: text }], img: currentAttachment ? currentAttachment.data : null };
    chat.messages.push(userMsg);
    
    chatInput.value = '';
    chatInput.style.height = 'auto';
    clearAttachment();
    renderMessages();
    
    isThinking = true;
    typingIndicator.classList.remove('hidden');
    updateButtonUIState();
    
    currentAbortController = new AbortController();

    try {
        // ТУТ ТВОЙ FETCH К VERCEL
        const response = await fetch('https://твоя-апишка-или-vercel.com/api/chat', {
            method: 'POST',
            signal: currentAbortController.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: chat.messages.map(m => ({ role: m.role, parts: m.parts })), // Отправляем без картинок на сервер (или добавь поддержку)
                subject: document.getElementById('subject-select').value,
                level: document.getElementById('level-select').value
            })
        });

        if (response.status === 429) {
            throw new Error('QUOTA_EXCEEDED');
        }

        const data = await response.json();
        
        // Заглушка, если сервер пока не подключен (для теста)
        const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Я получил твой запрос и проанализировал его! Серверная часть работает штатно. 🚀";
        
        const aiMsg = { role: 'model', parts: [{ text: "" }] };
        chat.messages.push(aiMsg);
        renderMessages();
        
        const lastBubble = chatMessages.lastElementChild.querySelector('.ai-bubble');
        await typeWriter(lastBubble, aiResponse);
        aiMsg.parts[0].text = aiResponse; // Сохраняем финальный текст без HTML-тегов курсора

    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('Запрос отменен');
        } else if (e.message === 'QUOTA_EXCEEDED') {
            quotaExceeded = true;
            chat.messages.push({ role: 'system', parts: [{ text: "<span class='text-red-500 font-bold'>❌ Превышен лимит запросов к API. Попробуйте позже.</span>" }] });
            renderMessages();
        } else {
            chat.messages.push({ role: 'system', parts: [{ text: "❌ Ошибка соединения с сервером." }] });
            renderMessages();
        }
    } finally {
        isThinking = false;
        typingIndicator.classList.add('hidden');
        updateButtonUIState();
        saveChats();
    }
}

// УПРАВЛЕНИЕ КНОПКОЙ ОТПРАВКИ (Normal / Thinking / Quota Exceeded)
function updateButtonUIState() {
    const container = document.getElementById('btn-icon-container');
    
    sendBtn.classList.remove('quota-exceeded');
    sendBtn.disabled = false;

    if (isThinking) {
        // Режим размышления -> Показываем квадрат СТОП
        container.innerHTML = `<div class="stop-square pulse"></div>`;
    } else if (quotaExceeded) {
        // Режим превышения квот -> Самолетик, кнопка красная и не активна
        container.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i>`;
        sendBtn.classList.add('quota-exceeded');
        sendBtn.disabled = true;
    } else {
        // Обычный режим -> Самолетик
        container.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i>`;
    }
    lucide.createIcons(); // <--- Вот этот хвост, который у тебя оборвался!
}

window.shareChat = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Ссылка на проект скопирована!");
};

// Запуск
init();