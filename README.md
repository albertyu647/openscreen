<p align="center">
  <img src=".github/assets/logo.jpg" width="96" alt="OpenScreen fork logo">
</p>

<h1 align="center">OpenScreen, autodemo fork</h1>

<p align="center">
  A fork of <a href="https://github.com/siddharthvaddem/openscreen">OpenScreen</a> with steadier zoom animation, timelapse playback and configurable export, so it can render demo videos headlessly for <a href="https://github.com/albertyu647/autodemo">autodemo</a>.
</p>

<p align="center">
  <img src=".github/assets/banner.jpg" alt="A video editor timeline with zoom regions, an easing curve and a zoomed screen frame">
</p>

## What this fork changes

All changes are on the `autodemo` branch, on top of upstream OpenScreen.

| Change | Why it matters |
|---|---|
| **Per-region ease durations are preserved.** `normalizeProjectEditor()` used to drop `zoomInDurationMs` / `zoomOutDurationMs` on every save and load. | A project file can set the timing of each zoom, and the timeline's drag handles stop losing their values. |
| **No "pop" between chained zooms.** When two zoom regions were close enough to be joined by a pan, the camera fell to 1.0x for about two frames at the handoff. | Back-to-back shots glide from one framing to the next instead of flickering. |
| **Cursor-follow aims at the pointer.** Auto-focus fed cursor telemetry straight in as a focus value, so it aimed short of the pointer by the padding amount. It now converts video space to stage space itself. | Auto-follow zooms land on what is being clicked. |
| **Playback up to 100x and a timelapse mode.** | Long waits in a recording can be compressed instead of cut. |
| **Configurable export frame rate and size, with background blur baked in.** | Renders match the capture exactly, which a scripted pipeline needs. |

The easing curves are untouched. A render with no chained regions is bit-identical before and after these changes (PSNR infinity over 900 frames).

### Using it headlessly

Launch with `HEADLESS=true` to run without a window. [autodemo's `export.mjs`](https://github.com/albertyu647/autodemo/blob/main/scripts/export.mjs) shows how to inject a project and capture the exported video through the main-process IPC handlers.

```sh
git clone -b autodemo https://github.com/albertyu647/openscreen
cd openscreen && npm install && npm run build-vite
```

The original README follows.

---

> [!WARNING]
> This is very much in beta and might be buggy here and there (but hope you have a good experience!).

<p align="center">
  <img src="public/openscreen.png" alt="OpenScreen Logo" width="64" />
  <br />
  <br />
  <a href="https://deepwiki.com/siddharthvaddem/openscreen">
    <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" />
  </a>
  &nbsp;
  <a href="https://discord.gg/yAQQhRaEeg">
    <img src="https://img.shields.io/discord/pHAUbcqNd?logo=discord&label=Discord&color=5865F2" alt="Join Discord" />
  </a>
</p>

# <p align="center">OpenScreen</p>

<p align="center"><strong>OpenScreen is your free, open-source alternative to Screen Studio (sort of).</strong></p>

If you don't want to pay $29/month for Screen Studio but want a much simpler version that does what most people seem to need, making beautiful product demos and walkthroughs, here's a free-to-use app for you. OpenScreen does not offer all Screen Studio features, but covers the basics well!

Screen Studio is an awesome product and this is definitely not a 1:1 clone. OpenScreen is a much simpler take, just the basics for folks who want control and don't want to pay. If you need all the fancy features, your best bet is to support Screen Studio (they really do a great job, haha). But if you just want something free (no gotchas) and open, this project does the job!

OpenScreen is 100% free for personal and commercial use. Use it, modify it, distribute it. (Just be cool 😁 and give a shoutout if you feel like it !)

<p align="center">
	<img src="public/preview3.png" alt="OpenScreen App Preview 3" style="height: 0.2467; margin-right: 12px;" />
	<img src="public/preview4.png" alt="OpenScreen App Preview 4" style="height: 0.1678; margin-right: 12px;" />
</p>

## Core Features
- Record specific windows or your whole screen.
- Add automatic or manual zooms (adjustable depth levels) and customize their durarion and position.
- Record microphone and system audio.
- Crop video recordings to hide parts.
- Choose between wallpapers, solid colors, gradients or a custom background.
- Motion blur for smoother pan and zoom effects.
- Add annotations (text, arrows, images).
- Trim sections of the clip.
- Customize the speed of different segments.
- Export in different aspect ratios and resolutions.

## Installation

Download the latest installer for your platform from the [GitHub Releases](https://github.com/siddharthvaddem/openscreen/releases) page.

### macOS

If you encounter issues with macOS Gatekeeper blocking the app (since it does not come with a developer certificate), you can bypass this by running the following command in your terminal after installation:

```bash
xattr -rd com.apple.quarantine /Applications/Openscreen.app
```

Note: Give your terminal Full Disk Access in **System Settings > Privacy & Security** to grant you access and then run the above command.

After running this command, proceed to **System Preferences > Security & Privacy** to grant the necessary permissions for "screen recording" and "accessibility". Once permissions are granted, you can launch the app.

### Linux

Download the `.AppImage` file from the releases page. Make it executable and run:

```bash
chmod +x Openscreen-Linux-*.AppImage
./Openscreen-Linux-*.AppImage
```

You may need to grant screen recording permissions depending on your desktop environment.

**Note:** If the app fails to launch due to a "sandbox" error, run it with --no-sandbox:
```bash
./Openscreen-Linux-*.AppImage --no-sandbox
```

### Limitations

System audio capture relies on Electron's [desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer) and has some platform-specific quirks:

- **macOS**: Requires macOS 13+. On macOS 14.2+ you'll be prompted to grant audio capture permission. macOS 12 and below does not support system audio (mic still works).
- **Windows**: Works out of the box.
- **Linux**: Needs PipeWire (default on Ubuntu 22.04+, Fedora 34+). Older PulseAudio-only setups may not support system audio (mic should still work).

## Built with
- Electron
- React
- TypeScript
- Vite
- PixiJS
- dnd-timeline

---

_I'm new to open source, idk what I'm doing lol. If something is wrong please raise an issue 🙏_

## Documentation

See the documentation here:
[OpenScreen Docs](https://deepwiki.com/siddharthvaddem/openscreen)

## Contributing

Contributions are welcome! If you’d like to help out or see what’s currently being worked on, take a look at the open issues and the [project roadmap](https://github.com/users/siddharthvaddem/projects/3) to understand the current direction of the project and find ways to contribute.

## License

This project is licensed under the [MIT License](./LICENSE). By using this software, you agree that the authors are not liable for any issues, damages, or claims arising from its use.
