import {
  ListItem as MuiListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
} from '@mui/material';
import { type ResolvedListItemProps } from 'enforma';

export function ListItem({
  title,
  subtitle,
  avatar,
  onEdit,
  onDelete,
  disabled,
  showDeleteButton,
}: ResolvedListItemProps) {
  return (
    <MuiListItem disablePadding>
      <ListItemButton onClick={onEdit}>
        {avatar !== undefined && (
          <ListItemAvatar>
            <Avatar src={avatar} />
          </ListItemAvatar>
        )}
        <ListItemText primary={title} secondary={subtitle} />
        {showDeleteButton && !disabled && (
          <IconButton
            edge="end"
            aria-label="delete"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ✕
          </IconButton>
        )}
      </ListItemButton>
    </MuiListItem>
  );
}
