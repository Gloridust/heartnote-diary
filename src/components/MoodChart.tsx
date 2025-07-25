import { useMemo } from 'react';

interface MoodDataPoint {
  date: string;
  score: number;
  title: string;
}

interface MoodChartProps {
  data: MoodDataPoint[];
  width?: number;
  height?: number;
}

export default function MoodChart({ data, width = 320, height = 140 }: MoodChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], path: '' };

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxScore = 10;
    const minScore = 1;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + ((maxScore - point.score) / (maxScore - minScore)) * chartHeight;
      return { x, y, ...point };
    });

    const path = points.length > 1 
      ? `M ${points[0].x},${points[0].y} ` + 
        points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
      : '';

    return { points, path };
  }, [data, width, height]);

  const getMoodColor = (score: number): string => {
    if (score >= 8) return '#3B82F6'; // 亮蓝色
    if (score >= 6) return '#60A5FA'; // 天蓝色
    if (score >= 4) return '#93C5FD'; // 浅灰蓝
    if (score >= 2) return '#64748B'; // 暗灰蓝
    return '#334155'; // 深蓝灰
  };

  if (data.length === 0) {
    return (
      <div className="mood-chart-empty">
        <div className="empty-icon">📈</div>
        <p>暂无心情数据</p>
        <style jsx>{`
          .mood-chart-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: ${height}px;
            color: var(--text-tertiary);
          }
          .empty-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            opacity: 0.5;
          }
          p {
            margin: 0;
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mood-chart-container">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 背景网格线 */}
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path 
              d="M 40 0 L 0 0 0 20" 
              fill="none" 
              stroke="var(--surface-dark)" 
              strokeWidth="0.5" 
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Y轴刻度线和标签 */}
        {[2, 4, 6, 8, 10].map(score => {
          const y = 20 + ((10 - score) / 9) * (height - 40);
          return (
            <g key={score}>
              <line
                x1="20"
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="var(--surface-dark)"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <text
                x="15"
                y={y + 3}
                fontSize="10"
                fill="var(--text-tertiary)"
                textAnchor="end"
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* 趋势区域填充 */}
        {chartData.path && (
          <path
            d={`${chartData.path} L ${chartData.points[chartData.points.length - 1].x},${height - 20} L ${chartData.points[0].x},${height - 20} Z`}
            fill="var(--primary-light)"
            opacity="0.3"
          />
        )}

        {/* 趋势线 */}
        {chartData.path && (
          <path
            d={chartData.path}
            fill="none"
            stroke="var(--primary-base)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 数据点 */}
        {chartData.points.map((point, index) => (
          <g key={index}>
            {/* 外圈 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="var(--surface-main)"
              stroke={getMoodColor(point.score)}
              strokeWidth="2"
            />
            {/* 内圈 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={getMoodColor(point.score)}
            />
          </g>
        ))}

        {/* X轴日期标签（只显示首尾） */}
        {data.length > 1 && (
          <>
            <text
              x="20"
              y={height - 5}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="start"
            >
              {data[0].date.slice(5)}
            </text>
            <text
              x={width - 20}
              y={height - 5}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="end"
            >
              {data[data.length - 1].date.slice(5)}
            </text>
          </>
        )}
      </svg>

      <style jsx>{`
        .mood-chart-container {
          width: 100%;
          background: linear-gradient(135deg, var(--surface-light) 0%, var(--surface-accent) 100%);
          border-radius: 8px;
          padding: 8px;
          overflow: hidden;
        }
        svg {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </div>
  );
} 