/**
 * 状态插件
 * 包含status命令
 */

module.exports = {
    name: 'status',
    description: '状态查询功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册status命令
        pluginManager.registerCommand('status', this.statusHandler.bind(this), {
            description: '查看机器人当前状态',
            usage: '.zybot status'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * status命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async statusHandler(username, args, bot) {
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        if (bot.lock) {
            bot.chat(`传送锁定：被${bot.lockedBy}锁定，锁定原因：${bot.lockReason}`);
        } else {
            bot.chat('传送锁定：机器人未锁定');
        }
        
        // 计算运行时间（小时）
        const uptimeHours = bot.startTime ? (new Date() - new Date(bot.startTime)) / 1000 / 60 / 60 : 0;
        bot.chat(`已平稳运行${uptimeHours.toFixed(2)}小时`);
    }
};