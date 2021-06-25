// "use strict";
//
// const axios = require("axios");
//
// const BASE_URL = process.env.DDY_TEST_BASE_URL || "http://www.misswho.cn:7001";
//
// const request = axios.create({
//   baseURL: BASE_URL,
//   timeout: 5000,
// });
//
// request.interceptors.response.use(
//   (response) => {
//     return response.data;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

const request = function () {
  return [
    {
      name: "react-typescript标准模板",
      npmName: "ddy-test-react-typescript-template",
      npmVersion: "1.0.2",
      type: "normal",
      installCommand: "npm install",
      startCommand: "npm start",
      tag: ["project"],
    },
    {
      name: "vue3标准模板",
      npmName: "ddy-test-vue3-template",
      npmVersion: "1.0.1",
      installCommand: "npm install",
      startCommand: "npm run serve",
      type: "normal",
      tag: ["project"],
    },
    {
      name: "组件库模板",
      npmName: "ddy-test-components",
      npmVersion: "1.0.2",
      type: "normal",
      installCommand: "npm install",
      startCommand: "npm start",
      tag: ["component"],
    },
    {
      name: "ddy-test自定义模板",
      npmName: "ddy-test-custom-template",
      npmVersion: "1.0.4",
      type: "custom",
      installCommand: "npm install",
      startCommand: "npm start",
      tag: ["project"],
      ignore: ["**/public/**"],
    },
  ];
};

module.exports = request;
