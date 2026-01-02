/**
 * 一言插件
 * 实现获取一言并发送到聊天的功能
 */
const https = require('https');

// 辅助函数：处理HTTPS GET请求，返回Promise
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = {
    name: 'hitokoto',
    description: '一言功能插件',
    version: '1.0.0',
    
    // 标记是否已经输出过一言
    hasSentHitokoto: false,
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     * @param {Object} logger - 日志管理器
     */
    activate(bot, pluginManager, logger) {
        this.logger = logger;
        // 检查bot实例是否已创建
        if (!bot.bot) {
            // 延迟注册，等待机器人实例创建
            setTimeout(() => this.activate(bot, pluginManager, logger), 1000);
            return;
        }
        
        // 监听机器人spawn事件，连接成功后获取一言
        bot.bot.on('spawn', async () => {
            await this.sendHitokoto(bot);
        });
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 重置标记
        this.hasSentHitokoto = false;
    },
    
    /**
     * 获取一言并发送到聊天
     * @param {Object} bot - 机器人实例
     */
    async sendHitokoto(bot) {
        // 检查是否已经发送过一言
        if (this.hasSentHitokoto) {
            return; // 已经发送过，不再发送
        }
        
        try {
            // 获取一言
            const hitokotoData = await httpsGet('https://v1.hitokoto.cn');
            const hitokoto = JSON.parse(hitokotoData);
            const content = hitokoto.hitokoto;
            const author = hitokoto.from_who || hitokoto.from || '未知作者';
            
            // 发送到聊天
            bot.chat(`【一言】${content} —— ${author}`);
            
            // 设置标记为已发送
            this.hasSentHitokoto = true;
            
            // 记录日志
            if (this.logger) {
                this.logger.info(`发送一言成功: ${content} —— ${author}`);
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('获取一言失败:', { error: error.message });
            }
            bot.chat('【一言】获取失败，请稍后重试');
        }
    }
};