// 数据源URL集合
var sourceUrls = [];

// 数据源HTML
var sourceHtmls = [];

// 获取HTML时返回的DTD对象：
var dtdGetHtmls = [];

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

var dlgLogin, dlgSelect;

$(function () {

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    })

    $('#btnClearStorage').btnCleanStorage();

    // 初始化“可见范围”
    Dialog.InitAppList($('#listApps'));

    dlgSelect = new SelectConceptDialog({
        selected: function (conceptId) {
            $('#itemTypeId').val(conceptId);
            Nagu.CM.get(conceptId).done(function (c) {
                $('#itemTypeFn').text(c.FriendlyNames[0]);
                $('#summary_itemType').text(c.FriendlyNames[0]);
            });
        }
    });

});

// 完成数据源配置
function finishSourceCfg() {
    // 获取参数
    var sourceUrlTplt = $('#sourceUrlTplt').val();
    var step = new Number($('#urlStep').val());
    var startIndex = new Number($('#urlStartIndex').val());
    var endIndex = new Number($('#urlEndIndex').val());
    var phLength = new Number($('#urlPhLength').val());
    sourceUrls = [];
    dtdGetHtmls = [];

    // 生成URL：
    for (var i = startIndex; i < endIndex + 1; i = i + step) {
        sourceUrls.push(sourceUrlTplt.replace(/{p1}/g, i));
    }

    // 获取源HTML：
    for (var i = 0; i < sourceUrls.length; i++) {
        dtdGetHtmls[i] = $.post('/func/wrap/?url=' + sourceUrls[i]).done(function (html) {
            sourceHtmls[i] = html;
        }).fail(function () {
            sourceHtmls[i] = 'error';
        });
    }

    itemsFromUrl = new Array();

    // 转到下一步
    $('#tab1 a').eq(1).tab('show');
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
    $('#tab1 a').eq(2).tab('show');
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
            var body = getSourceObject(data);
            //itemCount += body.size();
            itemCount += itemsFromUrl[i].length;
            $('#summary_itemCount').text(itemCount);
            if (++count < dtdGetHtmls.length)
                $('#summary_itemCount').append('+');
        }).fail(function () {
            if (++count >= dtdGetHtmls.length)
                $('#summary_itemCount').text(itemCount);
        });
    }
    
    $('#tab1 a').eq(4).tab('show');
}


// 完成准备数据概述
function finishSummary() {
}

// 依据名称检索概念是否存在，并将结果显示到指定的div中。
function searchFn(fn, div) {
    div.text('概念查找结果：');
    if (conceptIds[fn] !== undefined) {
        B.spanLabelInfo().text('概念存在').appendTo(div);
        return;
    }
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
    });
}



//根据从Url获得的数据获得数据源的jQuery对象
function getSourceObject(data) {
    var body = $(data);
    var code = $('#sourceSelectCode').val();
    if (code != '') eval('body = ' + code);
    return body;
}

// 根据从数据源对象获得的item对象和用户设置的代码获取Fn：
function getFn(item, data){
    var fnCode = $('#fnCode').val();
    var dataItem = $(item);
    var fn = '';
    eval('fn= ' + fnCode);
    return fn;
}

// 根据从数据源对象获得的item对象和用户设置的代码获取Desc：
function getDesc(item, data){
    var descCode = $('#descCode').val();
    var dataItem = $(item);
    var desc = '';
    eval('desc= ' + descCode);
    return desc;
}

// 根据从数据源对象获得的item对象和用户设置的代码获取指定属性的值和处理方法
function getPv(item, propertyId, data) {
    var dataItem = $(item);
    var div = $('div[propertyCodeFor="' + propertyId + '"]');
    var propertyValue;
    var propertyCode = div.find('input').val();
    var clff = div.find('select').val();
    if (propertyCode == '') propertyCode = '""';
    eval('propertyValue= ' + propertyCode);
    return {
        value: propertyValue,
        process: clff
    };
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


// 预览数据源对象，并显示获取条目的数据
function previewSourceData() {
    var ph = $('#sourceDataSize').empty();
    ph.append('选取结果（仅显示前十个Url）：');
    $.each(dtdGetHtmls, function (i, dtd) {
        if (i >= 10) return;
        var span = B.spanBadge().text('loading...').appendTo(ph);
        $.when(dtd).done(function (data) {
            var body = getSourceObject(data);
            span.text(body.length);
        }).fail(function () {
            span.text('Error');
        });
    });
}

// 预览条目名称的取值结果
function previewFn() {
    var ph = $('#previewFnResult').empty();
    ph.append('取值结果（仅显示前三个Url中每个Url数据的前十个条目）：');
    $.each(dtdGetHtmls, function (i, dtd) {
        if (i > 2) return;
        var div = B.div().text('loading...').appendTo(ph);
        $.when(dtd).done(function (data) {
            div.text('第' + (i + 1) + '个Url的条目名称：');
            var body = getSourceObject(data);
            $.each(body, function (j, item) {
                var dataItem = $(item);
                if (j >= 10) return;
                var fn = getFn(item, data);
                div.append(B.spanBadge().text(fn));
            });
        }).fail(function () {
            div.text('第' + (i + 1) + '个Url的条目读取失败');
        });
    });
}

// 预览条目简介的取值结果
function previewDesc() {
    var ph = $('#previewDescResult').empty();
    ph.text('取值结果（仅显示前三个Url中每个Url数据的前十个条目）：');

    $.each(dtdGetHtmls, function (i, dtd) {
        if (i > 2) return;
        var div = B.div().text('loading...').appendTo(ph);
        $.when(dtd).done(function (data) {
            div.text('第' + (i + 1) + '个Url的条目简介：');
            var body = getSourceObject(data);
            $.each(body, function (j, item) {
                if (j >= 10) return;
                var desc = getDesc(item,data);
                div.append(B.spanBadge().text(desc));
            });
        }).fail(function () {
            div.text('第' + (i + 1) + '个Url的条目读取失败');
        });
    });
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
        var body = getSourceObject(data);
        $.each(body, function (i, objPh) {

            // 添加数据到条目表格中：
            var tr = B.tr().appendTo(tbody);
            B.td().text(i + 1).appendTo(tr);

            // 添加概念名称到表格中
            var fn = getFn(objPh, data);
            var div = B.div();
            var inputFn = B.input().val(fn).change(function () {
                searchFn($(this).val(), div);
            }).change();
            var desc = getDesc(objPh, data);
            var inputDesc = B.input().val(desc);
            B.td().append(inputFn).append(div).append(inputDesc).appendTo(tr);

            // 添加所有“实例包含的属性”到表格中
            $.each(fss, function (i, fs) {
                var pv = getPv(objPh, fs.Object.ConceptId, data);
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

var properties, itemDone = 0, itemFail = 0;
function catchData() {

    // 初始化抓取结果界面
    itemDone = 0;
    itemFail = 0;
    $('#result_url_count').text(dtdGetHtmls.length);
    $('#result_item_count').text(itemCount);
    var urlDone = 0;
    $('#result_url_index').text(urlDone);
    $('#result_item_count').text(urlDone);
    $('#result_item_fail').text(urlDone);
    $('#errorList').empyt();

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

    var body = getSourceObject(data);
    $.each(body, function (i, item) {
        dtds.push(catchItem(i, item, data, index));
    });
    return $.when.apply($, dtds);
}


function catchItem(index, item, data, urlIndex) {
    var dtd = $.Deferred();

    var body = getSourceObject(data);
    var fn = getFn(item, data);
    var desc = getDesc(item, data);

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
            $.when(catchItemPv(c, item, data)).done(function () {
                $('#result_item_index').text(++itemDone);
                dtd.resolve();
            });
        });
    });
    return dtd.promise();
}

// 根据当前td为当前概念添加属性值
function catchItemPv(c, item, data) {
    var dtds = [];

    // 3. 确保概念具有指定的类型
    dtds.push(ensureConceptType(c.ConceptId));

    $.each(properties, function (i, property) {
        var propertyId = property.Object.ConceptId;
        var pv = getPv(item, propertyId, data);

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
    $('#curOpt').text('正在创建名为“' + fn + '”的概念');
    switch (process) {
        case '0': //发现同名概念时自动选用，否则创建新的
            if (conceptIds[fn] !== undefined)
                Nagu.CM.get(conceptIds[fn]).done(function (c) {
                    dtd.resolve(c);
                });
            else if (conceptStatus[fn] = Status.NotExist) {
                Nagu.CM.create(fn, desc).done(function (c) {
                    conceptIds[fn] = c.ConceptId;
                    conceptStatus[fn] = Status.Exist;
                    dtd.resolve(c);
                });
            } else {
                Nagu.CM.search(fn).done(function (cs) {
                    if (cs.length > 0) {
                        conceptIds[fn] = cs[0].ConceptId;
                        conceptStatus[fn] = Status.Exist;
                        dtd.resolve(cs[0]);
                    } else {
                        Nagu.CM.create(fn, desc).done(function (c) {
                            conceptIds[fn] = c.ConceptId;
                            conceptStatus[fn] = Status.Exist;
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

}