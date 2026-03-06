
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined");
    process.exit(1);
}

async function listModels() {
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
            headers: {
                "x-goog-api-key": apiKey!,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Available Models:");
        data.models.forEach((m: { name: string; displayName: string; supportedGenerationMethods: string[] }) => {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Supported generation methods: ${m.supportedGenerationMethods.join(", ")}`);
        });
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
