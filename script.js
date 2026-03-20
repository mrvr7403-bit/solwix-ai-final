const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [{ role: 'model', parts: [{ text: "Системы Solwix AI активны. Готов к работе!" }] }]
};

const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить', icon: 'sparkles', prompt: 'Объясни просто: ' },
    { name: 'Решить задачу', icon: 'check-square', prompt: 'Реши по шагам: ' },
    { name: 'Квиз', icon: 'help-circle', prompt: 'Сделай тест по теме: ' }
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
    chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function renderTools() {
    const container = document.getElementById('tools-container');
    container.innerHTML = TOOLS.map(tool => `
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-4 w-full bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 transition-all group shadow-sm">
            <i data-lucide="${tool.icon}" class="w-4 h-4 text-slate-400 group-hover:text-indigo-500"></i>
            <span class="text-sm font-semibold text-slate-600">${tool.name}</span>
        </button>
    `).join('');
    lucide.createIcons();
}

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function renderMessages() {
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200'}">
                ${msg.role === 'user' ? '<i data-lucide="user" class="w-5 h-5"></i>' : LOGO_SVG}
            </div>
            <div class="${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'} px-5 py-3 rounded-2xl max-w-[80%] text-[15px] leading-relaxed">
                ${msg.parts[0].text.replace(/\n/g, '<br>')}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
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
        state.messages.push({ role: 'model', parts: [{ text: data.text }] });
        renderMessages();
    } catch (err) {
        typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Ошибка связи." }] });
        renderMessages();
    } finally { sendBtn.disabled = false; }
}

init();