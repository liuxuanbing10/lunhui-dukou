# 分发前的签名与杀毒应对（ANTIVIRUS / CODE SIGNING）

> 《轮回渡口》桌面版（Windows 自包含包）发布前的代码签名与杀毒软件应对说明。
> 生成日期：2026-08-21（Phase 4 收尾）。

## 1. 为什么会被拦截

- 未签名的 `.exe` 会被 Windows SmartScreen（"来自未知发布者"）与部分杀软（启发式）拦截/给警告。
- 我们导出的 `LunhuiDukou.exe` 是自包含 .NET + 内嵌 pck，体积较大，更易被误报为压缩壳/可疑。

## 2. 已做的应对（本次）

1. **代码签名（自签名证书）**：工程已签，证书主题 `CN=Lunhui Dukou, ...`，指纹 `2A6A17E2AD96FFAA45FF9A7A846FE8C2356809BD`（存于当前用户证书库 `Cert:\CurrentUser\My`）。
   ```bash
   signtool sign /fd SHA256 /sha1 <指纹> app/build/LunhuiDukou.exe
   ```
2. **可复用签名脚本**：`app/scripts/distribute/sign.ps1`（自动建证书/签名/校验），每次发布跑一次。
3. **校验结果确认**：`signtool verify /pa` 通过（签名结构有效），但因**自签名证书不受系统根信任**，SmartScreen 仍会提示"发布者未知"——这是自签名的固有限制。

> ⚠️ 自签名**不能**彻底消除 SmartScreen/杀软告警。要获得系统级信任需 **OV/EV 代码签名证书**（向商业 CA 购买，或发布到 Microsoft Store）。自签名/免费方案只适合内部分发与开发验证。

## 3. 若被 Defender/杀软拦截时

- **Windows Defender 排除**（需管理员 PowerShell）：
  ```powershell
  Add-MpPreference -ExclusionPath 'D:\Projects\lunhui-dukou\app\build'
  ```
- **手动扫描验证**（需管理员）：
  ```powershell
  Start-MpScan -ScanType QuickScan -ScanPath 'D:\Projects\lunhui-dukou\app\build'
  # 或手动到 设置→Windows 安全中心→病毒和威胁防护→扫描选项→自定义 里选 build 目录
  ```
- **云端交叉验证**：把 `LunhuiDukou.exe` 上传 VirusTotal（多引擎参考），确认无主流引擎误报。若误报，可向对应厂商提交"误报申诉"。
- 本机调试态：此前在内存水位紧张、Defender 关闭的环境开发；正式发布前应在**开着实时保护**的干净环境重扫一次。

## 4. 常规发布动作（每次出新包）

```powershell
# 1) 干净重导出（排除开发插件 addons/*，见 export_presets.cfg）
mkdir app\build
godot --headless --path app --export-release "Windows 桌面" build/LunhuiDukou.exe

# 2) 签名
powershell -ExecutionPolicy Bypass -File app/scripts/distribute/sign.ps1

# 3) 校验
signtool verify /pa app/build/LunhuiDukou.exe

# 4) 扫描（管理员）并交界面测试
```

## 5. 建议（正式对外发布）

- 购买 **OV 代码签名证书**（≈数百元/年）或采用 Microsoft Store 分发，彻底摆脱 SmartScreen 警告；
- 签名后对 `data_*` 目录同样检查；整包 zip 交付时防篡改。