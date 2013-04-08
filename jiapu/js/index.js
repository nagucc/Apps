var dlgCreateFamily, dlgCreatePerson, cdp, addValueDialog, curFamily;
// 全局变量
var CM, SM, N, MM, FM;

function currentFamily(){ return $('.family-list li.active a').attr('conceptId'); }



$(document).ready(function () {
    // 全局变量
    CM = new ConceptManager();
    SM = new StatementManager();
    MM = new MemberManager();
    FM = new FamilyManager();
    N = Nagu;
    curFamily = getRequest()['id'];

    getFamilies2().done(function () {
        QC.Login({
            btnId: "qqLoginBtn",
            scope: "all",
            size: "A_M"
        }, afterQCLogin);
    });
});
 
/********************************************************************************************************************************/
// 获取家族列表
function getFamilies2() {
    var dtd = $.Deferred();

    // 获取所有家族
    FM.all().done(function (fss) {
        $('#families').statementList(fss, {
            renderItem: function (fs, li) {
                li.addClass('concept-list-item');
                return li.appendMorpheme(fs.Subject).done(function (c) {
                    li.find('a').click(familyBtn_onClick);
                });
            }
        }).done(function (fss) {
            if (curFamily === undefined)
                $('#families li:first a').click();
            else {
                $('#families li a[conceptId="' + curFamily + '"]').click();
            }
            dtd.resolve();
        });
    });

    return dtd.promise();
}




/********************************************************************************************************************************/
function afterNaguLogin() {
    // 初始化对话框:
    if (dlgCreateFamily === undefined) {
        dlgCreateFamily = new CreateConceptDialog({
            onAdded: dlgCreateFamily_onAdded
        });
    }
    if (dlgCreatePerson === undefined) {
        dlgCreatePerson = new CreatePersonDialog({
            added: dlgCreatePerson_added
        });
    }
    if (addValueDialog === undefined) {
        addValueDialog = new AddPropertyValueDialog({
            added: addPropertyValueDialog_added
        });
    }

    // 显示右侧类型详细信息
    cdp = new ConceptDetailPanel(curFamily, {
        renderTitle: conceptDetailPanel_renderTitle,
        renderValues: conceptDetailPanel_renderValues,
        renderProperty: conceptDetailPanel_renderProperty,
        renderPropertyValues: conceptDetailPanel_renderPropertyValues,
        renderType: ConceptDetailPanel.renderType2,
        showDetail: false
    });

    // 初始化一些与登录状态有关的控件：
    $('#addInfo').attr('href', '/apps/public/concept.html?id=' + curFamily);
    
    $('.nagu-said-status-toggler').attr('StatementId', $(this).closest("li").attr('StatementId'));
    initBtnSaidStatus(function () {
        if ($('.nagu-said-status-toggler').text() == '加注星标') $('.concept-list-item.active').prependTo($('#myfamilies'));
        else $('.concept-list-item.active').prependTo($('#families'));
    });

    // 显示一些该显示的控件：
    $(".logged").show("slow", function () {
    });
}

/********************************************************************************************************************************




/********************************************************************************************************************************/

// 定义左边按钮的OnClick事件
function familyBtn_onClick() {
    
    // 为防止出现异步错误,此处必须声明一个变量
    // 不能直接使用$('.family-list .active a'))取当前值.
    var a = $(this);

    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");

    curFamily = $(this).attr("conceptId");

    

    // 显示右侧家族树信息.
    $('#genTree2 > li[id!="gen20"]').remove();
    FM.members(curFamily).done(function (memberFss) {
        // 显示当前家族基本信息
        var members = new Array();
        $.each(memberFss, function (i, n) { members.push(n.Subject); });

        $('#gen20 > ul').conceptList(members, {
            clearBefore: true,
            pageSize: 5,
            renderItem: person_conceptList_renderItem
        });
    });

    // 显示右侧类型信息：
    MM.check().done(function (status) {
        if (status.nagu) {
            afterNaguLogin();
        } else {
            cdp = new ConceptDetailPanel(curFamily);
        }
    }).fail(function () {
        cdp = new ConceptDetailPanel(curConcept, { showDetail: false });
    }).done(function () {
        cdp.show($('#family_detail'));
    });

    // 初始化一些零碎的，与登录状态无关的控件：
    $("#qrcode").empty().qrcode({ text: "http://nagu.cc/apps/jiapu/index.html?id=" + curFamily });

    
}



/********************************************************************************************************************************/


function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
        $("#myfamilies li").prependTo("#families");
    });
    cdp = new ConceptDetailPanel($('families li.active a').attr('conceptId'));
    cdp.show($('#family_detail'));
}




/********************************************************************************************************************************/
// 当QQ登录成功之后：
function afterQCLogin(reqData, opts) {
    var dtd = $.Deferred();

    // 获取用户信息并显示：
    QC.api("get_user_info").success(function (s) {
        var span = $("#qqLoginBtn");
        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () {
            QQLogout();
        }));
        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    MM.getMe().fail(function () {
        // 若当前nagu未登录，使用当前QC的凭据登录nagu
        QC.Login.getMe(function (openId, accessToken) {
            MM.loginFromQC(openId, accessToken).done(function (data) {
                if (data.Status == "OK") {
                    console.log("用户登录成功");
                    afterNaguLogin();
                    cdp.show($('#family_detail'));
                }
            });
        });
    });
    return dtd.promise();
}



/********************************************************************************************************************************/
function searchPersons() {
    $("#personResult").empty();
    searchWithType($("#personpre").val(), jzcyId).done(function (persons) {
        $.each(persons, function (index, person) {
            $("#personResult").append(newLi("personresult_" + person.ConceptId));
            getConcept(person.ConceptId).done(function (person) {
                var a = newA().attr("href", "person.html?id=" + person.ConceptId)
                            .text(person.FriendlyNames[0]);
                $("#personresult_" + person.ConceptId).append(a);
            });
        });

    });
}

/******** 各种回调函数 ************************************************************************************************************************/



function dlgCreateFamily_onAdded(family) {
    // 1. 添加必要的rdf:type信息
    var cm = new ConceptManager();
    cm.addRdfType(family.ConceptId, FamilyManager.JiazuType).done(function (fs) {
        console.log('添加rdf:type "家族成员" 成功');

        // 2. 刷新左侧列表
        // 2.1 获取所有家族
        var fm = new FamilyManager();
        fm.all({ reflesh: true }).done(function (fss) {
            $('#families').statementList(fss, {
                clearBefore: true,
                renderItem: function (fs, li) {
                    li.addClass('concept-list-item');
                    return li.appendMorpheme(fs.Subject).done(function (c) {
                        li.find('a').click(familyBtn_onClick);
                    });
                }
            }).done(function () {
                $('#families li:first a').click();
            });
        });
    });
}

function dlgCreatePerson_added(person) {
    var fm = new FamilyManager();
    var fid = $('#families > li.active a').attr('conceptId');
    fm.members(fid, { reflesh: true }).done(function (memberFss) {
        // 显示当前家族基本信息
        $("dt#dtPersonCount").next("dd").text(memberFss.length);

        $('#gen20 > ul').statementList(memberFss, {
            clearBefore: true,
            pageSize: 5,
            renderItem: members_statementList_renderItem
        });
    });
}


function conceptDetailPanel_renderTitle(ph, title, concept) {
    var btn = newA().text(title).click(function () {
        dlgCreateFamily.toggle(concept.ConceptId, { h3: '为"' + concept.FriendlyNames[0] + '"添加新的名称或简介' });
    });
    ph.append(btn);
}

function conceptDetailPanel_renderValues(ph, values, valueFss) {
    var dd = newDd();
    var ul = newTag('ul', { class: 'nav nav-pills ' });
    ph.append(dd.append(ul));

    // 为每一个名称或描述值生成下拉菜单:
    for (var i = 0; i < values.length; i++) {
        var miSaidStatus = getSaidMenuItem(valueFss[i], function () {
            var cm = new ConceptManager();
            cm.flush(currentFamily());
            $('#families li.active').find('a').click();
        });


        var menu = new Menu([miSaidStatus], {
            text: values[i]
        });
        menu.appendTo(ul);
    }
    $('.dropdown-toggle').dropdown();
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
            $('#families li.active').find('a').click();
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

function addPropertyValueDialog_added(fs) {
    // 刷新缓存
    PvsFromBaseClass[fs.Subject.ConceptId] = undefined;
    $('.family-list li.active a').click();
}