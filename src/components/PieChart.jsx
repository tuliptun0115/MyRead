const COLORS = ['#fb6f92', '#ff85a1', '#ffb3c1', '#ffc2d1', '#ff7096', '#ff99ac', '#ffe5ec', '#dadada'];

const PieChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item[1], 0);
    if (total === 0) return null;

    let cumulativePercent = 0;

    return (
        <div className="pie-chart-container" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg viewBox="-1 -1 2 2" style={{ width: '150px', transform: 'rotate(-90deg)', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {data.map(([label, value], i) => {
                    const startX = Math.cos(2 * Math.PI * cumulativePercent);
                    const startY = Math.sin(2 * Math.PI * cumulativePercent);
                    const percent = value / total;
                    cumulativePercent += percent;
                    const endX = Math.cos(2 * Math.PI * cumulativePercent);
                    const endY = Math.sin(2 * Math.PI * cumulativePercent);
                    const largeArcFlag = percent > 0.5 ? 1 : 0;
                    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                    return <path key={label} d={pathData} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth="0.01" />;
                })}
            </svg>
            <div className="pie-legend" style={{ textAlign: 'left' }}>
                {data.slice(0, 5).map(([label, value], i) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i % COLORS.length] }}></div>
                        <span style={{ opacity: 0.8 }}>{label}</span>
                        <span style={{ fontWeight: 'bold' }}>{Math.round(value / total * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChart;
