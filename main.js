/**
 * ZyBot主入口文件
 * 基本框架，负责连接核心组件、加载插件和启动服务
 */

// 导入核心模块
const MinecraftBot = require('./src/bot');
const WebServer = require('./src/web');
const PluginManager = require('./src/plugin');
const CommandHandler = require('./src/commands');
const logger = require('./src/logger');

/**
 * 主应用类
 * 负责整合所有核心组件
 */
class ZyBot {
    constructor() {
        this.bot = null;
        this.webServer = null;
        this.pluginManager = null;
        this.commandHandler = null;
    }

    /**
     * 初始化应用
     */
    async initialize() {
        logger.info('正在初始化ZyBot...');
        
        // 创建机器人实例
        this.bot = new MinecraftBot();
        
        // 启动Web服务器
        this.webServer = new WebServer();
        this.webServer.start(this.bot);
        
        // 初始化权限管理器（单例）
        const PermissionManager = require('./src/permission');
        if (!global.ZyBotPermissionManager) {
            global.ZyBotPermissionManager = new PermissionManager();
        }
        this.permissionManager = global.ZyBotPermissionManager;
        
        // 初始化插件管理器并传递权限管理器
        this.pluginManager = new PluginManager(this.permissionManager);
        
        // 加载插件
        this.pluginManager.loadPlugins('./plugins', this.bot);
        
        // 初始化命令处理器并传递插件管理器
        this.commandHandler = new CommandHandler(this.pluginManager);
        
        // 注册命令监听器
        this.commandHandler.registerCommandListener(this.bot);
        
        // 启动机器人
        this.bot.start();
        
        // 设置定期状态广播
        this.setupStatusBroadcast();
        
        logger.info('ZyBot初始化完成！');
    }

    /**
     * 设置定期状态广播
     */
    setupStatusBroadcast() {
        // 每2秒广播一次状态
        setInterval(() => {
            if (this.webServer) {
                this.webServer.broadcastStatus();
            }
        }, 2000);
    }

    /**
     * 停止应用
     */
    stop() {
        logger.info('正在停止ZyBot...');
        
        // 停止机器人
        if (this.bot) {
            this.bot.stop();
        }
        
        // 关闭Web服务器
        if (this.webServer) {
            this.webServer.close();
        }
        
        logger.info('ZyBot已停止！');
    }
}

// 创建应用实例
const app = new ZyBot();

// 初始化并启动应用
app.initialize().catch(error => {
    logger.error('初始化失败:', { error: error.message });
    process.exit(1);
});

// 处理退出信号
process.on('SIGINT', () => {
    app.stop();
    process.exit();
});

// 导出应用实例（供其他模块使用）
module.exports = app;