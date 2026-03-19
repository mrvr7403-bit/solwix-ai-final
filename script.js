const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [
        { role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Чем могу помочь?" }] }
    ]
};

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function init() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderMessages();
    
    document.getElementById('subject-select').addEventListener('change', (e) => state.subject = e.target.value);
    document.getElementById('level-select').addEventListener('change', (e) => state.level = e.target.value);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function formatContent(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = state.messages.map(msg => `
        <div class="flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} mb-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white border border-slate-200 text-blue-600 shadow-sm">
                <i data-lucide="${msg.role === 'user' ? 'user' : 'bot'}"></i>
            </div>
            <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]">
                <div class="px-5 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}">
                    ${formatContent(msg.parts[0].text)}
                </div>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-slate-400 text-sm italic p-4";
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

        // Проверяем, пришел ли текст
        const aiResponse = data.text || "Ошибка: ответ пустой.";
        state.messages.push({ role: 'model', parts: [{ text: aiResponse }] });
        renderMessages();

    } catch (err) {
        loadingDiv.innerText = "Ошибка связи. Проверь консоль (F12).";
        console.error("Критическая ошибка:", err);
    }
}

init();