var betterJapanese = {
    name: 'betterJapanese',
    apiUrl: {
        release: 'https://pages.yukineko.me/better-japanese',
        dev: '../mods/local/better-japanese/translate.json'
    },
    config: {
        hash: '0',
        enable: true
    },
    isDev: false,
    initialized: false,
    fallbackTimer: 0,
    origins: {},

    init: function () {
        this.load()

        this.fallbackTimer = setTimeout(() => {
            this.checkUpdate()
            this.initialized = true
        }, 5000)

        send({ id: 'init bridge' })

        this.log('Initialized')
    },

    initAfterLoad: function(){
        betterJapanese.origins.updateMenu = Game.UpdateMenu
        betterJapanese.origins.sayTime = Game.sayTime

        // メニューに独自ボタンを実装
        Game.UpdateMenu = function(){
            betterJapanese.origins.updateMenu()
            if(Game.onMenu == 'prefs'){
                betterJapanese.injectMenu()
            }
        }

        // 時間表記からカンマを取り除く
        Game.sayTime = function(time, detail){
            return betterJapanese.origins.sayTime(time, detail).replaceAll(', ', '')
        }

        // hookを削除
        Game.removeHook('create', betterJapanese.initAfterLoad)
    },

    register: function () {
        Game.registerMod(this.name, this)
        Game.registerHook('create', betterJapanese.initAfterLoad)
    },

    save: function () {
        localStorage.setItem('BJPConfig', JSON.stringify(this.config))
    },

    load: function () {
        var conf = localStorage.getItem('BJPConfig')
        if (conf) this.config = JSON.parse(conf)
    },

    injectMenu: function () {
        var button = l('monospaceButton')
        var element = document.createElement('div')
        element.innerHTML = betterJapanese.writeButton('enable', 'enableJPButton', '日本語訳の改善', 
            function(){
                BeautifyAll();
                Game.RefreshStore();
                Game.upgradesToRebuild=1;
            }.toString()
            )+'<label>(日本語訳を非公式翻訳版に置き換えます)</label>'
        button.parentNode.insertBefore(element, button.previousElementSibling)
    },

    writeButton: function(prefName, button, desc, callback){//本家のWritePrefButtonとほぼ同じ
        return `<a class="smallFancyButton prefButton option${this.config[prefName] ? '' : ' off'}" id="${button}" ${Game.clickStr}="betterJapanese.toggleButton(${prefName},${button},${desc});${callback}">${desc}${this.config[prefName] ? ON : OFF}</a>`
    },

    toggleButton: function (prefName, button, desc) {
        var button = l(button)
        this.config[prefName] = !this.config[prefName]
        button.innerHTML = desc + (this.config.enable ? ON : OFF)
        button.className = `smallFancyButton prefButton option${(this.config.enable ? '' : ' off')}`
        PlaySound('snd/tick.mp3')
    },

    addDevButton: function () {
        var element = document.createElement('div')
        element.innerHTML = `<button style="position: absolute; left: 10px; top: 10px; z-index: 9999;" type="button" onclick="betterJapanese.reloadLanguagePack()">Reload LanguageFile</button>`
        document.body.append(element)
    },

    checkUpdate: async function () {
        this.log('Checking updates')

        if(this.isDev) return await this.updateLanguagePack(this.apiUrl.dev)
        var res = await fetch(`${this.apiUrl.release}/api/release.json`).then(res => res.json()).catch(() => this.config.hash)
        if(res.hash !== this.config.hash) {
            if (await this.updateLanguagePack(res.url)) {
                this.config.hash = res.hash
                this.save()
                this.showUpdateNotification()
            }
        } else {
            this.log('No updates available')
        }
    },

    showUpdateNotification: function () {
        Game.Notify('日本語訳改善Mod', '翻訳データを更新しました。<br>再読み込み後から有効になります。<br><a onclick="betterJapanese.reload()">セーブデータを保存して再読み込み</a>')
    },

    reload: function () {
        Game.toSave = true
        Game.toReload = true
    },

    reloadLanguagePack: async function () {
        await this.checkUpdate()
        this.showUpdateNotification()
        ModLanguage('JA', JSON.parse(localStorage.getItem('BJPLangPack')))
    },

    updateLanguagePack: async function (url) {
        var base = {
            "": {
                "language": "JA",
                "plural-forms": "nplurals=2;plural=(n!=1);"
            },
        }

        try {
            var lang = await fetch(url).then(res => res.json())
            localStorage.setItem('BJPLangPack', JSON.stringify(Object.assign(base, lang)))
        } catch {
            this.log('Update failed')
            return false
        }

        this.log('Update successfull')
        return true
    },

    log: function (msg) {
        console.log(`%c[BetterJapanese]%c ${msg}`, 'color: yellow', '')
    }
}

window.api.receive('fromMain', (msg) => {
    if (msg.id === 'greenworks loaded' && !betterJapanese.initialized) {
        betterJapanese.isDev = betterJapanese.isDev || !!msg.data.DEV
        betterJapanese.log(`DevMode: ${betterJapanese.isDev}`)
        betterJapanese.checkUpdate()
        if (betterJapanese.isDev) betterJapanese.addDevButton()

        clearTimeout(betterJapanese.fallbackTimer)
        betterJapanese.initialized = true
    }
})

betterJapanese.register()