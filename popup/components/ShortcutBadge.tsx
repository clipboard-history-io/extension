import { Badge } from "@mantine/core";

interface Props {
  shortcut: string;
}

export const ShortcutBadge = ({ shortcut }: Props) => {
  return (
    <Badge variant="filled" size="xs" sx={{ userSelect: "none", flexShrink: 0, display: "flex" }}>
      {shortcut}
    </Badge>
  );
};
