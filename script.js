const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix-head)" /></svg>`;
const TOOLS = [{ name: 'Объясни просто', icon: 'sparkles', p: 'Объясни просто: ' }, { name: 'Реши по шагам', icon: 'list', p: 'Реши по шагам: ' }];

let chats = []; 
let currentChatId = null;
let isThinking = false;
let quotaExceeded = false;

// 1. ГЛОБАЛЬНАЯ ПАМЯТЬ (Синхронизация между чатами)
function getGlobalMemory() {
    return chats
        .filter(c => c.id !== currentChatId)
        .slice(0, 3)
        .map(c => `В чате "${c.title}" обсуждали: ${c.messages[c.messages.length-1]?.parts[0].text.slice(0, 50)}`)
        .join('; ');
}

// 2. УМНАЯ БЛОКИРОВКА ИНТЕРФЕЙСА
function setUIAvailability(available) {
    quotaExceeded = !available;
    const btn = document.getElementById('send-btn');
    const input = document.getElementById('chat-input');
    
    if (!available) {
        btn.classList.add('quota-exceeded');
        input.disabled = true;
        input.placeholder = "Solwix на перерыве...";
        localStorage.setItem('solwix_lock', Date.now() + 60000);
    } else {
        btn.classList.remove('quota-exceeded');
        input.disabled = false;
        input.placeholder = "Задай вопрос Solwix...";
    }
}

async function sendMessage() {
    if (quotaExceeded || isThinking) return;
    
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const activeChat = chats.find(c => c.id === currentChatId);
    activeChat.messages.push({ role: 'user', parts: [{ text }] });
    
    // Подготовка интерфейса
    input.value = '';
    renderMessages();
    isThinking = true;
    document.getElementById('ai-typing-indicator').classList.remove('hidden');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                subject: document.getElementById('subject-select').value,
                memory: getGlobalMemory(), // Передаем память из других чатов
                history: activeChat.messages.slice(-5)
            })
        });

        // ПЕРЕХВАТ ОШИБОК GOOGLE
        if (!response.ok) throw new Error(response.status === 429 ? 'QUOTA' : 'SERVER');

        const data = await response.json();
        handleAIDelivery(activeChat, data.text);

    } catch (e) {
        handleSilentError(activeChat, e.message);
    }
}

function handleSilentError(chat, type) {
    isThinking = false;
    document.getElementById('ai-typing-indicator').classList.add('hidden');
    chat.messages.pop(); // Удаляем вопрос, чтобы не ломать историю
    
    setUIAvailability(false);
    
    const errorText = type === 'QUOTA' 
        ? "Solwix взял небольшую паузу, чтобы набраться сил. Попробуйте снова через минуту."
        : "Что-то пошло не так. Пожалуйста, обновите страницу.";

    chat.messages.push({ 
        role: 'model', 
        parts: [{ text: `<div class="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs">${errorText}</div>` }] 
    });
    renderMessages();
    setTimeout(() => setUIAvailability(true), 60000);
}

// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Рендер, Скролл, Авторизация)
function handleAIDelivery(chat, fullText) {
    document.getElementById('ai-typing-indicator').classList.add('hidden');
    const aiMsg = { role: 'model', parts: [{ text: "" }] };
    chat.messages.push(aiMsg);
    renderMessages();

    let i = 0;
    const interval = setInterval(() => {
        aiMsg.parts[0].text += fullText[i++];
        renderMessages();
        if (i >= fullText.length) {
            clearInterval(interval);
            isThinking = false;
            save();
        }
        const area = document.getElementById('chat-scroll-area');
        area.scrollTop = area.scrollHeight;
    }, 15);
}

function renderMessages() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    const container = document.getElementById('chat-messages');
    container.innerHTML = chat.messages.map(m => `
        <div class="flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}">
            <div class="w-8 h-8 rounded-lg border flex items-center justify-center bg-white shrink-0 shadow-sm">
                ${m.role === 'user' ? '<i data-lucide="user" class="w-4 h-4 text-indigo-500"></i>' : LOGO_CHAT}
            </div>
            <div class="${m.role === 'user' ? 'user-bubble' : 'ai-bubble'} px-4 py-2 text-sm max-w-[85%] shadow-sm">
                ${m.parts[0].text.replace(/\n/g, '<br>')}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function createNewChat() {
    const id = Date.now();
    chats.unshift({ id, title: 'Новый чат', messages: [{ role: 'model', parts: [{ text: "Привет! Я Solwix AI. Чем помочь сегодня?" }] }] });
    currentChatId = id;
    renderChatsList();
    renderMessages();
}

function renderChatsList() {
    const list = document.getElementById('chats-list');
    list.innerHTML = chats.map(c => `
        <div onclick="selectChat(${c.id})" class="p-3 rounded-xl cursor-pointer text-xs font-semibold ${currentChatId === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'} truncate">
            ${c.title}
        </div>
    `).join('');
}

window.selectChat = (id) => { currentChatId = id; renderMessages(); renderChatsList(); };
function save() { localStorage.setItem('solwix_data', JSON.stringify(chats)); }
function loadUser() { 
    const lock = localStorage.getItem('solwix_lock');
    if (lock && Date.now() < lock) setUIAvailability(false);
    const saved = localStorage.getItem('solwix_data');
    if (saved) { chats = JSON.parse(saved); currentChatId = chats[0].id; renderChatsList(); renderMessages(); } else { createNewChat(); }
}

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('active'); 
    document.getElementById('sidebar-overlay').classList.toggle('hidden'); 
}

document.addEventListener('DOMContentLoaded', () => { loadUser(); lucide.createIcons(); });