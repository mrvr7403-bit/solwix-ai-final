const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [
        { role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Выбери предмет и уровень сложности сверху, и мы приступим к учебе!" }] }
    ]
};

const TOOLS = [
    { name: 'Объяснить концепцию', icon: 'sparkles', prompt: 'Объясни мне простыми словами концепцию: ' },
    { name: 'Решить по шагам', icon: 'check-square', prompt: 'Реши эту задачу максимально подробно по шагам: ' },
    { name: 'Проверить грамматику', icon: 'type', prompt: 'Проверь ошибки и стиль в этом тексте: ' },
    { name: '✨ Быстрый квиз', icon: 'help-circle', prompt: 'Сгенерируй тест из 3 вопросов для проверки знаний по теме: ' }
];

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function init() {
    lucide.createIcons();
    renderTools();
    renderMessages();
    
    // Listeners
    document.getElementById('subject-select').addEventListener('change', (e) => state.subject = e.target.value);
    document.getElementById('level-select').addEventListener('change', (e) => state.level = e.target.value);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function renderTools() {
    const container = document.getElementById('tools-container');
    container.innerHTML = TOOLS.map(tool => `
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm">
            <div class="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600">
                <i data-lucide="${tool.icon}" class="w-4 h-4"></i>
            </div>
            <span class="text-sm font-medium text-slate-600 group-hover:text-blue-700">${tool.name}</span>
        </button>
    `).join('');
    lucide.createIcons();
}

function formatContent(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
        .replace(/\$\$(.*?)\$\$/gs, '<div class="bg-slate-800 text-blue-100 p-4 my-3 rounded-lg font-mono text-sm overflow-x-auto">$1</div>')
        .replace(/\$(.*?)\$/g, '<code class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono text-sm border border-blue-100">$1</code>')
        .replace(/\n/g, '<br>');
}

function renderMessages() {
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-blue-600'}">
                <i data-lucide="${msg.role === 'user' ? 'user' : 'bot'}" class="w-5 h-5"></i>
            </div>
            <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]">
                <div class="px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}">
                    ${formatContent(msg.parts[0].text)}
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-slate-400 text-sm italic ml-14 animate-pulse";
    loadingDiv.innerText = "Solwix думает...";
    chatMessages.appendChild(loadingDiv);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                subject: state.subject,
                level: state.level,
                history: state.messages.slice(-5) // Отправляем последние сообщения для контекста
            })
        });

        const data = await response.json();
        loadingDiv.remove();

        if (data.error) throw new Error(data.error);

        state.messages.push({ role: 'model', parts: [{ text: data.text }] });
        renderMessages();
    } catch (err) {
        loadingDiv.innerText = "Ошибка связи с сервером.";
        console.error(err);
    }
}

window.useTool = (prompt) => {
    chatInput.value = prompt;
    chatInput.focus();
};

init();