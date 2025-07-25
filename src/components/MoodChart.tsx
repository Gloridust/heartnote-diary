import { useMemo, useState } from 'react';

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

interface TooltipData {
  show: boolean;
  x: number;
  y: number;
  data?: MoodDataPoint & { index: number };
}

export default function MoodChart({ data, width = 320, height = 140 }: MoodChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData>({ show: false, x: 0, y: 0 });

  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], path: '', areaPath: '' };

    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxScore = 10;
    const minScore = 0;

    const points = data.map((point, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding + ((maxScore - point.score) / (maxScore - minScore)) * chartHeight;
      return { x, y, ...point, index };
    });

    const path = points.length > 1 
      ? `M ${points[0].x},${points[0].y} ` + 
        points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
      : '';

    // 创建渐变区域路径
    const areaPath = points.length > 1
      ? `M ${points[0].x},${height - padding} L ${points[0].x},${points[0].y} ` +
        points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x},${height - padding} Z`
      : '';

    return { points, path, areaPath };
  }, [data, width, height]);

  const getMoodColor = (score: number): string => {
    if (score >= 8) return '#2563EB'; // 明亮活力蓝 - 非常开心
    if (score >= 6) return '#3B82F6'; // 清爽天空蓝 - 愉快  
    if (score >= 4) return '#93C5FD'; // 柔和灰蓝 - 平静
    if (score >= 2) return '#64748B'; // 暗淡石板蓝 - 低落
    return '#334155'; // 深沉海军蓝 - 难过
  };

  const getMoodEmoji = (score: number): string => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  };

  const handleMouseEnter = (point: typeof chartData.points[0], event: React.MouseEvent) => {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    setTooltip({
      show: true,
      x: point.x,
      y: point.y - 10,
      data: point
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, x: 0, y: 0 });
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
        {/* 定义渐变 */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary-base)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary-base)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* 简洁的Y轴参考线 */}
        {[2, 4, 6, 8, 10].map(score => {
          const y = 30 + ((10 - score) / 10) * (height - 60);
          return (
            <g key={score}>
              <line
                x1="30"
                y1={y}
                x2={width - 30}
                y2={y}
                stroke="var(--surface-dark)"
                strokeWidth="1"
                opacity="0.2"
                strokeDasharray="2,2"
              />
              <text
                x="20"
                y={y + 4}
                fontSize="11"
                fill="var(--text-tertiary)"
                textAnchor="middle"
                fontWeight="500"
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* 渐变区域填充 */}
        {chartData.areaPath && (
          <path
            d={chartData.areaPath}
            fill="url(#areaGradient)"
          />
        )}

        {/* 简洁的趋势线 */}
        {chartData.path && (
          <path
            d={chartData.path}
            fill="none"
            stroke="var(--primary-base)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 扁平化数据点 */}
        {chartData.points.map((point, index) => (
          <g key={index}>
            {/* 悬浮感应区域 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              cursor="pointer"
              onMouseEnter={(e) => handleMouseEnter(point, e)}
              onMouseLeave={handleMouseLeave}
            />
            {/* 数据点 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={getMoodColor(point.score)}
              stroke="var(--surface-main)"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />
          </g>
        ))}

        {/* X轴日期标签 */}
        {data.length > 1 && (
          <>
            <text
              x="30"
              y={height - 8}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="start"
              fontWeight="500"
            >
              {data[0].date.slice(5)}
            </text>
            <text
              x={width - 30}
              y={height - 8}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="end"
              fontWeight="500"
            >
              {data[data.length - 1].date.slice(5)}
            </text>
          </>
        )}
      </svg>

      {/* 悬浮提示框 */}
      {tooltip.show && tooltip.data && (
        <div 
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-emoji">{getMoodEmoji(tooltip.data.score)}</div>
            <div className="tooltip-score">{tooltip.data.score}/10</div>
            <div className="tooltip-date">{tooltip.data.date.slice(5)}</div>
            <div className="tooltip-title">{tooltip.data.title}</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mood-chart-container {
          position: relative;
          width: 100%;
          background: var(--surface-main);
          border-radius: 12px;
          padding: 12px;
          border: 1px solid var(--surface-dark);
        }
        
        svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .tooltip {
          position: absolute;
          pointer-events: none;
          z-index: 1000;
          transform: translate(-50%, -100%);
        }

        .tooltip-content {
          background: var(--surface-main);
          border: 1px solid var(--surface-dark);
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          text-align: center;
          min-width: 80px;
        }

        .tooltip-emoji {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .tooltip-score {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .tooltip-date {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .tooltip-title {
          font-size: 11px;
          color: var(--text-tertiary);
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (prefers-color-scheme: dark) {
          .tooltip-content {
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
        }
      `}</style>
    </div>
  );
} 