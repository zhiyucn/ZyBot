/**
 * 锁定插件
 * 包含lock和unlock命令
 */

// 辅助函数：延迟指定毫秒数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: 'lock',
    description: '锁定相关功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册lock命令
        pluginManager.registerCommand('lock', this.lockHandler.bind(this), {
            description: '锁定机器人传送功能',
            usage: '.zybot lock <原因>'
        }, this.name);
        
        // 注册unlock命令
        pluginManager.registerCommand('unlock', this.unlockHandler.bind(this), {
            description: '解锁机器人传送功能',
            usage: '.zybot unlock'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * lock命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async lockHandler(username, args, bot) {
        // 检查机器人是否已经被锁定
        if (bot.lock) {
            bot.chat(`机器人已被${bot.lockedBy}锁定，锁定原因：${bot.lockReason}`);
        } else if (args.length < 1) {
            bot.chat('请输入锁定原因，格式：.zybot lock <原因>');
        } else {
            // 锁定机器人
            const reason = args.join(' ');
            bot.chat(`机器人已被${username}锁定，锁定原因：${reason}`);
            bot.lock = true;
            bot.lockReason = reason;
            bot.lockedBy = username;
        }
    },
    
    /**
     * unlock命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async unlockHandler(username, args, bot) {
        if (!bot.lock) {
            bot.chat('机器人未锁定');
        } else if (bot.unlockConfirm.has(username)) {
            // 二次确认，解锁机器人
            bot.chat(`机器人已被${username}解锁`);
            bot.lock = false;
            bot.lockReason = '';
            bot.lockedBy = '';
            bot.unlockConfirm.delete(username);
        } else {
            // 首次请求解锁，提示二次确认
            bot.chat(`机器人被${bot.lockedBy}锁定，锁定原因：${bot.lockReason}`);
            // sleep，防止顺序混乱
            await sleep(500);
            bot.chat('如果你执意要解除，请再次输入 .zybot unlock 命令确认');
            bot.unlockConfirm.set(username, true);
        }
    }
};