﻿var curUserId;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog;
/********************************************************************************************************************************/
// 当QQ登录成功之后：
function afterQCLogin(reqData, opts) {
    QC.api("get_user_info").success(function (s) {
        var span = $("#qqLoginBtn");

        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () { QQLogout(); }));
        
        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    QC.Login.getMe(function (openId, accessToken) {
        $.getJSON("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken).done(function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
                curUserId = data.UserId;

                // 初始化对话框
                addTypeDialog = new AddTypeDialog(
                {
                    onTypeAdded: addTypeDialog_onTypeAdded,
                    appId: data.UserId
                });

                addValueDialog = new AddPropertyValueDialog({
                    appId: data.UserId,
                    added: addPropertyValueDialog_added
                });

                createConceptDialog = new CreateConceptDialog(
                {
                    appId: data.UserId,
                    onAdded: createConceptDialog_onAdded
                });


                $(".logged").show("slow", function () {
                    var ss = new SaidStatus(0);
                    ss.initAllSpan();
                    initBtnSaidStatus();
                });
                var sm = new StatementManager();
                sm.findByPO(Nagu.Concepts.RdfType, Nagu.Concepts.PrivateObject, Nagu.MType.Concept, { appId: curUserId }).done(function (fss) {
                    $('#myConcepts').statementList(fss,
                        {
                            clearBefore: true,
                            renderItem: statementList_renderItem,
                            pageSize: 4
                        });
                    $('#myConcepts li.active').find('a').click();
                });

            }
        });
    });
}

function conceptBtn_onClick() {
    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");

    // 显示Concept的详细信息
    var cdp = new ConceptDetailPanel($(this).attr('ConceptId'),
    {
        renderTitle: conceptDetailPanel_renderTitle,
        renderValues: conceptDetailPanel_renderValues,
        appId: curUserId,
        renderProperty: conceptDetailPanel_renderProperty,
        renderPropertyValues: conceptDetailPanel_renderPropertyValues
    });
    cdp.show($('#concept_detail'));
}

function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}







/**  各种回调函数 ***************************************************************************/


function conceptDetailPanel_renderTitle(ph, title, concept) {
    var btn = newA().text(title).click(function () {
        createConceptDialog.toggle(concept.ConceptId, { h3: '为"' + concept.FriendlyNames[0] + '"添加新的名称或简介' });
    });
    ph.append(btn);
}


function conceptDetailPanel_renderValues(ph, values, valueFss) {
    var dd = newDd();
    var ul = newTag('ul', { class: 'nav nav-pills ' });
    ph.append(dd.append(ul));

    // 为每一个名称或描述值生成下拉菜单:
    for (var i = 0; i < values.length; i++) {
        var menuItems = new Array();
        menuItems.push(getSaidMenuItem(valueFss[i], function () {
            var cm = new ConceptManager();
            cm.flush($('#myConcepts li.active').attr('conceptId'));
            $('#myConcepts li.active').find('a').click();
        }));

        var menu = new Menu(menuItems, {
            text: values[i]
        });
        menu.appendTo(ul);
    }
    $('.dropdown-toggle').dropdown();
}


function statementList_renderItem(fss, li) {
    // 在li上添加ConceptId 属性
    li.attr("ConceptId", fss.Subject.ConceptId);

    // 在页面左边以胶囊按钮的方式展示实例列表
    return renderMorpheme2(fss.Subject, li).done(function (c) {
        //var ss = new SaidStatus(li.attr('statementId'));
        //li.find('a').prepend(ss.getSpan());
        li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
        li.addClass("concept-list-item");
    });
}


function createConceptDialog_onAdded(concept) {
    // 1. 检查左边列表是否有此concept,没有则显示
    var cItem = $.grep($('#myConcepts li'), function (li) {
        return $(li).attr('ConceptId') == concept.ConceptId;
    });
    if (cItem.length) {
        $(cItem).find('a').click();
    } else {
        // 添加PrivateClass类型
        var cm = new ConceptManager();
        cm.addRdfType(concept.ConceptId, Nagu.Concepts.PrivateObject, { appId: curUserId }).done(function (fs) {
            var li = newLi().attr("statementId", fs.StatementId).attr("ConceptId", concept.ConceptId);
            $('#myConcepts').prepend(li);

            // 在页面左边以胶囊按钮的方式展示实例列表
            renderMorpheme2(concept, li).done(function (c) {
                var ss = new SaidStatus(li.attr('statementId'));
                li.find('a').prepend(ss.getSpan());
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                li.addClass("concept-list-item");
            });
            // 2. 通过左边item的click显示右边详细信息
            li.find('a').click();
        });
    }
}


//返回一个MenuItem对象,用于删除或添加星标
function getSaidMenuItem(statement, changed) {
    return new MenuItem({
        text: '添加/删除星标',
        click: function () {
            var a = $(this);
            var sm = new SayManager();
            if (a.text() == '添加星标') {
                sm.say(a.attr('statementId')).done(function () {
                    a.text('删除星标');
                }).fail(function () { alert('fail'); a.text('添加星标'); });
            } else {
                sm.dontSay(a.attr('statementId')).done(function (data) {
                    if (data.SaidCount == 0) {
                        $('#' + a.attr('menuId')).remove();
                    } else {
                        a.text('添加星标');
                    }
                }).fail(function () { alert('fail'); a.text('删除星标'); });
            }
            if (changed !== undefined) changed();
        },
        appended: function (li, a) {
            a.attr('statementId', statement.StatementId);
            var saym = new SayManager();
            saym.status(statement.StatementId).done(function (data) {
                if (data.HasSaid) {
                    a.text('删除星标');
                } else {
                    a.text('添加星标');
                }
            }).fail(function () { alert('get status failed') });
        }
    });
}

function conceptDetailPanel_renderPropertyValues(placeHolder, propertyId, values, subjectId) {
    if (values.length == 0) { placeHolder.text('无属性值'); return; }
    var ul = newTag('ul', { class: 'nav nav-pills' });
    placeHolder.append(ul);
    $.each(values, function (i, v) {

        // 为每一个属性值生产一个下拉菜单:
        var meunItems = new Array();
        meunItems.push(getSaidMenuItem(v, function () {
            // 刷新缓存
            PvsFromBaseClass[subjectId] = undefined;
            $('#myConcepts li.active').find('a').click();
        }));

        var menu = new Menu(meunItems, {
            appended: function (li, a, ul) {
                var cm = new ConceptManager();

                if (v.Object.Value) a.text(v.Object.Value);
                else cm.get(v.Object.ConceptId).done(function (c) {
                    a.text(c.FriendlyNames[0]);
                });
            }
        });
        menu.appendTo(ul);
    });
}

function conceptDetailPanel_renderProperty(placeHolder, propertyId, subjectId) {
    var cm = new ConceptManager();
    // 显示属性:
    cm.get(propertyId).done(function (p) {
        placeHolder.append(newA().text(p.FriendlyNames[0]).click(function () {
            addValueDialog.toggle(subjectId, Nagu.MType.Concept, p.ConceptId,
                    {
                        h3: '为属性“' + p.FriendlyNames[0] + '”添加属性值'
                    });
        }));
    });
}


function addTypeDialog_onTypeAdded(fs) {
    var sm = new StatementManager();
    // 刷新缓存,重新findBySP
    sm.flush('', fs.Subject.ConceptId, Nagu.Concepts.RdfType, '', curUserId);
    $('#myConcepts li.active').find('a').click();
}


function addPropertyValueDialog_added(fs) {
    // 刷新缓存
    PvsFromBaseClass[fs.Subject.ConceptId] = undefined;
    $('#myConcepts li.active').find('a').click();
}