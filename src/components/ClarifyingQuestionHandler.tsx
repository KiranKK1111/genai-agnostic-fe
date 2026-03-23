/**
 * Clarifying Question Handler Component
 * Handles interactive clarifying questions of different types
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { ClarifyingQuestion } from '../api';

interface ClarifyingQuestionHandlerProps {
  clarifyingQuestion: ClarifyingQuestion;
  originalQuery: string;
  isLoading?: boolean;
  isAnswered?: boolean;
  onConfirm: (confirmation: string) => void;
}

export function ClarifyingQuestionHandler({
  clarifyingQuestion,
  originalQuery,
  isLoading = false,
  isAnswered = false,
  onConfirm,
}: ClarifyingQuestionHandlerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [inputValue, setInputValue] = useState('');
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Treat as locked if already answered (from history) or confirmed in this session
  const isLocked = isAnswered || confirmed;

  const handleBinaryChoice = (choice: string) => {
    if (isLocked) return;
    setSelectedChoice(choice);
    setConfirmed(true);
    onConfirm(choice);
  };

  const handleMultipleChoice = (option: string | { value: string; label: string; [key: string]: any }) => {
    if (isLocked) return;
    const text = typeof option === 'string' ? option : option.value || option.label;
    setSelectedChoice(text);
    setConfirmed(true);
    onConfirm(text);
  };

  const toggleMultiSelect = (value: string) => {
    if (isLocked) return;
    setMultiSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleMultiSelectConfirm = () => {
    if (isLocked || multiSelected.length === 0) return;
    setConfirmed(true);
    onConfirm(multiSelected.join(','));
  };

  const handleValueInput = () => {
    if (isLocked) return;
    if (inputValue.trim()) {
      setConfirmed(true);
      onConfirm(inputValue);
      setInputValue('');
    }
  };

  const renderBinary = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
      {['yes', 'no'].map((choice) => {
        const isSelected = selectedChoice === choice;
        return (
          <Button
            key={choice}
            onClick={() => handleBinaryChoice(choice)}
            disabled={isLoading || isLocked}
            variant="outlined"
            sx={{
              background: isSelected ? '#3b82f6' : 'transparent',
              color: isSelected ? '#ffffff' : '#9ca3af',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              borderRadius: '6px',
              border: isSelected ? '1.5px solid #3b82f6' : '1.5px solid #d1d5db',
              cursor: isLocked ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isLocked && !isSelected ? 0.4 : 1,
              ...(!isLocked && {
                '&:hover': {
                  background: '#3b82f6',
                  borderColor: '#3b82f6',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                },
                '&:active': {
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  color: '#ffffff',
                },
              }),
              '&:disabled': {
                opacity: isLocked && isSelected ? 1 : 0.4,
                cursor: 'default',
                color: isSelected ? '#ffffff' : '#9ca3af',
                background: isSelected ? '#3b82f6' : 'transparent',
                border: isSelected ? '1.5px solid #3b82f6' : '1.5px solid #d1d5db',
              },
            }}
          >
            {choice.toUpperCase()}
          </Button>
        );
      })}
    </Box>
  );

  const renderMultipleChoice = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
      {clarifyingQuestion.options?.map((option, idx) => {
        const label = typeof option === 'string' ? option : option.label;
        const value = typeof option === 'string' ? option : option.value || option.label;
        const key = typeof option === 'string' ? option : option.value || `opt-${idx}`;
        const isSelected = selectedChoice === value;
        return (
          <Chip
            key={key}
            label={label}
            onClick={() => handleMultipleChoice(option)}
            variant={isSelected ? 'filled' : 'outlined'}
            sx={{
              cursor: isLocked ? 'default' : 'pointer',
              borderColor: isSelected ? '#3b82f6' : '#3b82f6',
              color: isSelected ? '#ffffff' : '#3b82f6',
              backgroundColor: isSelected ? '#3b82f6' : 'transparent',
              opacity: isLocked && !isSelected ? 0.4 : 1,
              ...(!isLocked && {
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderColor: '#2563eb',
                },
              }),
              '&.Mui-disabled': {
                opacity: isLocked && isSelected ? 1 : 0.4,
                color: isSelected ? '#ffffff' : '#3b82f6',
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                borderColor: '#3b82f6',
              },
            }}
            disabled={isLoading || isLocked}
          />
        );
      })}
    </Box>
  );

  const renderValueInput = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        size="small"
        type={clarifyingQuestion.input_type === 'number' ? 'number' : 'text'}
        placeholder={`Enter ${clarifyingQuestion.input_type || 'value'}`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isLoading || isLocked}
        sx={{
          flex: 1,
          minWidth: '200px',
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleValueInput();
          }
        }}
      />
      {!isLocked && (
        <Button
          onClick={handleValueInput}
          disabled={!inputValue.trim() || isLoading}
          size="small"
          variant="outlined"
          sx={{
            textTransform: 'none',
            borderColor: '#3b82f6',
            color: '#3b82f6',
            '&:hover': {
              borderColor: '#2563eb',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            },
          }}
        >
          Confirm
        </Button>
      )}
    </Box>
  );

  const renderEntityDisambiguation = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
      {clarifyingQuestion.options?.map((option, idx) => {
        const label = typeof option === 'string' ? option : `${option.label}${option.description ? ` (${option.description})` : ''}`;
        const value = typeof option === 'string' ? option : option.value || option.label;
        const key = typeof option === 'string' ? option : option.value || `opt-${idx}`;
        const isSelected = selectedChoice === value;
        return (
        <Chip
          key={key}
          label={label}
          onClick={() => handleMultipleChoice(option)}
          variant={isSelected ? 'filled' : 'outlined'}
          sx={{
            cursor: isLocked ? 'default' : 'pointer',
            borderColor: '#f59e0b',
            color: isSelected ? '#ffffff' : '#f59e0b',
            backgroundColor: isSelected ? '#f59e0b' : 'transparent',
            opacity: isLocked && !isSelected ? 0.4 : 1,
            ...(!isLocked && {
              '&:hover': {
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: '#d97706',
              },
            }),
            '&.Mui-disabled': {
              opacity: isLocked && isSelected ? 1 : 0.4,
              color: isSelected ? '#ffffff' : '#f59e0b',
              backgroundColor: isSelected ? '#f59e0b' : 'transparent',
              borderColor: '#f59e0b',
            },
          }}
          disabled={isLoading || isLocked}
        />
        );
      })}
    </Box>
  );

  const renderMissingParameter = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        size="small"
        placeholder="Enter required parameter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isLoading || isLocked}
        sx={{
          flex: 1,
          minWidth: '200px',
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleValueInput();
          }
        }}
      />
      {!isLocked && (
        <Button
          onClick={handleValueInput}
          disabled={!inputValue.trim() || isLoading}
          size="small"
          variant="outlined"
          sx={{
            textTransform: 'none',
            borderColor: '#3b82f6',
            color: '#3b82f6',
            '&:hover': {
              borderColor: '#2563eb',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            },
          }}
        >
          Provide
        </Button>
      )}
    </Box>
  );

  const renderMultiSelect = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        {clarifyingQuestion.options?.map((option, idx) => {
          const label = typeof option === 'string' ? option : option.label;
          const value = typeof option === 'string' ? option : option.value || option.label;
          const isSelected = multiSelected.includes(value);
          return (
            <Chip
              key={value || `opt-${idx}`}
              label={label}
              onClick={() => toggleMultiSelect(value)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                cursor: isLocked ? 'default' : 'pointer',
                borderColor: '#3b82f6',
                color: isSelected ? '#ffffff' : '#3b82f6',
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                opacity: isLocked && !isSelected ? 0.4 : 1,
                ...(!isLocked && {
                  '&:hover': {
                    backgroundColor: isSelected
                      ? '#2563eb'
                      : 'rgba(59, 130, 246, 0.1)',
                    borderColor: '#2563eb',
                  },
                }),
                '&.Mui-disabled': {
                  opacity: isLocked && isSelected ? 1 : 0.4,
                  color: isSelected ? '#ffffff' : '#3b82f6',
                  backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                  borderColor: '#3b82f6',
                },
              }}
              disabled={isLoading || isLocked}
            />
          );
        })}
      </Box>
      {!isLocked && (
        <Box sx={{ mt: 2 }}>
          <Button
            onClick={handleMultiSelectConfirm}
            disabled={multiSelected.length === 0 || isLoading}
            size="small"
            variant="contained"
            sx={{
              textTransform: 'none',
              backgroundColor: '#3b82f6',
              '&:hover': { backgroundColor: '#2563eb' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            Confirm ({multiSelected.length} selected)
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderContent = () => {
    switch (clarifyingQuestion.type) {
      case 'binary':
        return renderBinary();
      case 'multiple_choice':
        return renderMultipleChoice();
      case 'value_input':
        return renderValueInput();
      case 'entity_disambiguation':
      case 'ambiguous_table':
      case 'ambiguous_value':
      case 'ambiguous_column':
        return renderEntityDisambiguation();
      case 'missing_parameter':
        return renderMissingParameter();
      case 'viz_type':
        return renderMultiSelect();
      default:
        // Check mode for multi_select
        if ((clarifyingQuestion as any).mode === 'multi_select') {
          return renderMultiSelect();
        }
        // If options are present, treat as multiple choice
        if (clarifyingQuestion.options && clarifyingQuestion.options.length > 0) {
          return renderMultipleChoice();
        }
        return null;
    }
  };

  return (
    <Box>
      <Typography
        sx={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#3b82f6',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: 1,
        }}
      >
        ❓ CLARIFICATION NEEDED
      </Typography>
      <Typography
        sx={{
          fontSize: isMobile ? '13px' : '14px',
          lineHeight: 1.5,
          color: 'text.primary',
          mb: 2,
        }}
      >
        {clarifyingQuestion.question}
      </Typography>
      {renderContent()}
    </Box>
  );
}
