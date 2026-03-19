export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) {
      return res.status(200).json({ text: "Ошибка: В настройках Vercel не найден GEMINI_KEY!" });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history || [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: { 
          parts: [{ text: `Ты — Solwix AI. Предмет: ${subject}. Уровень: ${level}. Отвечай кратко и по делу на русском.` }] 
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: "Ошибка Google: " + data.error.message });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Ошибка сервера: " + error.message });
  }
}