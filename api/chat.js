export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден в Vercel." });

    // Возвращаемся на v1beta, так как только там сейчас живет модель 1.5-flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Самая простая структура данных, которую понимает любая версия
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Ты — Solwix AI, академический помощник по предмету ${subject} (${level}). Отвечай на русском.` }]
        },
        {
          role: "model",
          parts: [{ text: "Хорошо, я готов помогать как Solwix AI!" }]
        },
        // Добавляем историю, если она есть
        ...(history || []).map(msg => ({
          role: msg.role,
          parts: [{ text: msg.parts[0].text }]
        })),
        // Текущее сообщение пользователя
        {
          role: "user",
          parts: [{ text: message }]
        }
      ]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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