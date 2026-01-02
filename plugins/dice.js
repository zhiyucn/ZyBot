/**
 * 骰子插件
 * 包含摇色子命令
 */

module.exports = {
    name: 'dice',
    description: '骰子相关功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册"摇色子"命令
        pluginManager.registerCommand('摇色子', this.diceHandler.bind(this), {
            description: '掷出一个1-6的随机数',
            usage: '.zybot 摇色子'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * "摇色子"命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async diceHandler(username, args, bot) {
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        // 生成1-6的随机数
        const result = Math.floor(Math.random() * 6) + 1;
        bot.chat(`${username} 幸运的掷出了 ${result}`);
    }
};