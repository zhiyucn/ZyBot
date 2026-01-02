/**
 * 命令处理系统
 * 负责命令解析、权限验证和插件调用
 */

const logger = require('./logger');

class CommandHandler {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
    }

    /**
     * 处理玩家发送的命令
     * @param {string} username - 发送命令的玩家用户名
     * @param {string} message - 玩家发送的消息内容
     * @param {Object} bot - 机器人实例
     */
    async handleCommand(username, message, bot) {
        // 检查消息是否以.zybot开头
        if (!message.startsWith('.zybot ')) {
            return;
        }
        
        // 提取命令部分（移除.zybot前缀）
        const commandStr = message.slice(7).trim();
        
        // 解析命令和参数
        const args = commandStr.split(' ');
        const cmd = args[0].toLowerCase();
        const commandArgs = args.slice(1);

        // 执行命令
        const success = await this.pluginManager.executeCommand(cmd, username, commandArgs, bot);
        
        // 如果命令执行失败，发送错误消息
        if (!success) {
            bot.chat(`&#fb0808指&#fb3145令&#fc5b83错&#fc84c0误&#fcadfd！`);
        }
    }

    /**
     * 注册命令处理监听器
     * @param {Object} bot - 机器人实例
     */
    registerCommandListener(bot) {
        // 保存监听器引用，以便后续准确移除
        if (!this.chatListener) {
            this.chatListener = async (username, message) => {
                // 从当前上下文中获取正确的bot实例
                const currentBotInstance = bot.bot;
                if (username === currentBotInstance.username) return;
                
                logger.info(`[${username}] ${message}`);
                
                // 处理命令
                await this.handleCommand(username, message, bot);
            };
        }
        
        if (!this.messagestrListener) {
            this.messagestrListener = (message) => {
                logger.debug(message);
                if (message.includes('请求传送到你的位置')) {
                    bot.chat("等我一下！");
                    bot.chat("/tpaccept");
                }
            };
        }
        
        // 使用onBotReady回调机制，确保在bot连接或重连时都能正确注册监听器
        bot.onBotReady((currentBot) => {
            // 先移除已有的监听器，避免重复注册
            currentBot.removeListener('chat', this.chatListener);
            currentBot.removeListener('messagestr', this.messagestrListener);
            
            // 监听聊天消息事件
            currentBot.on('chat', this.chatListener);

            // 监听系统消息事件（用于处理TPA请求）
            currentBot.on('messagestr', this.messagestrListener);
        });
    }

    /**
     * 获取所有可用命令
     * @returns {Object} 命令列表
     */
    getAvailableCommands() {
        const commands = {};
        
        for (const [commandName, command] of this.pluginManager.getCommands().entries()) {
            commands[commandName] = {
                description: command.options.description || '',
                usage: command.options.usage || commandName,
                plugin: command.plugin
            };
        }
        
        return commands;
    }
}

module.exports = CommandHandler;