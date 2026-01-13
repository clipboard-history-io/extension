import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    subscriptions: i.entity({
      email: i.string().unique().indexed(),
    }),
    entries: i.entity({
      emailContentHash: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
      copiedAt: i.number().indexed().optional(),
      content: i.string(),
      isFavorited: i.boolean().optional(),
      tags: i.string().optional(),
    }),
    settings: i.entity({
      cloudItemLimit: i.number().indexed().optional(),
    }),
  },
  links: {
    subscriptionUser: {
      forward: { on: "subscriptions", has: "one", label: "$user", onDelete: "cascade" },
      reverse: { on: "$users", has: "one", label: "subscription" },
    },
    entriesUser: {
      forward: { on: "entries", has: "one", label: "$user", onDelete: "cascade" },
      reverse: { on: "$users", has: "many", label: "entries" },
    },
    settingsUser: {
      forward: { on: "settings", has: "one", label: "$user", onDelete: "cascade" },
      reverse: { on: "$users", has: "one", label: "settings" },
    },
  },
});

// This helps Typescript display better intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
