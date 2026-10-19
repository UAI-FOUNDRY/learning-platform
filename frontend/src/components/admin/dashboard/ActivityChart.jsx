import React, { useState, useId, useRef, useEffect } from 'react';

const METRIC_CONFIG = {
  registrations: {
    id: 'registrations',
    label: 'Registrations',
    fullName: 'User Registrations',
    color: '#D92D2D', // Brand Red
    strokeDash: 'none',
    lineStyleLabel: 'Solid line',
    pointShape: 'circle'
  },
  enrollments: {
    id: 'enrollments',
    label: 'Enrollments',
    fullName: 'Course Enrollments',
    color: '#514940', // Neutral taupe/slate
    strokeDash: '8 5',
    lineStyleLabel: 'Dashed line',
    pointShape: 'diamond'
  },
  coursesCreated: {
    id: 'coursesCreated',
    label: 'Courses Created',
    fullName: 'Courses Created',
    color: '#0D9488', // Teal
    strokeDash: '3 4',
    lineStyleLabel: 'Dotted line',
    pointShape: 'square'
  },
  courseApprovals: {
    id: 'courseApprovals',
    label: 'Approvals',
    fullName: 'Course Approvals',
    color: '#D97706', // Amber
    strokeDash: '10 4 2 4',
    lineStyleLabel: 'Dash-dot line',
    pointShape: 'triangle'
  },
  courseCompletions: {
    id: 'courseCompletions',
    label: 'Completions',
    fullName: 'Course Completions',
    color: '#15803D', // Emerald
    strokeDash: '5 3',
    lineStyleLabel: 'Short-dash line',
    pointShape: 'circle'
  }
};

const RANGES = ['7D', '30D', '90D', '1Y'];

/**
 * Generates a smooth SVG path through an array of points using cubic Bezier curves.
 * Clamps Y control points within chart plotting boundaries so curves do not overshoot the top gridline
 * or dip below the zero baseline into negative values.
 */
function createSmoothPath(points, topBound, bottomBound) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const tension = 0.2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Clamp Y control points within chart bounds so the curve does not dip below zero or overshoot the top
    if (typeof topBound === 'number' && typeof bottomBound === 'number') {
      cp1y = Math.max(topBound, Math.min(bottomBound, cp1y));
      cp2y = Math.max(topBound, Math.min(bottomBound, cp2y));
    }

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export default function ActivityChart({ trendsData = {} }) {
  const [selectedRange, setSelectedRange] = useState('30D');
  const [activeMetric, setActiveMetric] = useState('registrations');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareMetrics, setCompareMetrics] = useState(['registrations', 'enrollments']);
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [showDataTable, setShowDataTable] = useState(false);

  const svgRef = useRef(null);
  const gradientId = useId();

  // Reset hovered point when range or active metric toggles
  useEffect(() => {
    setHoveredPointIndex(null);
  }, [selectedRange, activeMetric, isCompareMode]);

  // Metrics to render
  const metricsToDisplay = isCompareMode
    ? compareMetrics
    : [activeMetric];

  const currentRangeData = trendsData[selectedRange] || {};

  // Check if current range data is available
  const hasData = metricsToDisplay.some(
    m => Array.isArray(currentRangeData[m]) && currentRangeData[m].length > 0
  );

  // SVG Dimensions & Padding - Balanced proportion and efficient plotting area
  const width = 720;
  const height = 240;
  const padding = { top: 16, right: 24, bottom: 32, left: 46 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute shared maximum Y value across all displayed metrics
  let rawMaxY = 1;
  metricsToDisplay.forEach(m => {
    const list = currentRangeData[m] || [];
    list.forEach(pt => {
      if (typeof pt.value === 'number' && pt.value > rawMaxY) {
        rawMaxY = pt.value;
      }
    });
  });

  // Calculate clean, readable axis max and tick intervals (4 intervals, 5 ticks)
  // Ensures integer ticks without duplicate rounded values
  const calculateAxisScale = (maxVal) => {
    if (maxVal <= 4) {
      return { axisMax: 4, yTicks: [0, 1, 2, 3, 4] };
    }
    const rawStep = maxVal / 4;
    const power = Math.floor(Math.log10(rawStep));
    const magnitude = Math.pow(10, power);
    const residual = rawStep / magnitude;

    let step;
    if (residual <= 1) step = 1 * magnitude;
    else if (residual <= 2) step = 2 * magnitude;
    else if (residual <= 2.5) step = 2.5 * magnitude;
    else if (residual <= 5) step = 5 * magnitude;
    else step = 10 * magnitude;

    const axisMax = step * 4;
    const yTicks = [0, step, step * 2, step * 3, axisMax];
    return { axisMax, yTicks };
  };

  const { axisMax, yTicks: rawYTicks } = calculateAxisScale(rawMaxY);

  const yTicks = rawYTicks.map(value => {
    const ratio = axisMax > 0 ? value / axisMax : 0;
    const y = padding.top + chartH - ratio * chartH;
    return { value, y };
  });

  // Calculate coordinates for each metric
  const metricSeries = metricsToDisplay.map((metricKey, idx) => {
    const config = METRIC_CONFIG[metricKey];
    const dataList = currentRangeData[metricKey] || [];
    const count = dataList.length;

    const points = dataList.map((pt, i) => {
      const x = count > 1 ? padding.left + (i / (count - 1)) * chartW : padding.left + chartW / 2;
      const val = typeof pt.value === 'number' ? pt.value : 0;
      const y = padding.top + chartH - (val / axisMax) * chartH;
      return {
        ...pt,
        x,
        y,
        metricKey,
        metricName: config.fullName,
        index: i
      };
    });

    const baseline = padding.top + chartH;
    const smoothPath = createSmoothPath(points, padding.top, baseline);
    let areaPath = '';
    if (points.length > 0 && !isCompareMode) {
      const first = points[0];
      const last = points[points.length - 1];
      areaPath = `${smoothPath} L ${last.x.toFixed(1)} ${baseline.toFixed(1)} L ${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
    }

    return {
      metricKey,
      config,
      points,
      smoothPath,
      areaPath,
      isPrimary: idx === 0
    };
  });

  // Handle compare metric toggle (maximum 3)
  const handleToggleCompareMetric = (key) => {
    setCompareMetrics(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(k => k !== key);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), key];
      }
      return [...prev, key];
    });
  };

  // Forgiving nearest-point hover detection across the plotting area
  const handlePointerMove = (e) => {
    if (!svgRef.current || basePoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width) return;

    // Convert mouse clientX into SVG viewBox coordinate space (0 to width)
    const clientX = e.clientX;
    const svgX = ((clientX - rect.left) / rect.width) * width;

    // Find nearest data point index by horizontal distance
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < basePoints.length; i++) {
      const dist = Math.abs(basePoints[i].x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    if (hoveredPointIndex !== nearestIdx) {
      setHoveredPointIndex(nearestIdx);
    }
  };

  const handlePointerLeave = () => {
    // Keep hover active if keyboard focus is currently active on a data point
    if (
      document.activeElement &&
      document.activeElement.id &&
      document.activeElement.id.startsWith('chart-focus-target-')
    ) {
      return;
    }
    setHoveredPointIndex(null);
  };

  // Get active hovered tooltip data
  const basePoints = metricSeries[0]?.points || [];
  const activePointInfo = hoveredPointIndex !== null && basePoints[hoveredPointIndex]
    ? {
        date: basePoints[hoveredPointIndex].date,
        items: metricSeries.map(s => {
          const pt = s.points[hoveredPointIndex];
          return {
            config: s.config,
            value: pt?.value,
            prevValue: pt?.prevValue,
            x: pt?.x,
            y: pt?.y
          };
        })
      }
    : null;

  return (
    <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B6AA9A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#211E1A] leading-tight">
              Platform Activity
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Interactive Trend
            </span>
          </div>
          <p className="text-[13px] text-[#514940] mt-0.5 leading-relaxed">
            Compare growth patterns across user registrations, courses, and completions.
          </p>
        </div>

        {/* Range Segmented Control */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div
            role="group"
            aria-label="Time range selector"
            className="inline-flex rounded-lg p-1 bg-[#EAE3DA] border border-[#B6AA9A]"
          >
            {RANGES.map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1 text-[13px] font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                  selectedRange === range
                    ? 'bg-[#C8BBAA] text-[#D92D2D] shadow-xs'
                    : 'text-[#514940] hover:text-[#211E1A]'
                }`}
                aria-pressed={selectedRange === range}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCompareMode(prev => !prev)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              isCompareMode
                ? 'bg-[#EAE3DA] border-[#D92D2D] text-[#D92D2D] font-semibold'
                : 'bg-[#EAE3DA] border-[#B6AA9A] text-[#514940] hover:bg-[#D6D0C8]'
            }`}
            aria-pressed={isCompareMode}
          >
            {isCompareMode ? 'Compare Mode (Active)' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {/* Metric Selectors */}
      <div className="py-2 flex flex-wrap items-center justify-between gap-2.5 text-[13px]">
        {isCompareMode ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-[#514940] mr-1.5">
              Compare (up to 3):
            </span>
            {Object.values(METRIC_CONFIG).map(metric => {
              const isSelected = compareMetrics.includes(metric.id);
              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => handleToggleCompareMetric(metric.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                    isSelected
                      ? 'bg-[#EAE3DA] border-[#D92D2D] text-[#211E1A] shadow-2xs font-semibold'
                      : 'bg-[#EAE3DA] border-[#B6AA9A] text-[#71675D] hover:bg-[#D6D0C8]'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: metric.color }}
                    aria-hidden="true"
                  />
                  <span>{metric.label}</span>
                  <span className="text-[10px] text-[#71675D] font-mono">({metric.lineStyleLabel.split(' ')[0]})</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#514940] mr-1.5">Metric:</span>
            {Object.values(METRIC_CONFIG).map(metric => {
              const isActive = activeMetric === metric.id;
              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => setActiveMetric(metric.id)}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                    isActive
                      ? 'bg-[#D92D2D] text-white font-semibold shadow-2xs'
                      : 'bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8]'
                  }`}
                  aria-pressed={isActive}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Accessible Data Table Toggle */}
        <button
          type="button"
          onClick={() => setShowDataTable(prev => !prev)}
          className="text-[13px] text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
          aria-expanded={showDataTable}
        >
          {showDataTable ? 'Hide Data Table' : 'Show Data Table (Accessible)'}
        </button>
      </div>

      {/* Screen Reader Summary */}
      <div className="sr-only" aria-live="polite">
        Platform activity chart showing {selectedRange} data for {metricsToDisplay.join(', ')}.
        Maximum value is {axisMax}. Use arrow keys to explore data points or open the accessible table below.
      </div>

      {/* Chart Visualization Container */}
      <div className="relative mt-1.5 w-full select-none">
        {!hasData ? (
          <div className="flex items-center justify-center h-44 border border-dashed border-[#B6AA9A] rounded-lg text-[14px] text-[#71675D]">
            No activity records available for this selected range.
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-auto max-h-[250px] overflow-visible transition-all duration-300"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Activity line chart for ${selectedRange}`}
            onPointerLeave={handlePointerLeave}
          >
            <defs>
              {/* Subtle Red Gradient Fill for Single Metric Mode */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D92D2D" stopOpacity="0.25" />
                <stop offset="85%" stopColor="#D92D2D" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#D92D2D" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map(tick => (
              <g key={tick.y} className="pointer-events-none">
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke="#B6AA9A"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="text-[12px] fill-[#71675D] font-mono"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {/* Area Fill for Primary Metric in Single Mode */}
            {!isCompareMode && metricSeries[0]?.areaPath && (
              <path
                d={metricSeries[0].areaPath}
                fill={`url(#${gradientId})`}
                className="transition-opacity duration-300 pointer-events-none"
              />
            )}

            {/* Render Metric Lines */}
            {metricSeries.map(series => (
              <g key={series.metricKey} className="pointer-events-none">
                <path
                  d={series.smoothPath}
                  fill="none"
                  stroke={series.config.color}
                  strokeWidth="2.5"
                  strokeDasharray={series.config.strokeDash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Highlighted Selected Point Marker */}
                {series.points.map((pt, i) => {
                  const isHovered = hoveredPointIndex === i;
                  if (!isHovered) return null;
                  return (
                    <g key={i} className="pointer-events-none">
                      {/* Subtle Outer Halo */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill={series.config.color}
                        fillOpacity="0.25"
                      />
                      {/* Crisp Center Marker */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill={series.config.color}
                        stroke="#EAE3DA"
                        strokeWidth="2"
                        className="drop-shadow-xs"
                      />
                    </g>
                  );
                })}
              </g>
            ))}

            {/* Shared Vertical Hover Guideline */}
            {hoveredPointIndex !== null && basePoints[hoveredPointIndex] && (
              <line
                x1={basePoints[hoveredPointIndex].x}
                y1={padding.top}
                x2={basePoints[hoveredPointIndex].x}
                y2={padding.top + chartH}
                stroke="#D92D2D"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70 pointer-events-none"
              />
            )}

            {/* X-Axis Tick Labels */}
            {basePoints.map((pt, i) => {
              const isHovered = hoveredPointIndex === i;
              const totalPts = basePoints.length;
              const step = totalPts > 12 ? Math.ceil(totalPts / 6) : totalPts > 7 ? 2 : 1;
              const isFirst = i === 0;
              const isLast = i === totalPts - 1;
              const shouldRenderLabel = isFirst || isLast || (i % step === 0 && i < totalPts - Math.floor(step / 2)) || isHovered;
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

              return (
                <g key={i} className="pointer-events-none">
                  {shouldRenderLabel && (
                    <text
                      x={pt.x}
                      y={padding.top + chartH + 20}
                      textAnchor={anchor}
                      className={`text-[11px] sm:text-[12px] font-sans transition-colors select-none ${
                        isHovered
                          ? 'fill-[#D92D2D] font-bold'
                          : 'fill-[#71675D]'
                      }`}
                    >
                      {pt.date}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Forgiving pointer interaction layer over plotting area */}
            <rect
              x={padding.left}
              y={padding.top}
              width={chartW}
              height={chartH + 30}
              fill="transparent"
              className="cursor-crosshair"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            />

            {/* Keyboard Accessible Targets */}
            {basePoints.map((pt, i) => (
              <rect
                key={`kb-${i}`}
                id={`chart-focus-target-${i}`}
                x={pt.x - 12}
                y={padding.top}
                width="24"
                height={chartH + 26}
                fill="transparent"
                tabIndex="0"
                role="button"
                aria-label={`View data for ${pt.date}`}
                className="focus:outline-none focus-visible:stroke-[#D92D2D] focus-visible:stroke-2 pointer-events-none focus:pointer-events-auto"
                onFocus={() => setHoveredPointIndex(i)}
                onBlur={() => setHoveredPointIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && i < basePoints.length - 1) {
                    e.preventDefault();
                    setHoveredPointIndex(i + 1);
                    document.getElementById(`chart-focus-target-${i + 1}`)?.focus();
                  } else if (e.key === 'ArrowLeft' && i > 0) {
                    e.preventDefault();
                    setHoveredPointIndex(i - 1);
                    document.getElementById(`chart-focus-target-${i - 1}`)?.focus();
                  }
                }}
              />
            ))}
          </svg>
        )}

        {/* Hover / Focus Tooltip */}
        {activePointInfo && (() => {
          const ptX = activePointInfo.items[0]?.x ?? padding.left;
          const xPercent = (ptX / width) * 100;

          // Stable edge alignment prevents tooltip from ever clipping card borders
          let positionStyle = {};
          if (xPercent < 24) {
            positionStyle = {
              left: `${Math.max(4, xPercent)}%`,
              transform: 'translateX(0)'
            };
          } else if (xPercent > 76) {
            positionStyle = {
              left: `${Math.min(96, xPercent)}%`,
              transform: 'translateX(-100%)'
            };
          } else {
            positionStyle = {
              left: `${xPercent}%`,
              transform: 'translateX(-50%)'
            };
          }

          return (
            <div
              className="absolute z-20 pointer-events-none bg-[#211E1A] text-[#EAE3DA] text-xs rounded-lg px-3 py-2.5 shadow-lg border border-[#514940] transition-transform duration-75 whitespace-nowrap"
              style={{
                top: '8px',
                ...positionStyle
              }}
            >
              <div className="font-semibold text-[#EAE3DA] border-b border-[#514940] pb-1 mb-1.5 flex items-center justify-between gap-4">
                <span>{activePointInfo.date}</span>
                <span className="text-[10px] text-[#71675D]">Sample Data</span>
              </div>

              <div className="space-y-1">
                {activePointInfo.items.map((item) => {
                  const diff = typeof item.prevValue === 'number' && typeof item.value === 'number'
                    ? item.value - item.prevValue
                    : null;

                  return (
                    <div key={item.config.id} className="flex items-center justify-between gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-[#C8BBAA]">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: item.config.color }}
                        />
                        <span>{item.config.label}:</span>
                      </span>
                      <span className="font-mono font-bold text-white">
                        {typeof item.value === 'number' ? item.value : 'N/A'}
                        {diff !== null && (
                          <span className={`ml-2 text-[10px] font-normal ${
                            diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-amber-400' : 'text-gray-400'
                          }`}>
                            ({diff >= 0 ? `+${diff}` : diff} vs prior)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Distinction & Line Styles Legend */}
      <div className="mt-2.5 pt-2.5 border-t border-[#B6AA9A] flex flex-wrap items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#514940]">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <span className="font-semibold text-[#211E1A] text-[13px] sm:text-[14px]">Legend:</span>
          {metricsToDisplay.map(mKey => {
            const cfg = METRIC_CONFIG[mKey];
            return (
              <div key={mKey} className="flex items-center gap-2">
                <svg className="w-5 h-2.5" aria-hidden="true">
                  <line
                    x1="0"
                    y1="5"
                    x2="20"
                    y2="5"
                    stroke={cfg.color}
                    strokeWidth="2.5"
                    strokeDasharray={cfg.strokeDash}
                  />
                </svg>
                <span>
                  <strong className="text-[#211E1A]">{cfg.label}</strong>
                  <span className="ml-1 text-[12px] text-[#71675D]">({cfg.lineStyleLabel})</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#71675D]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
          <span>Confirmed 0 values plotted at baseline</span>
        </div>
      </div>

      {/* Accessible Equivalent Data Table */}
      {showDataTable && (
        <div className="mt-5 pt-5 border-t border-[#B6AA9A]">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#211E1A] mb-3">
            Accessible Equivalent Table ({selectedRange})
          </h3>
          <div className="overflow-x-auto max-h-60 border border-[#B6AA9A] rounded-lg">
            <table className="min-w-full divide-y divide-[#B6AA9A] text-[13px]">
              <caption className="sr-only">
                Platform Activity data table for {selectedRange}
              </caption>
              <thead className="bg-[#EAE3DA]">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-[#211E1A]">
                    Period / Date
                  </th>
                  {metricsToDisplay.map(mKey => (
                    <th key={mKey} scope="col" className="px-4 py-3 text-right font-semibold text-[#211E1A]">
                      {METRIC_CONFIG[mKey].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B6AA9A] bg-[#C8BBAA]">
                {basePoints.map((pt, i) => (
                  <tr key={i} className="hover:bg-[#EAE3DA] transition-colors">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-[#211E1A]">
                      {pt.date}
                    </th>
                    {metricSeries.map(s => {
                      const item = s.points[i];
                      return (
                        <td key={s.metricKey} className="px-4 py-2.5 text-right font-mono text-[#514940]">
                          {typeof item?.value === 'number' ? item.value : '0'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
