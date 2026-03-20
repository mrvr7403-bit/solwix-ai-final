export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден в Vercel." });

    // ПОПЫТКА №1: Используем полное название модели (flash-001)
    // Если это не сработает, Google вернет ошибку, и мы это увидим
    const modelName = "gemini-1.5-flash"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: `Ты — Solwix AI. Предмет: ${subject}. Уровень: ${level}. Отвечай на русском.` }] },
        { role: "model", parts: [{ text: "Принято!" }] },
        ...(history || []).map(m => ({ role: m.role, parts: [{ text: m.parts[0].text }] })),
        { role: "user", parts: [{ text: message }] }
      ]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      // ЕСЛИ ОПЯТЬ 404: Давай выведем ВЕСЬ список доступных тебе моделей в чат!
      // Это поможет нам понять, под каким именем Google скрывает Gemini у тебя.
      if (data.error.code === 404) {
        return res.status(200).json({ 
          text: `Google опять выдал 404. Попробуй зайти в Google AI Studio и проверить, создана ли там именно модель 'gemini-1.5-flash'. Текст ошибки: ${data.error.message}` 
        });
      }
      return res.status(200).json({ text: `Ошибка Google: ${data.error.message}` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пусто.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Системный сбой: " + error.message });
  }
}