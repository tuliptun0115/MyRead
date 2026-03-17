const fs = require('fs');

async function testGasDualAI() {
    const gasUrl = process.env.VITE_GAS_API_URL;
    if (!gasUrl) {
        console.log("No GAS URL in .env");
        return;
    }

    const testSummaryInfo = "書名: 高敏感的你要這樣守護自己\n作者: 泰德‧澤夫\n分類: Body, Mind & Spirit\n原本簡介: 你是否對聲音、氣味、光線特別敏感？ 在人際關係中容易感到疲憊，總是過度在意他人的情緒？ 在這個快節奏、充滿刺激的世界，你該如何保護自己？ 這本書獻給所有「高敏感族」（HSP, Highly Sensitive Person）...";
    console.log("Sending Summary POST to GAS with:", testSummaryInfo);

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: `ACTION:AI_SUMMARY+++${testSummaryInfo}`
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Raw Response:");
        console.log(text);

        try {
            const json = JSON.parse(text);
            console.log("\nParsed Drafted Summary:", json.summary);
        } catch (e) { }
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
