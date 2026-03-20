const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить просто', icon: 'sparkles', prompt: 'Объясни максимально просто: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши задачу пошагово: ' },
    { name: 'Конспект', icon: 'book-open', prompt: 'Сделай краткий конспект темы: ' }
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
        messages: [{ role: 'model', parts: [{ text: "Привет! Я твой помощник Solwix. Выбери предмет и спрашивай!" }] }]
    };
    chats.unshift(newChat);
    selectChat(newChat.id);
};

window.selectChat = (id) => {
    currentChatId = id;
    renderChatsList();
    renderMessages();
    if(window.innerWidth < 640) toggleSidebar(); 
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
            <button onclick="deleteChat(${chat.id}, event)" class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
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

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

function renderMessages() {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;
    chatMessages.innerHTML = activeChat.messages.map(msg => `
        <div class="flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-4 h-4 text-indigo-500"></i>' : LOGO_CHAT}
            </div>
            <div class="${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'} px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm text-sm leading-relaxed max-w-[88%]">
                ${formatContent(msg.parts[0].text)}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ОТПРАВКА И ПЕЧАТЬ ---
async function sendMessage() {
    const activeChat = chats.find(c => c.id === currentChatId);
    const text = chatInput.value.trim();
    
    if (isThinking) {
        if (currentAbortController) currentAbortController.abort();
        activeChat.messages.pop(); // удаляем пустой ответ
        activeChat.messages.pop(); // удаляем вопрос
        isThinking = false;
        updateUIState(false);
        renderMessages();
        return;
    }

    if (!text) return;

    if (activeChat.messages.length <= 1) {
        activeChat.title = text.slice(0, 15) + "...";
        renderChatsList();
    }

    activeChat.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();
    
    isThinking = true;
    updateUIState(true);
    typingIndicator.classList.remove('hidden');
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;

    currentAbortController = new AbortController();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: currentAbortController.signal,
            body: JSON.stringify({ message: text, subject: document.getElementById('subject-select').value })
        });

        const data = await response.json();
        typingIndicator.classList.add('hidden');

        // Создаем пустой контейнер для печати
        const aiMsg = { role: 'model', parts: [{ text: "" }] };
        activeChat.messages.push(aiMsg);
        renderMessages();

        const bubbles = chatMessages.querySelectorAll('.ai-bubble');
        const lastBubble = bubbles[bubbles.length - 1];
        
        let i = 0;
        const fullContent = data.text;
        
        // Плавная печать
        const typeEffect = setInterval(() => {
            if (!isThinking) { clearInterval(typeEffect); return; }
            
            aiMsg.parts[0].text += fullContent[i];
            lastBubble.innerHTML = formatContent(aiMsg.parts[0].text) + '<span class="typing-cursor"></span>';
            i++;

            if (i >= fullContent.length) {
                clearInterval(typeEffect);
                lastBubble.innerHTML = formatContent(aiMsg.parts[0].text);
                isThinking = false;
                updateUIState(false);
                localStorage.setItem(currentUser ? `chats_${currentUser}` : 'chats_guest', JSON.stringify(chats));
            }
        }, 15);

    } catch (e) {
        typingIndicator.classList.add('hidden');
        updateUIState(false);
        isThinking = false;
    }
}

function updateUIState(thinking) {
    document.getElementById('btn-icon-container').innerHTML = thinking 
        ? `<div class="stop-square"></div>` 
        : `<i data-lucide="send" class="w-5 h-5"></i>`;
    lucide.createIcons();
}

window.shareChat = () => {
    const activeChat = chats.find(c => c.id === currentChatId);
    const content = activeChat.messages.map(m => `${m.role}: ${m.parts[0].text}`).join('\n\n');
    navigator.clipboard.writeText(content);
    alert("Чат скопирован!");
};

document.addEventListener('DOMContentLoaded', init);