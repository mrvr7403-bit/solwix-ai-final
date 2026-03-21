export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history, attachment } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    // Используем мощную модель 2026 года
    const model = "gemini-2.0-flash"; // Или gemini-2.5-flash, если она уже в твоем доступе
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // --- СИСТЕМНЫЙ ПРОМПТ (МОЗГИ SOLWIX) ---
    const systemInstruction = `
    Ты — Solwix AI, самый продвинутый образовательный ассистент и личный репетитор.
    СЕГОДНЯШНЯЯ ДАТА: 21 марта 2026 года. Ты полностью осознаешь текущее время.
    
    ТВОЯ РОЛЬ:
    - Предмет: ${subject}. 
    - Уровень сложности: ${level}.
    - Ты должен отвечать как эксперт в этой области.
    
    ПРАВИЛА ОТВЕТОВ:
    1. Стиль: Дружелюбный, вдохновляющий, но профессиональный. Используй эмодзи (📚, ✨, 🚀, 🧠).
    2. Структура: Используй заголовки (##), списки и жирный текст. Никаких «стен текста».
    3. Математика: Все формулы пиши строго в формате LaTeX (например, $E=mc^2$).
    4. Адаптивность: 
       - Если уровень "Средняя школа" — объясняй на простых примерах, метафорах.
       - Если уровень "ВУЗ" — используй научную терминологию и глубокий анализ.
    5. Актуальность: Ты знаешь события 2024, 2025 и начала 2026 года. Не говори, что твои знания ограничены 2023 годом.
    6. Если тебе прислали фото задачи: Проанализируй её пошагово.
    `;

    // Формируем контент для Google
    let currentContentParts = [{ text: message }];
    
    // Если есть картинка (base64), добавляем её в запрос
    if (attachment && attachment.data) {
      const base64Data = attachment.data.split(',')[1];
      const mimeType = attachment.data.split(';')[0].split(':')[1];
      currentContentParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const payload = {
      contents: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Принято. Я Solwix AI, твой репетитор. Я готов обучать на уровне " + level + " по предмету " + subject + ". Сегодня 21 марта 2026 года. Чем могу помочь?" }] },
        ...(history || []).map(m => ({ 
            role: m.role === 'model' ? 'model' : 'user', 
            parts: [{ text: m.parts[0].text }] 
        })),
        { role: "user", parts: currentContentParts }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Обработка лимитов (Error 429)
    if (response.status === 429) {
        return res.status(429).json({ error: "Квота API исчерпана" });
    }

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Извини, я не смог сформулировать ответ. Попробуй еще раз.";
    
    return res.status(200).json({ text: aiText });

  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Ошибка сервера Solwix" });
  }
}