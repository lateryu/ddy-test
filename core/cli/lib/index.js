'use strict';

module.exports = core;


const path = require('path');
const commander = require('commander');
const semver = require('semver');
const colors = require('colors');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const dotenv = require('dotenv');
// const rootCheck = require('root-check');


const pkg = require('../package.json');
const log = require('@ddy-test/log');
const constant = require('./const');
const { usage, option } = require('commander');

let args, config;

async function core(args) {
    try {
        checkPkgVersion();
        checkNodeVersion();
        // checkRoot();
        checkUserHome();
        checkInputArgs();
        checkEnv();
        await checkGlobalUpdate();
    } catch(e) {
        log.error(e.message);
    }
}
function checkEnv() {
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExists(dotenvPath)) {
        config = dotenv.config({
            path: dotenvPath,
        });
    }
    createDefaultConfig();
    log.verbose('环境变量', process.env.CLI_HOME_PATH);
}

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

// const program = new commander.Command();
// program
//   .version('0.1.0')
//   .arguments('<username> [password]')
//   .description('test command', {
//     username: 'user to login',
//     password: 'password for user, if required'
//   })
//   .action((username, password) => {
//     console.log('username:', username);
//     console.log('environment:', password || 'no password given');
//   });

 


// program.name(Object.keys(pkg.bin)[0])
//     .usage('<command> [options]')
//     .version(pkg.version);
// program
//     .arguments('<name>')
//     .option('-t, --title <honorific>', 'title to use before name')
//     .option('-d, --debug', '是否开启调试模式')
//     .action((name, options, command) => {
//         console.log(name, 'name');
//         console.log(options.debug, 111);
//         console.log(command.name(), 22222);
//         if (options.debug) {
//           console.error('Called %s with options %o', command.name(), options);
//         }
//         const title = options.title ? `${options.title} ` : '';
//         // console.log(`Thank-you ${title}${name}`);
//       });

//     const opts = program.opts();
//     // console.log(opts);

//     program.option('-e, --envName <envName>', '获取环境变量')

// // program.outputHelp();

// 注册事件
    // const clone = program.command('clone <source> [description]');
    // clone
    // .description('clone a repository')
    // .option('-f, --force', '是否强制')
    // .action((name, description, cmdObj) => {
    //     console.log('do clone', name, description, cmdObj.force);
    // })

    //   program.parse(process.argv);




function checkInputArgs() {
    const minimist = require('minimist');
    const argv = require('process').argv;
    args = minimist(process.argv.slice(2));
    checkArgs()
}

function checkArgs() {
    if (args.debug) {
        process.env.LOG_LEVEL = 'verbose';
    } else {
        process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
    log.verbose('a', 'debug已开启');
}

function checkPkgVersion() {
    console.log(pkg.version);
    log.notice('cli', pkg.version);
}

function checkNodeVersion() {
    // 第一步， 获取当前node版本号
    const currentVersion = process.version;
    // 第二步，比对最低版本
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    // 比对
    if(!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`ddy-test 需要安装 v${lowestVersion} 以上版本的node.js`))
    }

}

function checkRoot() {
    // import rootCheck from 'root-check';
    const rootCheck = require('root-check');
    rootCheck();
}

function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在'));
    }
}