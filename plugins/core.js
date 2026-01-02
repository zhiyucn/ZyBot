/**
 * 核心插件
 * 包含set-bot、help等基础命令
 */

// 辅助函数：延迟指定毫秒数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: 'core',
    description: '核心功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册set-bot命令
        pluginManager.registerCommand('set-bot', this.setBotHandler.bind(this), {
            description: '修改当前操作的机器人',
            usage: '.zybot set-bot <id>'
        }, this.name);
        
        // 注册help命令
        pluginManager.registerCommand('help', this.helpHandler.bind(this), {
            description: '获取帮助信息',
            usage: '.zybot help'
        }, this.name);

        pluginManager.registerCommand('run_command', this.runCommandHandler.bind(this), {
            description: '运行任意Minecraft命令',
            usage: '.zybot run_command <command>'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * set-bot命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async setBotHandler(username, args, bot) {
        if (args.length > 0) {
            const botId = args[0];
            // 如果id为自己的id，则修改Map
            if (botId === bot.config.main.bot_id) {
                bot.currentPlayers.set(username, botId);
                bot.chat(`你正在操作机器人${botId}`);
            } else {
                // bot焦点被移到了其他Bot，删除Map中的记录
                bot.currentPlayers.delete(username);
                bot.chat(`你正在操作机器人${botId}`);
            }
        } else {
            bot.chat('请提供机器人ID，格式：.zybot set-bot <id>');
        }
    },
    
    /**
     * help命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async helpHandler(username, args, bot) {
        bot.chat(`你好！${username}`);
        // sleep，防止顺序混乱
        await sleep(1000);
        bot.chat(".zybot set-bot <id> 修改当前操作的机器人");
        bot.chat(".zybot help 获取帮助信息");
        bot.chat(".zybot 开盒 <玩家ID> [p] 开！添加p参数可私聊返回结果");
        bot.chat(".zybot 来我这 让机器人tpa到你的位置挂机");
        bot.chat(".zybot 摇色子 看看你的运气");
        bot.chat(".zybot lock <原因> 锁定机器人传送功能，所有人可使用");
        bot.chat(".zybot unlock 解锁机器人传送功能，需二次确认");
        bot.chat(".zybot status 查看机器人当前状态");
    },

    /**
     * run_command命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async runCommandHandler(username, args, bot) {
        if (args.length > 0) {
            const command = args.join(' ');
            // 发送命令到Minecraft服务器
            bot.bot.chat(command);
            bot.chat(`已发送命令：${command}`);
        } else {
            bot.chat('请提供要运行的命令，格式：.zybot run_command <command>');
        }
    }
};