$.views.settings.allowCode(true);
$.views.converters("getResponseModelName", function (val) {
    return getResponseModelName(val);
});

var tempBody = $.templates('#temp_body');
var tempBodyResponseModel = $.templates('#temp_body_response_model');

//获取context path
var contextPath = getContextPath();

function getContextPath() {
    var pathName = document.location.pathname;
    var index = pathName.substr(1).indexOf("/");
    var result = pathName.substr(0, index + 1);
    return result;
}


// 参数：prop = 属性，val = 值
function createJson(values, prop, val) {
    // 如果 val 被忽略
    if (typeof val === "undefined") {
        // 删除属性
        delete values[prop];
    }
    else {
        // 添加 或 修改
        values[prop] = val;
    }
}

$(function () {
    $.ajax({
        url: "v2/api-docs",
// 	        url : "http://petstore.swagger.io/v2/swagger.json",
        dataType: "json",
        type: "get",
        async: false,
        success: function (data) {
            //layui init
            layui.use(['layer', 'jquery', 'element'], function () {
                var $ = layui.jquery, layer = layui.layer, element = layui.element;
            });
            var jsonData = eval(data);
            var colId = "name"
            var asc = function (x, y) {
                return (x[colId] > y[colId]) ? 1 : -1
            }
            jsonData.tags.sort(asc)
            $("#title").html(jsonData.info.title);
            $("body").html($("#template").render(jsonData));

            $("[name='a_path']").click(function () {
                var path = $(this).attr("path");
                var method = $(this).attr("method");
                var operationId = $(this).attr("operationId");
                $.each(jsonData.paths[path], function (i, d) {
                    if (d.operationId == operationId) {
                        d.path = path;
                        d.method = method;
                        $("#path-body").html(tempBody.render(d));
                        var modelName = getResponseModelName(d.responses["200"]["schema"]["$ref"]);
                        if (modelName) {
                            var jsonRequired = jsonData.definitions[modelName].required;
                            var jsonDef = jsonData.definitions[modelName].properties;
                            recursive(jsonRequired, jsonDef, jsonData.definitions);
                            $("#path-body-response-model").html(tempBodyResponseModel.render(jsonData.definitions[modelName]));
                        }
                    }
                });
            });

            //提交测试按钮
            $("[name='btn_submit']").click(function () {
                var operationId = $(this).attr("operationId");
                var parameterJson = {};
                $("input[operationId='" + operationId + "']").each(function (index, domEle) {
                    var k = $(domEle).attr("name");
                    var v = $(domEle).val();
                    parameterJson.push({k: v});
                });
            });
        }
    });

});


function recursive(jsonRequired, jsonDef, definitions) {
    for (var p in jsonDef) {
        var paramJson = jsonDef[p];

        if (jsonRequired != undefined) {
            /**
             * 是否是必传参数
             */
            for (var i = 0; i < jsonRequired.length; i++) {
                var reqParam = jsonRequired[i];
                if (reqParam == p) {
                    createJson(jsonDef[p], "required", true)
                }
            }
        }

        /**
         * 是否包含子集
         */
        if (paramJson.type == "object" || paramJson.type == "array" || paramJson.$ref != undefined) {
            if(definitions[paramJson.description]!=undefined){
                createJson(jsonDef[p], "ischild", true);
                var chilcJsonRequired = definitions[paramJson.description].required;
                var chilcJsonProperties = definitions[paramJson.description].properties;
                createJson(jsonDef[p], "objects", definitions[paramJson.description]);
                recursive(chilcJsonRequired, chilcJsonProperties, definitions)
            }
        } else {
            createJson(jsonDef[p], "ischild", false);
        }
    }
}

function getResponseModelName(val) {
    if (!val) {
        return null;
    }
    return val.substring(val.lastIndexOf("/") + 1, val.length);
}

//测试按钮，获取数据
function getData(operationId) {
    var path = contextPath + $("[m_operationId='" + operationId + "']").attr("path");
    //path 参数
    $("[p_operationId='" + operationId + "'][in='path']").each(function (index, domEle) {
        var k = $(domEle).attr("name");
        var v = $(domEle).val();
        if (v) {
            path = path.replace("{" + k + "}", v);
        }
    });

    //header参数
    var headerJson = {};
    $("[p_operationId='" + operationId + "'][in='header']").each(function (index, domEle) {
        var k = $(domEle).attr("name");
        var v = $(domEle).val();
        if (v) {
            headerJson[k] = v;
        }
    });

    //请求方式
    var parameterType = $("#content_type_" + operationId).val();

    //query 参数
    var parameterJson = {};
    if ("form" == parameterType) {
        $("[p_operationId='" + operationId + "'][in='query']").each(function (index, domEle) {
            var k = $(domEle).attr("name");
            var v = $(domEle).val();
            if (v) {
                parameterJson[k] = v;
            }
        });
    } else if ("json" == parameterType) {
        var str = $("#text_tp_" + operationId).val();
        try {
            parameterJson = JSON.parse(str);
        } catch (error) {
            layer.msg("" + error, {icon: 5});
            return false;
        }
    }

    //发送请求
    $.ajax({
        type: $("[m_operationId='" + operationId + "']").attr("method"),
        url: path,
        headers: headerJson,
        data: parameterJson,
        dataType: 'json',
        success: function (data) {
            var options = {
                withQuotes: true
            };
            $("#json-response").jsonViewer(data, options);
        }
    });
}


//请求类型
function changeParameterType(el) {
    var operationId = $(el).attr("operationId");
    var type = $(el).attr("type");
    $("#content_type_" + operationId).val(type);
    $(el).addClass("layui-btn-normal").removeClass("layui-btn-primary");
    if ("form" == type) {
        $("#text_tp_" + operationId).hide();
        $("#table_tp_" + operationId).show();
        $("#pt_json_" + operationId).addClass("layui-btn-primary").removeClass("layui-btn-normal");
    } else if ("json" == type) {
        $("#text_tp_" + operationId).show();
        $("#table_tp_" + operationId).hide();
        $("#pt_form_" + operationId).addClass("layui-btn-primary").removeClass("layui-btn-normal");
    }
}
