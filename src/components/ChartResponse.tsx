import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card as MuiCard,
  CardContent as MuiCardContent,
  Typography,
  Box,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

const pieData = [
  { name: "Hardware Issues", value: 35, color: "#3b82f6" },
  { name: "Software Problems", value: 25, color: "#8b5cf6" },
  { name: "Network Issues", value: 20, color: "#06b6d4" },
  { name: "User Requests", value: 15, color: "#10b981" },
  { name: "Other", value: 5, color: "#f59e0b" },
];

const barData = [
  { month: "Jan", incidents: 45, resolved: 42 },
  { month: "Feb", incidents: 52, resolved: 50 },
  { month: "Mar", incidents: 48, resolved: 46 },
  { month: "Apr", incidents: 61, resolved: 58 },
  { month: "May", incidents: 55, resolved: 53 },
  { month: "Jun", incidents: 58, resolved: 57 },
  { month: "Jul", incidents: 63, resolved: 61 },
  { month: "Aug", incidents: 59, resolved: 57 },
  { month: "Sep", incidents: 67, resolved: 65 },
  { month: "Oct", incidents: 70, resolved: 68 },
  { month: "Nov", incidents: 64, resolved: 62 },
  { month: "Dec", incidents: 72, resolved: 70 },
];

const StyledCard = styled(MuiCard)(({ theme }) => ({
  background:
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: "16px",
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 8px 32px rgba(0, 0, 0, 0.4)"
      : "0 8px 32px rgba(0, 0, 0, 0.08)",
  border:
    theme.palette.mode === "dark"
      ? "1px solid rgba(148, 163, 184, 0.1)"
      : "1px solid rgba(226, 232, 240, 0.8)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 12px 40px rgba(0, 0, 0, 0.5)"
        : "0 12px 40px rgba(0, 0, 0, 0.12)",
  },
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  const theme = useTheme();

  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(30, 41, 59, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
          border:
            theme.palette.mode === "dark"
              ? "1px solid rgba(148, 163, 184, 0.3)"
              : "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "12px 16px",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.5)"
              : "0 4px 20px rgba(0, 0, 0, 0.15)",
          minWidth: "140px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        {label && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {label}
          </Typography>
        )}
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              color: entry.color,
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export function ChartResponse() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        maxWidth: 900,
      }}
    >
      <Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Here's the SDM (Service Desk Management) analysis for
          the last annual maintenance period:
        </Typography>
      </Box>

      {/* Pie Chart */}
      <StyledCard>
        <MuiCardContent sx={{ padding: "20px !important" }}>
          <Typography
            variant="h6"
            sx={{
              marginBottom: "16px",
              fontWeight: 600,
              background:
                "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "16px",
            }}
          >
            Incident Distribution by Category
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Custom Legend on the Left */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1.5,
              minWidth: '200px',
            }}>
              {pieData.map((item, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5 
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }} 
                  />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '13px',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {item.name}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Pie Chart on the Right */}
            <Box sx={{ flex: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      name,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius +
                        (outerRadius - innerRadius) * 0.5;
                      const x =
                        cx + radius * Math.cos(-midAngle * RADIAN);
                      const y =
                        cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            textShadow:
                              "0px 1px 2px rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    })}
                    outerRadius={120}
                    innerRadius={0}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                    animationBegin={0}
                    activeShape={false}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{
                          filter:
                            "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))",
                          cursor: "default",
                          outline: "none",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </MuiCardContent>
      </StyledCard>

      {/* Bar Chart */}
      <StyledCard>
        <MuiCardContent sx={{ padding: "20px !important" }}>
          <Typography
            variant="h6"
            sx={{
              marginBottom: "16px",
              fontWeight: 600,
              background:
                "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "16px",
            }}
          >
            Monthly Incident Tracking
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={barData}
              margin={{
                top: 5,
                right: 5,
                left: -20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient
                  id="incidentsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#3b82f6"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="100%"
                    stopColor="#3b82f6"
                    stopOpacity={0.6}
                  />
                </linearGradient>
                <linearGradient
                  id="resolvedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#10b981"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="100%"
                    stopColor="#10b981"
                    stopOpacity={0.6}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="rgba(148, 163, 184, 0.3)"
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="rgba(148, 163, 184, 0.3)"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="rect"
              />
              <Bar
                dataKey="incidents"
                fill="url(#incidentsGradient)"
                name="Total Incidents"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="resolved"
                fill="url(#resolvedGradient)"
                name="Resolved"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </MuiCardContent>
      </StyledCard>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 1.5 }}
        >
          Key Insights:
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, m: 0, "& li": { mb: 0.5 } }}
        >
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
          >
            <strong>Total Incidents:</strong> 714 incidents
            recorded over the annual period
          </Typography>
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
          >
            <strong>Resolution Rate:</strong> 97.3% of incidents
            successfully resolved
          </Typography>
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
          >
            <strong>Peak Month:</strong> December had the
            highest incident count with 72 incidents
          </Typography>
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
          >
            <strong>Primary Category:</strong> Hardware Issues
            account for 35% of all incidents
          </Typography>
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
          >
            <strong>Trend:</strong> Steady increase in incident
            volume during Q4, likely due to year-end operations
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}