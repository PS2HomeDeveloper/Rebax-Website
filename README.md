# Rebax Website

The official website of [Rebax Engine](https://github.com/PS2HomeDeveloper/Rebax), live at **https://rebax.pages.dev/**.

It is a static site written in plain HTML, CSS and JavaScript. There is no build step and no dependency to install.

## How it works

- Pages are ordinary HTML files: `index.html`, `download/`, `releases/`, `docs/`, `community/` and `404.html`.
- The download and releases pages read the release list directly from the [Rebax repository](https://github.com/PS2HomeDeveloper/Rebax/releases) through the public GitHub API, in the visitor's browser. Publishing a new release on GitHub updates the website automatically. The text of a release is shown as its release notes.
- Downloads are matched to platform cards by the file name of each release asset:

  ```
  Rebax-Engine-v<version>-<platform>-<architecture>.<extension>
  ```

  Platforms are `windows`, `linux`, `macos`, `android` and `ios`. Architectures are `x86_64`, `arm64`, `x86`, `arm` and `universal`. Files that do not match are listed as additional files.

## Deployment

The site is hosted on Cloudflare Pages and deploys on every push to the main branch.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `/` |

Security headers and caching rules live in `_headers`.

## Local preview

Serve the folder with any static file server and open it in a browser, for example:

```
python3 -m http.server 8000
```

## Related repositories

- [Rebax](https://github.com/PS2HomeDeveloper/Rebax): the engine and editor
- [Rebax SDKs](https://github.com/PS2HomeDeveloper/Rebax-SDKs): target SDK packages
- [Rebax Toolchains](https://github.com/PS2HomeDeveloper/Rebax-Toolchains): compiler packages

## License

The website source is released under the MIT License (see `LICENSE`). The Space Grotesk font in `assets/fonts` is licensed under the SIL Open Font License 1.1 (see `assets/fonts/OFL.txt`). The names "Rebax" and "Rebax Engine" and the Rebax logo are trademarks of PS2HomeDeveloper.
