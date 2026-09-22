import type { ReactNode } from 'react'
import type { PieLabelRenderProps } from 'recharts'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  Grid,
  Stack,
  Typography,
} from '@mui/material'

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

const queueLengthTrend = [
  { time: '09:00', value: 3 },
  { time: '10:00', value: 5 },
  { time: '11:00', value: 8 },
  { time: '12:00', value: 9 },
  { time: '13:00', value: 11 },
  { time: '14:00', value: 12 },
  { time: '15:00', value: 10 },
  { time: '16:00', value: 8 },
  { time: '17:00', value: 7 },
  { time: '18:00', value: 5 },
  { time: '19:00', value: 2 },
  { time: '20:00', value: 1 },
]

const serviceDistribution = [
  {
    name: 'General Consultation',
    value: 8,
    pct: 42,
    color: '#0ea5d9',
  },
  {
    name: 'Cardiology Consult',
    value: 6,
    pct: 32,
    color: '#14b8a6',
  },
  {
    name: 'Orthopedic Consultation',
    value: 5,
    pct: 26,
    color: '#f59e0b',
  },
]

const waitTimeTrend = [
  { time: '10:00', value: 22 },
  { time: '11:00', value: 20 },
  { time: '12:00', value: 18 },
  { time: '13:00', value: 16 },
  { time: '14:00', value: 14 },
  { time: '15:00', value: 13 },
  { time: '16:00', value: 11 },
  { time: '17:00', value: 9 },
  { time: '18:00', value: 7 },
]

const employeeUtilization = [
  { name: 'Sakshi', value: 38 },
  { name: 'Riya', value: 62 },
  { name: 'Ananya', value: 41 },
  { name: 'Deepak', value: 45 },
]

const avgUtil = Math.round(
  employeeUtilization.reduce(
    (total, employee) => total + employee.value,
    0
  ) / employeeUtilization.length
)

const peakHourData = [
  { hour: '01', value: 1 },
  { hour: '05', value: 3 },
  { hour: '10', value: 4 },
  { hour: '16', value: 4 },
  { hour: '18', value: 3 },
  { hour: '21', value: 3 },
]

const customerFlowByHour = [
  { slot: '8-10 AM', booked: 3, served: 1 },
  { slot: '12-2 PM', booked: 2, served: 1 },
  { slot: '4-6 PM', booked: 3, served: 2 },
  { slot: '8-10 PM', booked: 10, served: 3 },
]

const waitDistribution = [
  { range: '0-5m', value: 5 },
  { range: '5-10m', value: 5 },
  { range: '15-20m', value: 5 },
  { range: '30m+', value: 3 },
]

const queueStatusBreakdown = [
  {
    label: 'Done',
    value: 6,
    pct: 32,
    color: '#64748b',
  },
  {
    label: 'Serving',
    value: 5,
    pct: 26,
    color: '#14b8a6',
  },
  {
    label: 'Waiting',
    value: 8,
    pct: 42,
    color: '#f59e0b',
  },
]

/* =========================================================
   TOOLTIP
   ========================================================= */

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color?: string
    fill?: string
  }>
  label?: string
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: TooltipProps) => {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        border: '1px solid #dcecf8',
        borderRadius: '12px',
        px: 1.5,
        py: 1.2,
        boxShadow: '0 8px 25px rgba(15, 70, 110, 0.12)',
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: '#0b2545',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>

      {payload.map((item, index) => (
        <Typography
          key={index}
          sx={{
            fontSize: 11,
            color: item.color ?? item.fill ?? '#64748b',
          }}
        >
          {item.name}: <b>{item.value}</b>
        </Typography>
      ))}
    </Box>
  )
}

/* =========================================================
   KPI CARD
   ========================================================= */

function StatCard({
  label,
  value,
  icon,
  sub,
  gradient,
}: {
  label: string
  value: string
  icon: ReactNode
  sub: string
  gradient: string
}) {
  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: 132,
        borderRadius: '20px',
        background: gradient,
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 10px 24px rgba(15, 70, 110, 0.18)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',

        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow:
            '0 15px 30px rgba(15, 70, 110, 0.23)',
        },
      }}
    >
      {/* Large decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          right: -38,
          bottom: -45,
          width: 125,
          height: 125,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.10)',
        }}
      />

      {/* Small decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          right: 25,
          bottom: -18,
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.11)',
        }}
      />

      {/* Top decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          right: -30,
          top: -42,
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />

      <CardContent
        sx={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          p: '20px 21px !important',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.90)',
              lineHeight: 1.3,
            }}
          >
            {label}
          </Typography>

          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.20)',
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>

        <Typography
          sx={{
            mt: 1.15,
            fontSize: 29,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>

        <Typography
          sx={{
            mt: 0.85,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {sub}
        </Typography>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   WHITE PANEL
   ========================================================= */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #dcecf8',
        boxShadow:
          '0 4px 18px rgba(15, 70, 110, 0.06)',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={{
          p: {
            xs: 1.75,
            sm: 2.25,
          },
          '&:last-child': {
            pb: {
              xs: 1.75,
              sm: 2.25,
            },
          },
        }}
      >
        <Box sx={{ mb: 1.75 }}>
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 700,
              color: '#0b2545',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                fontSize: 11,
                color: '#718096',
                mt: 0.45,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {children}
      </CardContent>
    </Card>
  )
}

/* =========================================================
   PIE LABEL
   ========================================================= */

const renderCustomLabel = (
  props: PieLabelRenderProps
) => {
  const {
    cx,
    cy,
    midAngle,
    outerRadius,
    value,
    index,
  } = props

  const currentIndex = index as number

  const pct =
    serviceDistribution[currentIndex]?.pct ?? 0

  const color =
    serviceDistribution[currentIndex]?.color ??
    '#64748b'

  const RADIAN = Math.PI / 180

  const radius =
    (outerRadius as number) + 25

  const x =
    (cx as number) +
    radius *
      Math.cos(
        -(midAngle as number) * RADIAN
      )

  const y =
    (cy as number) +
    radius *
      Math.sin(
        -(midAngle as number) * RADIAN
      )

  return (
    <text
      x={x}
      y={y}
      fill={color}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={700}
    >
      {value} · {pct}%
    </text>
  )
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function DashboardPage() {
  const colors = {
    background: '#eef8ff',
    backgroundLight: '#f7fbff',

    navy: '#0b2545',
    muted: '#718096',
    grid: '#e5edf5',

    blue: '#10a9df',
    blueDark: '#087db8',

    green: '#2bc993',
    greenDark: '#18a878',

    orange: '#ffb91c',
    orangeDark: '#ed9209',

    purple: '#9a68e8',
    purpleDark: '#7135d8',
  }

  /* =======================================================
     8 CARDS
     
     TOP:
     Blue → Green → Orange → Purple

     BOTTOM:
     Purple → Orange → Green → Blue
     ======================================================= */

  const stats = [
    /* ================= TOP ROW ================= */

    {
      label: 'PATIENTS TODAY',
      value: '16',
      icon: '👥',
      sub: 'Across all services',

      gradient: `linear-gradient(
        135deg,
        ${colors.blue} 0%,
        ${colors.blueDark} 100%
      )`,
    },

    {
      label: 'PATIENTS SERVED',
      value: '6',
      icon: '✓',
      sub: '38% of today',

      gradient: `linear-gradient(
        135deg,
        ${colors.green} 0%,
        ${colors.greenDark} 100%
      )`,
    },

    {
      label: 'ACTIVE QUEUE',
      value: '13',
      icon: '↻',
      sub: 'Awaiting service',

      gradient: `linear-gradient(
        135deg,
        ${colors.orange} 0%,
        ${colors.orangeDark} 100%
      )`,
    },

    {
      label: 'AVG WAIT TIME',
      value: '9m',
      icon: '◷',
      sub: '-3m vs yesterday',

      gradient: `linear-gradient(
        135deg,
        ${colors.purple} 0%,
        ${colors.purpleDark} 100%
      )`,
    },

    /* ================= BOTTOM ROW ================= */

    {
      label: 'MAX WAIT TIME',
      value: '24m',
      icon: '⏱',
      sub: 'Longest today',

      gradient: `linear-gradient(
        135deg,
        ${colors.purple} 0%,
        ${colors.purpleDark} 100%
      )`,
    },

    {
      label: 'QUEUE LENGTH',
      value: '8',
      icon: '≡',
      sub: 'Currently waiting',

      gradient: `linear-gradient(
        135deg,
        ${colors.orange} 0%,
        ${colors.orangeDark} 100%
      )`,
    },

    {
      label: 'EMPLOYEE UTILIZATION',
      value: '11%',
      icon: '◑',
      sub: 'Avg. across staff',

      gradient: `linear-gradient(
        135deg,
        ${colors.green} 0%,
        ${colors.greenDark} 100%
      )`,
    },

    {
      label: 'PEAK HOUR',
      value: '6 AM',
      icon: '↗',
      sub: 'Busiest slot',

      gradient: `linear-gradient(
        135deg,
        ${colors.blue} 0%,
        ${colors.blueDark} 100%
      )`,
    },
  ]

  const axisTick = {
    fontSize: 10,
    fill: '#94a3b8',
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        background: `
          linear-gradient(
            180deg,
            ${colors.background} 0%,
            ${colors.backgroundLight} 100%
          )
        `,
        px: {
          xs: 1.25,
          sm: 2,
          md: 2.5,
          lg: 3,
        },
        py: {
          xs: 1.75,
          sm: 2.25,
          md: 2.75,
        },
      }}
    >
      {/* ===================================================
          HEADER
          =================================================== */}

      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: {
              xs: 23,
              sm: 26,
              md: 28,
            },
            fontWeight: 800,
            color: colors.navy,
            lineHeight: 1.2,
          }}
        >
          Organization Dashboard
        </Typography>

        <Typography
          sx={{
            fontSize: 12.5,
            color: colors.muted,
            mt: 0.6,
          }}
        >
          Live customer flow and operational insights
        </Typography>
      </Box>

      {/* ===================================================
          8 KPI CARDS

          DESKTOP:

          BLUE   GREEN   ORANGE  PURPLE
          PURPLE ORANGE  GREEN   BLUE
          =================================================== */}

      <Grid
        container
        spacing={{
          xs: 1.5,
          sm: 1.75,
          md: 2,
        }}
        sx={{ mb: 2 }}
      >
        {stats.map((stat) => (
          <Grid
            key={stat.label}
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* ===================================================
          QUEUE LENGTH + SERVICE DISTRIBUTION
          =================================================== */}

      <Grid
        container
        spacing={{
          xs: 1.5,
          sm: 1.75,
          md: 2,
        }}
        sx={{ mb: 2 }}
      >
        <Grid
          size={{
            xs: 12,
            md: 8,
          }}
        >
          <Panel
            title="Queue Length Trend"
            subtitle="Customer queue movement throughout the day"
          >
            <ResponsiveContainer
              width="100%"
              height={235}
            >
              <AreaChart
                data={queueLengthTrend}
                margin={{
                  top: 8,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="queueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors.blue}
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor={colors.blue}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.blueDark}
                  strokeWidth={3}
                  fill="url(#queueGradient)"
                  dot={{
                    r: 3,
                    fill: colors.blueDark,
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 5 }}
                  name="Queue Length"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Service Distribution"
            subtitle="Today's appointments by service"
          >
            <Stack alignItems="center">
              <PieChart
                width={240}
                height={205}
              >
                <Pie
                  data={serviceDistribution}
                  cx={120}
                  cy={102}
                  innerRadius={57}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {serviceDistribution.map(
                    (item, index) => (
                      <Cell
                        key={index}
                        fill={item.color}
                      />
                    )
                  )}
                </Pie>
              </PieChart>

              <Stack
                spacing={1}
                sx={{
                  width: '100%',
                }}
              >
                {serviceDistribution.map(
                  (item) => (
                    <Stack
                      key={item.name}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Box
                          sx={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            bgcolor: item.color,
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: 11,
                            color: colors.muted,
                          }}
                        >
                          {item.name}
                        </Typography>
                      </Stack>

                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.navy,
                        }}
                      >
                        {item.pct}%
                      </Typography>
                    </Stack>
                  )
                )}
              </Stack>
            </Stack>
          </Panel>
        </Grid>
      </Grid>

      {/* ===================================================
          WAIT TIME + EMPLOYEE UTILIZATION + PEAK HOUR
          =================================================== */}

      <Grid
        container
        spacing={{
          xs: 1.5,
          sm: 1.75,
          md: 2,
        }}
        sx={{ mb: 2 }}
      >
        {/* Wait Time */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Wait Time Trend"
            subtitle="Average waiting time in minutes"
          >
            <ResponsiveContainer
              width="100%"
              height={215}
            >
              <AreaChart
                data={waitTimeTrend}
                margin={{
                  top: 8,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="waitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors.green}
                      stopOpacity={0.28}
                    />

                    <stop
                      offset="95%"
                      stopColor={colors.green}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.greenDark}
                  strokeWidth={3}
                  fill="url(#waitGradient)"
                  dot={{
                    r: 2.5,
                    fill: colors.greenDark,
                    strokeWidth: 0,
                  }}
                  name="Wait (min)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>

        {/* Employee Utilization */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Employee Utilization"
            subtitle="Average utilization across staff"
          >
            <ResponsiveContainer
              width="100%"
              height={215}
            >
              <BarChart
                data={employeeUtilization}
                margin={{
                  top: 8,
                  right: 5,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <ReferenceLine
                  y={avgUtil}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'avg',
                    position: 'right',
                    fontSize: 9,
                    fill: '#94a3b8',
                  }}
                />

                <Bar
                  dataKey="value"
                  fill={colors.orangeDark}
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                  name="Utilization %"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>

        {/* Peak Hour */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Peak Hour Analysis"
            subtitle="Appointment volume by hour"
          >
            <ResponsiveContainer
              width="100%"
              height={215}
            >
              <BarChart
                data={peakHourData}
                margin={{
                  top: 8,
                  right: 5,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="hour"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <Bar
                  dataKey="value"
                  fill={colors.purple}
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                  name="Appointments"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>
      </Grid>

      {/* ===================================================
          CUSTOMER FLOW + WAIT DISTRIBUTION + QUEUE STATUS
          =================================================== */}

      <Grid
        container
        spacing={{
          xs: 1.5,
          sm: 1.75,
          md: 2,
        }}
      >
        {/* Customer Flow */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Customer Flow by Hour"
            subtitle="Booked vs. served today"
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  bgcolor: colors.blue,
                }}
              />

              <Typography
                sx={{
                  fontSize: 10.5,
                  color: colors.muted,
                }}
              >
                Booked
              </Typography>

              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  bgcolor: colors.green,
                  ml: 1,
                }}
              />

              <Typography
                sx={{
                  fontSize: 10.5,
                  color: colors.muted,
                }}
              >
                Served
              </Typography>
            </Stack>

            <ResponsiveContainer
              width="100%"
              height={205}
            >
              <BarChart
                data={customerFlowByHour}
                margin={{
                  top: 8,
                  right: 5,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="slot"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <Bar
                  dataKey="booked"
                  fill={colors.blue}
                  radius={[4, 4, 0, 0]}
                  name="Booked"
                />

                <Bar
                  dataKey="served"
                  fill={colors.green}
                  radius={[4, 4, 0, 0]}
                  name="Served"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>

        {/* Wait Distribution */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Wait Time Distribution"
            subtitle="How long people are actually waiting"
          >
            <ResponsiveContainer
              width="100%"
              height={225}
            >
              <BarChart
                data={waitDistribution}
                margin={{
                  top: 8,
                  right: 5,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={colors.grid}
                  vertical={false}
                />

                <XAxis
                  dataKey="range"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                />

                <Bar
                  dataKey="value"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  name="Customers"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </Grid>

        {/* Queue Status */}
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Panel
            title="Queue Status Breakdown"
            subtitle="Current composition of the queue"
          >
            <Stack
              direction="row"
              sx={{
                height: 30,
                borderRadius: '9px',
                overflow: 'hidden',
                mb: 2.25,
                mt: 1,
              }}
            >
              {queueStatusBreakdown.map(
                (segment) => (
                  <Box
                    key={segment.label}
                    title={`${segment.label}: ${segment.value} (${segment.pct}%)`}
                    sx={{
                      width: `${segment.pct}%`,
                      bgcolor: segment.color,
                    }}
                  />
                )
              )}
            </Stack>

            <Stack spacing={1.3}>
              {queueStatusBreakdown.map(
                (segment) => (
                  <Stack
                    key={segment.label}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1,
                      borderRadius: '10px',
                      backgroundColor: '#f8fbfe',
                      border:
                        '1px solid #edf3f7',
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          bgcolor:
                            segment.color,
                        }}
                      />

                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: colors.muted,
                        }}
                      >
                        {segment.label}
                      </Typography>
                    </Stack>

                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: colors.navy,
                      }}
                    >
                      {segment.value} (
                      {segment.pct}%)
                    </Typography>
                  </Stack>
                )
              )}
            </Stack>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  )
}