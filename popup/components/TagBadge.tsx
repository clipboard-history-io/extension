import { Badge, Box, rem, type Sx } from "@mantine/core";
import { generateColor } from "@marko19907/string-to-color";

interface Props {
  tag: string;
  sx?: Sx;
}

export const TagBadge = ({ tag }: Props) => {
  return (
    <Badge
      variant="dot"
      size="xs"
      sx={{
        userSelect: "none",
        "::before": { content: "none" },
        maxWidth: "none",
        whiteSpace: "nowrap",
        overflow: "visible",
        flexShrink: 0,
      }}
      leftSection={
        <Box
          sx={{
            width: rem(4),
            height: rem(4),
            borderRadius: rem(4),
            backgroundColor: generateColor(tag),
          }}
        />
      }
    >
      {tag}
    </Badge>
  );
};
