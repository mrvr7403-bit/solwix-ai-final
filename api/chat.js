module.exports = async (req, res) => {
  // Разрешаем только POST запросы от твоего сайта
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) {
      return res.status(200).json({ text: "Ошибка конфигурации: API ключ не найден в настройках Vercel." });
    }

    // Используем максимально стабильную версию модели
    const model = "gemini-1.5-flash-latest"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Используем глобальный fetch (стандарт Node.js 18+ на Vercel)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: history || [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: { 
          parts: [{ text: `Ты — Solwix AI, академический помощник. Предмет: ${subject}. Уровень: ${level}. Твои ответы должны быть точными, вежливыми и на русском языке.` }] 
        }
      })
    });

    const data = await response.json();

    // Если Google вернул ошибку, выводим её в чат для отладки
    if (data.error) {
      return res.status(200).json({ text: `Ошибка Google: ${data.error.message}` });
    }

    // Безопасно извлекаем текст из ответа
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(200).json({ text: "ИИ прислал пустой ответ. Попробуйте перефразировать вопрос." });
    }

    // Возвращаем чистый текст ответа
    return res.status(200).json({ text: aiText });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(200).json({ text: "Системная ошибка сервера: " + error.message });
  }
};