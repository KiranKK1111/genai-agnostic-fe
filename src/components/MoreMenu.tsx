import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { MoreVertical, Copy, Trash2, Share2 } from 'lucide-react';

interface MoreMenuProps {
  onCopy?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  customItems?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
}

export function MoreMenu({
  onCopy,
  onDelete,
  onShare,
  customItems = [],
}: MoreMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (callback?: () => void) => {
    callback?.();
    handleClose();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{
          '&:hover': {
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        <MoreVertical size={18} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onCopy && (
          <MenuItem onClick={() => handleMenuItemClick(onCopy)}>
            <ListItemIcon>
              <Copy size={16} />
            </ListItemIcon>
            <ListItemText>Copy</ListItemText>
          </MenuItem>
        )}
        
        {onShare && (
          <MenuItem onClick={() => handleMenuItemClick(onShare)}>
            <ListItemIcon>
              <Share2 size={16} />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
        )}

        {customItems.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => handleMenuItemClick(item.onClick)}
          >
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}

        {onDelete && (
          <>
            {(onCopy || onShare || customItems.length > 0) && (
              <hr style={{ margin: '4px 0' }} />
            )}
            <MenuItem
              onClick={() => handleMenuItemClick(onDelete)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <Trash2 size={16} />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
