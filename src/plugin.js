/**
 * 插件系统核心类
 * 负责插件加载、管理、命令注册和事件分发
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class PluginManager {
    constructor(permissionManager = null) {
        this.plugins = new Map(); // 已加载的插件
        this.commands = new Map(); // 已注册的命令
        this.events = new Map(); // 事件监听器
        this.permissionManager = permissionManager; // 权限管理器
    }

    /**
     * 加载指定目录下的所有插件
     * @param {string} pluginsDir - 插件目录路径
     * @param {Object} bot - 机器人实例
     */
    loadPlugins(pluginsDir, bot) {
        try {
            // 转换为绝对路径
            const absolutePluginsDir = path.isAbsolute(pluginsDir) 
                ? pluginsDir 
                : path.join(process.cwd(), pluginsDir);
                
            const files = fs.readdirSync(absolutePluginsDir);
            
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    const pluginPath = path.join(absolutePluginsDir, file);
                    try {
                        // 使用完整绝对路径加载插件
                        const plugin = require(pluginPath);
                        this.loadPlugin(plugin, bot);
                    } catch (error) {
                        logger.error(`加载插件 ${file} 失败:`, { error: error.message });
                    }
                }
            });
        } catch (error) {
            logger.error('加载插件目录失败:', { error: error.message });
        }
    }

    /**
     * 加载单个插件
     * @param {Object} plugin - 插件对象
     * @param {Object} bot - 机器人实例
     */
    loadPlugin(plugin, bot) {
        if (!plugin.name) {
            logger.error('插件缺少名称，加载失败');
            return;
        }

        if (this.plugins.has(plugin.name)) {
            logger.warn(`插件 ${plugin.name} 已存在，跳过加载`);
            return;
        }

        try {
            // 创建插件实例的副本，防止修改原始对象
            const pluginInstance = { ...plugin };
            
            // 激活插件
            if (typeof pluginInstance.activate === 'function') {
                // 传递权限管理器的只读代理
                const permissionManagerProxy = new Proxy(this.permissionManager, {
                    set: () => {
                        throw new Error('插件无权直接修改权限管理器状态');
                    },
                    deleteProperty: () => {
                        throw new Error('插件无权直接修改权限管理器状态');
                    }
                });
                
                // 传递完整的pluginManager实例
                pluginInstance.activate(bot, this, permissionManagerProxy, logger);
            }
            
            this.plugins.set(pluginInstance.name, pluginInstance);
            logger.info(`插件 ${pluginInstance.name} 加载成功`);
        } catch (error) {
            logger.error(`激活插件 ${plugin.name} 失败:`, { error: error.message });
        }
    }

    /**
     * 卸载插件
     * @param {string} pluginName - 插件名称
     */
    unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            logger.warn(`插件 ${pluginName} 不存在`);
            return;
        }

        try {
            // 停用插件
            if (typeof plugin.deactivate === 'function') {
                plugin.deactivate();
            }
            
            // 移除该插件注册的所有命令
            for (const [commandName, command] of this.commands.entries()) {
                if (command.plugin === pluginName) {
                    this.commands.delete(commandName);
                }
            }
            
            this.plugins.delete(pluginName);
            logger.info(`插件 ${pluginName} 卸载成功`);
        } catch (error) {
            logger.error(`卸载插件 ${pluginName} 失败:`, { error: error.message });
        }
    }

    /**
     * 注册命令
     * @param {string} commandName - 命令名称
     * @param {Function} handler - 命令处理函数
     * @param {Object} options - 命令选项
     * @param {string} pluginName - 插件名称
     * @param {string} permissionGroup - 所需权限组（可选）
     */
    registerCommand(commandName, handler, options = {}, pluginName, permissionGroup = null) {
        if (this.commands.has(commandName)) {
            console.warn(`命令 ${commandName} 已存在，将被覆盖`);
        }

        this.commands.set(commandName, {
            handler,
            options,
            plugin: pluginName,
            permissionGroup: permissionGroup || options.permissionGroup || null
        });

        // 如果提供了权限组，注册到权限管理器
        if (this.permissionManager && (permissionGroup || options.permissionGroup)) {
            this.permissionManager.registerCommandPermission(
                commandName, 
                permissionGroup || options.permissionGroup
            );
        }
    }

    /**
     * 执行命令
     * @param {string} commandName - 命令名称
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     * @returns {Promise<boolean>} - 命令是否执行成功
     */
    async executeCommand(commandName, username, args, bot) {
        const command = this.commands.get(commandName);
        if (!command) {
            return false;
        }

        // 检查权限
        if (this.permissionManager && command.permissionGroup) {
            const hasPermission = await this.permissionManager.checkCommandPermission(username, commandName);
            if (!hasPermission) {
                bot.chat(`你没有权限执行命令: ${commandName}`);
                return false;
            }
        }

        try {
            await command.handler(username, args, bot);
            return true;
        } catch (error) {
            logger.error(`执行命令 ${commandName} 失败:`, { error: error.message });
            return false;
        }
    }

    /**
     * 注册自定义权限
     * @param {string} pluginName - 插件名称
     * @param {string} permissionName - 权限名称
     * @param {string} permissionGroup - 所需权限组
     */
    registerCustomPermission(pluginName, permissionName, permissionGroup) {
        if (this.permissionManager) {
            this.permissionManager.registerCustomPermission(pluginName, permissionName, permissionGroup);
        }
    }

    /**
     * 获取所有已注册命令
     * @returns {Map} - 已注册的命令
     */
    getCommands() {
        return this.commands;
    }

    /**
     * 监听事件
     * @param {string} eventName - 事件名称
     * @param {Function} listener - 事件监听器
     */
    on(eventName, listener) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(listener);
    }

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     */
    emit(eventName, ...args) {
        if (this.events.has(eventName)) {
            this.events.get(eventName).forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`执行事件 ${eventName} 监听器失败:`, error.message);
                }
            });
        }
    }
}

module.exports = PluginManager;