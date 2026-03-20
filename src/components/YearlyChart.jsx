const COLORS = ['#fb6f92', '#ff85a1', '#ffb3c1', '#ffc2d1', '#ff7096', '#ff99ac', '#ffe5ec', '#dadada'];

const YearlyChart = ({ records }) => {
    // 1. 提取年份統計
    const yearlyData = {};
    records.forEach(r => {
        if (r.completionDate) {
            const year = r.completionDate.split('-')[0];
            if (year && year.length === 4) {
                yearlyData[year] = (yearlyData[year] || 0) + 1;
            }
        }
    });

    // 2. 排序年份 (由舊到新)
    const sortedYears = Object.entries(yearlyData).sort((a, b) => a[0] - b[0]);
    if (sortedYears.length === 0) return null;

    const maxCount = Math.max(...sortedYears.map(item => item[1]));
    const chartHeight = 120;
    const barWidth = 35;
    const gap = 15;

    return (
        <div className="yearly-chart-container" style={{ 
            marginTop: '0px', 
            padding: '40px 10px 20px', 
            textAlign: 'center',
            width: '100%',
            overflow: 'visible'
        }}>
            <h4 style={{ marginBottom: '15px', fontSize: '0.9rem', opacity: 0.8 }}>年度閱讀趨勢</h4>
            <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: sortedYears.length > 5 ? 'flex-start' : 'center', 
                gap: `${gap}px`, 
                minHeight: `${chartHeight + 40}px`,
                overflowX: 'auto',
                overflowY: 'visible',
                paddingBottom: '20px'
            }}>
                {sortedYears.map(([year, count], i) => {
                    const height = (count / maxCount) * chartHeight;
                    return (
                        <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 'bold', color: '#fb6f92' }}>{count}</span>
                            <div style={{ 
                                width: `${barWidth}px`, 
                                height: `${height}px`, 
                                background: `linear-gradient(to top, #fb6f92, ${COLORS[i % COLORS.length]})`,
                                borderRadius: '4px 4px 2px 2px',
                                transition: 'height 0.6s ease-out',
                                boxShadow: '0 2px 8px rgba(251, 111, 146, 0.3)'
                            }}></div>
                            <span style={{ fontSize: '16px', marginTop: '12px', opacity: 0.8 }}>{year}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default YearlyChart;
