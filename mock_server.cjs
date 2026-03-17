const http = require('http');

let db = []; // Memory DB

const requestListener = function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/exec' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', data: db }));
        return;
    }

    if (req.url === '/exec' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });

            if (body.startsWith('ACTION:OCR_VISION+++')) {
                setTimeout(() => {
                    res.end(JSON.stringify({ title: '高敏感的你要這樣守護自己', author: '泰德‧澤夫', error: '' }));
                }, 1500); // Simulate network delay
            } else if (body.startsWith('ACTION:AI_SUMMARY+++')) {
                setTimeout(() => {
                    res.end(JSON.stringify({ summary: '📚 此書專為高敏感族設計，提出具體的心理學方法，教你如何在快節奏的世界中建立「結界」。如果你容易受別人情緒影響，這本說明書將能助你重拾靜心！' }));
                }, 1500);
            } else {
                try {
                    const parsed = JSON.parse(body);
                    const newRecord = {
                        id: db.length + 1,
                        title: parsed.t || '無書名',
                        coverUrl: parsed.c || '',
                        completionDate: parsed.d || '',
                        author: parsed.a || '無作者',
                        category: parsed.cat || '未分類',
                        publisher: parsed.p || '',
                        summary: parsed.s || '暫無摘要...'
                    };
                    db.unshift(newRecord); // Add to top
                    res.end(JSON.stringify({ status: 'success' }));
                } catch (e) {
                    res.end(JSON.stringify({ status: 'error', message: 'invalid JSON' }));
                }
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
};

const server = http.createServer(requestListener);
server.listen(8080, () => {
    console.log(`Mock GAS Server is running on http://localhost:8080/exec`);
});
