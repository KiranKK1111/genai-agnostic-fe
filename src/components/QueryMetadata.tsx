/**
 * Query Metadata Display Component
 * 
 * Displays metadata from the new backend architecture:
 * - Schema discovery results (tables discovered, primary table)
 * - Entity parsing (entities found, intents detected)
 * - Query execution details (SQL generated, execution time)
 * 
 * Helps users understand what the backend understood about their query
 * and what schema was discovered from their database.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  alpha,
  useTheme,
  styled as muiStyled,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  Database,
  Table,
  Code,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DynamicResponse } from '../api';

interface QueryMetadataProps {
  response: DynamicResponse;
  defaultExpanded?: boolean;
}

const MetadataCard = muiStyled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
  marginBottom: '16px',
}));

const MetadataSection = muiStyled(Box)(({ theme }) => ({
  marginBottom: '16px',
  padding: '12px',
  borderRadius: '6px',
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  '&:last-child': {
    marginBottom: 0,
  },
}));

const SectionTitle = muiStyled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: theme.palette.primary.main,
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}));

const MetadataItem = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  fontSize: '12px',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const Label = muiStyled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));

const Value = muiStyled(Box)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontFamily: "'Courier New', monospace",
  fontSize: '11px',
  maxWidth: '300px',
  wordBreak: 'break-word',
  textAlign: 'right',
}));

export const QueryMetadata: React.FC<QueryMetadataProps> = ({
  response,
  defaultExpanded = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const metadata = response.metadata;

  if (!metadata) {
    return null;
  }

  const schemaMetadata = metadata.schema_metadata;
  const parsingMetadata = metadata.parsing_metadata;
  const queryExecution = metadata.query_execution;
  const analysis = metadata.analysis;

  const hasSchemaInfo = schemaMetadata && Object.keys(schemaMetadata).length > 0;
  const hasParsingInfo = parsingMetadata && Object.keys(parsingMetadata).length > 0;
  const hasExecutionInfo = queryExecution && Object.keys(queryExecution).length > 0;
  const hasAnalysis = analysis && Object.keys(analysis).length > 0;

  if (!hasSchemaInfo && !hasParsingInfo && !hasExecutionInfo && !hasAnalysis) {
    return null;
  }

  return (
    <MetadataCard>
      <CardContent>
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            mb: expanded ? 1 : 0,
            pb: expanded ? 1 : 0,
            borderBottom: expanded ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : 'none',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 600,
            }}
          >
            <Code size={16} />
            Query Metadata
          </Typography>
          <IconButton size="small" sx={{ ml: 'auto' }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {/* Schema Discovery */}
            {hasSchemaInfo && (
              <MetadataSection>
                <SectionTitle>
                  <Database size={14} />
                  Schema Discovery
                </SectionTitle>
                <Box>
                  {schemaMetadata?.tables_discovered !== undefined && (
                    <MetadataItem>
                      <Label>Tables Discovered</Label>
                      <Value>{schemaMetadata.tables_discovered}</Value>
                    </MetadataItem>
                  )}
                  {schemaMetadata?.primary_table && (
                    <MetadataItem>
                      <Label>Primary Table</Label>
                      <Chip
                        label={schemaMetadata.primary_table}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </MetadataItem>
                  )}
                  {schemaMetadata?.table_names && schemaMetadata.table_names.length > 0 && (
                    <MetadataItem>
                      <Label>Available Tables</Label>
                      <Value>
                        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                          {schemaMetadata.table_names.slice(0, 5).map((table: string) => (
                            <Chip
                              key={table}
                              label={table}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {schemaMetadata.table_names.length > 5 && (
                            <Chip
                              label={`+${schemaMetadata.table_names.length - 5} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Value>
                    </MetadataItem>
                  )}
                </Box>
              </MetadataSection>
            )}

            {/* Entity Parsing */}
            {hasParsingInfo && (
              <MetadataSection>
                <SectionTitle>
                  <Table size={14} />
                  Entity Parsing
                </SectionTitle>
                <Box>
                  {parsingMetadata?.intent && (
                    <MetadataItem>
                      <Label>Intent Detected</Label>
                      <Chip
                        label={parsingMetadata.intent}
                        size="small"
                        color="primary"
                        variant="filled"
                      />
                    </MetadataItem>
                  )}
                  {parsingMetadata?.entities_found &&
                    parsingMetadata.entities_found.length > 0 && (
                      <MetadataItem>
                        <Label>Entities Found</Label>
                        <Value>
                          <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                            {parsingMetadata.entities_found.map((entity: { name: string; confidence: number }) => (
                              <Tooltip
                                key={entity.name}
                                title={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
                              >
                                <Chip
                                  label={entity.name}
                                  size="small"
                                  variant="outlined"
                                  icon={
                                    entity.confidence >= 0.8 ? (
                                      <CheckCircle size={12} />
                                    ) : (
                                      <AlertCircle size={12} />
                                    )
                                  }
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </Value>
                      </MetadataItem>
                    )}
                  {parsingMetadata?.ambiguities &&
                    parsingMetadata.ambiguities.length > 0 && (
                      <MetadataItem>
                        <Label>Ambiguities</Label>
                        <Value>
                          <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                            {parsingMetadata.ambiguities.map((amb: string) => (
                              <Tooltip key={amb} title="Multiple interpretations possible">
                                <Chip
                                  label={amb}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  icon={<AlertCircle size={12} />}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </Value>
                      </MetadataItem>
                    )}
                </Box>
              </MetadataSection>
            )}

            {/* Query Execution */}
            {hasExecutionInfo && (
              <MetadataSection>
                <SectionTitle>
                  <Clock size={14} />
                  Query Execution
                </SectionTitle>
                <Box>
                  {queryExecution?.execution_time_ms !== undefined && (
                    <MetadataItem>
                      <Label>Execution Time</Label>
                      <Value>{queryExecution.execution_time_ms}ms</Value>
                    </MetadataItem>
                  )}
                  {queryExecution?.rows_returned !== undefined && (
                    <MetadataItem>
                      <Label>Rows Returned</Label>
                      <Value>{queryExecution.rows_returned}</Value>
                    </MetadataItem>
                  )}
                  {queryExecution?.safety_validated && (
                    <MetadataItem>
                      <Label>Safety Check</Label>
                      <Chip
                        icon={<CheckCircle size={12} />}
                        label="Validated"
                        size="small"
                        color="success"
                        variant="filled"
                      />
                    </MetadataItem>
                  )}
                  {queryExecution?.warnings && queryExecution.warnings.length > 0 && (
                    <MetadataItem>
                      <Label>Warnings</Label>
                      <Value>
                        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                          {queryExecution.warnings.map((warning: string) => (
                            <Tooltip key={warning} title={warning}>
                              <Chip
                                label={warning}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      </Value>
                    </MetadataItem>
                  )}
                </Box>
              </MetadataSection>
            )}

            {/* Analysis */}
            {hasAnalysis && (
              <MetadataSection>
                <SectionTitle>
                  <AlertCircle size={14} />
                  Analysis
                </SectionTitle>
                <Box>
                  {analysis?.reasoning && (
                    <MetadataItem>
                      <Label>Reasoning</Label>
                      <Value sx={{ textAlign: 'right', maxWidth: 400 }}>
                        {analysis.reasoning}
                      </Value>
                    </MetadataItem>
                  )}
                  {analysis?.complexity && (
                    <MetadataItem>
                      <Label>Query Complexity</Label>
                      <Value>{analysis.complexity}/10</Value>
                    </MetadataItem>
                  )}
                </Box>
              </MetadataSection>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </MetadataCard>
  );
};

export default QueryMetadata;
