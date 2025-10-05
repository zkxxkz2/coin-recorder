// GitHub配置 - 安全的跨设备登录系统
// 注意：此文件会被推送到GitHub，切勿包含真实令牌！
window.GITHUB_CONFIG = {
    // GitHub用户名（公开信息）
    GITHUB_USERNAME: 'zkxxkz2',

    // GitHub令牌（生产环境设为null）
    // 用户需要通过其他方式获取令牌，如环境变量或安全配置
    GITHUB_TOKEN: null,

    // 数据仓库名称（公开信息）
    REPO_NAME: 'coin-recorder-data'
};

// 安全提醒：
// 此文件会被推送到GitHub仓库，请勿包含敏感信息！
// GitHub令牌应通过其他安全方式提供给应用
//
// 配置说明：
// 1. 复制一份此文件为 github-config.local.js（不推送到Git）
// 2. 在本地文件中填入真实的GitHub令牌
// 3. 应用会优先使用本地配置文件中的令牌
