import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Chip,
  useTheme,
} from '@mui/material'

import type { SelectChangeEvent } from '@mui/material/Select'
import type { SimulationTrend } from '../../types'

const METRICS: Record<
  string,
  {
    label: string
    shortLabel: string
    color: string
    unit: string
    yAxisLabel: string
  }
> = {
  maximum_queue: {
    label: 'Maximum Queue',
    shortLabel: 'Max Queue',
    color: '#0d9488',
    unit: '',
    yAxisLabel: 'Queue Length',
  },

  average_wait: {
    label: 'Average Wait',
    shortLabel: 'Avg Wait',
    color: '#3b82f6',
    unit: ' min',
    yAxisLabel: 'Waiting Time (minutes)',
  },

  utilization: {
    label: 'Utilization',
    shortLabel: 'Utilization',
    color: '#8b5cf6',
    unit: '%',
    yAxisLabel: 'Utilization (%)',
  },
}

interface TooltipPayload {
  dataKey: string
  color: string
  value: number
  name: string
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
}

function useDark() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(
        document.documentElement.getAttribute('data-theme') === 'dark',
      )
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return dark
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps) {
  const theme = useTheme()

  if (!active || !payload?.length) {
    return null
  }

  const dark =
    document.documentElement.getAttribute('data-theme') === 'dark'

  return (
    <Box
      sx={{
        backgroundColor: dark
          ? 'rgba(15, 23, 42, 0.97)'
          : 'rgba(255, 255, 255, 0.97)',
        border: `1px solid ${
          dark ? '#334155' : '#e2e8f0'
        }`,
        borderRadius: 2,
        px: 1.75,
        py: 1.25,
        minWidth: 160,
        boxShadow: dark
          ? '0 8px 30px rgba(0,0,0,0.35)'
          : '0 8px 30px rgba(15,23,42,0.12)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          color: dark ? '#f8fafc' : '#0f172a',
          mb: 0.75,
        }}
      >
        Hour {label}
      </Typography>

      {payload.map((item) => {
        const metric = METRICS[item.dataKey]

        return (
          <Box
            key={item.dataKey}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mt: 0.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                }}
              />

              <Typography
                variant="caption"
                sx={{
                  color: dark ? '#cbd5e1' : '#64748b',
                }}
              >
                {metric?.shortLabel ?? item.name}
              </Typography>
            </Box>

            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: item.color,
              }}
            >
              {Number(item.value).toFixed(1)}
              {metric?.unit ?? ''}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

export default function ForecastChart({
  trends,
}: {
  trends: SimulationTrend[]
}) {
  const [metric, setMetric] = useState('maximum_queue')

  const isDark = useDark()
  const theme = useTheme()

  const cfg = METRICS[metric]

  const midPoint =
    trends && trends.length > 0
      ? Math.ceil(trends.length / 2)
      : null

  const handleMetricChange = (
    event: SelectChangeEvent,
  ) => {
    setMetric(event.target.value)
  }

  return (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',

        backgroundColor: isDark
          ? '#1e293b'
          : '#ffffff',

        border: `1px solid ${
          isDark ? '#334155' : '#e2e8f0'
        }`,

        boxShadow: isDark
          ? '0 4px 20px rgba(0,0,0,0.15)'
          : '0 4px 20px rgba(15,23,42,0.06)',

        transition:
          'all 0.25s ease',

        '&:hover': {
          boxShadow: isDark
            ? '0 8px 30px rgba(0,0,0,0.22)'
            : '0 8px 30px rgba(15,23,42,0.10)',
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          '&:last-child': {
            pb: { xs: 2, sm: 2.5 },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            justifyContent: 'space-between',
            alignItems: {
              xs: 'flex-start',
              sm: 'center',
            },
            gap: 2,
            mb: 2,
          }}
        >
          {/* Title Section */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: {
                    xs: '1rem',
                    sm: '1.05rem',
                  },
                  fontWeight: 700,
                  color: isDark
                    ? '#f8fafc'
                    : '#0f172a',
                }}
              >
                Forecast: Queue Evolution
              </Typography>

              <Chip
                label="Forecast"
                size="small"
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: `${cfg.color}18`,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}35`,
                }}
              />
            </Box>

            <Typography
              variant="body2"
              sx={{
                fontSize: 12,
                color: isDark
                  ? '#94a3b8'
                  : '#64748b',
              }}
            >
              Monitor queue performance across
              different time intervals
            </Typography>
          </Box>

          {/* Metric Selector */}
          <FormControl
            size="small"
            sx={{
              minWidth: {
                xs: '100%',
                sm: 170,
              },
            }}
          >
            <Select
              value={metric}
              onChange={handleMetricChange}
              displayEmpty
              sx={{
                height: 38,
                borderRadius: 2,

                fontSize: 12,
                fontWeight: 600,

                backgroundColor: isDark
                  ? '#0f172a'
                  : '#ffffff',

                color: isDark
                  ? '#f1f5f9'
                  : '#334155',

                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark
                    ? '#475569'
                    : '#e2e8f0',
                },

                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: cfg.color,
                },

                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: cfg.color,
                  borderWidth: 1,
                },

                '& .MuiSelect-icon': {
                  color: isDark
                    ? '#94a3b8'
                    : '#64748b',
                },
              }}
            >
              {Object.entries(METRICS).map(
                ([key, value]) => (
                  <MenuItem
                    key={key}
                    value={key}
                    sx={{
                      fontSize: 12,
                      py: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor:
                            value.color,
                        }}
                      />

                      {value.label}
                    </Box>
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Metric Summary */}
        {trends && trends.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: cfg.color,
                boxShadow: `0 0 0 4px ${cfg.color}18`,
              }}
            />

            <Typography
              variant="caption"
              sx={{
                color: isDark
                  ? '#cbd5e1'
                  : '#64748b',
                fontWeight: 600,
              }}
            >
              Showing {cfg.label}
            </Typography>
          </Box>
        )}

        {/* Chart / Empty State */}
        {!trends || trends.length === 0 ? (
          <Box
            sx={{
              height: 260,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1.5,

              borderRadius: 2,

              backgroundColor: isDark
                ? 'rgba(15,23,42,0.35)'
                : '#f8fafc',

              border: `1px dashed ${
                isDark ? '#475569' : '#e2e8f0'
              }`,
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',

                backgroundColor: `${cfg.color}15`,
                color: cfg.color,

                fontSize: 22,
                fontWeight: 700,
              }}
            >
              ~
            </Box>

            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isDark
                  ? '#cbd5e1'
                  : '#475569',
              }}
            >
              No forecast data available
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: isDark
                  ? '#64748b'
                  : '#94a3b8',
              }}
            >
              Run a simulation to see the forecast.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: {
                xs: 280,
                sm: 300,
              },
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={trends}
                margin={{
                  top: 15,
                  right: 10,
                  left: 0,
                  bottom: 15,
                }}
              >
                <defs>
                  <linearGradient
                    id={`forecastGrad-${metric}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={cfg.color}
                      stopOpacity={0.30}
                    />

                    <stop
                      offset="100%"
                      stopColor={cfg.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={
                    isDark
                      ? '#334155'
                      : '#e2e8f0'
                  }
                  vertical={false}
                />

                <XAxis
                  dataKey="hour"
                  tick={{
                    fontSize: 11,
                    fill: isDark
                      ? '#94a3b8'
                      : '#64748b',
                  }}
                  axisLine={{
                    stroke: isDark
                      ? '#475569'
                      : '#e2e8f0',
                  }}
                  tickLine={false}
                  label={{
                    value: 'Time interval (hours)',
                    position: 'insideBottom',
                    offset: -8,
                    fontSize: 11,
                    fill: isDark
                      ? '#94a3b8'
                      : '#64748b',
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: isDark
                      ? '#94a3b8'
                      : '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                  label={{
                    value: cfg.yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 5,
                    fontSize: 11,
                    fill: isDark
                      ? '#94a3b8'
                      : '#64748b',
                  }}
                />

                {midPoint && (
                  <ReferenceLine
                    x={midPoint}
                    stroke={
                      isDark
                        ? '#64748b'
                        : '#cbd5e1'
                    }
                    strokeDasharray="5 4"
                  />
                )}

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                  cursor={{
                    stroke: cfg.color,
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  fill={`url(#forecastGrad-${metric})`}
                  dot={{
                    r: 3.5,
                    fill: cfg.color,
                    strokeWidth: 0,
                  }}
                  activeDot={{
                    r: 6,
                    fill: cfg.color,
                    stroke: isDark
                      ? '#1e293b'
                      : '#ffffff',
                    strokeWidth: 3,
                  }}
                  name={cfg.label}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Bottom Info */}
        {trends && trends.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 0.5,
              pt: 1.5,

              borderTop: `1px solid ${
                isDark
                  ? '#334155'
                  : '#f1f5f9'
              }`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDark
                  ? '#64748b'
                  : '#94a3b8',
              }}
            >
              {trends.length} time intervals
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: cfg.color,
                fontWeight: 600,
              }}
            >
              {cfg.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}