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
                    onTypeAdded: function (fs) { alert("ddddd"); },
                    appId: data.UserId
                });
                addTypeDialog.init();

                addValueDialog = new AddPropertyValueDialog(
                {
                    appId: data.UserId
                });
                addTypeDialog.init();

                createConceptDialog = new CreateConceptDialog(
                {
                    appId: data.UserId,
                    onAdded: function (concept) {
                        var cdp = new ConceptDetailPanel(concept.ConceptId);
                        cdp.show($('.span8'));
                    }
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
                            renderItem: function (fss, li) {
                                // 在页面左边以胶囊按钮的方式展示实例列表
                                return renderMorpheme2(fss.Subject, li).done(function (c) {
                                    var ss = new SaidStatus(li.attr('statementId'));
                                    li.find('a').prepend(ss.getSpan());
                                    li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                                    li.addClass("concept-list-item");
                                });
                            }
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
        renderTitle: function (ph, title, concept) {
            var btn = newA().text(title).click(function () {
                createConceptDialog.toggle(concept.ConceptId, { h3: '为"' + concept.FriendlyNames[0] + '"添加新的名称或简介' });
            });
            ph.append(btn);
        },
        renderValues: function (ph, values, valueFss) {
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
        $('.dropdown-toggle').dropdown()
    }
    });
    cdp.show($('.span8'));
}


function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}

function createConcept() {
    //1. 数据验证
    var alert = $("div#dlgCreateConcept div.alert");
    alert.hide();

    ulError = $("div#dlgCreateConcept ul.error-list").empty();
    var hasError = false;
    var fn = $("#tbConceptName").val();
    var desc = $("#tbConceptDesc").val();

    if (fn === undefined || fn == "") {
        hasError = true;
        ulError.append(newLi().append("\"名称\"不能为空"));
    }
    if (desc === undefined || desc == "") {
        hasError = true;
        ulError.append(newLi().append("\"简介\"不能为空"));
    }
    if (hasError) {
        alert.show();
        return;
    }

    //2. 完成Class创建
    var cm = new ConceptManager();
    cm.create(fn, desc).done(function (c) {
        console.log("添加Concept成功");
        cm.addRdfType(c.ConceptId, Nagu.Concepts.PrivateObject, { appId: curUserId }).done(function (fs) {
            console.log("添加PrivateObject成功");
            $("div#dlgCreateConcept input").val("");

            var li = newLi().attr("statementId", fs.StatementId).addClass("concept-list-item");
            $('#myConcepts').prepend(li);
            renderMorpheme2(fs.Subject, li).done(function (c) {
                var icon = StarIcon().addClass('nagu-said-status').attr('StatementId', li.attr('statementId'));
                li.find('a').prepend(newSpan().addClass('logged').append(icon));
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                li.find('a').click();
            });
            $("div#dlgCreateConcept").modal('toggle');
        });
    });
}