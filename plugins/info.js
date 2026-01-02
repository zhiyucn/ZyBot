/**
 * 信息查询插件
 * 包含开盒命令
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
    name: 'info',
    description: '信息查询功能插件',
    version: '1.0.0',
    
    /**
     * 插件激活
     * @param {Object} bot - 机器人实例
     * @param {Object} pluginManager - 插件管理器
     */
    activate(bot, pluginManager) {
        this.bot = bot;
        // 注册"开盒"命令
        pluginManager.registerCommand('开盒', this.infoHandler.bind(this), { 
            description: '获取玩家信息',
            usage: '.zybot 开盒 <玩家ID> [p]'
        }, this.name);
    },
    
    /**
     * 插件停用
     */
    deactivate() {
        // 清理资源（如果需要）
    },
    
    /**
     * "开盒"命令处理函数
     * @param {string} username - 发送命令的玩家
     * @param {Array} args - 命令参数
     * @param {Object} bot - 机器人实例
     */
    async infoHandler(username, args, bot) {
        // 检查玩家是否有操作权限
        if (!bot.hasPermission(username)) {
            return;
        }
        
        if (args.length > 0) {
            const playerId = args[0];
            const isPrivate = args.includes('p');
            await this.getPlayerInfo(username, playerId, isPrivate, bot);
        } else {
            bot.chat(`请提供玩家正版ID，格式：.zybot 开盒 <玩家ID>`);
        }
    },
    
    /**
     * 获取玩家信息（UUID和皮肤URL）
     * @param {string} requester - 请求信息的玩家用户名
     * @param {string} playerId - 目标玩家的正版ID
     * @param {boolean} isPrivate - 是否使用私聊模式发送结果
     * @param {Object} bot - 机器人实例
     */
    async getPlayerInfo(requester, playerId, isPrivate, bot) {
        try {
            // 1. 首先获取玩家位置信息
            let msg = 'map error';
            let px = 0;
            let py = 0;
            let pz = 0;
            
            try {
                // 使用配置文件中的地图URL和地图类型
                const mapUrl = this.bot.config.main?.map_url || 'https://map.example.com';
                const mapType = this.bot.config.main?.map_type || 'BlueMap';
                
                // 根据地图类型构建不同的API URL
                let mapApiUrl = '';
                if (mapType === 'BlueMap') {
                    // BlueMap的API路径
                    mapApiUrl = `${mapUrl.replace(/\/$/, '')}/maps/world/live/players.json`;
                }
                
                if (mapApiUrl) {
                    const mapData = await httpsGet(mapApiUrl);
                    const response = JSON.parse(mapData);
                    const players = response.players || [];
                    
                    if (players && players.length > 0) {
                        const player = players.find(p => p.name === playerId);
                        if (player) {
                            msg = `ok`;
                            px = player.position.x.toFixed(2);
                            py = player.position.y.toFixed(2);
                            pz = player.position.z.toFixed(2);
                        } else {
                            msg = `error`;
                        }
                    } else {
                        msg = `error`;
                    }
                } else {
                    msg = `map type error`;
                }
            } catch (error) {
                msg = `map error`;
            }
            
            // 2. 获取玩家UUID
            const uuidUrl = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(playerId)}`;
            const uuidData = await httpsGet(uuidUrl);
            const profile = JSON.parse(uuidData);
            
            if (!profile.id) {
                const errorMsg = `未找到玩家 ${playerId}`;
                if (isPrivate) {
                    bot.chat(`/msg ${requester} ${errorMsg}`);
                } else {
                    bot.chat(`[${requester}] ${errorMsg}`);
                }
                return;
            }
            
            const uuid = profile.id;
            
            // 3. 使用UUID获取玩家皮肤信息
            const skinInfoUrl = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}?unsigned=false`;
            const skinData = await httpsGet(skinInfoUrl);
            const skinProfile = JSON.parse(skinData);
            
            if (!skinProfile.properties || skinProfile.properties.length === 0) {
                const errorMsg = `无法获取 ${playerId} 的皮肤信息`;
                if (isPrivate) {
                    bot.chat(`/msg ${requester} ${errorMsg}`);
                } else {
                    bot.chat(`[${requester}] ${errorMsg}`);
                }
                return;
            }
            
            // 解码皮肤数据
            const skinProp = skinProfile.properties[0];
            const decoded = Buffer.from(skinProp.value, 'base64').toString('utf8');
            const skinInfo = JSON.parse(decoded);
            
            let skinUrl = '';
            if (skinInfo.textures && skinInfo.textures.SKIN) {
                skinUrl = skinInfo.textures.SKIN.url;
            }
            
            // 4. 以伪JSON格式发送结果
            const resultMsg = `{ name: ${playerId}, uuid: ${uuid}, skin: ${skinUrl}, posmsg: ${msg}, pos: { x: ${px}, y: ${py}, z: ${pz} } }`;
            
            if (isPrivate) {
                bot.chat(`/msg ${requester} ${resultMsg}`);
            } else {
                bot.chat(resultMsg);
            }
            
        } catch (error) {
            // 处理所有可能的错误
            let errorMsg = '';
            
            if (error.message.includes('getaddrinfo')) {
                errorMsg = `网络错误: 无法连接到API服务器`;
            } else if (error.message.includes('404')) {
                errorMsg = `未找到玩家 ${playerId}`;
            } else {
                errorMsg = `获取信息失败: ${error.message}`;
            }
            
            if (isPrivate) {
                bot.chat(`/msg ${requester} ${errorMsg}`);
            } else {
                bot.chat(`[${requester}] ${errorMsg}`);
            }
        }
    }
};