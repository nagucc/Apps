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

var dlgLogin;

$(function () {
    $('input').change();
    var htmlDataChanged = function () {
        if ($('#htmlData').val() == '')
            $('#btnToPart3').attr('disabled', 'disabled');
        else $('#btnToPart3').removeAttr('disabled');
    };
    $('#htmlData').change(htmlDataChanged).bind('keyup', htmlDataChanged);

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    })

    $('#btnClearStorage').btnCleanStorage();

});

function getUrlData() {
    var url = $('#url').val();

    $('#ifr').unbind().load(function () {
        urlData = this.contentWindow.document;
        $('#htmlData').val('<body>' + this.contentWindow.document.body.innerHTML + '</body>').change();
    });

    $('#ifr').attr('src', '/func/wrap/?url=' + url);
}
function preview() {
    if ($('#htmlData').val().trim() == '') alert('还未获取网页数据');
    else ifram_load();
}

function checkBag(sender) {
    var ph = $(sender);
    var bagId = ph.val();
    bagType = undefined;
    $('#part1').find('button').attr('disabled', 'disabled');
    Nagu.CM.get(bagId).done(function (bag) {
        bagType = bag;
        ph.next('span').remove();
        ph.after(B.span().addClass('label label-success').text('当前容器：' + bag.FriendlyNames[0]));
        $('#summary_bag').text(bag.FriendlyNames[0]);

        if (itemType !== undefined) $('#part1').find('button').removeAttr('disabled');
    }).fail(function () {
        ph.next('span').remove();
        ph.after(B.span().addClass('label label-warning').text('未能找到容器，请确保ID正确'));
    });
}

function checkClass(sender) {
    var ph = $(sender);
    var classId = ph.val();
    itemType = undefined;
    $('#part1').find('button').attr('disabled', 'disabled');
    Nagu.CM.get(classId).done(function (cla) {
        itemType = cla;
        ph.next('span').remove();
        ph.after(B.span().addClass('label label-success').text('当前条目类型：' + cla.FriendlyNames[0]));
        $('#summary_itemType').text(cla.FriendlyNames[0]);

        // 获取“实例包含的属性，并显示配置单元”
        propertyFss = [];
        Nagu.SM.findBySP(cla.ConceptId, Nagu.MType.Concept, Nagu.Concepts.HasInstancesProperty).done(function (fss) {
            propertyFss = fss;
            var ph = $('#itemProperties').show();
            ph.statementList(fss, {
                clearBefore: true,
                createItemContainer: function (fs) {
                    return B.divControlGroup().attr('propertyCodeFor', fs.Object.ConceptId);
                },
                renderItem: renderItemPropertiesConfig
            });
            if (bagType !== undefined) $('#part1').find('button').removeAttr('disabled');

        });
    }).fail(function () {
        $('#itemProperties').hide();
        ph.next('span').remove();
        ph.after(B.span().addClass('label label-warning').text('未能找到类型，请确保ID正确'));
    });
}

function renderItemPropertiesConfig(typeFs, ph) {
    Nagu.CM.get(typeFs.Object.ConceptId).done(function (type) {
        var label = B.labelControlLabel().appendTo(ph)
            .text('属性“' + type.FriendlyNames[0] + '”值的选取代码：');
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

function ifram_load() {
    //var body = $(urlData.body);
    var body = $($('#htmlData').val().trim());

    var code = $('#code').val();
    if (code != '') eval('body = ' + code);

    // 显示筛选数据的数目：
    $('#code').next('span').remove();
    $('#code').after(B.span().addClass('label label-success').text('选中数据量：' + body.size()));
    $('#summary_itemCount').text(body.size());
    // 预览选出来的每一个条目
    var ph = $('#objPre').empty();
    var fnCode = $('#fnCode').val();
    var descCode = $('#descCode').val();
    var tbody = $('#itemTable').empty();

    // 添加所有“实例包含的属性”到表头中
    var thead = $('#itemTableHead tr');
    thead.children().slice(3).remove();
    $.each(propertyFss, function (i, fs) {
        Nagu.CM.get(fs.Object.ConceptId).done(function (property) {
            B.th().text(property.FriendlyNames[0]).appendTo(thead);
        });
    });


    $.each(body, function (i, objPh) {
        var pre = $('<pre/>').appendTo(ph);
        pre.append($(objPh).html());

        // 添加数据到条目表格中：
        var tr = B.tr().appendTo(tbody);
        B.td().text(i + 1).appendTo(tr);

        var fn, desc;
        var dataItem = $(objPh);

        // 添加概念名称到表格中
        eval('fn = ' + fnCode);
        var inputFn = B.input().val(fn);
        B.td().append(inputFn).appendTo(tr);

        var div = B.div().insertAfter(inputFn);
        div.text('概念查找结果：');
        Nagu.CM.search(fn).done(function (cs) {
            if (cs.length > 0) {
                conceptIds[fn] = cs[0].ConceptId;
                Nagu.SM.findBySPO(bagType.ConceptId, Nagu.Rdf.Li, cs[0].ConceptId).done(function (fss) {
                    if (fss.length > 0) {
                        B.spanLabelInfo().text('概念存在且在容器中('+ cs.length + ')').appendTo(div);
                        conceptStatus[fn] = Status.ExistAndBag;
                    } else {
                        B.spanLabelWarning().text('概念存在，但不在容器中('+cs.length + ')').appendTo(div);
                    }
                });
            } else {
                B.spanLabel().text('概念不存在').appendTo(div);
                conceptStatus[fn] = Status.NotExist;
            }
        });

        eval('desc = ' + descCode);
        var inputDesc = B.input().val(desc);
        B.td().append(inputDesc).appendTo(tr);

        // 添加所有“实例包含的属性”到表格中
        $.each(propertyFss, function (i, fs) {
            var div = $('div[propertyCodeFor="' + fs.Object.ConceptId + '"]');
            var propertyValue;
            var propertyCode = div.find('input').val();
            var clff = div.find('select').val();
            if(propertyCode == '') propertyCode = '""';
            eval('propertyValue= ' + propertyCode);
            var input = B.input().val(propertyValue);
            B.td().attr('pvFor', fs.Object.ConceptId).append(input).appendTo(tr);

            if (propertyValue != '' && (clff == '0' || clff == '4')) {
                var div = B.div().insertAfter(input);
                div.text('概念查找结果：');
                Nagu.CM.search(propertyValue).done(function (cs) {
                    if (cs.length > 0) {
                        B.spanLabelImportant().text('概念存在('+cs.length + ')').appendTo(div);
                        conceptIds[propertyValue] = cs[0].ConceptId;
                        conceptStatus[propertyValue] = Status.Exist;

                    } else {
                        B.spanLabel().text('概念不存在').appendTo(div);
                        conceptStatus[propertyValue] = Status.NotExist;
                    }
                });
            }
        });

    });
}

function catchData() {
    catchItem();
    //var tbody = $('#itemTable');

    //// 从表中逐行取数据
    //$.each(tbody.find('tr'), function (i, tr) {
    //    var fn = $(tr).children().eq(1).find('input').val();
    //    var desc = $(tr).children().eq(2).find('input').val();

    //    // 1. 创建或找到已存在的概念
    //    ensureConceptExist(fn, desc).done(function (c) {
    //        // 2. 确保概念在数据容器中
    //        ensureConceptInBag(c.ConceptId, fn);

    //        // 3. 确保概念具有指定的类型
    //        ensureConceptType(c.ConceptId);

    //        // 4. 添加概念的属性和值
    //        $.each($(tr).children().slice(3), function (i, td) {
    //            var propertyId = $(td).attr('pvFor');
    //            var propertyValue = $(td).find('input').val();
    //            if (propertyValue == '') return;

    //            var pvProcess = $('div[propertyCodeFor="' + propertyId + '"]').find('select').val();
    //            switch (pvProcess) {
    //                case '0': // 发现同名概念就使用
    //                    ensureConceptExist(propertyValue, propertyValue).done(function (pv) {
    //                        Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv.ConceptId);
    //                    });
    //                    break;
    //                case '1': // 作为文本使用
    //                    Nagu.CM.addLiteralPropertyValue(c.ConceptId, propertyId, propertyValue);
    //                    break;
    //                case '2': // 无论如何创建新概念
    //                    Nagu.Cm.create(propertyValue, propertyValue).done(function (pv) {
    //                        Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv.ConceptId);
    //                    });
    //                    break;
    //            }
    //        });
    //    });
        
        
    //});
}

function catchItem(index) {
    if (index === undefined) index = 0;
    if (index == 0) $('#catchResult').find('ol').empty();
    var tr = $('#itemTable tr').eq(index);
    if (tr.size() == 0) {
        $('#catchResult').find('ol').append(B.li().text('抓取结束'));
        return;
    }

    $('#catchResult').find('ol').append(B.li().text('开始抓取第' + (index+1) + '个条目'));

    var fn = tr.children().eq(1).find('input').val();
    var desc = tr.children().eq(2).find('input').val();

    if (fn == '') return catchItem(index + 1);

    // 1. 创建或找到已存在的概念
    ensureConceptExist(fn, desc).done(function (c) {
        $('#catchResult').find('ol').append(B.li().text('创建条目概念成功'));
        // 2. 确保概念在数据容器中
        ensureConceptInBag(c.ConceptId, fn);

        // 3. 确保概念具有指定的类型
        ensureConceptType(c.ConceptId);

        $('#catchResult').find('ol').append(B.li().text('开始抓取条目属性值'));
        catchItemPv(c, tr, tr.children().eq(3)).done(function () {
            $('#catchResult').find('ol').append(B.li().text('抓取第' + (index+1) + '个条目结束'));
            catchItem(index + 1);
        });
    });
}

// 根据当前td为当前概念添加属性值
function catchItemPv(c, tr, td) {
    var dtd = $.Deferred();
    if (td.size() == 0) {
        dtd.resolve();
        return dtd.promise();
    }
    var propertyId = td.attr('pvFor');
    var propertyValue = td.find('input').val();
    return $.when(catchItemPv(c, tr, td.next())).done(function () {
        $('#catchResult').find('ol').append(B.li().text('开始为属性' + propertyId + '抓取属性值'));
        if (propertyValue == '') {
            dtd.resolve();
            return dtd.promise();
        }

        var pvProcess = $('div[propertyCodeFor="' + propertyId + '"]').find('select').val();
        if (pvProcess == '4'){
            if (conceptStatus[propertyValue] != Status.NotExist) pvProcess = '0';
            else pvProcess = '1';
        }
        switch (pvProcess) {
            case '0': // 发现同名概念就使用
                ensureConceptExist(propertyValue, propertyValue).done(function (pv) {
                    // TODO: 是否可以通过另设Deferred变量实现异步方法的同步？
                    //var dtd2 = $.Deferred
                    Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv.ConceptId).done(function () {
                        //$('#catchResult').find('ol').append(B.li().text('属性' + propertyId + '的属性值抓取成功'));
                        dtd.resolve();
                    });
                });
                break;
            case '1': // 作为文本使用
                Nagu.CM.addLiteralPropertyValue(c.ConceptId, propertyId, propertyValue).done(function () {
                    //$('#catchResult').find('ol').append(B.li().text('属性' + propertyId + '的属性值抓取成功'));
                    dtd.resolve();
                });
                break;
            case '2': // 无论如何创建新概念
                Nagu.Cm.create(propertyValue, propertyValue).done(function (pv) {
                    Nagu.CM.addConceptPropertyValue2(c.ConceptId, propertyId, pv.ConceptId).done(function () {
                        //$('#catchResult').find('ol').append(B.li().text('属性' + propertyId + '的属性值抓取成功'));
                        dtd.resolve();
                    });
                });
                break;
            case '4':
                break;
        }
        return dtd.promise();
    }).done(function () {
        $('#catchResult').find('ol').append(B.li().text('属性' + propertyId + '的属性值抓取成功'));
    });

}

function ensureConceptExist(fn, desc) {
    var dtd = $.Deferred();
    if (conceptIds[fn] !== undefined)
        Nagu.CM.get(conceptIds[fn]).done(function (c) {
            dtd.resolve(c);
        });
    else Nagu.CM.create(fn, desc).done(function (c) {
        dtd.resolve(c);
    });
    return dtd.promise();
}

function ensureConceptInBag(cid, fn) {
    if (conceptStatus[fn] == Status.ExistAndBag) return;
    Nagu.SM.create(bagType.ConceptId, Nagu.MType.Concept,
        Nagu.Rdf.Li,
        cid, Nagu.MType.Concept);
}

function ensureConceptType(cid) {
    Nagu.CM.get(cid).done(function (c) {
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