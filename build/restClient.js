"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _types = require("./types");

var _fetch = require("./fetch");

exports.default = function (apiUrl) {
  var httpClient = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _fetch.jsonApiHttpClient;

  /**
   * @param {String} type One of the constants appearing at the top if this file, e.g. 'UPDATE'
   * @param {String} resource Name of the resource to fetch, e.g. 'posts'
   * @param {Object} params The REST request params, depending on the type
   * @returns {Object} { url, options } The HTTP request parameters
   */
  var convertRESTRequestToHTTP = function convertRESTRequestToHTTP(type, resource, params) {
    var url = "";
    var options = {};
    switch (type) {
      case _types.GET_MANY_REFERENCE:
      case _types.GET_LIST:
        var _params$pagination = params.pagination,
            page = _params$pagination.page,
            perPage = _params$pagination.perPage;
        var _params$sort = params.sort,
            field = _params$sort.field,
            order = _params$sort.order;
        var _params$filter = params.filter,
            name = _params$filter.name,
            value = _params$filter.value;

        var _query = {
          "page[size]": perPage,
          "page[number]": page
        };
        Object.keys(params.filter).forEach(function (key) {
          var filterField = "filter[" + key + "]";
          _query[filterField] = params.filter[key];
        });
        if (type === "GET_MANY_REFERENCE") {
          var targetFilter = "filter[" + params.target + "]";
          _query[targetFilter] = params.id;
        }
        if (order === "ASC") {
          _query.sort = field;
        } else {
          _query.sort = "-" + field;
        }
        url = apiUrl + "/" + resource + "?" + (0, _fetch.queryParameters)(_query);
        break;
      case _types.GET_ONE:
        url = apiUrl + "/" + resource + "/" + params.id;
        break;
      case _types.GET_MANY:
        var _query = { "filter[id]": params.ids.toString() };
        url = apiUrl + "/" + resource + "?" + (0, _fetch.queryParameters)(_query);
        break;
      case _types.UPDATE:
        url = apiUrl + "/" + resource + "/" + params.id;
        options.method = "PATCH";
        var attrs = {};
        Object.keys(params.data).forEach(function (key) {
          return attrs[key] = params.data[key];
        });
        var updateParams = {
          data: { type: resource, id: params.id, attributes: attrs }
        };
        options.body = JSON.stringify(updateParams);
        break;
      case _types.CREATE:
        url = apiUrl + "/" + resource;
        options.method = "POST";
        var createParams = {
          data: { type: resource, attributes: params.data }
        };
        options.body = JSON.stringify(createParams);
        break;
      case _types.DELETE:
        url = apiUrl + "/" + resource + "/" + params.id;
        options.method = "DELETE";
        break;
      default:
        throw new Error("Unsupported fetch action type " + type);
    }
    return { url: url, options: options };
  };

  /**
   * @param {Object} response HTTP response from fetch()
   * @param {String} type One of the constants appearing at the top if this file, e.g. 'UPDATE'
   * @param {String} resource Name of the resource to fetch, e.g. 'posts'
   * @param {Object} params The REST request params, depending on the type
   * @returns {Object} REST response
   */
  var convertHTTPResponseToREST = function convertHTTPResponseToREST(response, type, resource, params) {
    var headers = response.headers,
        json = response.json;

    switch (type) {
      case _types.GET_MANY_REFERENCE:
      case _types.GET_LIST:
        var jsonData = json.data.map(function (dic) {
          var interDic = Object.assign({ id: dic.id }, dic.attributes, dic.meta);
          if (dic.relationships) {
            Object.keys(dic.relationships).forEach(function (key) {
              var keyString = key + "_id";
              if (dic.relationships[key].data) {
                //if relationships have a data field --> assume id in data field
                interDic[keyString] = dic.relationships[key].data.id;
              } else if (dic.relationships[key].links) {
                //if relationships have a link field
                var link = dic.relationships[key].links["self"];
                httpClient(link).then(function (response) {
                  interDic[key] = {
                    data: response.json.data,
                    count: response.json.data.length
                  };
                  interDic["count"] = response.json.data.length;
                });
              }
            });
          }
          return interDic;
        });
        return { data: jsonData, total: json.meta.page["total"] };
      case _types.GET_MANY:
        jsonData = json.data.map(function (obj) {
          return Object.assign({ id: obj.id }, obj.attributes);
        });
        return { data: jsonData };
      case _types.UPDATE:
      case _types.CREATE:
        return {
          data: Object.assign({ id: json.data.id }, json.data.attributes)
        };
      case _types.DELETE:
        return { data: json };
      default:
        return { data: json.data };
    }
  };

  /**
   * @param {string} type Request type, e.g GET_LIST
   * @param {string} resource Resource name, e.g. "posts"
   * @param {Object} payload Request parameters. Depends on the request type
   * @returns {Promise} the Promise for a REST response
   */
  return function (type, resource, params) {
    var _convertRESTRequestTo = convertRESTRequestToHTTP(type, resource, params),
        url = _convertRESTRequestTo.url,
        options = _convertRESTRequestTo.options;

    return httpClient(url, options).then(function (response) {
      return convertHTTPResponseToREST(response, type, resource, params);
    });
  };
};