export default function BookListItem({ record, defaultCover, onClick }) {
    return (
        <div className="book-list-item" onClick={onClick} style={{ cursor: 'pointer' }}>
            <img 
                src={record.coverUrl || defaultCover} 
                className="list-cover" 
                onError={(e) => { e.target.src = defaultCover; }}
                alt="封面"
            />
            <div className="list-info">
                <div className="list-title">{record.title}</div>
                <div className="list-meta">
                    <span className="list-author-publisher">{record.author} / {record.publisher}</span>
                    <span className="list-category" style={{ marginLeft: '8px' }}>{record.category}</span>
                </div>
                <div className="list-summary">{record.summary}</div>
            </div>
            <div className="list-date">完讀日<br />{record.completionDate}</div>
        </div>
    );
}
