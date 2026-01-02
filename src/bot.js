/**
 * 机器人核心类
 * 负责Minecraft服务器连接、事件处理和基本状态管理
 */
const mineflayer = require('mineflayer');
const fs = require('fs');
const toml = require('toml');
const path = require('path');
const logger = require('./logger');

class MinecraftBot {
    constructor() {
        this.bot = null;
        this.config = this.loadConfig();
        this.status = 'stopped'; // stopped, starting, running, error
        this.errorMessage = '';
        this.startTime = null;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 60000;
        this.reconnectTimeout = null;
        
        // 状态信息
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.world = '';
        this.lastPositionBroadcast = null;
        
        // 锁定状态
        this.lock = false;
        this.lockReason = '';
        this.lockedBy = '';
        this.unlockConfirm = new Map();
        
        // 当前操作的玩家
        this.currentPlayers = new Map();
        
        // 监听器注册回调列表
        // 用于在bot重连时重新注册所有监听器
        this.listenerCallbacks = [];
    }

    /**
     * 从配置文件加载配置
     * @returns {Object} 配置对象
     */
    loadConfig() {
        try {
            // 加载JSON配置
            const jsonConfigPath = path.join(__dirname, '../config/config.json');
            const jsonConfig = fs.readFileSync(jsonConfigPath, 'utf8');
            const config = JSON.parse(jsonConfig);
            
            // 加载TOML配置
            const tomlConfigPath = path.join(__dirname, '../config/config.toml');
            const tomlConfig = toml.parse(fs.readFileSync(tomlConfigPath, 'utf8'));
            
            // 合并配置，TOML配置优先级更高
            return { ...config, ...tomlConfig };
        } catch (error) {
            logger.warn('无法加载配置文件，使用默认配置:', { error: error.message });
            return {
                host: 'localhost',
                port: 25565,
                username: 'Fumumi_39',
                version: '1.21.8',
                auth: 'microsoft',
                main: {
                    bot_id: 'zy',
                    map_type: 'BlueMap',
                    map_url: 'https://map.example.com',
                    owner: 'zhiyuHD'
                }
            };
        }
    }

    /**
     * 启动机器人并连接到服务器
     */
    start() {
        // 重新读取配置文件
        this.config = this.loadConfig();
        logger.info('正在启动Minecraft机器人...');
        logger.info(`服务器: ${this.config.host}:${this.config.port}`);
        logger.info(`用户名: ${this.config.username}`);
        logger.info(`验证方式: ${this.config.auth}`);
        
        this.status = 'starting';
        this.errorMessage = '';
        
        this.bot = mineflayer.createBot({
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            version: this.config.version,
            auth: this.config.auth
        });
        
        // 只有在首次启动时重置锁定状态和启动时间
        if (this.reconnectAttempts === 0) {
            this.lock = false;
            this.lockReason = '';
            this.lockedBy = '';
            this.unlockConfirm.clear();
            this.startTime = new Date().toLocaleString();
            logger.info(`机器人启动时间: ${this.startTime}`);
        }
        
        this.setupEventListeners();
    }

    /**
     * 注册监听器回调
     * 当bot连接或重连时，所有注册的回调都会被调用，用于重新注册事件监听器
     * @param {Function} callback - 监听器注册回调函数
     */
    onBotReady(callback) {
        if (typeof callback === 'function') {
            // 检查回调是否已经存在，避免重复注册
            const callbackExists = this.listenerCallbacks.some(existingCallback => existingCallback === callback);
            if (!callbackExists) {
                this.listenerCallbacks.push(callback);
                
                // 如果bot已经准备就绪，立即调用回调
                if (this.bot && this.status === 'running') {
                    callback(this.bot);
                }
            }
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 连接成功事件
        this.bot.on('spawn', () => {
            logger.info('机器人已成功连接到服务器！');
            this.status = 'running';
            this.errorMessage = '';
            
            // 连接成功，重置重连次数
            if (this.reconnectAttempts > 0) {
                logger.info(`重连成功，已重置重连次数（共尝试${this.reconnectAttempts}次）`);
                this.reconnectAttempts = 0;
            }
            
            // 调用所有监听器注册回调，让外部组件重新注册事件监听器
            this.listenerCallbacks.forEach(callback => {
                try {
                    callback(this.bot);
                } catch (error) {
                    console.error('调用监听器回调失败:', error.message);
                }
            });
        });

        // 位置更新事件
        this.bot.on('move', () => {
            if (this.bot.entity) {
                this.currentPosition = {
                    x: Math.round(this.bot.entity.position.x * 100) / 100,
                    y: Math.round(this.bot.entity.position.y * 100) / 100,
                    z: Math.round(this.bot.entity.position.z * 100) / 100
                };
                this.world = this.bot.world ? this.bot.world.name : '';
            }
        });

        // 错误事件
        this.bot.on('error', (err) => {
            logger.error('机器人错误:', { error: err.message });
            this.status = 'error';
            this.errorMessage = err.message;
        });

        // 断开连接事件
        this.bot.on('end', () => {
            logger.info('机器人已断开连接');
            this.status = 'stopped';
            
            // 启动重连
            this.reconnectAttempts++;
            logger.info(`将在${this.reconnectInterval/1000}秒后尝试第${this.reconnectAttempts}次重连...`);
            
            // 清除可能存在的旧定时器
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            
            // 设置重连定时器
            this.reconnectTimeout = setTimeout(() => {
                logger.info(`开始第${this.reconnectAttempts}次重连...`);
                this.start();
            }, this.reconnectInterval);
        });
    }

    /**
     * 获取机器人当前状态
     * @returns {Object} 机器人状态对象
     */
    getStatus() {
        return {
            status: this.status,
            startTime: this.startTime,
            uptime: this.startTime ? (new Date() - new Date(this.startTime)) / 1000 : 0,
            server: `${this.config.host}:${this.config.port}`,
            username: this.config.username,
            lock: this.lock,
            lockReason: this.lockReason,
            lockedBy: this.lockedBy,
            currentPosition: this.currentPosition,
            world: this.world,
            errorMessage: this.errorMessage,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * 停止机器人
     */
    stop() {
        if (this.bot) {
            this.bot.chat('&#084cfbZ&#1458fby&#2064fbB&#2b70fbo&#377cfct&#4388fc正&#4f94fc在&#5ba0fc退&#66abfc出&#72b7fc游&#7ec3fc戏&#8acffd，&#95dbfd请&#a1e7fd稍&#adf3fd后')
            this.bot.quit();
            logger.info('机器人已停止');
        }
        
        this.status = 'stopped';
        
        // 清除重连定时器
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
    }

    /**
     * 发送聊天消息
     * @param {string} message - 要发送的消息
     */
    chat(message) {
        if (this.bot && this.status === 'running') {
            this.bot.chat(message);
        }
    }

    /**
     * 检查玩家是否有操作权限
     * @param {string} username - 玩家用户名
     * @returns {boolean} 是否有操作权限
     */
    hasPermission(username) {
        return this.currentPlayers.has(username) || username === this.config.main.owner;
    }

    /**
     * 检查玩家是否是超级管理员
     * @param {string} username - 玩家用户名
     * @returns {boolean} 是否是超级管理员
     */
    isOwner(username) {
        return username === this.config.main.owner;
    }
}

module.exports = MinecraftBot;