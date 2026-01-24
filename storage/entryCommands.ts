import * as z from 'zod';

import { Storage } from "@plasmohq/storage";

import { EntryCommand } from "~types/entryCommand";

const storage = new Storage({
  area: "local",
});

// Do not change this without a migration.
const ENTRY_COMMANDS_STORAGE_KEY = "entryCommands";

export const watchEntryCommands = (cb: (entryCommands: EntryCommand[]) => void) => {
  return storage.watch({
    [ENTRY_COMMANDS_STORAGE_KEY]: (c) => cb(z.array(EntryCommand).catch([]).parse(c.newValue)),
  });
};

export const getEntryCommands = async () => {
  return z
    .array(EntryCommand)
    .catch([])
    .parse(await storage.get(ENTRY_COMMANDS_STORAGE_KEY));
};

export const _setEntryCommands = async (entryCommands: EntryCommand[]) => {
  await storage.set(ENTRY_COMMANDS_STORAGE_KEY, entryCommands);
};

export const createEntryCommand = async (entryId: string, commandName: string) => {
  const entryCommands = await getEntryCommands();

  await _setEntryCommands([
    ...entryCommands.filter(
      (entryCommand) =>
        entryCommand.entryId !== entryId && entryCommand.commandName !== commandName,
    ),
    { entryId, commandName },
  ]);
};

export const deleteEntryCommands = async (entryIds: string[]) => {
  const s = new Set(entryIds);

  const entryCommands = await getEntryCommands();

  await _setEntryCommands(entryCommands.filter((entryCommand) => !s.has(entryCommand.entryId)));
};
