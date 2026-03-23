import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Alert,
  useTheme,
} from '@mui/material';
import { ChevronDown, ChevronUp, Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ToolCall } from '../types/sessionState';

interface ToolExecutionHistoryProps {
  toolCalls: ToolCall[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function ToolExecutionHistory({
  toolCalls,
  isExpanded = true,
  onToggle,
}: ToolExecutionHistoryProps) {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const theme = useTheme();

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  if (!toolCalls || toolCalls.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor:
            theme.palette.mode === 'dark'
              ? 'rgba(34, 197, 94, 0.05)'
              : 'rgba(34, 197, 94, 0.03)',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardHeader
          title="Tool Execution History"
          avatar={<Zap size={20} />}
          action={
            <IconButton onClick={handleToggle} size="small">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </IconButton>
          }
          sx={{ pb: 1 }}
        />
        <Collapse in={expanded} timeout="auto">
          <CardContent>
            <Typography color="textSecondary" variant="body2">
              No tools executed yet.
            </Typography>
          </CardContent>
        </Collapse>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'pending':
        return <Clock size={20} />;
      default:
        return <Zap size={20} />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return isoString;
    }
  };

  const sortedCalls = [...toolCalls].sort(
    (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
  );

  return (
    <Card
      sx={{
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(34, 197, 94, 0.05)'
            : 'rgba(34, 197, 94, 0.03)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardHeader
        title="Tool Execution History"
        avatar={<Zap size={20} />}
        action={
          <IconButton onClick={handleToggle} size="small">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        }
        sx={{ pb: 1 }}
      />
      <Collapse in={expanded} timeout="auto">
        <CardContent>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
            {toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''} executed
          </Typography>

          <Stack spacing={2}>
            {sortedCalls.map((call: ToolCall, idx: number) => (
              <Box
                key={idx}
                sx={{
                  p: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Stack spacing={1}>
                  {/* Header with status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(call.status)}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {call.tool_name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        label={call.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(call.status) as any}
                        variant="outlined"
                      />
                      {call.execution_time_ms && (
                        <Chip
                          icon={<Clock size={14} />}
                          label={`${call.execution_time_ms}ms`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Timestamp */}
                  <Typography variant="caption" color="textSecondary">
                    {formatDate(call.executed_at)}
                  </Typography>

                  {/* Parameters */}
                  {Object.keys(call.parameters).length > 0 && (
                    <Box
                      sx={{
                        backgroundColor: theme.palette.background.default,
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        maxHeight: 100,
                        overflowY: 'auto',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                        Parameters:
                      </Typography>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem' }}>
                        {JSON.stringify(call.parameters, null, 2)}
                      </pre>
                    </Box>
                  )}

                  {/* Result */}
                  {call.result && (
                    <Box
                      sx={{
                        backgroundColor: theme.palette.background.default,
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        maxHeight: 100,
                        overflowY: 'auto',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                        Result:
                      </Typography>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem' }}>
                        {typeof call.result === 'string'
                          ? call.result
                          : JSON.stringify(call.result, null, 2)}
                      </pre>
                    </Box>
                  )}

                  {/* Error */}
                  {call.error && (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      <Typography variant="caption">{call.error}</Typography>
                    </Alert>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Collapse>
    </Card>
  );
}
