'use strict';

var Command = require('@ddy-test/command');
const log = require('@ddy-test/log');


class InitCommand extends Command {
   init() {
      this.projectName = this._argv[0] || '';
      this.force = !!this._cmd.force;
      log.verbose('projectName', this.projectName);
      log.verbose('force', this.force);
   }
   exec() {
      console.log("init 业务逻辑");
   }
}

function init(argv) {
   return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;

