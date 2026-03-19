export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден в Vercel." });

    // Самый стабильный эндпоинт
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Формируем историю так, чтобы первым шел контекст персонажа
    const contextPrompt = `Ты — Solwix AI, академический помощник. Предмет: ${subject}, Уровень: ${level}. Отвечай на русском.`;
    
    // Собираем всё в один массив контента
    const contents = [
      { role: "user", parts: [{ text: contextPrompt }] },
      { role: "model", parts: [{ text: "Понял тебя. Я Solwix AI, готов помогать!" }] },
      ...(history || []),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: `Ошибка Google: ${data.error.message} (Код: ${data.error.code})` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Ошибка сервера: " + error.message });
  }
}