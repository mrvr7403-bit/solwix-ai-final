const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [{ role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Выбери предмет и уровень сложности сверху, и мы приступим к учебе!" }] }]
};

// SVG-код твоего логотипа для аватарок
const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="grad-solwix-chat" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#6366f1" />
                            <stop offset="100%" stop-color="#a855f7" />
                        </linearGradient>
                    </defs>
                    <polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix-chat)" />
                </svg>`;

const TOOLS = [
    { name: 'Объяснить концепцию', icon: 'sparkles', prompt: 'Объясни просто: ' },
    { name: 'Решить задачу', icon: 'check-square', prompt: 'Реши по шагам: ' },
    { name: 'Квиз', icon: 'help-circle', prompt: 'Сделай тест из 3 вопросов по теме: ' }
];

const chatMessages = document.getElementById('chat-messages');
const chatScrollArea = document.getElementById('chat-scroll-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('ai-typing-indicator');

function init() {
    if (window.lucide) lucide.createIcons();
    renderTools();
    renderMessages();
    
    document.getElementById('subject-select').addEventListener('change', (e) => state.subject = e.target.value);
    document.getElementById('level-select').addEventListener('change', (e) => state.level = e.target.value);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });
}

function renderTools() {
    const container = document.getElementById('tools-container');
    container.innerHTML = TOOLS.map(tool => `
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-4 w-full text-left bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group shadow-sm">
            <div class="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <i data-lucide="${tool.icon}" class="w-4 h-4"></i>
            </div>
            <span class="text-sm font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">${tool.name}</span>
        </button>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-200 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500'}">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-5 h-5"></i>' : LOGO_SVG}
            </div>
            <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]">
                <div class="${msg.role === 'user' ? 'user-message-bubble rounded-tr-sm' : 'ai-message-bubble rounded-tl-sm'} px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm">
                    ${formatContent(msg.parts[0].text)}
                </div>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
    scrollToBottom();
}

function scrollToBottom() {
    if (chatScrollArea) chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || sendBtn.disabled) return;

    sendBtn.disabled = true;
    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    if (typingIndicator) typingIndicator.classList.remove('hidden');
    scrollToBottom();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, subject: state.subject, level: state.level, history: state.messages.slice(-5) })
        });
        const data = await response.json();
        if (typingIndicator) typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: data.text }] });
        renderMessages();
    } catch (err) {
        if (typingIndicator) typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Ошибка связи с сервером." }] });
        renderMessages();
    } finally { sendBtn.disabled = false; chatInput.focus(); }
}

init();