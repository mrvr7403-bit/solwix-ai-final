const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [{ role: 'model', parts: [{ text: "Привет! Я **Solwix AI**. Чем могу помочь сегодня?" }] }]
};

const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить', icon: 'sparkles', prompt: 'Объясни просто: ' },
    { name: 'Решить задачу', icon: 'check-square', prompt: 'Реши по шагам: ' },
    { name: 'Тест', icon: 'help-circle', prompt: 'Сделай тест по теме: ' }
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
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-4 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-indigo-300 transition-all group shadow-sm">
            <i data-lucide="${tool.icon}" class="w-4 h-4 text-slate-400 group-hover:text-indigo-600"></i>
            <span class="text-xs font-bold text-slate-600">${tool.name}</span>
        </button>
    `).join('');
    lucide.createIcons();
}

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function renderMessages() {
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 bg-white">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-4 h-4 text-indigo-500"></i>' : LOGO_CHAT}
            </div>
            <div class="${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'} px-5 py-3 shadow-sm text-sm leading-relaxed max-w-[85%]">
                ${msg.parts[0].text.replace(/\n/g, '<br>')}
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || sendBtn.disabled) return;

    sendBtn.disabled = true;
    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    typingIndicator.classList.remove('hidden');
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, subject: state.subject, level: state.level, history: state.messages.slice(-5) })
        });
        const data = await response.json();
        typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: data.text || "Ошибка." }] });
        renderMessages();
    } catch (err) {
        typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Сбой связи." }] });
        renderMessages();
    } finally { sendBtn.disabled = false; chatInput.focus(); }
}

init();