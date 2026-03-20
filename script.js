const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [
        { role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Выбери предмет и уровень сложности сверху, и мы приступим!" }] }
    ]
};

const TOOLS = [
    { name: 'Объяснить концепцию', icon: 'sparkles', prompt: 'Объясни мне простыми словами концепцию: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши эту задачу максимально подробно по шагам: ' },
    { name: 'Проверить грамматику', icon: 'type', prompt: 'Проверь ошибки и стиль в этом тексте: ' },
    { name: '✨ Быстрый квиз', icon: 'help-circle', prompt: 'Сгенерируй тест из 3 вопросов по теме: ' }
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
    if (!container) return;
    container.innerHTML = TOOLS.map(tool => `
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm">
            <div class="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <i data-lucide="${tool.icon}" class="w-4 h-4"></i>
            </div>
            <span class="text-sm font-medium text-slate-600 group-hover:text-indigo-700 transition-colors">${tool.name}</span>
        </button>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// Глобальная функция для кнопок
window.useTool = (promptText) => {
    chatInput.value = promptText;
    chatInput.focus();
};

function formatContent(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\n/g, '<br>');
}

function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white' : 'bg-white border border-slate-200 text-indigo-500'} shadow-sm">
                <i data-lucide="${msg.role === 'user' ? 'user' : 'bot'}" class="w-5 h-5"></i>
            </div>
            <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]">
                <div class="px-5 py-3 rounded-2xl shadow-sm text-[15px] ${msg.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}">
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
            body: JSON.stringify({
                message: text,
                subject: state.subject,
                level: state.level,
                history: state.messages.slice(-5) 
            })
        });
        const data = await response.json();
        if (typingIndicator) typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: data.text || "Ошибка API." }] });
        renderMessages();
    } catch (err) {
        if (typingIndicator) typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Ошибка соединения." }] });
        renderMessages();
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

init();