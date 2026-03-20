const state = {
    subject: 'Математика',
    level: 'Средняя школа',
    messages: [
        { role: 'model', parts: [{ text: "Привет! Я твой академический помощник **Solwix AI**. Выбери предмет и уровень сложности сверху, и мы приступим к учебе!" }] }
    ]
};

// Проверяем, какие ID на самом деле есть в твоем HTML
// Если у тебя в HTML id="user-input", поменяй 'chat-input' на 'user-input' ниже
const chatInput = document.getElementById('chat-input') || document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('ai-typing-indicator');

function init() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Подключаем выбор предмета и уровня
    const subSelect = document.getElementById('subject-select');
    const lvlSelect = document.getElementById('level-select');
    
    if(subSelect) subSelect.addEventListener('change', (e) => state.subject = e.target.value);
    if(lvlSelect) lvlSelect.addEventListener('change', (e) => state.level = e.target.value);
    
    // Кнопка отправки
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    
    // Клавиша Enter
    if(chatInput) {
        chatInput.addEventListener('keydown', (e) => { 
            if(e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                sendMessage(); 
            } 
        });
    }

    renderMessages();
}

function formatContent(text) {
    // Делаем текст красивым (жирный, переносы строк)
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function renderMessages() {
    if(!chatMessages) return;
    
    chatMessages.innerHTML = state.messages.map(msg => `
        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-direction: ${msg.role === 'user' ? 'row-reverse' : 'row'}">
            <div style="padding: 10px; border-radius: 15px; max-width: 80%; background: ${msg.role === 'user' ? '#6366f1' : '#f1f5f9'}; color: ${msg.role === 'user' ? 'white' : 'black'}">
                ${formatContent(msg.parts[0].text)}
            </div>
        </div>
    `).join('');
    
    scrollToBottom();
}

function scrollToBottom() {
    if(chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || sendBtn.disabled) return;

    // Блокируем интерфейс
    sendBtn.disabled = true;
    state.messages.push({ role: 'user', parts: [{ text }] });
    chatInput.value = '';
    renderMessages();

    // Показываем индикатор "Думает"
    if(typingIndicator) typingIndicator.classList.remove('hidden');
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
        
        if(typingIndicator) typingIndicator.classList.add('hidden');

        if (data.text) {
            state.messages.push({ role: 'model', parts: [{ text: data.text }] });
        } else {
            state.messages.push({ role: 'model', parts: [{ text: "Ошибка: Google не ответил." }] });
        }
        renderMessages();
    } catch (err) {
        if(typingIndicator) typingIndicator.classList.add('hidden');
        state.messages.push({ role: 'model', parts: [{ text: "Сбой сети. Попробуй еще раз." }] });
        renderMessages();
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Запуск
init();