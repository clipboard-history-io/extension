import type { PlasmoMessaging } from "@plasmohq/messaging";

import { Alarm } from "~types/alarm";

export type DeleteTtlAlarmRequestBody = undefined;
export type DeleteTtlAlarmResponseBody = Record<PropertyKey, never>;

const deleteTtlAlarm = async () => {
  await chrome.alarms.clear(Alarm.Enum.CleanupTtl);
};

const handler: PlasmoMessaging.MessageHandler<
  DeleteTtlAlarmRequestBody,
  DeleteTtlAlarmResponseBody
> = async (_, res) => {
  await deleteTtlAlarm();
  res.send({});
};

export default handler;
