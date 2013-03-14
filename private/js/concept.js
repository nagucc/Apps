var curUserId;
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

                addValueDialog = new AddPropertyValueDialog( { appId: data.UserId });

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
                            renderItem: statementList_renderItem
                        });
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
        appId : curUserId
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
    var ul = newTag('ul', { class: 'nav nav-pills nav-stacked' });
    ph.append(dd.append(ul));
    for (var i = 0; i < values.length; i++) {
        var menuId = 'menu' + Math.round(Math.random() * 10000000000000);
        var li = newTag('li', { class: 'dropdown', id: menuId });
        ul.append(li);

        var a = newTag('a', { class: 'dropdown-toggle', text: values[i] });
        a.attr('href', '#' + menuId).attr('data-toggle', 'dropdown');
        a.append(newTag('b', { class: 'caret' }));

        var ul2 = newTag('ul', { class: 'dropdown-menu' });
        var m1 = newA().text('添加/删除星标').click(function () {
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
        });
        m1.attr('id', 'say_' + valueFss[i].StatementId);
        m1.attr('statementId', valueFss[i].StatementId);
        m1.attr('menuId', menuId);
        var saym = new SayManager();
        saym.status(valueFss[i].StatementId).done(function (data) {
            var a = $('#say_' + data.ObjectFsId);
            if (data.HasSaid) {
                a.text('删除星标');
            } else {
                a.text('添加星标');
            }
        }).fail(function () { alert('get status failed') });
        var li1 = newTag('li').append(m1);
        var li3 = newTag('li').append(newA().text('A2'));
        ul2.append(li1).append(li3);

        li.append(a).append(ul2);
    }
    $('.dropdown-toggle').dropdown();
}


function statementList_renderItem(fss, li) {
    // 在li上添加ConceptId 属性
    li.attr("ConceptId", fss.Subject.ConceptId);

    // 在页面左边以胶囊按钮的方式展示实例列表
    return renderMorpheme2(fss.Subject, li).done(function (c) {
        var ss = new SaidStatus(li.attr('statementId'));
        li.find('a').prepend(ss.getSpan());
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
        cItem.click();
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





function conceptDetailPanel_renderPropertyAndValues(placeHolder, propertyId, values, subjectId) {
    var dt = newDt("dt_" + propertyId);
    placeHolder.append(dt);

    var cm = new ConceptManager();
    // 显示属性:
    cm.get(propertyId).done(function (p) {
        dt.append(newA().text(p.FriendlyNames[0]).click(function () {
            addValueDialog.toggle(subjectId, Nagu.MType.Concept, p.ConceptId,
                    {
                        h3: '为属性“' + p.FriendlyNames[0] + '”添加属性值'
                    });
        }));
    });
    // 显示Value
    var dd = newDd();
    placeHolder.append(dd);
    if (values.length == 0) { dd.text('无属性值'); return; }

    var ul = newTag('ul', { class: 'nav nav-pills nav-stacked' });
    dd.append(ul);
    $.each(values, function (i, v) {
        var li = newTag('li', { class: 'dropdown', id: 'value_' + randomInt() });
        ul.append(li);
        renderStatement(v, li);
    });
}


function addTypeDialog_onTypeAdded(fs) {
    var sm = new StatementManager();
    sm.flush('', '', Nagu.Concepts.RdfType, Nagu.Concepts.PrivateObject, curUserId);
    $('#myConcepts li.active').find('a').click();
}