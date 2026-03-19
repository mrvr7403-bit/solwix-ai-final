lucide.createIcons();
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const send = document.getElementById('send');

async function handleAction() {
    const text = input.value.trim();
    if (!text) return;
    
    appendMsg(text, 'user');
    input.value = '';
    const aiBubble = appendMsg('Загружаю знания...', 'ai');

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: text,
                subject: document.getElementById('subject-select').value,
                level: document.getElementById('level-select').value
            })
        });
        const data = await res.json();
        aiBubble.innerHTML = marked.parse(data.candidates[0].content.parts[0].text);
    } catch {
        aiBubble.innerText = 'Ошибка! Проверь настройки Vercel.';
    }
    chat.scrollTop = chat.scrollHeight;
}

function appendMsg(text, type) {
    const d = document.createElement('div');
    d.className = `msg msg-${type} my-2`;
    d.innerHTML = type === 'ai' ? text : text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
}

send.onclick = handleAction;
input.onkeydown = (e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAction());