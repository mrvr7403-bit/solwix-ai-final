export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден в настройках Vercel." });

    // Самый прямой путь к модели 1.5 Flash через v1beta
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Ты — Solwix AI. Предмет: ${subject}. Уровень: ${level}. Отвечай на русском.` }]
        },
        {
          role: "model",
          parts: [{ text: "Принято! Я Solwix AI, твой помощник." }]
        },
        ...(history || []).map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.parts[0].text }]
        })),
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
      return res.status(200).json({ text: `Google ворчит: ${data.error.message} (Код: ${data.error.code})` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Системная ошибка: " + error.message });
  }
}