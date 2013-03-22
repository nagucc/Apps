var dlgCreateFamily, dlgCreatePerson, cdp, addValueDialog;
function currentFamily(){ return $('.family-list li.active a').attr('conceptId'); }


/********************************************************************************************************************************/
// 获取家族列表
function getFamilies2() {
    var dtd = $.Deferred();

    // 获取所有家族
    var fm = new FamilyManager();
    fm.all().done(function (fss) {
        $('#families').statementList(fss, {
            renderItem: function (fs, li) {
                li.addClass('concept-list-item');
                return li.appendMorpheme(fs.Subject).done(function (c) {
                    li.find('a').click(familyBtn_onClick);
                });
            }
        }).done(function (fss) {
            var request = getRequest();
            if (request['id'] === undefined)
                $('#families li:first a').click();
            else {
                $('#families li a[conceptId="' + request['id'] + '"]').click();
            }
            dtd.resolve();
        });
    });

    // 初始化对话框:
    dlgCreateFamily = new CreateConceptDialog(
    {
        onAdded: dlgCreateFamily_onAdded
    });
    dlgCreatePerson = new CreatePersonDialog({
        added: dlgCreatePerson_added
    });

    addValueDialog = new AddPropertyValueDialog({
        added: addPropertyValueDialog_added
    });

    return dtd.promise();
}




/********************************************************************************************************************************/


/********************************************************************************************************************************




/********************************************************************************************************************************/

// 定义左边按钮的OnClick事件
function familyBtn_onClick() {
    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");
    var fid = $(this).attr("conceptId");



    var fm = new FamilyManager();
    fm.members(fid).done(function (memberFss) {
        // 显示当前家族基本信息
        $('#gen20 > ul').statementList(memberFss, {
            clearBefore: true,
            pageSize: 5,
            renderItem: members_statementList_renderItem
        });
    });

    if (QC.Login.check()) {
        cdp = new ConceptDetailPanel(fid, {
            renderTitle: conceptDetailPanel_renderTitle,
            renderValues: conceptDetailPanel_renderValues,
            renderProperty: conceptDetailPanel_renderProperty,
            renderPropertyValues: conceptDetailPanel_renderPropertyValues
        });
    } else cdp = new ConceptDetailPanel(fid);
    cdp.show($('#family_detail'));


    $('.nagu-said-status-toggler').attr('StatementId', $(this).closest("li").attr('StatementId'));
    initBtnSaidStatus(function () {
        if ($('.nagu-said-status-toggler').text() == '加注星标') $('.concept-list-item.active').prependTo($('#myfamilies'));
        else $('.concept-list-item.active').prependTo($('#families'));
    });

    $("#qrcode").empty().qrcode({ text: "http://nagu.cc/apps/jiapu/index.html?id=" + fid });
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
        //alert('dd');
        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () {
            QQLogout();
        }));
        $(".logged").show("slow", function () {
            $('.nagu-said-status').each(function (i, s) {
                var sm = new SayManager();
                sm.status($(s).attr('statementid')).done(function (hasSaid) {
                    initSaidStatus($(s).attr('statementid'), hasSaid);
                    if (hasSaid) {
                        var li = $('.concept-list-item[StatementId="' + $(s).attr('statementid') + '"]');
                        li.prependTo($('#myfamilies'));
                    }
                });
            });
            initBtnSaidStatus(function () {
                if ($('.nagu-said-status-toggler').text() == '加注星标') $('.concept-list-item.active').prependTo($('#myfamilies'));
                else $('.concept-list-item.active').prependTo($('#families'));
            });
        });

        // 重新显示右侧信息
        cdp = new ConceptDetailPanel(currentFamily(), {
            renderTitle: conceptDetailPanel_renderTitle,
            renderValues: conceptDetailPanel_renderValues,
            renderProperty: conceptDetailPanel_renderProperty,
            renderPropertyValues: conceptDetailPanel_renderPropertyValues
        });
        cdp.show($('#family_detail'));


        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    // 登录服务器端
    QC.Login.getMe(function (openId, accessToken) {
        $.getJSON("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken, function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
                dtd.resolve();
            }
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

function members_statementList_renderItem(statement, li) {
    // 显示家族树成员的算法见 #1
    var personId;

    // 当前显示右侧家族成员列表
    if (statement.Predicate.ConceptId == Person.Properties.SuoZaiJiaZu)
        personId = statement.Subject.ConceptId;
    else {
        // 当前显示父亲或子女列表
        personId = statement.Object.ConceptId;
    }



    // 若当前世代节点是"gen20",则不显示其它世代已经存在的成员.
    if (li.parent().parent().attr('id') == 'gen20') {
        if ($('#genTree2 li[personId="' + personId + '"]').size()) {
            li.remove();
            return;
        }
    }

    // 删除家族树中已经存在的成员节点
    $($.grep($('#genTree2 li'), function (li) {
        return $(li).attr('personId') == personId;
    })).remove();
    li.attr('personId', personId);


    var cm = new ConceptManager();
    cm.get(personId).done(function (person) {
        // 下拉菜单
        // “详细信息”菜单
        var miDetail = new MenuItem({
            appended: function (li, a) {
                a.attr('href', 'person.html?id=' + personId);
            },
            text: '详细信息'
        });

        // “显示家族关系”菜单
        var miGen = new MenuItem({
            text: '显示家族关系',
            appended: function (li, a) {
                a.click(function () {
                    // 1. 显示"父亲"

                    // 获取世代容器
                    var genLi = li.closest('.gen-li').prev();
                    var pm = new Person(personId);
                    pm.father().done(function (data) {
                        // 存在“父亲”，而且世代容器不存在，则创建世代容器
                        if (data.length && !genLi.size()) {
                            var newli = newLi().attr("id", "gen" + randomInt()).addClass("gen-li");
                            genLi = li.closest('.gen-li').before(newli).prev();
                            genLi.append(newTag('ul', { class: 'nav nav-pills' }));
                        }
                        genLi.find('ul.nav').statementList(data, {
                            renderItem: members_statementList_renderItem
                        });
                    });

                    // 2. 显示子女
                    pm.children().done(function (children) {
                        // 如果世代容器不存在，则创建世代容器
                        if (children.length && !genLi.size()) {
                            var newli = newLi().attr("id", "gen" + randomInt()).addClass("gen-li");
                            genLi = li.closest('.gen-li').before(newli).prev();
                            genLi.append(newTag('ul', { class: 'nav nav-pills' }));
                        }
                        genLi.find('ul.nav').statementList(data, {
                            renderItem: members_statementList_renderItem
                        });
                    });
                    $(this).remove();
                });
            }
        });


        var menuId = 'menu' + randomInt();
        li.addClass('dropdown').attr('id', menuId).conceptMenu([miDetail, miGen], {
            text: person.FriendlyNames[0],
            rendered: function (ph, toggler, ul) {
                toggler.prepend(Icon('icon-user'));
            }
        });
    });
}



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