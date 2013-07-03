// 数据源URL集合
var sourceUrls = [];

// 数据源HTML
var sourceHtmls = [];

// 获取HTML时返回的DTD对象：
var dtdGetHtmls = [];
var dtdBulkGetHtmls = [];

// 获取“实例包含的属性”时返回的DTD对象：
var dtdProperty;

// 从各个Url里面取出来的条目。
var itemsFromUrl = new Array();

var propertyFss = [];
var bagType = undefined;
var itemType = undefined;
var conceptStatus = []; // 用于记录概念是否存在的情况。0：不存在；1：存在；2：存在且在容器中。
var conceptIds = [];
var Status = function(){};
Status.NotExist = 0;
Status.Exist = 1;
Status.ExistAndBag = 2;

var urlData = undefined;

var dlgLogin, dlgSelect, curProject, curUser;

Nagu.Catcher = {
    Project: '1c932f69-5fce-4b70-8e30-33eba57177a9', // 类，描述项目
    ItemType: '7c3117bc-6865-4d84-bbfe-2a76291e873c', // 条目类型
    ItemProcess: '91c2733b-1dea-4dea-83f1-eefd1cf3f2a0', // 条目处理方法
    AppIdForS: 'd4967fab-45a2-4d53-b873-5cd69bc64518', // 可见范围
    UrlTemplate: 'efea4a56-12dd-497b-9c6b-297f7dc902c8', //数据源模板
    UrlStartIndex: '68e10fd0-823f-4687-a196-b3e5242a2dab', // 起始序号
    UrlStepLength: '40790f80-7998-41b0-a1f9-775cec070870', // 步长
    UrlEndIndex: '1492559d-cab1-48e1-8b13-335413494561', // 结束序号
    UrlParamLength: '0567f125-1da9-445b-a36b-ac682e85ffc3', // 占位符长度
    UrlGetterCode: '35ee73e3-f8a7-4e57-8c58-8b049402b00d', // 数据源Url的抓取代码
    ItemGetterCode: '53ff7b16-1062-43aa-a9fb-d2767869b33c', // 条目取值代码
    ItemPvGetterCodeClass: 'e7810347-48f1-445d-bf78-57600a322e55', // 条目属性值取值代码类
    ItemPvGetterCode: '4fbd3a36-5235-46f7-a3cd-44eea82d4a6c', // 条目属性值取值代码
    PvGetterCode: 'ee87ecbc-718e-43fa-8105-a955b8dc83ed', // 属性值取值代码
    PvProcess: 'e12692b9-707d-4c1b-bce6-37e2d6e3c12f' // 属性值处理方法
};

$(function () {

    curProject = getRequest()['id'];
    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
            curUser = me.Id;
        } else { // 未登录
            naguLogout();
        }
    })

    $('#btnClearStorage').btnCleanStorage();

    // 初始化“可见范围”
    Dialog.InitAppList($('#listApps'));
    Dialog.InitAppList($('#listApps2'));

    dlgSelect = new SelectConceptDialog({
        selected: dlgSelect_selected
    });

    listProjects();

});


function getUrls() {
    // 获取参数
    var sourceUrlTplt = $('#sourceUrlTplt').val();
    var step = new Number($('#urlStep').val());
    if (step < 1) step = 1;
    var start = new Number($('#urlStartIndex').val());
    var end = new Number($('#urlEndIndex').val());
    var phLength = new Number($('#urlPhLength').val());
    sourceUrls = [];
    

    // 生成URL：
    var urlGetterCode = $('#urlGetterCode').val();
    var urlGetter = function (sourceUrlTplt, start, step, end, phLength, sourceUrls) { };
    eval('urlGetter = function (sourceUrlTplt, start, step, end, phLength, sourceUrls){' + urlGetterCode + '};');
    $.when(urlGetter(sourceUrlTplt, start, step, end, phLength, sourceUrls))
        .then(function () {
            $('#btnFinishSourceCfg').removeAttr('disabled');
            alert('抓取URL成功，共抓取' + sourceUrls.length + '个URL');
        });
}

// 完成数据源配置
function finishSourceCfg() {
    // 获取源HTML：
    dtdGetHtmls = [];
    for (var i = 0; i < sourceUrls.length; i++) {
        dtdGetHtmls[i] = $.post('/func/wrap/?url=' + sourceUrls[i]).done(function (html) {
            //sourceHtmls[i] = html;
            sourceHtmls[sourceUrls[i]] = html;
        }).fail(function () {
            //sourceHtmls[i] = 'error';
            sourceHtmls[sourceUrls[i]] = 'error';
        });
    }

    // 使用批量方法获得HTML(TODO)
    /*dtdBulkGetHtmls = [];
    var bulkCount = $('#bulkUrlCount').val();
    var j = 0;
    while (j < sourceUrls.length) {
        var urls = [];
        for (var k = 0; j < sourceUrls.length && k < bulkCount; k++, j++) {
            urls.push(sourceUrls[j]);
        }
        dtdBulkGetHtmls = $.post('/func/bulkWrap', {
            urls: SerializeJsonToStr(urls)
        }).done(function (data) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].ret == 0) sourceUrls[data[i].url] = data[i].content;
                else sourceUrls[data[i].url] = 'error';
            }
        });
    }*/

    itemsFromUrl = new Array();

    // 转到下一步
    $('#tab1 a').eq(2).tab('show');
}

// 完成条目类型配置
function finishItemTypeCfg() {
    var ph = $('#itemTypeId');
    var classId = ph.val();
    itemType = undefined;
    Nagu.CM.get(classId).done(function (cla) {
        itemType = cla;
        $('#summary_itemType').text(cla.FriendlyNames[0]);

        // 获取“实例包含的属性，并显示配置单元”
        dtdProperty = Nagu.SM.findBySP(cla.ConceptId, Nagu.MType.Concept, Nagu.Concepts.HasInstancesProperty).done(function (fss) {
            var ph = $('#itemProperties').show();
            ph.statementList(fss, {
                clearBefore: true,
                createItemContainer: function (fs) {
                    return B.divControlGroup().attr('propertyCodeFor', fs.Object.ConceptId);
                },
                renderItem: renderItemPropertiesConfig
            });
        });
    }).fail(function () {
        $('#itemProperties').hide();
        ph.next('span').remove();
        ph.after(B.span().addClass('label label-warning').text('未能找到类型，请确保ID正确'));
    });
    //$('#tab1 a').eq(1).tab('show');
    $('#stepSourceCfg').tab('show');
}

// 完成条目取值代码设置
function finishItemCodeCfg() {
    $('.pagination ul').empty();
    $.each(dtdGetHtmls, function (i, dtd) {
        var a = B.a().attr('index', i).attr('href', '#').text('loading...');
        $('.pagination ul').append(B.li().append(a));
        $.when(dtd).done(function (data) {
            a.text(i + 1).click(function () {
                previewItemsFromUrl($(this).attr('index'));
            });
        }).fail(function () {
            a.remove();
        });
    });

    // 生成预览数据的表格
    $.when(dtdProperty).done(function (fss) {
        // 添加所有“实例包含的属性”到表头中
        var thead = $('#itemTableHead tr');
        thead.children().slice(2).remove();
        $.each(fss, function (i, fs) {
            Nagu.CM.get(fs.Object.ConceptId).done(function (property) {
                B.th().text(property.FriendlyNames[0]).appendTo(thead);
            });
        });
    });
    previewItemsFromUrl(0);
    $('#tab1 a').eq(3).tab('show');
}


// 完成所有条目数据预览
var itemCount = 0;
function finishPreview() {
    itemCount = 0;
    var count = 0;
    $('#summary_urlCount').text(sourceUrls.length);

    // 计算所有条目的数量
    for (var i = 0; i < dtdGetHtmls.length; i++) {
        dtdGetHtmls[i].done(function (data) {
            if (itemsFromUrl[i] === undefined) {
                itemsFromUrl[i] = new Array();
                getItems(data, itemsFromUrl[i]);
            }
            itemCount += itemsFromUrl[i].length;
            $('#summary_itemCount').text(itemCount);
            $('#result_item_count').text(itemCount);
            if (++count < dtdGetHtmls.length)
                $('#summary_itemCount').append('+');
        }).fail(function () {
            if (++count >= dtdGetHtmls.length)
                $('#summary_itemCount').text(itemCount);
                $('#result_item_count').text(itemCount);
        });
    }
    
    $('#tab1 a').eq(4).tab('show');
}


// 完成准备数据概述
function finishSummary() {
}

// 依据名称检索概念是否存在，并将结果显示到指定的div中。
var itemSearching=0, itemSearched=0;
function searchFn(fn, div) {
    div.text('概念查找结果：');
    if (conceptIds[fn] !== undefined) {
        B.spanLabelInfo().text('概念存在').appendTo(div);
        return;
    }
    $('#itemSearchResult').text('正在检查概念是否存在，' + ++itemSearching + '个正在检查, ' + itemSearched + '个已完成。');
    Nagu.CM.search(fn).done(function (cs) {
        if (cs.length == 1) {
            B.spanLabelInfo().text('概念存在').appendTo(div);
            conceptStatus[fn] = Status.Exist;
            conceptIds[fn] = cs[0].ConceptId;
        } else if (cs.length > 1) {
            B.spanLabelWarning().text('概念存在(' + cs.length + ')').appendTo(div);
            conceptStatus[fn] = Status.Exist;
            conceptIds[fn] = cs[0].ConceptId;
        } else {
            B.spanLabel().text('概念不存在').appendTo(div);
            conceptStatus[fn] = Status.NotExist;
        }
        $('#itemSearchResult').text('正在检查概念是否存在，' + --itemSearching + '个正在检查, ' + ++itemSearched + '个已完成。');

    });
}

// 根据从数据源对象获得的item对象和用户设置的代码获取指定属性的值和处理方法
function getPv2(item, propertyId, data) {
    var div = $('div[propertyCodeFor="' + propertyId + '"]');
    var propertyValue;
    var propertyCode = div.find('input').val();
    var clff = div.find('select').val();
    if (propertyCode == '') propertyValue = '';
    else eval('propertyValue= item.' + propertyCode);
    return {
        value: propertyValue,
        process: clff
    };
}


function getItems(data, result) {
    var code = $('#itemGetter').val();

    var itemGetter;
    eval('itemGetter = function (data, items) {' + code + '}');
    itemGetter(data, result);
}

// 预览条目取值方法
function previewItems() {
    var ph = $('#previewItemsResult').empty();
    ph.text('取值结果（仅显示前三个Url中每个Url数据的前十个条目）：');

    $.each(dtdGetHtmls, function (i, dtd) {
        if (i > 2) return;
        var div = B.div().text('loading...').appendTo(ph);
        itemsFromUrl[i] = new Array();
        $.when(dtd).done(function (data) {
            div.text('第' + (i + 1) + '个Url中抓取的条目：');
            var code = $('#itemGetter').val();
            
            var itemGetter = function (data, items) { };
            eval('itemGetter = function (data, items) {' + code + '}');
            itemGetter(data, itemsFromUrl[i]);
            $.each(itemsFromUrl[i], function (j, item) {
                if (j >= 10) return;
                var itemString = item.fn + '(' + item.desc + ')';
                div.append(B.spanBadge().text(itemString));
            });
        }).fail(function () {
            div.text('第' + (i + 1) + '个Url的条目读取失败');
        });
    });
}

// 在表格中预览指定Url的数据
function previewItemsFromUrl(index) {
    var tbody = $('#itemTable').empty();
    $('#tabItemPreview').find('h3').text('当前数据源：' + (Number(index) + 1) + '/' + dtdGetHtmls.length);
    $.when(dtdGetHtmls[index], dtdProperty).done(function (a1, fss) {
        var data = a1[0];
        //var body = getSourceObject(data);
        if (itemsFromUrl[index] === undefined) {
            itemsFromUrl[index] = new Array();
            getItems(data, itemsFromUrl[index]);
        }
        $.each(itemsFromUrl[index], function (i, item) {

            // 添加序号到条目表格中：
            var tr = B.tr().appendTo(tbody);
            B.td().text(i + 1).appendTo(tr);

            // 添加概念名称到表格中
            var fn = item.fn;
            var div = B.div();
            var inputFn = B.input().val(fn).change(function () {
                searchFn($(this).val(), div);
            }).change();
            var desc = item.desc;
            var inputDesc = B.input().val(desc);
            B.td().append(inputFn).append(div).append(inputDesc).appendTo(tr);

            // 添加所有“实例包含的属性”到表格中
            $.each(fss, function (i, fs) {
                var pv = getPv2(item, fs.Object.ConceptId, data);
                var input = B.input().val(pv.value);
                B.td().attr('pvFor', fs.Object.ConceptId).append(input).appendTo(tr);
                if (pv.process == '0' || pv.process == '4') {
                    var div = B.div().insertAfter(input);
                    input.change(function () {
                        var fn = $.trim($(this).val());
                        if (fn != '') searchFn(fn, div);
                    });
                    input.change();
                }
            });

        });
    });
}

function renderItemPropertiesConfig(typeFs, ph) {
    Nagu.CM.get(typeFs.Object.ConceptId).done(function (type) {
        var label = B.labelControlLabel().appendTo(ph)
            .text('“' + type.FriendlyNames[0] + '”值的选取代码：');
        var controls = B.divControls().appendTo(ph);

        var input = B.input().appendTo(controls);
        B.span().text('处理方式：').appendTo(controls);
        var select = B.select().appendTo(controls);
        B.option().text('发现同名概念时自动使用，否则当作文本添加').val(4).appendTo(select);
        B.option().text('作为文本添加').val(1).appendTo(select);
        /*
        由于创建概念用的是异步方法，因此导致同名的属性值会被重复创建，出现脏数据。
        所以，下面两种选项暂时无法使用
        B.option().text('发现同名概念时自动使用，否则创建新概念').val(0).appendTo(select);
        B.option().text('无论何时都创建新概念').val(2).appendTo(select);
        */

        $('#propertyCodeRef').clone().appendTo(controls);

    });
}

var properties, itemDone = 0, itemFail = 0, itemCreating, itemCreated;

function catchData() {

    // 初始化抓取结果界面
    itemDone = 0;
    itemFail = 0;
    itemCreating = 0;
    itemCreated = 0;
    $('#result_url_count').text(dtdGetHtmls.length);
    var urlDone = 0;
    $('#result_url_index').text(urlDone);
    //$('#result_item_count').text(urlDone);
    $('#result_item_fail').text(urlDone);
    $('#errorList').empty();

    for (var i = 0; i < dtdGetHtmls.length; i++) {
        // 逐个url抓取
        $.when(dtdGetHtmls[i]).done(function (data) {
            catchFromUrl(i, data).done(function () {
                $('#result_url_index').text(++urlDone);
                if (urlDone == dtdGetHtmls.length) alert('抓取完成');
            });
        }).fail(function () {
            $('#errorList').append(B.li().append('第' + (i + 1) + '个URL抓取失败：' + sourceUrls[i]));
            $('#result_url_index').text(++urlDone);
            if (urlDone == dtdGetHtmls.length) alert('抓取完成');
        });
    }
}

function catchFromUrl(index, data) {
    var dtds = [];

    if (itemsFromUrl[index] === undefined) {
        itemsFromUrl[index] = new Array();
        getItems(data, itemsFromUrl[index]);
    }
    $.each(itemsFromUrl[index], function (i, item) {
        dtds.push(catchItem(i, item, data, index));
    });
    return $.when.apply($, dtds);
}


function catchItem(index, item, data, urlIndex) {
    var dtd = $.Deferred();

    var fn = item.fn;
    var desc = item.desc;

    if (fn == '') {
        $('#errorList').append(B.li().append('第' + (urlIndex + 1) + '个URL(' + sourceUrls[index] + ')中的第'+(index+1)+'个条目名称为空。'));
        $('#result_item_fail').text(++itemFail);
        dtd.resolve();
        return dtd.promise();
    }

    // 1. 创建或找到已存在的概念
    ensureConceptExist(fn, desc).done(function (c) {
        $.when(dtdProperty).done(function (fss) {
            properties = fss;
            $.when(/*catchItemPv(c, item, data)*/catchItemPv2(c, item, data, fss)).done(function () {
                $('#result_item_index').text(++itemDone);
                dtd.resolve();
            });
        });
    });
    return dtd.promise();
}

// 使用批量创建语句，一次性插入所有属性值。
function catchItemPv2(c, item, data, properties) {
    var dtds = [];

    // 3. 确保概念具有指定的类型
    dtds.push(ensureConceptType(c.ConceptId));

    var dtdPvs = [];
    // 生成每一个属性值的语句：
    var statements = [];
    $.each(properties, function (i, property) {
        var propertyId = property.Object.ConceptId;
        var pv = getPv2(item, propertyId, data);
        if (pv.value == '') {
            return;
        }
        var dtd = $.Deferred();
        dtdPvs.push(dtd);

        var statTplt = {
            SubjectId: c.ConceptId,
            SType: Nagu.MType.Concept,
            PredicateId: propertyId,
            AppId: ''
        };  
        switch (pv.process) {
            case '0': // 发现同名概念就使用
                
                break;
            case '1': // 作为文本使用
                var statement = {
                    Object: pv.value,
                    OType: Nagu.MType.Literal
                };
                statement = $.extend(statTplt, statement);
                statements.push(statement);
                dtd.resolve(statement);
                break;
            case '2': // 无论如何创建新概念
                Nagu.Cm.create(pv.value, pv.value).done(function (pv2) {
                    var statement = {
                        Object: pv2.ConceptId,
                        OType: Nagu.MType.Concept
                    };
                    statement = $.extend(statTplt, statement);
                    statements.push(statement);
                    dtd.resolve(statement);
                });
                break;
            case '4': //发现同名概念则使用，否则当作文本添加
                if (conceptIds[pv.value] !== undefined) { //已存在
                    var statement = {
                        Object: conceptIds[pv.value],
                        OType: Nagu.MType.Concept
                    };
                    statement = $.extend(statTplt, statement);
                    statements.push(statement);
                    dtd.resolve(statement);
                } else if (conceptStatus[pv.value] == Status.NotExist) { //不存在
                    var statement = {
                        Object: pv.value,
                        OType: Nagu.MType.Literal
                    };
                    statement = $.extend(statTplt, statement);
                    statements.push(statement);
                    dtd.resolve(statement);
                } else { //不知道存不存在
                    Nagu.CM.search(pv.value).done(function (cs) {
                        if (cs.length > 0) {
                            conceptIds[pv.value] = cs[0].ConceptId;
                            conceptStatus[pv.value] = Status.Exist;
                        } else {
                            conceptStatus[pv.value] = Status.NotExist;
                        }
                        var statement = {
                            Object: cs.length > 0 ? cs[0].ConceptId : pv.value,
                            OType: cs.length > 0 ? Nagu.MType.Concept : Nagu.MType.Literal
                        };
                        statement = $.extend(statTplt, statement);
                        statements.push(statement);
                        dtd.resolve(statement);
                    });
                }
                break;
        }

    });

    var dtd2 = $.Deferred();
    dtds.push(dtd2);

    $.when.apply($, dtdPvs).done(function (a1, a2, a3, a4, a5) {
        Nagu.SM.bulkCreate(statements).done(function (fss) {
            dtd2.resolve();
        });
    });
    return $.when.apply($, dtds);

}

// 根据当前td为当前概念添加属性值
function catchItemPv(c, item, data) {
    var dtds = [];

    // 3. 确保概念具有指定的类型
    dtds.push(ensureConceptType(c.ConceptId));

    $.each(properties, function (i, property) {
        var propertyId = property.Object.ConceptId;
        var pv = getPv2(item, propertyId, data);

        var dtd = $.Deferred();
        dtds.push(dtd);
        if (pv.value == '') {
            dtd.resolve();
            return;
        }

        switch (pv.process) {
            case '0': // 发现同名概念就使用
                ensureConceptExist(pv.value, pv.value).done(function (pv2) {
                    Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv2.ConceptId).done(function () {
                        dtd.resolve();
                    });
                });
                break;
            case '1': // 作为文本使用
                Nagu.CM.addLiteralPropertyValue(c.ConceptId, propertyId, pv.value).done(function () {
                    dtd.resolve();
                });
                break;
            case '2': // 无论如何创建新概念
                Nagu.Cm.create(pv.value, pv.value).done(function (pv2) {
                    Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv2.ConceptId).done(function () {
                        dtd.resolve();
                    });
                });
                break;
            case '4': //发现同名概念则使用，否则当作文本添加
                if (conceptIds[pv.value] !== undefined) {
                    Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, conceptIds[pv.value]).done(function () {
                        dtd.resolve();
                    });
                } else if (conceptStatus[pv.value] == Status.NotExist) {
                    Nagu.CM.addLiteralPropertyValue(c.ConceptId, propertyId, pv.value).done(function () {
                        dtd.resolve();
                    });
                } else {
                    Nagu.CM.search(pv.value).done(function (cs) {
                        if (cs.length > 0) {
                            conceptIds[pv.value] = cs[0].ConceptId;
                            conceptStatus[pv.value] = Status.Exist;
                            Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, conceptIds[pv.value]).done(function () {
                                dtd.resolve();
                            });
                        } else {
                            conceptStatus[pv.value] = Status.NotExist;
                            Nagu.CM.addLiteralPropertyValue(c.ConceptId, propertyId, pv.value).done(function () {
                                dtd.resolve();
                            });
                        }
                    });
                }
                break;
        }

    });
    return $.when.apply($, dtds);

}

function ensureConceptExist(fn, desc) {
    var dtd = $.Deferred();
    var process = $('#itemProcess').val();
    $('#curOpt').text('正在创建概念，' + ++itemCreating + '个在创建中, ' + itemCreated + '个已完成。');
    switch (process) {
        case '0': //发现同名概念时自动选用，否则创建新的
            if (conceptIds[fn] !== undefined)
                Nagu.CM.get(conceptIds[fn]).done(function (c) {
                    $('#curOpt').text('正在创建概念，' + --itemCreating + '个在创建中, ' + ++itemCreated + '个已完成。');
                    dtd.resolve(c);
                });
            else if (conceptStatus[fn] = Status.NotExist) {
                Nagu.CM.create(fn, desc).done(function (c) {
                    conceptIds[fn] = c.ConceptId;
                    conceptStatus[fn] = Status.Exist;
                    $('#curOpt').text('正在创建概念，' + --itemCreating + '个在创建中, ' + ++itemCreated + '个已完成。');
                    dtd.resolve(c);
                });
            } else {
                Nagu.CM.search(fn).done(function (cs) {
                    if (cs.length > 0) {
                        conceptIds[fn] = cs[0].ConceptId;
                        conceptStatus[fn] = Status.Exist;
                        $('#curOpt').text('正在创建概念，' + --itemCreating + '个在创建中, ' + ++itemCreated + '个已完成。');
                        dtd.resolve(cs[0]);
                    } else {
                        Nagu.CM.create(fn, desc).done(function (c) {
                            conceptIds[fn] = c.ConceptId;
                            conceptStatus[fn] = Status.Exist;
                            $('#curOpt').text('正在创建概念，' + --itemCreating + '个在创建中, ' + ++itemCreated + '个已完成。');
                            dtd.resolve(c);
                        });
                    }
                });
            }
            break;
        case '1': // 只有同名概念同时具有类型时才自动选用(TODO)
            break;
        case '2':
            Nagu.CM.create(fn, desc).done(function (c) {
                $('#curOpt').text('正在创建概念，' + --itemCreating + '个在创建中, ' + ++itemCreated + '个已完成。');
                dtd.resolve(c);
            });
            break;
    }
    
    return dtd.promise();
}

function ensureConceptType(cid) {
    return Nagu.CM.get(cid).done(function (c) {
        for (var i = 0; i < c.TypeFss.length; i++) {
            if (c.TypeFss[i].Object.ConceptId == itemType.ConceptId) return;
        }
        Nagu.CM.addRdfType(cid, itemType.ConceptId);
    });
}



// 当nagu未登录或用户退出之后
function naguLogout() {
    $('.nagu-logged').hide();
    $('.nagu-logout').show();

    if (dlgLogin === undefined) {
        dlgLogin = new LoginDialog({
            success: function (me) {
            }
        });
    }
    dlgLogin.modal('show');
}

// 当nagu登录成功之后
function afterNaguLogin(me) {

    $('.nagu-logged').show();
    $('.nagu-logout').hide();

    // 显示“我的帐户”
    $('#accountInfo').attr('href', '/apps/public/concept.html?id=' + me.Id);

    // 如果QQ已绑定，显示QQ图标。
    if (me.QcOpenId != '') {
        var qqimg = $('<img/>').attr('src', 'http://qzonestyle.gtimg.cn/qzone/vas/opensns/res/img/Connect_logo_1.png');
        $('#accountInfo').prepend(qqimg);
    }

    // 获取当前项目信息
    curProject = getRequest()['id'];
    if (curProject === undefined || curProject == '') {
    } else {
        
    }

}


function saveProject() {
    
    var pFn = $('#projectFn').val();
    if(pFn == '') return;

    var pDesc = $('#projectDesc').val();
    var pAppId = curUser;//$('#listApps2').val();
    var itemTypeId = $('#itemTypeId').val();
    var itemProcess = $('#itemProcess').val();
    var appIdForS = $('#listApps').val();
    var urlTemplate = $('#sourceUrlTplt').val();
    var urlStartIndex = $('#urlStartIndex').val();
    var urlStepLength = $('#urlStep').val();
    var urlEndIndex = $('#urlEndIndex').val();
    var urlParamLength = $('#urlPhLength').val();
    var itemGetterCode = $('#itemGetter').val();
    var urlGetterCode = $('#urlGetterCode').val();


    $.when(PM.getOrNew(curProject, pFn, {
        appId: pAppId
    })).done(function (p, fs) {
        $.when(PM.renew(p.ConceptId, pFn, pDesc, { appId: pAppId }),
        PM.resetItemType(p.ConceptId, itemTypeId, { appId: pAppId }),
        PM.resetItemProcess(p.ConceptId, itemProcess, { appId: pAppId }),
        PM.resetAppIdForS(p.ConceptId, appIdForS, { appId: pAppId }),
        PM.resetUrlTemplate(p.ConceptId, urlTemplate, { appId: pAppId }),
        PM.resetUrlStartIndex(p.ConceptId, urlStartIndex, { appId: pAppId }),
        PM.resetUrlStepLength(p.ConceptId, urlStepLength, { appId: pAppId }),
        PM.resetUrlEndIndex(p.ConceptId, urlEndIndex, { appId: pAppId }),
        PM.resetUrlParamLength(p.ConceptId, urlParamLength, { appId: pAppId }),
        PM.resetItemGetterCode(p.ConceptId, itemGetterCode, { appId: pAppId }),
        PM.resetUrlGetterCode(p.ConceptId, urlGetterCode, { appId: pAppId })
        ).done(function () {
            // 更新左边导航条,TODO:出处无法显示新保存的项目
            //listProjects().done(function () {
            //    curProject = p.ConceptId;
            //});
            alert('保存完成，将在刷新页面后生效。');
            window.location = '/apps/catcher/bulk.html?id=' + p.ConceptId;
        });
        
    });
}

function listProjects() {
    var dtd = $.Deferred();
    Nagu.SM.findByPO(Nagu.Rdf.Type, Nagu.Catcher.Project, Nagu.MType.Concept).done(function (fss) {
        $('#projectList').statementList(fss, {
            clearBefore: true,
            renderItem: function (statement, li) {
                li.appendConcept(statement.Subject.ConceptId);
                li.find('a').click(function () {
                    curProject = statement.Subject.ConceptId;
                    showProject(statement.StatementId);
                    li.siblings().removeClass('active');
                    li.addClass('active');
                });
            }
        });
        if (curProject !== undefined && curProject != '') {
            $('#projectList li a[conceptId="' + curProject + '"]').click();
        } else { // 显示第一个项目
            $('#projectList li a').first().click();
        }
        dtd.resolve();
    });
    return dtd.promise();
}

function showProject(pFsId) {
    $('.span9').show();
    $('#tab1 a').eq(0).tab('show');
    Nagu.SM.get(pFsId).done(function (pFs) {
        var appId = pFs.AppId;
        if (appId == Nagu.App.Public) appId = '';
        $('listApps2').val(appId);
        $('#tab1 a').eq(0).tab('show');
        Nagu.CM.get(pFs.Subject.ConceptId).done(function (p) {
            $('#projectFn').val(p.FriendlyNames[0]);
            $('#projectDesc').val(p.Descriptions[0]);
        });

        $('#itemTypeId').val('');
        $('#itemProcess').val('');
        $('#listApps').val('');
        $('#sourceUrlTplt').val('');
        $('#urlStartIndex').val('');
        $('#urlStep').val('');
        $('#urlEndIndex').val('');
        $('#urlPhLength').val('');
        $('#itemGetter').val('');
        $('#urlGetterCode').val('');

        PM.get(pFs.Subject.ConceptId).done(function (project) {
            // 设置条目类型及附属内容：
            dlgSelect_selected(project.ItemTypeId);
            $('#itemProcess').val(project.ItemProcess);
            $('#listApps').val(project.AppIdForS);
            $('#sourceUrlTplt').val(project.UrlTemplate);
            $('#urlStartIndex').val(project.UrlStartIndex);
            $('#urlStep').val(project.UrlStepLength);
            $('#urlEndIndex').val(project.UrlEndIndex);
            $('#urlPhLength').val(project.UrlParamLength);
            $('#itemGetter').val(project.ItemGetterCode);
            $('#urlGetterCode').val(project.UrlGetterCode);
        });
    });
}

function newProject() {
    curProject = '';
    $('.span9').show();
    $('#tab1 #stepSaveProject').tab('show');
}

var ProjectManager = function () { };

ProjectManager.prototype.getOrNew = function (pid, fn, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    if (pid === undefined || pid == '') {
        Nagu.CM.create(fn, '', options).done(function (p) {
            Nagu.CM.addRdfType(p.ConceptId, Nagu.Catcher.Project, options).done(function (fs) {
                dtd.resolve(p, fs);
            });
        });
    } else {
        Nagu.CM.get(pid).done(function (p) { dtd.resolve(p); });
    }
    return dtd.promise();
};

ProjectManager.prototype.renew = function (pid, fn, desc, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    this.getOrNew(pid, fn, options).done(function (p) {
        // 设置是否需要重置名称和描述的标识：
        var needSetFn = true, needSetDesc = true;

        // 检查是否需要重置名称，并删除不需要的名称：
        for (var i = 0; i < p.FriendlyNameFss.length; i++) {
            if (p.FriendlyNames[i] != fn)
                Nagu.SayM.dontSay(p.FriendlyNameFss[i].StatementId);
            else needSetFn = false;
        }

        // 检查是否需要重置描述，并删除不需要的描述
        for (var i = 0; i < p.DescriptionFss.length; i++) {
            if (p.DescriptionFss[i].StatementId == Nagu.App.Public) continue;

            if (p.Descriptions[i] != desc)
                Nagu.SayM.dontSay(p.DescriptionFss[i].StatementId);
            else needSetDesc = false;
        }

        // 如果需要重置名称或属性，则重置后返回；否则直接返回。
        if (needSetFn ||
            (needSetDesc && desc != ''))
            Nagu.CM.create(fn, desc, {
                id: pid
            }).done(function (p) {
                dtd.resolve(p);
            });
        else dtd.resolve(p);
    });
    return dtd.promise();
};

ProjectManager.prototype.resetItemType = function (pid, typeId, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.ItemType, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.ConceptId != typeId)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        // 如果不需要重置，或typeId为空，则直接返回。
        if (!needReset || typeId == '') dtd.resolve();
        else Nagu.CM.addConceptPropertyValue2(pid, Nagu.Catcher.ItemType, typeId, options).done(function (fs) {
            dtd.resolve(fs);
        });
    });
    return dtd.promise();
};

ProjectManager.prototype.resetItemProcess = function (pid, process, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.ItemProcess, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != process)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.ItemProcess, process, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetAppIdForS = function (pid, appIdForS, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.AppIdForS, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.ConceptId != appIdForS)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addConceptPropertyValue2(pid, Nagu.Catcher.AppIdForS, appIdForS, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlTemplate = function (pid, urlTemplate, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlTemplate, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlTemplate)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlTemplate, urlTemplate, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlStartIndex = function (pid, urlStartIndex, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlStartIndex, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlStartIndex)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlStartIndex, urlStartIndex, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlStepLength = function (pid, urlStepLength, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlStepLength, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlStepLength)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlStepLength, urlStepLength, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlEndIndex = function (pid, urlEndIndex, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlEndIndex, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlEndIndex)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlEndIndex, urlEndIndex, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlParamLength = function (pid, urlParamLength, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlParamLength, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlParamLength)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlParamLength, urlParamLength, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};

ProjectManager.prototype.resetUrlGetterCode = function (pid, urlGetterCode, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.UrlGetterCode, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != urlGetterCode)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.UrlGetterCode, urlGetterCode, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};


ProjectManager.prototype.resetItemGetterCode = function (pid, itemGetterCode, options) {
    var dtd = $.Deferred();
    var defaults = {
        appId: ''
    };
    options = $.extend(defaults, options);
    Nagu.SM.findBySP(pid, Nagu.MType.Concept, Nagu.Catcher.ItemGetterCode, options).done(function (fss) {
        //设置是否需要重置值的标识：
        var needReset = true;
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value != itemGetterCode)
                Nagu.SayM.dontSay(fss[i].StatementId);
            else needReset = false;
        }
        if (needReset)
            Nagu.CM.addLiteralPropertyValue(pid, Nagu.Catcher.ItemGetterCode, itemGetterCode, options).done(function (fs) {
                dtd.resolve(fs);
            });
        else dtd.resolve();
    });
    return dtd.promise();
};


ProjectManager.prototype.get = function (pid) {
    var dtd = $.Deferred();

    // 清空缓存
    if (PvsFromBaseClass[pid] && PvsFromBaseClass[pid][Nagu.Catcher.Project])
        PvsFromBaseClass[pid][Nagu.Catcher.Project] = undefined;
    propertyValuesFormBaseClass(pid, Nagu.MType.Concept, Nagu.Catcher.Project).done(function (pvs) {
        var project = {};
        $.each(pvs, function (i, pv) {
            if (pv.Value.length == 0) return;
            switch (pv.Key) {
                case Nagu.Catcher.ItemType:
                    project.ItemTypeId = pv.Value[0].Object.ConceptId;
                    break;
                case Nagu.Catcher.ItemProcess:
                    project.ItemProcess = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.AppIdForS:
                    project.AppIdForS = pv.Value[0].Object.ConceptId;
                    break;
                case Nagu.Catcher.UrlTemplate:
                    project.UrlTemplate = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.UrlStartIndex:
                    project.UrlStartIndex = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.UrlStepLength:
                    project.UrlStepLength = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.UrlEndIndex:
                    project.UrlEndIndex = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.UrlParamLength:
                    project.UrlParamLength = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.ItemGetterCode:
                    project.ItemGetterCode = pv.Value[0].Object.Value;
                    break;
                case Nagu.Catcher.UrlGetterCode:
                    project.UrlGetterCode = pv.Value[0].Object.Value;
            }
                
        });
        
        dtd.resolve(project);
    });
    return dtd.promise();
};



var PM = new ProjectManager();

// 回调函数

function dlgSelect_selected(conceptId) {
    $('#itemTypeId').val(conceptId);
    $('#summary_itemType').text('');
    $('#itemTypeFn').text('');
    if (conceptId === undefined || conceptId == '') return;

    Nagu.CM.get(conceptId).done(function (c) {
        $('#itemTypeFn').text(c.FriendlyNames[0]);
        $('#summary_itemType').text(c.FriendlyNames[0]);
    });
}