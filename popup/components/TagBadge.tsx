import { Badge, Box, rem } from "@mantine/core";
import { generateColor } from "@marko19907/string-to-color";

interface Props {
  tag: string;
}

export const TagBadge = ({ tag }: Props) => {
  return (
    <Badge
      variant="dot"
      size="xs"
      sx={{
        userSelect: "none",
        "::before": { content: "none" },
      }}
      maw={146}
      // Workaround because the default dot gets messed up when max width is
      // hit.
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
