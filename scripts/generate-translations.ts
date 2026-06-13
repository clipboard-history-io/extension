import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import pool from "@ricokahler/pool";
import { Translator, type TargetLanguageCode } from "deepl-node";
import { z } from "zod";

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

// Maps a Chrome i18n locale to its DeepL target language, or null when DeepL
// cannot translate it. Every returned code is a valid `TargetLanguageCode` as of
// deepl-node 1.27.0 (which exposes DeepL's January 2026 language expansion), so
// no type assertions are needed.
const languageCodeChromeToDeepL = (
  langChrome: ChromeI18nLanguageCode,
): TargetLanguageCode | null => {
  switch (langChrome) {
    // Not supported by DeepL.
    case "am":
    case "kn":
      return null;

    // Chrome locales whose DeepL code differs from the Chrome code.
    case "en":
    case "en_US":
      return "en-US";
    case "en_AU":
    case "en_GB":
      return "en-GB";
    case "es_419":
      return "es-419";
    case "pt_BR":
      return "pt-BR";
    case "pt_PT":
      return "pt-PT";
    case "zh_CN":
      return "zh-HANS";
    case "zh_TW":
      return "zh-HANT";
    case "fil":
      return "tl"; // Filipino → Tagalog
    case "no":
      return "nb"; // Norwegian → Norwegian Bokmål
  }

  // Every remaining Chrome code is itself a valid DeepL target code.
  return langChrome;
};

const getLocaleOverride = (lang: ChromeI18nLanguageCode) => {
  const overridePath = path.join("locale-overrides", lang, "messages.json");
  if (!existsSync(overridePath)) {
    return {};
  }

  return z
    .record(z.string(), z.object({ message: z.string() }))
    .parse(JSON.parse(readFileSync(overridePath, "utf8")));
};

const writeMessagesJson = (lang: ChromeI18nLanguageCode, data: string) => {
  const dir = path.join("locales", lang);
  if (!existsSync(dir)) {
    mkdirSync(dir);
  }

  writeFileSync(path.join(dir, "messages.json"), data);
};

const authKey = process.env.DEEPL_API_KEY;
if (!authKey) {
  console.error("DEEPL_API_KEY environment variable is required.");
  process.exit(1);
}

const translator = new Translator(authKey);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// DeepL aggressively rate limits the free tier, so retry transient failures with
// exponential backoff before giving up.
const translateText = async (message: string, description: string, lang: TargetLanguageCode) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const { text } = await translator.translateText(message, "en", lang, {
        context: description,
      });

      // DeepL occasionally returns stray leading/trailing whitespace; UI labels
      // never want it.
      return text.trim();
    } catch (e) {
      if (attempt >= 5) {
        throw e;
      }

      const delayMs = 2 ** attempt * 5000;
      console.log(`  Rate limited on ${lang}, retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }
};

const main = async () => {
  const messages = Object.entries(enMessagesJson);

  const deepLLanguageCodes = Array.from(
    new Set(
      ALL_CHROME_I18N_LANGUAGE_CODES.flatMap((lang) => {
        const l = languageCodeChromeToDeepL(lang);
        return l === null ? [] : [l];
      }),
    ),
  );

  // Optionally limit to N randomly-chosen languages for a quick sanity check,
  // e.g. `pnpm generate:translations 3`.
  const limit = Number(process.argv[2]);
  const collection = Number.isNaN(limit)
    ? deepLLanguageCodes
    : deepLLanguageCodes.sort(() => Math.random() - 0.5).slice(0, limit);

  console.log(`Translating ${messages.length} message(s) into ${collection.length} language(s)...`);

  const results = await pool({
    collection,
    maxConcurrency: 1,
    task: async (lang) => {
      console.log(`Translating to ${lang}...`);

      return await pool({
        collection: messages,
        maxConcurrency: 1,
        task: async ([key, { message, description }]) => {
          const text = await translateText(message, description, lang);

          return [lang, { [key]: { message: text } }] as const;
        },
      });
    },
  });

  const languageCodeDeepLToMessagesJson: Record<string, Record<string, { message: string }>> = {};

  results.flat().forEach(([lang, val]) => {
    languageCodeDeepLToMessagesJson[lang] = { ...languageCodeDeepLToMessagesJson[lang], ...val };
  });

  ALL_CHROME_I18N_LANGUAGE_CODES.filter((lang) => lang !== "en").forEach((lang) => {
    const l = languageCodeChromeToDeepL(lang);
    if (l === null) {
      return;
    }

    const translated = languageCodeDeepLToMessagesJson[l];
    if (translated === undefined) {
      return;
    }

    // Copy so that locales sharing a DeepL code (e.g. en_AU/en_GB → en-GB) don't
    // leak each other's overrides into the shared translation object.
    const messagesJson = { ...translated };

    const localeOverride = getLocaleOverride(lang);
    for (const key in enMessagesJson) {
      const override = localeOverride[key];
      if (override !== undefined) {
        messagesJson[key] = override;
      }
    }

    writeMessagesJson(lang, JSON.stringify(messagesJson));
  });

  console.log("Done!");
};

main();
