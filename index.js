// github: @yahyaemre/backlinkcheckerbot
// telegram: @surungen

const { Telegraf, Telegram } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token);

const filePath = 'checklist.json';
let lastChecked = null;

const removeProtocol = (url) => {
    return url.replace(/^https?:\/\//, '');
};

const addLastChecked = (chatId, url, backlink, amount) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                bot.telegram.sendMessage(chatId, "⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        const alreadyExists = jsonArray.some(item => item.url === removeProtocol(url) && item.backlink === removeProtocol(backlink) && item.ownerId === chatId);
        if (alreadyExists) {
            bot.telegram.sendMessage(chatId, "ℹ️ Bu URL ve backlink zaten takip listesinde!");
            return;
        }

        jsonArray.push({ url: removeProtocol(url), backlink: removeProtocol(backlink), amount, ownerId: chatId });
        fs.writeFile(filePath, JSON.stringify(jsonArray, null, 2), (err) => {
            if (!err) {
                bot.telegram.sendMessage(chatId, "✅ Takip listesine eklendi!");
            }
        });
    });
};

const check = (chatId, url, backlink) => {
    if (!url || !backlink) {
        bot.telegram.sendMessage(chatId, "Hatalı kullanım! Lütfen `/check URL BACKLINK` formatında kullanın.", { parse_mode: 'Markdown' });
        return;
    }

    const cleanUrl = removeProtocol(url);
    const cleanBacklink = removeProtocol(backlink);

    axios.get(url.includes('http') ? url : `http://${url}`)
        .then((response) => {
            const backlinkCount = response.data.split(cleanBacklink).length - 1;

            fs.readFile(filePath, 'utf8', (err, data) => {
                let jsonArray = [];

                if (!err && data.trim()) {
                    try {
                        jsonArray = JSON.parse(data);
                        if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
                    } catch (error) {
                        bot.telegram.sendMessage(chatId, "⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                        return;
                    }
                }

                const alreadyTracking = jsonArray.some(item => item.url === cleanUrl && item.backlink === cleanBacklink);
                const trackingText = alreadyTracking ? " (Takip ediliyor)" : "";

                if (backlinkCount > 0) {
                    bot.telegram.sendMessage(
                        chatId,
                        `✅ *${url}* adresinde *${backlink}* linkine *${backlinkCount}* kere rastladım!${trackingText}\n\nEğer bu backlink sorgusunu takip listesine eklemek istiyorsan */sonekle* kullan.`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    bot.telegram.sendMessage(chatId, `❌ *${url}* adresinde *${backlink}* linkine rastlamadım.${trackingText}`, { parse_mode: 'Markdown' });
                }

                lastChecked = { chatId, url: cleanUrl, backlink: cleanBacklink, amount: backlinkCount };
            });
        })
        .catch(() => {
            bot.telegram.sendMessage(chatId, `⚠️ Hata: ${url} adresine erişilemedi. Lütfen URL'yi kontrol edin.`);
        });
};

const getCheckList = (chatId) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                bot.telegram.sendMessage(chatId, "⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        if (jsonArray.length === 0) {
            bot.telegram.sendMessage(chatId, "📋 Takip listesi boş!");
            return;
        }

        let message = "📋 *Takip Listesi:*\n\n";

        const promises = jsonArray.map((item, index) => {
            return axios.get(item.url.includes('http') ? item.url : `http://${item.url}`)
                .then((response) => {
                    const backlinkCount = response.data.split(item.backlink).length - 1;
                    jsonArray[index].amount = backlinkCount;

                    return `• *${item.url}* - *${item.backlink}* - *${backlinkCount}* kez rastlanmış\n`;
                })
                .catch(() => {
                    return `• *${item.url}* - *${item.backlink}* - *Bağlantıya ulaşılamadı*\n`;
                });
        });

        Promise.all(promises)
            .then((results) => {
                const filteredResults = results.filter((_, index) => jsonArray[index].ownerId === chatId);

                if (filteredResults.length > 0) {
                    const message = "📋 *Takip Listesi:*\n\n" + filteredResults.join('');
                    bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } else {
                    bot.telegram.sendMessage(chatId, "📋 Takip listesi boş!");
                }
            })
            .catch((error) => {
                console.log(error);
            });
    });
};

const addNewLink = (chatId, url, backlink) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                bot.telegram.sendMessage(chatId, "⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        const cleanUrl = removeProtocol(url);
        const cleanBacklink = removeProtocol(backlink);
        const adderId = chatId;

        axios.get(url.includes('http') ? url : `http://${url}`)
            .then((response) => {
                const backlinkCount = response.data.split(cleanBacklink).length - 1;
                const alreadyExists = jsonArray.some(item => item.url === cleanUrl && item.backlink === cleanBacklink && item.ownerId === chatId);
                if (alreadyExists) {
                    bot.telegram.sendMessage(chatId, "ℹ️ Bu URL ve backlink zaten takip listesinde!");
                    return;
                }

                jsonArray.push({ url: cleanUrl, backlink: cleanBacklink, amount: backlinkCount, ownerId: adderId });
                fs.writeFile(filePath, JSON.stringify(jsonArray, null, 2), (err) => {
                    if (!err) {
                        bot.telegram.sendMessage(chatId, `✅ Takip listesine eklendi! Bu backlink *${backlinkCount}* kere bulundu.`, { parse_mode: 'Markdown' });
                    } else {
                        bot.telegram.sendMessage(chatId, "⚠️ Listeye eklerken bir hata oluştu.");
                    }
                });
            })
            .catch(() => {
                bot.telegram.sendMessage(chatId, `⚠️ Hata: ${url} adresine erişilemedi. Lütfen URL'yi kontrol edin.`);
            });
    });
};

const deleteItemFromCheckList = (chatId, url, backlink) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                bot.telegram.sendMessage(chatId, "⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        const cleanUrl = removeProtocol(url);
        const cleanBacklink = removeProtocol(backlink);

        const filteredList = jsonArray.filter(item => item.url !== cleanUrl || item.backlink !== cleanBacklink);
        fs.writeFile(filePath, JSON.stringify(filteredList, null, 2), (err) => {
            if (!err) {
                bot.telegram.sendMessage(chatId, "✅ Takip listesinden silindi!");
            }
        });
    });
};

const getSpesificCheckList = (chatId, url) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                console.log("⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        const cleanUrl = removeProtocol(url);

        const promises = jsonArray
            .filter(item => item.url === cleanUrl && item.ownerId === chatId) // Sadece kullanıcının eklediği linkleri getir
            .map((item) => {
                return axios.get(item.url.includes('http') ? item.url : `http://${item.url}`)
                    .then((response) => {
                        const backlinkCount = response.data.split(item.backlink).length - 1;
                        return { url: item.url, backlink: item.backlink, amount: backlinkCount };
                    })
                    .catch(() => {
                        return { url: item.url, backlink: item.backlink, amount: "Bağlantıya ulaşılamadı" };
                    });
            });

        Promise.all(promises)
            .then((results) => {
                if (results.length > 0) {
                    const message = "📋 *Backlink Listesi:*\n\n" + results.map(item => `• *${item.backlink}* - *${item.amount}* kere rastlanmış`).join('\n');
                    bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } else {
                    bot.telegram.sendMessage(chatId, "📋 Takip listesinde bu backlinke dair bilgi bulamadım!");
                }
            })
            .catch((error) => {
                console.log(error);
            });
    });
};

const checkTheListByDay = () => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        let jsonArray = [];

        if (!err && data.trim()) {
            try {
                jsonArray = JSON.parse(data);
                if (!Array.isArray(jsonArray)) throw new Error("JSON formatı hatalı!");
            } catch (error) {
                console.log("⚠️ Bir hata oluştu. Lütfen tekrar deneyin.");
                return;
            }
        }

        const uniqueOwners = new Set();

        jsonArray.forEach((item) => {
            uniqueOwners.add(item.ownerId);
        });

        uniqueOwners.forEach((ownerId) => {
            getCheckList(ownerId);
        });
    });
};

setInterval(() => {
    checkTheListByDay();
}, 24 * 60 * 60 * 1000);  // 24 saatte bir kontrol

bot.start((ctx) => ctx.reply(`Merhaba *${ctx.message.from.first_name}*, ben *Backlink Checker Bot*!\nBeni kullanarak backlinklerini düzenli olarak takip edebilir ya da tekli sorgular yapabilirsin.\nYardım almak için /help komutunu kullan.`, { parse_mode: 'Markdown' }));

bot.command('check', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
        return ctx.reply("Hatalı kullanım! Lütfen `/check URL BACKLINK` formatında kullanın.", { parse_mode: 'Markdown' });
    }

    const [url, backlink] = args;
    check(ctx.message.chat.id, url, backlink);
    ctx.reply('Kontrol ediliyor...');
});

bot.command('sonekle', (ctx) => {
    if (!lastChecked) {
        bot.telegram.sendMessage(ctx.message.chat.id, "ℹ️ Önce bir `/check URL BACKLINK` komutuyla URL kontrol edin.");
        return;
    }

    addLastChecked(lastChecked.chatId, lastChecked.url, lastChecked.backlink, lastChecked.amount);
});

bot.command('liste', (ctx) => {
    getCheckList(ctx.message.chat.id);
});

bot.command('status', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) {
        return ctx.reply("Hatalı kullanım! Lütfen `/status URL` formatında kullanın.", { parse_mode: 'Markdown' });
    }

    const url = args[0];
    getSpesificCheckList(ctx.chat.id, url);
});


bot.command('ekle', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
        return ctx.reply("Hatalı kullanım! Lütfen `/ekle URL BACKLINK` formatında kullanın.", { parse_mode: 'Markdown' });
    }
    const [url, backlink] = args;
    addNewLink(ctx.message.chat.id, url, backlink);
});

bot.command('sil', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
        return ctx.reply("Hatalı kullanım! Lütfen `/sil URL BACKLINK` formatında kullanın.", { parse_mode: 'Markdown' });
    }
    const [url, backlink] = args;
    deleteItemFromCheckList(ctx.message.chat.id, url, backlink);
});

bot.help((ctx) => {
    ctx.reply('📋 Komutlar:\n\n'
        + '/check URL BACKLINK - URL ve backlink kontrolü\n'
        + '/sonekle - Son kontrol edilen URL ve backlinki takip listesine ekle\n'
        + '/liste - Takip listesini getir\n'
        + '/status URL - Verilen URL için backlink durumunu getir\n'
        + '/ekle URL BACKLINK - URL ve backlinki takip listesine ekle\n'
        + '/sil URL BACKLINK - URL ve backlinki takip listesinden sil\n'
        + '/komutlar - Komutları getir\n'
    );
})

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
