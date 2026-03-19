export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) {
      return res.status(200).json({ text: "Ошибка: API ключ (GEMINI_KEY) не найден в Vercel." });
    }

    // В 2026 году это самый стабильный эндпоинт для модели Flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history || [{ role: "user", parts: [{ text: message }] }],
        systemInstruction: { 
          parts: [{ text: `Ты — Solwix AI, эксперт в области ${subject}. Уровень: ${level}. Отвечай на русском языке, будь краток и полезен.` }] 
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    const data = await response.json();

    // Если Google вернул ошибку, мы её расшифруем
    if (data.error) {
      console.error("Google API Error:", data.error);
      return res.status(200).json({ 
        text: `Ошибка Google: ${data.error.message}. (Код: ${data.error.code})` 
      });
    }

    // Проверка структуры ответа
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(200).json({ text: "Google прислал пустой ответ. Попробуй другой вопрос." });
    }

    return res.status(200).json({ text: aiText });

  } catch (error) {
    console.error("Vercel Server Error:", error);
    return res.status(200).json({ text: "Системная ошибка: " + error.message });
  }
}