import React from 'react';
import {
  Box,
} from '@mui/material';

interface VisualizationWrapperProps {
  children: React.ReactNode;
}

export function VisualizationWrapper({
  children,
}: VisualizationWrapperProps) {

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* No styling - just render children directly */}
      <Box sx={{ width: '100%' }}>
        {children}
      </Box>
    </Box>
  );
}
