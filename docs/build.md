# 构建指南（Windows / Linux / macOS）

Patchouli Helper 是 Tauri v2 应用：前端是 `web/` 里的纯静态文件（**没有打包器、没有 `beforeBuildCommand`**），构建过程只有一步——编译 Rust 侧的壳，把 `web/` 塞进去。

所以「构建失败」几乎总是**系统依赖 / 工具链**问题，而不是前端问题。

```bash
npm i                  # 只装 @tauri-apps/cli
npm run tauri dev      # 开发：热加载窗口，改 web/ 后刷新即可
npm run tauri build    # 打包安装包
```

`npm run tauri <子命令>` 是 `tauri` CLI 的透传（`package.json` 里 `"tauri": "tauri"`），`tauri:dev` / `tauri:build` 是别名。

---

## 产物路径

默认（本地原生目标）：

| 平台 | 产物 |
| --- | --- |
| Windows | `src-tauri/target/release/bundle/msi/*.msi`、`src-tauri/target/release/bundle/nsis/*-setup.exe` |
| Linux | `src-tauri/target/release/bundle/deb/*.deb`、`src-tauri/target/release/bundle/appimage/*.AppImage` |
| macOS | `src-tauri/target/release/bundle/dmg/*.dmg`、`src-tauri/target/release/bundle/macos/*.app` |

裸可执行文件在 `src-tauri/target/release/patchouli-helper`（Windows 为 `patchouli-helper.exe`）。

用 `--target <三元组>` 时中间会多一层目录：

```
src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/Patchouli Helper_0.1.0_x64.dmg
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Patchouli Helper_0.1.0_aarch64.dmg
```

`tauri.conf.json` 里 `bundle.targets = "all"`，所以平台上所有可用格式都会产出；只想出一个可以：

```bash
npm run tauri build -- --bundles nsis
npm run tauri build -- --bundles deb,appimage
npm run tauri build -- --bundles dmg
```

---

## Windows

Tauri v2 在 Windows 上需要 **MSVC 链接器**，官方路子是安装 Visual Studio 生成工具（MSVC + Windows SDK）：

1. 装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选「使用 C++ 的桌面开发」（含 MSVC v143 与 Windows 10/11 SDK）。
2. 装 [Rust](https://rustup.rs/)，默认工具链 `stable-x86_64-pc-windows-msvc`。
3. 装 [WebView2 运行时](https://developer.microsoft.com/microsoft-edge/webview2/)（Win10 1803+ / Win11 一般已自带）。
4. Node.js ≥ 18（仅用于跑 `@tauri-apps/cli`）。

```powershell
npm i
npm run tauri build
# → src-tauri/target/release/bundle/msi\Patchouli Helper_0.1.0_x64_en-US.msi
# → src-tauri/target/release/bundle/nsis\Patchouli Helper_0.1.0_x64-setup.exe
```

`tauri.conf.json` 的 NSIS 已设 `"installMode": "currentUser"`（免管理员、装进用户目录）。

### 本机实测的替代方案：MinGW-w64 + GNU 工具链

本机没有 Windows SDK / MSVC，走不通 MSVC 路线，实测可用的是 **Rust GNU 工具链 + 独立 MinGW 链接器**：

```powershell
# 1) 装 GNU 工具链（本机已装好，rustc 1.100.0 / cargo 1.100.0）
rustup toolchain install stable-x86_64-pc-windows-gnu

# 2) 装 MinGW-w64（WinLibs 便携版即可，解压后用里面的 bin 目录）
#    例：C:\tools\winlibs-x86_64-posix-seh-gcc-*\mingw64\bin

# 3) 指定链接器，让 cargo 用 MinGW 的 gcc
$env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = "C:\tools\winlibs\mingw64\bin\x86_64-w64-mingw32-gcc.exe"

# 4) 直接 cargo 构建（跳过 tauri CLI 的打包环节）
cd src-tauri
cargo build --release --target x86_64-pc-windows-gnu
# → src-tauri/target/x86_64-pc-windows-gnu/release/patchouli-helper.exe
```

要点与坑：

- **必须显式设 `CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER`**。不设的话 cargo 会去找默认的 `x86_64-w64-mingw32-gcc`，而 rustup 自带的 GNU 工具链**不含** MinGW binutils，会报 `linker not found`。
- 建议用**默认宿主工具链**（`rustup default stable-x86_64-pc-windows-gnu`）再 `cargo build --release`，这样 `target/release` 路径与 CLI 期待的路径一致，后续用 `tauri build` 也能复用缓存。
- 这条路线只产出**裸 exe**（`cargo build` 不做 bundling），不会生成 msi/nsis 安装包。要安装包还是得回到 MSVC 路线，或者在 Linux/macOS/CI 上出对应平台的包。
- 交叉编译产物不会自动带上 WebView2 检查，首次运行在缺 WebView2 的机器上可能直接退出（需实测）。
- 当前环境里 `~/.cargo/bin` 不在 `PATH` 上，请用绝对路径调用或在 PowerShell 里补：

  ```powershell
  $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
  cargo --version
  ```

### 图标

`tauri.conf.json` 的 `bundle.icon` 引用 `src-tauri/icons/{32x32.png,128x128.png,128x128@2x.png,icon.ico}`；仓库里这套图标已经生成好了（额外还有 `icon.png`、`icon.icns` 供 macOS 用）。需要换图标时：

```bash
python scripts/gen_icons.py            # 仓库自带的生成脚本（依赖 Pillow，输出 src-tauri/icons/）
# 或者用 Tauri CLI 从一张 1024×1024 的 PNG 生成整套：
npm run tauri icon path/to/1024.png
```

改动图标后记得重新 `tauri build`，否则安装包里还是旧图标（Windows 的 `.ico` 会编进 exe 资源）。

---

## Linux

Debian / Ubuntu（22.04 及以后，WebKitGTK **4.1**）：

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

```bash
npm i
npm run tauri build
# → src-tauri/target/release/bundle/deb/*.deb
# → src-tauri/target/release/bundle/appimage/*.AppImage
```

注：

- Ubuntu 20.04 / Debian 11 只有 WebKitGTK **4.0**，需要把上面的 `4.1-dev` 换成 `libwebkit2gtk-4.0-dev`；Tauri v2 默认要 4.1，用 4.0 时构建可能失败（需实测）。
- AppImage 打包需要 `linuxdeploy` 与 FUSE，CI 里若报 `failed to run linuxdeploy`，先用 `--bundles deb` 排除环境问题。
- Arch：`webkit2gtk-4.1`、`base-devel`、`libxdo`、`openssl`、`libayatana-appindicator`、`librsvg`。

---

## macOS

- 装 Xcode Command Line Tools：`xcode-select --install`
- Rust 默认 `stable-aarch64-apple-darwin`（Apple Silicon）或 `stable-x86_64-apple-darwin`（Intel）

```bash
npm i
npm run tauri build
# → src-tauri/target/release/bundle/dmg/*.dmg
```

### 通用二进制（universal）

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin
# → src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

如果不做签名/公证，用户首次打开会被 Gatekeeper 拦（`已损坏，无法打开` / `无法验证开发者`），可临时 `xattr -dr com.apple.quarantine <app>`。正式分发需要 Apple Developer 证书 + `APPLE_CERTIFICATE` / `APPLE_ID` / `APPLE_TEAM_ID` 等环境变量（Tauri 文档有签名矩阵）。

---

## CI：GitHub Actions

`.github/workflows/build.yml` 用矩阵跑 Windows / Ubuntu 22.04 / macOS（`universal-apple-darwin`，一个 runner 同时产出 arm64 + x86_64 的 dmg），触发条件是 push tag `v*` 或手动 `workflow_dispatch`，产物通过 `actions/upload-artifact` 上传，路径与上表一致。

- Linux 那一行会在跑之前装上面那串 apt 依赖。
- 想拆成两个 macOS 产物，把矩阵里的 macOS 行改成两行（`macos-14` + `aarch64-apple-darwin`、Intel runner + `x86_64-apple-darwin`），注意 Intel runner 标签会随 GitHub 退役。
- 没签名时 Windows 的 SmartScreen、macOS 的 Gatekeeper 都会拦；要正式分发请加签名 secrets，或改用注释里的 `tauri-apps/tauri-action` 一并做 Release 上传。

---

## 排错清单

| 症状 | 原因 / 处理 |
| --- | --- |
| `linker 'link.exe' not found` | Windows 缺 MSVC/SDK；按上面装 Build Tools，或改走 GNU + MinGW 路线 |
| `linker 'x86_64-w64-mingw32-gcc' not found` | 没设 `CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER`，或 MinGW 的 `bin` 不在 `PATH` |
| `error: failed to run custom build command for webkit2gtk-sys` | Linux 缺 `libwebkit2gtk-4.1-dev`（或版本是 4.0） |
| `icon path ... does not exist` | 缺 `src-tauri/icons/`，跑 `npm run tauri icon` |
| `npm ci` 报 lockfile 不存在 | 仓库没有 `package-lock.json`，改用 `npm install`（CI 已做兜底） |
| 窗口打开一片空白 | `frontendDist` 指向 `../web`，检查 `web/index.html` 与 `web/js/main.js` 是否都在 |
| 改前端没生效 | `web/` 是静态资源，改完在窗口里刷新（`Ctrl+R`）或重启 `tauri dev` |
| `tauri build` 慢得离谱 | `Cargo.toml` 的 release profile 开了 `lto = true` + `codegen-units = 1`，这是刻意的体积/性能取舍 |
