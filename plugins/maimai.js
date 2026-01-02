/**
 * 麦麦适配器插件
 * 允许ZyBot接入MaiMBot，实现双向消息通信
 */

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const toml = require('toml');

module.exports = {
    name: 'maimai',
    description: '麦麦适配器插件，允许ZyBot接入MaiMBot',
    version: '1.0.0',
    
    // 插件状态
    enabled: true,
    connected: false,
    ws: null,
    config: null,
    bot: null,
    pluginManager: null,
    reconnectTimeout: null,
    heartbeatInterval: null,
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     * @param {Object} logger - 日志管理器
     */
    activate(bot, pluginManager, logger) {
        this.bot = bot;
        this.pluginManager = pluginManager;
        this.logger = logger;
        
        // 加载配置
        this.loadConfig();
        
        // 注册命令
        this.registerCommands();
        
        // 启动连接
        if (this.enabled && this.config.enabled) {
            this.connect();
        }
        
        // 注册事件监听器
        this.registerEventListeners();
        
        this.logger.info('麦麦适配器插件已激活');
    },
    
    /**
     * 注册事件监听器
     * 使用onBotReady回调机制，确保在bot连接或重连时都能正确注册监听器
     */
    registerEventListeners() {
        // 使用onBotReady回调机制，确保在bot连接或重连时都能正确注册监听器
        this.bot.onBotReady(() => {
            this.setupEventListeners();
        });
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源
        this.disconnect();
        this.removeEventListeners();
        
        this.logger.info('麦麦适配器插件已停用');
    },
    
    /**
     * 加载配置文件
     */
    loadConfig() {
        const configPath = path.join(__dirname, 'maimai', 'maimai.toml');
        
        try {
            // 检查配置目录是否存在
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            // 检查配置文件是否存在，不存在则创建默认配置
            if (!fs.existsSync(configPath)) {
                this.createDefaultConfig(configPath);
            }
            
            // 读取配置文件
            const configContent = fs.readFileSync(configPath, 'utf8');
            const parsedConfig = toml.parse(configContent);
            
            // 处理配置，支持带maimai section和不带maimai section的情况
            this.config = parsedConfig.maimai || parsedConfig;
            this.enabled = this.config.enabled;
            
            this.logger.info('麦麦适配器配置加载成功');
        } catch (error) {
            this.logger.error('加载麦麦适配器配置失败:', { error: error.message });
            // 使用默认配置
            this.config = this.getDefaultConfig();
            this.enabled = this.config.enabled;
        }
    },
    
    /**
     * 创建默认配置文件
     * @param {string} configPath - 配置文件路径
     */
    createDefaultConfig(configPath) {
        const defaultConfig = `# 麦麦适配器配置

[maimai]
enabled = true
# MaiMBot连接信息
host = "localhost"
port = 8000
# 心跳间隔（毫秒）
heartbeat_interval = 30000
# 重连间隔（毫秒）
reconnect_interval = 5000
`;
        
        fs.writeFileSync(configPath, defaultConfig, 'utf8');
        this.logger.info(`已创建默认配置文件: ${configPath}`);
    },
    
    /**
     * 获取默认配置
     * @returns {Object} 默认配置对象
     */
    getDefaultConfig() {
        return {
            enabled: true,
            host: "localhost",
            port: 8000,
            heartbeat_interval: 30000,
            reconnect_interval: 5000
        };
    },
    
    /**
     * 生成UUID
     * @returns {string} UUID字符串
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * 注册命令
     */
    registerCommands() {
        // 注册maimai命令
        this.pluginManager.registerCommand('maimai', this.maimaiHandler.bind(this), {
            description: '麦麦适配器控制命令',
            usage: '.zybot maimai <status|connect|disconnect|reload>'
        }, this.name);
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 确保机器人实例已创建
        const currentBot = this.bot.bot;
        if (currentBot) {
            // 保存监听器引用，以便后续准确移除
            if (!this.chatListener) {
                this.chatListener = (username, message) => {
                    this.handleMinecraftChat(username, message);
                };
            }
            
            // 先移除已有的监听器，避免重复注册
            // 注意：这里要使用当前的bot实例，而不是固定的this.bot.bot
            currentBot.removeListener('chat', this.chatListener);
            // 只注册一个监听器到当前bot实例
            currentBot.on('chat', this.chatListener);
        }
    },
    
    /**
     * 移除事件监听器
     */
    removeEventListeners() {
        // 确保机器人实例已创建
        if (this.bot && this.bot.bot && this.chatListener) {
            // 只移除我们自己注册的监听器，不影响其他插件
            this.bot.bot.removeListener('chat', this.chatListener);
            this.chatListener = null;
        }
    },
    
    /**
     * 连接到MaiMBot
     */
    connect() {
        if (this.connected || this.ws) {
            this.logger.info('麦麦适配器已连接，无需重复连接');
            return;
        }
        
        try {
            const url = `ws://${this.config.host}:${this.config.port}/ws`;
            this.logger.info(`正在连接到MaiMBot: ${url}`);
            
            // Node.js ws库支持在options中设置headers
            // 使用正确的headers参数名称，符合ws库的API
            this.ws = new WebSocket(url, {
                headers: {
                    'platform': 'minecraft', // 使用简单的platform头，与MaiMBot服务器代码一致
                    'x-platform': 'minecraft', // 同时支持x-platform，与maim_message库一致
                    'x-uuid': this.generateUUID(),
                    'x-apikey': ''
                }
            });
            
            // 连接打开事件
            this.ws.on('open', () => {
                this.connected = true;
                this.logger.info('麦麦适配器连接成功');
                this.startHeartbeat();
            });
            
            // 消息接收事件
            this.ws.on('message', (data) => {
                this.handleMaiMBotMessage(data);
            });
            
            // 连接关闭事件
            this.ws.on('close', () => {
                this.handleDisconnect();
            });
            
            // 连接错误事件
            this.ws.on('error', (error) => {
                this.logger.error('麦麦适配器连接错误:', { error: error.message || error });
                this.handleDisconnect();
            });
            
        } catch (error) {
            this.logger.error('麦麦适配器连接失败:', { error: error.message });
            this.handleDisconnect();
        }
    },
    
    /**
     * 断开与MaiMBot的连接
     */
    disconnect() {
        if (this.connected || this.ws) {
            // 停止心跳
            this.stopHeartbeat();
            
            // 清除重连定时器
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            
            // 关闭WebSocket连接
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            
            this.connected = false;
            this.logger.info('麦麦适配器已断开连接');
        }
    },
    
    /**
     * 处理连接断开
     */
    handleDisconnect() {
        this.connected = false;
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws = null;
        }
        
        this.logger.info('麦麦适配器连接已断开');
        
        // 尝试重连
        if (this.enabled && this.config.enabled) {
            this.scheduleReconnect();
        }
    },
    
    /**
     * 安排重连
     */
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        const reconnectInterval = this.config.reconnect_interval || 5000;
        this.logger.info(`将在 ${reconnectInterval}ms 后尝试重连...`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, reconnectInterval);
    },
    
    /**
     * 启动心跳
     * 注意：MaiMBot不需要我们发送心跳，禁用此功能
     */
    startHeartbeat() {
        // 禁用心跳，MaiMBot会自动处理连接状态
        return;
    },
    
    /**
     * 停止心跳
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },
    
    /**
     * 发送心跳包
     * 注意：MaiMBot不需要我们发送心跳，它会自己处理连接状态
     * 禁用主动心跳，避免发送不符合格式的消息
     */
    sendHeartbeat() {
        // 禁用主动心跳，避免发送不符合MaiMBot格式的消息
        // MaiMBot会自动处理连接状态
        return;
    },
    
    /**
     * 发送消息到MaiMBot
     * @param {Object} message - 消息对象
     */
    sendToMaiMBot(message) {
        if (this.connected && this.ws) {
            try {
                this.ws.send(JSON.stringify(message));
                return true;
            } catch (error) {
                this.logger.error('发送消息到MaiMBot失败:', { error: error.message });
                this.handleDisconnect();
                return false;
            }
        }
        return false;
    },
    
    /**
     * 处理Minecraft聊天消息
     * @param {string} username - 玩家用户名
     * @param {string} message - 聊天消息
     */
    handleMinecraftChat(username, message) {
        // 过滤机器人自身消息
        if (username === this.bot.config.username) {
            return;
        }
        
        // 过滤命令消息，不发送到MaiMBot
        // 命令格式：.zybot <command> [args]
        if (message.startsWith('.zybot ')) {
            return;
        }
        
        // 构建符合MaiBot要求的消息格式（群聊模式）
        const msgObj = {
            message_info: {
                platform: 'minecraft',
                message_id: Date.now(),
                time: Date.now() / 1000, // MaiBot期望的是float类型的时间戳
                user_info: {
                    platform: 'minecraft',
                    user_id: username,
                    user_nickname: username,
                    user_cardname: username
                },
                group_info: {
                    platform: 'minecraft',
                    group_id: 'minecraft_chat', // 固定的群聊ID
                    group_name: 'Minecraft' // 群聊名称
                },
                template_info: null,
                format_info: {
                    content_format: ['text'],
                    accept_format: ['text']
                },
                additional_config: {}
            },
            message_segment: {
                type: 'seglist',
                data: [
                    {
                        type: 'text',
                        data: message
                    }
                ]
            },
            raw_message: message
        };
        
        // 发送到MaiMBot
        this.sendToMaiMBot(msgObj);
    },
    
    /**
     * 处理MaiMBot消息
     * @param {Buffer|string} data - 接收到的数据
     */
    handleMaiMBotMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            // 处理不同类型的消息
            switch (message.type) {
                case 'pong':
                    // 心跳响应，忽略
                    break;
                case 'message':
                    // 转发到Minecraft聊天
                    this.sendToMinecraft(message);
                    break;
                default:
                    // 检查是否是MaiBot标准格式的消息
                    if (message.message_segment && message.message_info) {
                        this.handleMaiBotStandardMessage(message);
                    } else {
                        this.logger.info('未知消息类型:', { type: message.type });
                    }
                    break;
            }
        } catch (error) {
            this.logger.error('解析MaiMBot消息失败:', { error: error.message });
        }
    },
    
    /**
     * 处理MaiBot标准格式消息
     * @param {Object} message - MaiBot标准格式消息
     */
    handleMaiBotStandardMessage(message) {
        try {
            // 解析消息段
            const messageSegment = message.message_segment;
            const messageInfo = message.message_info;
            
            // 构建发送到Minecraft的消息
            let content = '';
            
            // 处理不同类型的消息段
            if (messageSegment.type === 'seglist') {
                // 处理消息段列表
                for (const seg of messageSegment.data) {
                    if (seg.type === 'text') {
                        content += seg.data;
                    } else if (seg.type === 'image') {
                        content += '[图片]';
                    } else if (seg.type === 'emoji') {
                        content += '[表情]';
                    } else if (seg.type === 'voice') {
                        content += '[语音]';
                    } else {
                        content += `[${seg.type}]`;
                    }
                }
            } else if (messageSegment.type === 'text') {
                // 直接文本消息
                content = messageSegment.data;
            }
            
            // 构建来源信息
            let source = '麦麦';
            if (messageInfo.platform) {
                source = messageInfo.platform;
            }
            
            // 构建用户名
            let username = '未知用户';
            if (messageInfo.user_info && messageInfo.user_info.user_nickname) {
                username = messageInfo.user_info.user_nickname;
            }
            
            // 发送到Minecraft
            this.bot.chat(`${content}`);
        } catch (error) {
            this.logger.error('处理MaiBot标准消息失败:', { error: error.message });
        }
    },
    
    /**
     * 发送消息到Minecraft
     * @param {Object} message - 消息对象
     */
    sendToMinecraft(message) {
        // 构建聊天消息格式
        let chatMessage = '';
        
        if (message.source === 'qq') {
            chatMessage = `[QQ] ${message.username}: ${message.content}`;
        } else if (message.source === 'wechat') {
            chatMessage = `[微信] ${message.username}: ${message.content}`;
        } else {
            chatMessage = `[麦麦] ${message.username}: ${message.content}`;
        }
        
        // 发送到Minecraft
        this.bot.chat(chatMessage);
    },
    
    /**
     * 注册命令处理函数
     */
    registerCommands() {
        this.pluginManager.registerCommand('maimai', this.maimaiHandler.bind(this), {
            description: '麦麦适配器控制命令',
            usage: '.zybot maimai <status|connect|disconnect|reload>'
        }, this.name);
    },
    
    /**
     * 麦麦命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async maimaiHandler(username, args, bot) {
        if (args.length === 0) {
            bot.chat('麦麦适配器命令用法: .zybot maimai <status|connect|disconnect|reload>');
            return;
        }
        
        const subCommand = args[0].toLowerCase();
        
        switch (subCommand) {
            case 'status':
                this.showStatus(bot);
                break;
            case 'connect':
                this.manualConnect(bot);
                break;
            case 'disconnect':
                this.manualDisconnect(bot);
                break;
            case 'reload':
                this.reloadConfig(bot);
                break;
            default:
                bot.chat(`未知命令: ${subCommand}，可用命令: status, connect, disconnect, reload`);
                break;
        }
    },
    
    /**
     * 显示连接状态
     * @param {Object} bot - 机器人实例
     */
    showStatus(bot) {
        const status = this.connected ? '已连接' : '未连接';
        const enabled = this.enabled ? '已启用' : '已禁用';
        
        bot.chat(`麦麦适配器状态: ${status}，功能: ${enabled}`);
        bot.chat(`连接地址: ${this.config.host}:${this.config.port}`);
    },
    
    /**
     * 手动连接
     * @param {Object} bot - 机器人实例
     */
    manualConnect(bot) {
        if (this.connected) {
            bot.chat('麦麦适配器已连接，无需重复连接');
            return;
        }
        
        this.connect();
        bot.chat('正在连接到MaiMBot...');
    },
    
    /**
     * 手动断开连接
     * @param {Object} bot - 机器人实例
     */
    manualDisconnect(bot) {
        if (!this.connected) {
            bot.chat('麦麦适配器未连接，无需断开');
            return;
        }
        
        this.disconnect();
        bot.chat('已断开与MaiMBot的连接');
    },
    
    /**
     * 重新加载配置
     * @param {Object} bot - 机器人实例
     */
    reloadConfig(bot) {
        this.loadConfig();
        bot.chat('麦麦适配器配置已重新加载');
    }
};
