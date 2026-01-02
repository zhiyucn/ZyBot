/**
 * 传送插件
 * 包含来我这等传送相关命令
 */

module.exports = {
    name: 'teleport',
    description: '传送相关功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册"来我这"命令
        pluginManager.registerCommand('来我这', this.tpaHandler.bind(this), {
            description: '让机器人tpa到你的位置',
            usage: '.zybot 来我这'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * "来我这"命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async tpaHandler(username, args, bot) {
        // 检查机器人是否被锁定
        if (bot.lock) {
            bot.chat(`机器人被${bot.lockedBy}锁定，锁定原因：${bot.lockReason}`);
            return;
        }
        
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        bot.chat(`正在为${username}发送TPA请求...`);
        bot.chat(`/tpa ${username}`);
    }
};