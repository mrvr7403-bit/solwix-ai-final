const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    language: 'ru', // По умолчанию русский
    messages: []
};

// Функция определения языка (Простой детектор латиницы)
function detectLanguage(text) {
    const englishPattern = /^[A-Za-z0-9\s.,!?-]+$/;
    return englishPattern.test(text.slice(0, 20)) ? 'en' : 'ru';
}

const LOGO_CHAT = `<svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40" fill="url(#grad-solwix)" /></svg>`;

const TOOLS = [
    { name: 'Объяснить', icon: 'sparkles', prompt: 'Объясни просто: ' },
    { name: 'Решить задачу', icon: 'check-square', prompt: 'Реши по шагам: ' },
    { name: 'Тест/Квиз', icon: 'help-circle', prompt: 'Сделай тест по теме: ' },
    { name: 'Конспект', icon: 'book-open', prompt: 'Сделай краткий конспект темы: ' },
    { name: 'Перевести', icon: 'languages', prompt: 'Переведи на другой язык и объясни правила: ' },
    { name: 'Стиль текста', icon: 'edit-3', prompt: 'Улучши стиль и грамматику этого текста: ' }
];

const chatMessages = document.getElementById('chat-messages');
const chatScrollArea = document.getElementById('chat-scroll-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('ai-typing-indicator');

function init() {
    if (window.lucide) lucide.createIcons();
    
    // Приветственное сообщение
    state.messages.push({ role: 'model', parts: [{ text: "Привет! Я **Solwix AI**. Чем могу помочь?\n\nHi! I'm **Solwix AI**. How can I help you today?" }] });
    
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
        <button onclick="useTool('${tool.prompt}')" class="flex items-center gap-3 p-3 w-full text-left bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
            <i data-lucide="${tool.icon}" class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors"></i>
            <span class="text-[11px] font-bold text-slate-600">${tool.name}</span>
        </button>
    `).join('');
    lucide.createIcons();
}

window.useTool = (p) => { chatInput.value = p; chatInput.focus(); };

function renderMessages() {
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in duration-300">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm">
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

    // Авто-определение языка по первому сообщению
    if (state.messages.length <= 1) {
        state.language = detectLanguage(text);
        document.getElementById('typing-text').innerText = state.language === 'en' ? 'Solwix is thinking...' : 'Solwix размышляет...';
    }

    sendBtn.disabled = true;
    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    typingIndicator.classList.remove('hidden');
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;

    // Промпт-инструкция для языка
    const langInstruction = state.language === 'en' ? " PLEASE ANSWER IN ENGLISH." : " ПОЖАЛУЙСТА, ОТВЕЧАЙ НА РУССКОМ.";

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text + langInstruction, 
                subject: state.subject, 
                level: state.level, 
                history: state.messages.slice(-5) 
            })
        });
        const data = await response.json();
        typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: data.text }] });
        renderMessages();
    } catch (err) {
        typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Error. Please try again." }] });
        renderMessages();
    } finally { sendBtn.disabled = false; chatInput.focus(); }
}

init();