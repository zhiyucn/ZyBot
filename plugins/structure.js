/**
 * 结构插件
 * 包含st命令
 */
const http = require('http');

// 辅助函数：处理HTTP GET请求，返回Promise
function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
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
    name: 'structure',
    description: '结构查找功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        // 注册st命令
        pluginManager.registerCommand('st', this.structureHandler.bind(this), {
            description: '查找结构',
            usage: '.zybot st <X> <Y> <结构ID>'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * st命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async structureHandler(username, args, bot) {
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        // 接受X Y坐标和结构ID
        if (args.length < 3) {
            bot.chat('请提供X Y坐标和结构ID，格式：.zybot st <X> <Y> <结构ID>');
        } else {
            // 查找结构
            // 请求http://localhost:8080/locate?x=xz=z&structure=id
            httpGet(`http://localhost:8080/locate?x=${args[0]}&z=${args[1]}&structure=${args[2]}`)
            .then(data => {
                // JSON转为数组
                let dataArray = JSON.parse(data);
                bot.chat(dataArray.text);
            })
            .catch(error => {
                bot.chat(`查找结构失败：${error.message}`);
            });
        }
    }
};