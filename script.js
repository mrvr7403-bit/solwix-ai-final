const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [
        { role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Чем могу помочь?" }] }
    ]
};

const TOOLS = [
    { name: 'Объяснить концепцию', icon: 'sparkles', prompt: 'Объясни мне простыми словами концепцию: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши эту задачу максимально подробно по шагам: ' },
    { name: 'Проверить ошибки', icon: 'type', prompt: 'Проверь ошибки и стиль в этом тексте: ' },
    { name: 'Сделать Квиз', icon: 'help-circle', prompt: 'Сгенерируй тест из 3 вопросов по теме: ' }
];

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const toolsContainer = document.getElementById('tools-container');

function init() {
    renderTools();
    renderMessages();
    
    document.getElementById('subject-select').addEventListener('change', (e) => state.subject = e.target.value);
    document.getElementById('level-select').addEventListener('change', (e) => state.level = e.target.value);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function renderTools() {
    if (!toolsContainer) return;
    toolsContainer.innerHTML = TOOLS.map(tool => `
        <button onclick="window.useTool('${tool.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm mb-2">
            <div class="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600">
                <i data-lucide="${tool.icon}" class="w-4 h-4"></i>
            </div>
            <span class="text-sm font-medium text-slate-600 group-hover:text-blue-700">${tool.name}</span>
        </button>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

window.useTool = (promptText) => {
    chatInput.value = promptText;
    chatInput.focus();
};

function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} mb-6">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white border border-slate-200 text-blue-600 shadow-sm">
                <i data-lucide="${msg.role === 'user' ? 'user' : 'bot'}"></i>
            </div>
            <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]">
                <div class="px-5 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}">
                    ${msg.parts[0].text.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-slate-400 text-sm italic p-4 ml-10";
    loadingDiv.innerText = "Solwix думает...";
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                subject: state.subject,
                level: state.level,
                history: state.messages.slice(-6)
            })
        });

        const data = await response.json();
        loadingDiv.remove();
        state.messages.push({ role: 'model', parts: [{ text: data.text || "Ошибка получения ответа." }] });
        renderMessages();
    } catch (err) {
        if(loadingDiv) loadingDiv.innerText = "Ошибка: " + err.message;
    }
}

init();