import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import pool from "@ricokahler/pool";
import { Translator, type TargetLanguageCode } from "deepl-node";
import * as z from 'zod';

import enMessagesJson from "../locales/en/messages.json";

const ALL_CHROME_I18N_LANGUAGE_CODES = [
  "ar",
  "am",
  "bg",
  "bn",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "en_AU",
  "en_GB",
  "en_US",
  "es",
  "es_419",
  "et",
  "fa",
  "fi",
  "fil",
  "fr",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "kn",
  "ko",
  "lt",
  "lv",
  "ml",
  "mr",
  "ms",
  "nl",
  "no",
  "pl",
  "pt_BR",
  "pt_PT",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "vi",
  "zh_CN",
  "zh_TW",
] as const;

type ChromeI18nLanguageCode = (typeof ALL_CHROME_I18N_LANGUAGE_CODES)[number];

const languageCodeChromeToDeepL = (
  langChrome: ChromeI18nLanguageCode,
): TargetLanguageCode | null => {
  switch (langChrome) {
    case "am":
    case "bn":
    case "ca":
    case "fa":
    case "fil":
    case "gu":
    case "he":
    case "hi":
    case "hr":
    case "kn":
    case "ml":
    case "mr":
    case "ms":
    case "no":
    case "sr":
    case "sw":
    case "ta":
    case "te":
    case "th":
    case "vi":
      return null;

    case "en":
    case "en_US":
      return "en-US";

    case "en_AU":
    case "en_GB":
      return "en-GB";

    case "es_419":
      return "es";

    case "pt_BR":
      return "pt-BR";

    case "pt_PT":
      return "pt-PT";

    case "zh_CN":
    case "zh_TW":
      return "zh";
  }

  return langChrome;
};

const getLocaleOverride = (lang: ChromeI18nLanguageCode) => {
  if (!existsSync(path.join("locale-overrides", lang, "messages.json"))) {
    return {};
  }

  return z
    .record(
      z.string(),
      z.object({
        message: z.string(),
      }),
    )
    .parse(JSON.parse(readFileSync(path.join("locale-overrides", lang, "messages.json"), "utf8")));
};

const writeMessagesJson = (lang: ChromeI18nLanguageCode, data: string) => {
  if (!existsSync(path.join("locales", lang))) {
    mkdirSync(path.join("locales", lang));
  }

  writeFileSync(path.join("locales", lang, "messages.json"), data);
};

const translator = new Translator("b2c0e6a4-a0b7-46f8-82f1-2473d1e21355:fx");

const languageCodeDeepLToMessagesJson: Record<string, Record<string, { message: string }>> = {};

const main = async () => {
  const results = await pool({
    collection: Array.from(
      new Set(
        ALL_CHROME_I18N_LANGUAGE_CODES.flatMap((lang) => {
          const l = languageCodeChromeToDeepL(lang);
          if (l === null) {
            return [];
          }

          return l;
        }),
      ),
    ),
    maxConcurrency: 1,
    task: async (lang) => {
      return await pool({
        collection: Object.entries(enMessagesJson),
        maxConcurrency: 1,
        task: async ([key, { message, description }]) => {
          const translation = await translator.translateText(message, "en", lang, {
            context: description,
          });

          return [lang, { [key]: { message: translation.text } }] as const;
        },
      });
    },
  });

  results.flat().forEach(([key, val]) => {
    languageCodeDeepLToMessagesJson[key] = { ...languageCodeDeepLToMessagesJson[key], ...val };
  });

  ALL_CHROME_I18N_LANGUAGE_CODES.filter((lang) => lang !== "en").forEach((lang) => {
    const l = languageCodeChromeToDeepL(lang);
    if (l === null) {
      return;
    }

    const messagesJson = languageCodeDeepLToMessagesJson[l];
    if (messagesJson === undefined) {
      return;
    }

    const localeOverride = getLocaleOverride(lang);

    for (const key in enMessagesJson) {
      const message = localeOverride[key];
      if (message === undefined) {
        continue;
      }

      messagesJson[key] = message;
    }

    writeMessagesJson(lang, JSON.stringify(messagesJson));
  });
};

main();
