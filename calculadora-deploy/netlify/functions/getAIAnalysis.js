// Esta es tu función serverless.
// Debe estar en una carpeta: /netlify/functions/getAIAnalysis.js

exports.handler = async (event) => {
    // 1. Obtener los prompts que envió el frontend (desde el event.body)
    let systemPrompt, userPrompt;
    try {
        const body = JSON.parse(event.body);
        systemPrompt = body.systemPrompt;
        userPrompt = body.userPrompt;

        if (!systemPrompt || !userPrompt) {
            throw new Error("Faltan 'systemPrompt' o 'userPrompt' en el body.");
        }
    } catch (error) {
        console.error("Error al parsear el body:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Error en los datos enviados: ${error.message}` }),
        };
    }

    // 2. Obtener tu clave de API SECRETA desde las variables de entorno de Netlify
    // ¡NUNCA escribas la clave aquí!
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: GEMINI_API_KEY no está configurada en Netlify.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error de configuración del servidor. (API Key no encontrada)" }),
        };
    }

    // URL Corregida (sin "light")
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 3. Construir el payload que enviaremos a Google (como lo hacíamos antes)
    const geminiPayload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // 4. Llamar a la API de Gemini desde el servidor
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error de la API de Gemini:", response.status, errorBody);
            throw new Error(`Error de la API de Gemini: ${response.statusText}`);
        }

        const result = await response.json();
        
        // 5. Extraer el texto de la respuesta de Gemini
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("Respuesta de Gemini inválida:", result);
            throw new Error("Respuesta de la IA inválida.");
        }

        // 6. Devolver solo el texto al frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ text: text }) // Enviamos un JSON simple
        };

    } catch (error) {
        console.error("Error en el fetch a Gemini:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error al contactar la IA: ${error.message}` }),
        };
    }
};

