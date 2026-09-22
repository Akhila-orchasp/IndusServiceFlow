import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const METRICS = [
  {
    key: 'average_wait',
    label: 'Avg waiting time (min)',
    color: '#3b82f6',
    dashed: false,
  },
  {
    key: 'maximum_queue',
    label: 'Max queue length',
    color: '#0d9488',
    dashed: false,
  },
  {
    key: 'utilization',
    label: 'Utilization (%)',
    color: '#8b5cf6',
    dashed: true,
  },
] as const

function useDark() {
  const [dark, setDark] = useState(
    () =>
      document.documentElement.getAttribute('data-theme') ===
      'dark',
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(
        document.documentElement.getAttribute('data-theme') ===
          'dark',
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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    color: string
    value: number
    name: string
  }>
  label?: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  const isDark =
    document.documentElement.getAttribute('data-theme') ===
    'dark'

  if (!active || !payload?.length) {
    return null
  }

  return (
    <Box
      sx={{
        minWidth: 180,
        px: 1.75,
        py: 1.25,
        borderRadius: 2,

        backgroundColor: isDark
          ? 'rgba(15, 23, 42, 0.97)'
          : 'rgba(255, 255, 255, 0.97)',

        border: `1px solid ${
          isDark ? '#334155' : '#e2e8f0'
        }`,

        boxShadow: isDark
          ? '0 8px 25px rgba(0,0,0,0.3)'
          : '0 8px 25px rgba(15,23,42,0.12)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          color: isDark ? '#f8fafc' : '#0f172a',
          mb: 1,
        }}
      >
        Hour {label}
      </Typography>

      {payload.map((item) => (
        <Box
          key={item.dataKey}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 0.6,
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
                color: isDark ? '#cbd5e1' : '#64748b',
              }}
            >
              {item.name}
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
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function TrendChart({
  trends,
}: {
  trends: SimulationTrend[]
}) {
  const [filter, setFilter] = useState('Last run')

  const isDark = useDark()
  const theme = useTheme()

  const empty = !trends || trends.length === 0

  const handleFilterChange = (
    event: SelectChangeEvent,
  ) => {
    setFilter(event.target.value)
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

        transition: 'all 0.25s ease',

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
        {/* ================= HEADER ================= */}
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
                Overview Trend
              </Typography>

              <Chip
                label="Analytics"
                size="small"
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,

                  backgroundColor: isDark
                    ? '#334155'
                    : '#f1f5f9',

                  color: isDark
                    ? '#cbd5e1'
                    : '#475569',

                  border: `1px solid ${
                    isDark ? '#475569' : '#e2e8f0'
                  }`,
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
              Compare key simulation metrics over time
            </Typography>
          </Box>

          {/* Filter */}
          <FormControl
            size="small"
            sx={{
              minWidth: {
                xs: '100%',
                sm: 130,
              },
            }}
          >
            <Select
              value={filter}
              onChange={handleFilterChange}
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
                  borderColor: '#3b82f6',
                },

                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },

                '& .MuiSelect-icon': {
                  color: isDark
                    ? '#94a3b8'
                    : '#64748b',
                },
              }}
            >
              <MenuItem
                value="Last run"
                sx={{ fontSize: 12 }}
              >
                Last run
              </MenuItem>

              <MenuItem
                value="All runs"
                sx={{ fontSize: 12 }}
              >
                All runs
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* ================= LEGEND ================= */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: {
              xs: 1.5,
              sm: 2.5,
            },
            mb: 1.5,
            px: 0.5,
          }}
        >
          {METRICS.map((metric) => (
            <Box
              key={metric.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              {/* Legend line */}
              <Box
                sx={{
                  position: 'relative',
                  width: 24,
                  height: 10,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: 2,

                    background: metric.dashed
                      ? `repeating-linear-gradient(
                          to right,
                          ${metric.color} 0px,
                          ${metric.color} 5px,
                          transparent 5px,
                          transparent 8px
                        )`
                      : metric.color,
                  }}
                />

                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform:
                      'translate(-50%, -50%)',

                    width: 7,
                    height: 7,
                    borderRadius: '50%',

                    backgroundColor:
                      metric.color,

                    border: `1.5px solid ${
                      isDark
                        ? '#1e293b'
                        : '#ffffff'
                    }`,
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontSize: 11,
                  color: isDark
                    ? '#94a3b8'
                    : '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                {metric.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ================= CHART ================= */}
        {empty ? (
          <Box
            sx={{
              height: 240,

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

                backgroundColor: '#3b82f615',
                color: '#3b82f6',

                fontSize: 22,
                fontWeight: 700,
              }}
            >
              ↗
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
              No trend data available
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: isDark
                  ? '#64748b'
                  : '#94a3b8',
              }}
            >
              Run a simulation to see the overview trend.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: {
                xs: 270,
                sm: 280,
              },
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={trends}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 15,
                }}
              >
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
                  tickLine={false}
                  axisLine={{
                    stroke: isDark
                      ? '#475569'
                      : '#e2e8f0',
                  }}
                  label={{
                    value: 'Time interval',
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
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                  cursor={{
                    stroke: '#94a3b8',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />

                {METRICS.map((metric) => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={2.5}

                    strokeDasharray={
                      metric.dashed
                        ? '5 4'
                        : undefined
                    }

                    dot={{
                      r: 3.5,
                      fill: metric.color,
                      strokeWidth: 0,
                    }}

                    activeDot={{
                      r: 6,
                      fill: metric.color,
                      stroke: isDark
                        ? '#1e293b'
                        : '#ffffff',
                      strokeWidth: 3,
                    }}

                    name={metric.label}

                    animationDuration={700}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* ================= FOOTER ================= */}
        {!empty && (
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
                color: isDark
                  ? '#94a3b8'
                  : '#64748b',
                fontWeight: 600,
              }}
            >
              {filter}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}