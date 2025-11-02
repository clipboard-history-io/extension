import * as z from "zod";

export const LocalTtlTypeEnum = z.enum(["Minutes", "Hours", "Days", "Weeks", "Months"]);

export const LocalTtlConfig = z
  .object({
    amount: z.number(),
    type: LocalTtlTypeEnum,
  })
  .nullable();
export type LocalTtlConfig = z.infer<typeof LocalTtlConfig>;
export type LocalTtlTypeEnum = z.infer<typeof LocalTtlTypeEnum>;
