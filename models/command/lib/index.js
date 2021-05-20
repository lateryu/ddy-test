'use strict';


const log = require('@ddy-test/log');
const { isObject } = require('@ddy-test/get-npm-info')

const semver = require('semver');
const colors = require('colors');
const LOWEST_NODE_VERSION = '12.0.0'; 

class Command {
    constructor(argv) {
        this._argv = argv;
        if (!argv) {
            throw new Error('参数不能为空')
        }
        if(!Array.isArray(argv)) {
            throw new Error('参数必须为数组');
        }
        if(argv.length < 1) {
            throw new Error('参数列表为空');
        }
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch(err => {
                log.error(err.message);
            })
        })
    }

    initArgs() {
        this._cmd = this._argv[this._argv.length - 1];
        this._argv = this._argv.slice(0, this._argv.length - 1);
    }

    init() {
        throw new Error("init必须实现");
    }

    exec() {
        throw new Error("exec必须实现");
    }

     // 获取最低node版本
 checkNodeVersion() {
    // 第一步， 获取当前node版本号
    const currentVersion = process.version;
    // 第二步，比对最低版本
    const lowestVersion = LOWEST_NODE_VERSION;
    // 比对
    if(!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`ddy-test 需要安装 v${lowestVersion} 以上版本的node.js`))
    }
};
}


module.exports = Command;
 
