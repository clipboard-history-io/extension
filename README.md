<a href="https://www.producthunt.com/posts/clipboard-history-3?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-clipboard&#0045;history&#0045;3" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=490162&theme=light" alt="Clipboard&#0032;History - Securely&#0032;access&#0044;&#0032;track&#0044;&#0032;and&#0032;manage&#0032;your&#0032;clipboard&#0032;history | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

# Clipboard History

![pika-1742612638736-1x](https://github.com/user-attachments/assets/b99fad41-5d85-4497-b90e-de6d51d9200a)

The first open source clipboard manager Chrome extension. Get all of the productivity benefits of a clipboard history with none of the security risks.

Clipboard History offers a simple, efficient, and secure way to manage your clipboard. When the clipboard monitor is enabled, everything you copy to your clipboard will be backed up and saved locally for easy access later. Never worry about losing important content in your clipboard again!

## Security & Privacy

Unrestricted access to your clipboard can raise serious privacy concerns. In an effort to be the most trustworthy clipboard history manager, Clipboard History is fully open-source. You can download or review the source code here: https://github.com/ayoung19/clipboard-history

# Contributing

Contributions are always welcome and appreciated! Feel free to pick up any issue with tags that aren’t already assigned—just leave a comment if you’d like to work on something.

Need faster responses? Join our [discord](https://discord.gg/4dY6MYa9wV), introduce yourself, and ping away!

## Architecture Diagram

Below is a rudimentary architecture diagram showing the general flow of clipboard data between the different components of the extension.

![Untitled-2024-10-02-0046](https://github.com/user-attachments/assets/98cc2c69-245f-4225-a188-39175cc03502)

## Project Structure

This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

```
clipboard-history
├── assets
├── background
│   ├── messages
│   └── index.ts
├── popup
├── scripts
├── storage
├── tabs
├── types
├── utils
├── offscreen.html
└── offscreen.ts
```

| Name                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `assets`              | https://docs.plasmo.com/framework/assets                                    |
| `background/messages` | https://docs.plasmo.com/framework/messaging                                 |
| `background/index.ts` | https://docs.plasmo.com/framework/background-service-worker                 |
| `popup`               | https://docs.plasmo.com/framework/ext-pages#adding-a-popup-page             |
| `scripts`             | Contains scripts used in the build system and CI/CD.                        |
| `tabs`                | https://docs.plasmo.com/framework/tab-pages                                 |
| `types`               | Contains definitions and schemas of common types used in application logic. |
| `utils`               | Contains utility functions used in application logic.                       |
| `offscreen.html`      | https://developer.chrome.com/docs/extensions/reference/api/offscreen        |
| `offscreen.ts`        | https://developer.chrome.com/docs/extensions/reference/api/offscreen        |

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

# Contributors

<!-- readme: contributors -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/ayoung19">
                    <img src="https://avatars.githubusercontent.com/u/18640252?v=4" width="100;" alt="ayoung19"/>
                    <br />
                    <sub><b>Andy Young</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/aichRhythm">
                    <img src="https://avatars.githubusercontent.com/u/48093060?v=4" width="100;" alt="aichRhythm"/>
                    <br />
                    <sub><b>Rhythm Aich</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/rrailroad">
                    <img src="https://avatars.githubusercontent.com/u/67599303?v=4" width="100;" alt="rrailroad"/>
                    <br />
                    <sub><b>Rachel Cai</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/aanand3">
                    <img src="https://avatars.githubusercontent.com/u/63207932?v=4" width="100;" alt="aanand3"/>
                    <br />
                    <sub><b>aanand3</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/pgiouroukis">
                    <img src="https://avatars.githubusercontent.com/u/55794994?v=4" width="100;" alt="pgiouroukis"/>
                    <br />
                    <sub><b>Petros Giouroukis</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/uussaammaahh">
                    <img src="https://avatars.githubusercontent.com/u/10544770?v=4" width="100;" alt="uussaammaahh"/>
                    <br />
                    <sub><b>Usamah Ulde</b></sub>
                </a>
            </td>
		</tr>
		<tr>
            <td align="center">
                <a href="https://github.com/riyan04">
                    <img src="https://avatars.githubusercontent.com/u/119859849?v=4" width="100;" alt="riyan04"/>
                    <br />
                    <sub><b>riyan04</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: contributors -end -->
