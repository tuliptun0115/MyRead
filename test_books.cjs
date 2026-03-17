const title = "高敏感的你要這樣守護自己";

async function testGoogleBooks() {
    try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=1`);
        if (res.ok) {
            const json = await res.json();
            if (json.items && json.items.length > 0) {
                const volInfo = json.items[0].volumeInfo;
                console.log({
                    title: volInfo.title,
                    author: volInfo.authors ? volInfo.authors.join(', ') : '',
                    category: volInfo.categories ? volInfo.categories[0] : '',
                    publisher: volInfo.publisher || '',
                    summary: volInfo.description ? volInfo.description.substring(0, 100) + '...' : ''
                });
            } else {
                console.log("No items found");
            }
        } else {
            console.log("HTTP error", res.status);
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}
testGoogleBooks();
