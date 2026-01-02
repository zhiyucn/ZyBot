/**
 * 执行插件
 * 包含run命令
 */

module.exports = {
    name: 'run',
    description: '执行命令功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册run命令
        pluginManager.registerCommand('run', this.runHandler.bind(this), {
            description: '执行指定命令',
            usage: '.zybot run <命令>'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * run命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async runHandler(username, args, bot) {
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        // 执行指定命令
        if (args.length < 1) {
            bot.chat('请提供要执行的命令，格式：.zybot run <命令>');
        } else {
            // 检查是不是超级管理员
            if (username === bot.config.main.owner) {
                // 执行命令
                bot.chat(`执行命令：${args.join(' ')}`);
                bot.chat(args.join(' '));
            } else {
                bot.chat('你没有权限执行此命令');
            }
        }
    }
};