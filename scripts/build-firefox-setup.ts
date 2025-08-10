import { renameSync, writeFileSync } from "fs";

import packageJSON from "../package.json";

// mv package.json .package.json
renameSync("package.json", ".package.json");

packageJSON.displayName = "Clipboard History IO";
packageJSON.manifest.permissions = packageJSON.manifest.permissions.filter(
  (permission) => permission !== "offscreen" && permission !== "sidePanel",
);
writeFileSync("package.json", JSON.stringify(packageJSON));
