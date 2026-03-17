const fs = require('fs');

async function testGasNLP() {
    const gasUrl = process.env.VITE_GAS_API_URL;
    if (!gasUrl) {
        console.log("No GAS URL in .env");
        return;
    }

    const testText = "身為高敏人, 你要學習最重要 的 事 就是 如何管理 自己 對 身體 和 情緒 刺激 的 高 度 敏感 必 舒緩 焦慮 , 找 回 內 在 平靜 的 心靈 療 癒 指 南高敏感的你要這樣守護自己THEHIGHLYSENSITIVEPERSON'SSURVIVALGUIDETed Zeff,Ph.D.世茂出版";
    console.log("Sending POST to GAS with RAW text:", testText);

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: `ACTION:OCR+++${testText}`
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Raw Response:");
        console.log(text);

        try {
            const json = JSON.parse(text);
            console.log("Parsed JSON:", json);
        } catch (e) { }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/VITE_GAS_API_URL="(.*?)"/);
if (match) {
    process.env.VITE_GAS_API_URL = match[1];
    testGasNLP();
} else {
    console.log("Could not find GAS URL");
}
