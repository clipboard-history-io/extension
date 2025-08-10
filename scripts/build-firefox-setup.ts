import { renameSync, writeFileSync } from "fs";

import packageJson from "../package.json";

const newPackageJson = {
  ...packageJson,
  manifest: {
    ...packageJson.manifest,
    // delete packageJson.manifest.side_panel
    side_panel: undefined,
    commands: {
      ...packageJson.manifest.commands,
      // packageJson.manifest.command._execute_browser_action = packageJson.manifest.commands._execute_action
      _execute_browser_action: packageJson.manifest.commands._execute_action,
      // delete packageJson.manifest.commands._execute_action
      _execute_action: undefined,
    },
  },
};

// mv package.json .package.json
renameSync("package.json", ".package.json");

newPackageJson.displayName = "Clipboard History IO";
newPackageJson.manifest.permissions = newPackageJson.manifest.permissions.filter(
  (permission) => permission !== "offscreen" && permission !== "sidePanel",
);
writeFileSync("package.json", JSON.stringify(newPackageJson));
