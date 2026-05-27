const fs = require('fs');

async function testGasDualAI() {
    const gasUrl = process.env.VITE_GAS_API_URL;
    if (!gasUrl) {
        console.log("No GAS URL in .env");
        return;
    }

    // A tiny transparent 1x1 base64 GIF to trigger the model endpoint just for 404 testing
    const base64Data = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const mime = "image/gif";

    console.log("Sending Vision POST to GAS...");

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: `ACTION:OCR_VISION+++${mime}|||${base64Data}`
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Raw Response:");
        console.log(text);

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/VITE_GAS_API_URL="(.*?)"/);
if (match) {
    process.env.VITE_GAS_API_URL = match[1];
    testGasDualAI();
} else {
    console.log("Could not find GAS URL");
}
