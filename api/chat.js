module.exports = async (req, res) => {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) {
      return res.status(200).json({ text: "Ошибка: В настройках Vercel не найден GEMINI_KEY!" });
    }

    const systemInstruction = `Ты — Solwix AI. Предмет: ${subject}. Уровень: ${level}. Отвечай на русском.`;

    // Используем динамический импорт fetch (для стабильности в Node.js)
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Но в Vercel Node 18+ fetch уже встроен, так что попробуем напрямую:
    const response = await global.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history || [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: `Ошибка Google: ${data.error.message}` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Системная ошибка сервера: " + error.message });
  }
};