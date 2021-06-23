const request = require("@ddy-test/request");

module.exports = function () {
  return request({
    url: "project/template",
  });
};
