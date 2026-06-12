import { Group, Kbd, rem, Text } from "@mantine/core";

interface Props {
  keys: string[];
  label: string;
}

export const KeyboardHint = ({ keys, label }: Props) => {
  return (
    <Group align="center" spacing={rem(4)} noWrap sx={{ userSelect: "none" }}>
      {keys.map((key) => (
        <Kbd
          key={key}
          sx={(theme) => ({
            fontSize: rem(10),
            lineHeight: 1,
            padding: `${rem(2)} ${rem(4)}`,
            color: theme.colors.gray[6],
          })}
        >
          {key}
        </Kbd>
      ))}
      <Text fz="xs" color="dimmed">
        {label}
      </Text>
    </Group>
  );
};
