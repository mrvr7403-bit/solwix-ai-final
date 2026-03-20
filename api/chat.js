export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден в Vercel." });

    // Используем gemini-1.5-pro-latest — это самая мощная и стабильная модель
    const model = "gemini-1.5-pro-latest"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: `Ты — Solwix AI, академический помощник. Предмет: ${subject}. Уровень: ${level}. Отвечай на русском.` }] },
        { role: "model", parts: [{ text: "Понял! Я Solwix AI, готов помочь." }] },
        ...(history || []).map(m => ({ 
            role: m.role === 'model' ? 'model' : 'user', 
            parts: [{ text: m.parts[0].text }] 
        })),
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
      // Если даже Pro-модель выдает 404, значит Google капризничает с регионом
      return res.status(200).json({ text: `Google (Pro) говорит: ${data.error.message} (Код: ${data.error.code})` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пусто.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Ошибка: " + error.message });
  }
}