import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getSettings } from "~storage/settings";
import { Alarm } from "~types/alarm";
import type { LocalTtlConfig, LocalTtlTypeEnum } from "~types/localTtlConfig";
import { deleteEntries, getEntries } from "~utils/storage";

export type CreateTtlAlarmRequestBody = {
  localTtlConfig: LocalTtlConfig;
};

export type CreateTtlAlarmResponseBody = Record<PropertyKey, never>;

const timeUnitToMinutes: Record<LocalTtlTypeEnum, number> = {
  Minutes: 1,
  Hours: 60,
  Days: 1440,
  Weeks: 10_080,
  Months: 43_200,
};

const timeUnitToMilliseconds: Record<LocalTtlTypeEnum, number> = {
  Minutes: 60_000,
  Hours: 3_600_000,
  Days: 86_400_000,
  Weeks: 604_800000,
  Months: 2_592_000_000,
};

const createAlarmOptions = (
  type: LocalTtlTypeEnum,
  amount: number,
): chrome.alarms.AlarmCreateInfo => {
  return {
    when: Date.now(),
    periodInMinutes: timeUnitToMinutes[type] * amount,
  };
};

export const removeEntriesNonFavorite = async () => {
  const { localTtlConfig } = await getSettings();

  if (!localTtlConfig) return;
  const entries = await getEntries();
  const now = Date.now();
  const ttlInMilliseconds = timeUnitToMilliseconds[localTtlConfig?.type] * localTtlConfig?.amount;
  const entriesToRemoved = entries
    .filter(({ createdAt }) => now - createdAt >= ttlInMilliseconds)
    .map(({ id }) => id);

  if (entriesToRemoved.length > 0) {
    await deleteEntries(entriesToRemoved);
  }
};

export const checkTtlAlarmState = async () => {
  const { localTtlConfig } = await getSettings();

  if (localTtlConfig) {
    const alarm = await chrome.alarms.get(Alarm.Enum.CleanupTtl);
    if (!alarm) {
      await createTtlAlarm(localTtlConfig);
    }
  }
};

const createTtlAlarm = async (ttl: LocalTtlConfig) => {
  if (!ttl) return;

  const alarmOptions = createAlarmOptions(ttl.type, ttl.amount);
  await chrome.alarms.create(Alarm.Enum.CleanupTtl, alarmOptions);
};

const handler: PlasmoMessaging.MessageHandler<
  CreateTtlAlarmRequestBody,
  CreateTtlAlarmResponseBody
> = async (req, res) => {
  if (req.body) {
    const { localTtlConfig } = req.body;
    createTtlAlarm(localTtlConfig);
  }
  res.send({});
};

export default handler;
