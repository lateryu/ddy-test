'use strict';

module.exports = core;


const path = require('path');
const commander = require('commander');
const semver = require('semver');
const colors = require('colors');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const dotenv = require('dotenv');
// const rootCheck = require('root-check'); // 需要import 引入

const pkg = require('../package.json');
const constant = require('./const');
const init = require('@ddy-test/init');
const exec = require('@ddy-test/exec');
const log = require('@ddy-test/log');

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch(e) {
        log.error(e.message);
        if (program.debug) {
            console.log(e);
        }
    }
}

// 启动检查
async function prepare() {
    // checkRoot();
    checkUserHome();
    // checkInputArgs(); // 已废弃
    checkEnv();
    await checkGlobalUpdate();
}


// 生成program实例
const program = new commander.Command();

// 命令注册
 function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启debug模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径');

    program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec);

    // 开启debug模式
    program.on('option:debug', function () {
        if (program.debug) {
            process.env.LOG_LEVEL = 'verbose';
        } else {
            process.env.LOG_LEVEL = 'info';
        }
        log.level = process.env.LOG_LEVEL;
    });

    // 指定targetPath 
    program.on('option:targetPath', function() {
        process.env.CLI_TARGET_PATH = program.targetPath;
    });


     // 对未知命令监听
     program.on('command:*', function(obj) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        console.log(colors.red('未知的命令:' + obj[0]));
        if (availableCommands.length > 0 ) {
            console.log(colors.red('可用的命令:' + availableCommands.join(',')));
        }
    })
    
    // if (program.args && program.args.length < 1 ) {
    //     program.outputHelp();
    //     console.log();
    // }
    program.parse(process.argv);
 };



// 检查环境
function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath,
        });
    }
    createDefaultConfig();
}

// 创建环境变量
function createDefaultConfig() {
    const cliConfig = {
        home: userHome,
    }
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检查版本号
async function checkGlobalUpdate() {
    const currentVersion = pkg.version;
    const npmName = pkg.name;

    const { getNpmSemverVersion } = require('@ddy-test/get-npm-info');
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn(colors.yellow(`请手动更新版本, 当前版本${currentVersion}, 最新版本${lastVersion},
        运行 npm install -g ${npmName} 进行更新`))
    }
}

// 权限
function checkRoot() {
    // import rootCheck from 'root-check';
    const rootCheck = require('root-check');
    rootCheck();
};

// 获取目录
function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在'));
    }
};

// 解析参数
// function checkInputArgs() {
//     const minimist = require('minimist');
//     const argv = require('process').argv;
//     args = minimist(process.argv.slice(2));
//     checkArgs()
// };

// function checkArgs() {
//     if (args.debug) {
//         process.env.LOG_LEVEL = 'verbose';
//     } else {
//         process.env.LOG_LEVEL = 'info';
//     }
//     log.level = process.env.LOG_LEVEL;
//     // log.verbose('a', 'debug已开启');
// };