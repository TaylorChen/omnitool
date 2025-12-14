# OmniTool 浏览器扩展

<p align="center">
  <img src="assets/icons/icon128.svg" alt="OmniTool Logo" width="128" height="128">
</p>

<p align="center">
  <strong>一个强大的浏览器安全工具扩展</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#安装方法">安装方法</a> •
  <a href="#使用指南">使用指南</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

---

## 功能特性

### 🔐 密码生成器 (Password Generator)

- **安全随机生成** - 使用 Web Crypto API (`crypto.getRandomValues()`) 生成密码学安全的随机密码
- **可自定义长度** - 支持 4-64 字符的密码长度调节
- **字符类型选择** - 大写字母、小写字母、数字、特殊符号，任意组合
- **实时强度评估** - 弱/中/强三级密码强度可视化指示
- **一键复制** - 快速复制到剪贴板，带成功提示
- **偏好记忆** - 自动保存用户的密码生成偏好设置

### 🔑 双因素认证器 (2FA Authenticator)

- **TOTP 标准支持** - 完整实现 RFC 6238 TOTP 算法，兼容 Google Authenticator
- **账户管理** - 添加、查看、删除 2FA 账户
- **二维码识别** - 支持上传二维码图片识别 `otpauth://` 链接
- **可视化倒计时** - 30 秒刷新周期，圆形进度条动画显示
- **一键复制** - 点击验证码快速复制
- **搜索过滤** - 快速查找已添加的账户
- **数据备份** - 支持导出数据到剪贴板 / 导入 JSON 备份文件

### ⚙️ 设置功能

- **数据管理** - 导出/导入账户数据
- **本地存储** - 所有数据仅存储在本地，不上传到任何服务器

---

## 安装方法

### 开发者模式安装

1. 下载或克隆此仓库：
   ```bash
   git clone https://github.com/TaylorChen/omnitool.git
   ```

2. 打开 Chrome 浏览器，进入扩展管理页面：
   ```
   chrome://extensions/
   ```

3. 开启右上角的 **「开发者模式」**

4. 点击 **「加载已解压的扩展程序」**，选择 `omnitool` 文件夹

5. 扩展图标应出现在浏览器工具栏中

### Chrome 网上应用店

即将上架！

---

## 使用指南

### 密码生成器

1. 点击扩展图标打开弹窗
2. 默认显示密码生成器标签页
3. 使用滑块调整密码长度
4. 勾选/取消勾选字符类型
5. 点击刷新按钮生成新密码
6. 点击「复制密码」按钮复制到剪贴板

### 2FA 认证器

1. 点击「认证器」标签页切换
2. 点击右下角的 **+** 按钮添加账户
3. 选择添加方式：
   - **手动输入** - 填写服务名、账户名和密钥
   - **图片识别** - 上传包含 QR 码的图片
4. 验证码每 30 秒自动刷新
5. 点击验证码可快速复制

### 数据备份

1. 进入「设置」标签页
2. 点击「复制数据到剪贴板」
3. 打开文本编辑器粘贴内容
4. 保存为 `.json` 文件

---

## 技术架构

### 技术栈

| 组件 | 技术 |
|------|------|
| 扩展标准 | Chrome Extension Manifest V3 |
| 前端 | Vanilla JavaScript + HTML + CSS |
| 存储 | Chrome Storage API |
| 加密 | Web Crypto API |
| TOTP | RFC 6238 / HMAC-SHA1 |
| QR 识别 | jsQR 库 |

### 项目结构

```
omnitool/
├── manifest.json              # 扩展配置
├── popup/
│   ├── popup.html            # 主界面
│   ├── popup.css             # 样式
│   └── popup.js              # 主控制器
├── background/
│   └── service-worker.js     # 后台服务
├── modules/
│   ├── password-generator.js # 密码生成模块
│   ├── totp.js               # TOTP 算法模块
│   ├── storage.js            # 存储管理模块
│   ├── qr-scanner.js         # QR 码扫描模块
│   └── jsqr.min.js           # QR 码识别库
├── assets/
│   └── icons/                # 扩展图标
├── LICENSE                   # 开源协议
└── README.md                 # 项目说明
```

### 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 存储账户数据和用户偏好设置 |
| `clipboardWrite` | 复制密码和验证码到剪贴板 |
| `alarms` | 后台定时任务 |
| `downloads` | 数据导出功能 |

---

## 安全说明

- ✅ 所有密码生成使用 `crypto.getRandomValues()` 密码学安全随机数
- ✅ TOTP 密钥仅存储在本地 Chrome Storage 中
- ✅ 无任何数据上传到外部服务器
- ✅ 所有计算均在本地完成
- ⚠️ TOTP 密钥目前未加密存储（规划中）

---

## 浏览器支持

| 浏览器 | 支持状态 |
|--------|----------|
| Chrome | ✅ 88+ |
| Edge   | ✅ 88+ (基于 Chromium) |
| Firefox | 🔄 计划中 |
| Safari  | 🔄 计划中 |

---

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 开发建议

- 遵循现有代码风格
- 添加必要的注释
- 确保功能测试通过
- 更新相关文档

---

## 开源协议

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

## 致谢

- [jsQR](https://github.com/cozmo/jsQR) - QR 码识别库
- [RFC 6238](https://tools.ietf.org/html/rfc6238) - TOTP 标准
- 所有贡献者

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/TaylorChen">OmniTool Team</a>
</p>
