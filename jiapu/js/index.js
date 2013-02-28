/********************************************************************************************************************************/
// 获取家族列表
function getFamilies2() {
    var request = getRequest();

    var dtd = $.Deferred();
    var resolvedDeferred = 0;   // 记录已经resolve的Deferred对象的数量
    // 获取所有家族
    var fm = new FamilyManager();
    fm.all().done(function (fss) {
        $.each(fss, function (i, fs) {

            // 生成显示框架：li#family_xxx > a
            var li = newLi().attr("statementId", fs.StatementId).attr("ConceptId", fs.Subject.ConceptId).addClass("concept-list-item");
            $("#families").append(li);



            // 初始化 families 缓存：
            if (FamilyManager.Cache[fs.Subject.ConceptId] === undefined) FamilyManager.Cache[fs.Subject.ConceptId] = [];
            FamilyManager.Cache[fs.Subject.ConceptId]["rdf:type"] = fs;

            if (request["id"] === undefined && i == 0) curFamilyId = fs.Subject.ConceptId;
            if (request["id"] == fs.Subject.ConceptId) curFamilyId = fs.Subject.ConceptId;

            renderMorpheme2(fs.Subject, li).done(function (c) {
                var icon = StarEmptyIcon().addClass('nagu-said-status').attr('StatementId', li.attr('statementId'));
                li.find('a').prepend(newSpan().addClass('logged hide').append(icon));
                li.find('a').attr('ConceptId', c.ConceptId).click(familyBtn_onClick);

                if (++resolvedDeferred == fss.length) dtd.resolve();
                if (curFamilyId == c.ConceptId) li.find('a').click();

                // 初始化“创建家族成员”对话框中的下拉列表
                var selJiazu = $("#sJiazu");
                selJiazu.append($("<option></option>").val(c.ConceptId).append(c.FriendlyNames[0]));
            });
        });
    });
    return dtd.promise();
}




/********************************************************************************************************************************/


/********************************************************************************************************************************/

function showPagedPersons(familyId, start, size) {

    //test
    //pagedByPO(suozaijiazu, familyId, CONCEPT, 0, 10);

    $("ol#genTree a").removeClass("btn-success");

    var fm = new FamilyManager();
    fm.members(familyId).done(function (memberFss) {
        // 显示当前家族基本信息
        $("dt#dtPersonCount").next("dd").text(memberFss.length);

        // 逐个显示家族成员按钮：
        for (var i = start; i < start + size; i++) {
            var moreBtnGroup = $("div#morePersons");
            moreBtnGroup.show();
            if (i >= memberFss.length) {
                moreBtnGroup.hide();
                break;
            }

            // 如果该家族成员以及被显示，则跳过：
            if ($("#btnGroup_" + memberFss[i].Subject.ConceptId).size()) {
                size++;
                continue;
            }

            // 否则，在more按钮之前显示家族成员按钮：
            moreBtnGroup.before(newBtnGroup("btnGroup_" + memberFss[i].Subject.ConceptId).attr("statementId", memberFss[i].StatementId));

            var pm = new Person(memberFss[i].Subject.ConceptId);
            pm.get().done(function (person) {
                var btngroup = $("#btnGroup_" + person.ConceptId);
                renderPersonBtnGroup2(btngroup, person.FriendlyNames[0], person.ConceptId);
                btngroup.children("a").addClass("btn-success");
                $(".dropdown-toggle").dropdown();
            });

            var moreBtn = $("div#morePersons button");
            moreBtn.unbind();
            moreBtn.click(function () {
                showPagedPersons(familyId, start + 5, 5);
            });
        }
    });
}





/********************************************************************************************************************************/

// 定义左边按钮的OnClick事件
function familyBtn_onClick() {
    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");
    var fid = $(this).attr("conceptId")

    $("ol#genTree > li").not($("ol#genTree > li#gen0")).remove();
    $("li#gen0 > div").not("li#gen0 > div#morePersons").remove();
    showPagedPersons(fid, 0, 5);
    $('.nagu-said-status-toggler').attr('StatementId', $(this).closest("li").attr('StatementId'));
    initBtnSaidStatus(function () {
        if ($('.nagu-said-status-toggler').text() == '加注星标') $('.concept-list-item.active').prependTo($('#myfamilies'));
        else $('.concept-list-item.active').prependTo($('#families'));
    });
    $("dt#dateCreated").next("dd").text(formatJSONDate(FamilyManager.Cache[fid]["rdf:type"].DateCreated, "yyyy-MM-dd hh:mm:ss"));
    $("#qrcode").empty().qrcode({ text: "http://nagu.cc/apps/jiapu/index.html?id=" + fid });
}



/********************************************************************************************************************************/








/********************************************************************************************************************************/






/*****************************************************************************************************************************/



// 显示“父亲”
function showFather(personId, curLi) {
    $("ol#genTree a").removeClass("btn-success");
    $("#btnGroup_" + personId).children("a").addClass("btn-success");

    var li = $("#" + curLi).prev();

    var pm = new Person(personId);
    pm.father().done(function (data) {
        // 存在“父亲”，而且li不存在，则创建li节点
        if (data.length > 0 && !li.size()) {
            var newli = newLi().attr("id", "gen" + Math.round(Math.random() * 100000)).addClass("btn-toolbar");
            li = $("#" + curLi).before(newli).prev();
        }
        $.each(data, function (i, fatherFs) {
            if ($("#btnGroup_" + fatherFs.Object.ConceptId).size()) {
                $("#btnGroup_" + fatherFs.Object.ConceptId).remove();
            }
            var father = new Person(fatherFs.Object.ConceptId);
            father.get().done(function (data2) {
                var btngroup = renderPersonBtnGroup(data2.FriendlyNames[0], data2.ConceptId);

                btngroup.children("a").addClass("btn-success");

                if (li.attr("id") == "gen0") {
                    var moreBtnGroup = $("#morePersons");
                    moreBtnGroup.before(btngroup);
                }
                else
                    li.append(btngroup);

                $(".dropdown-toggle").dropdown();
            });
        });
    });
}

// 显示“后代”
function showChildren(personId, curLi) {
    $("ol#genTree a").removeClass("btn-success");
    $("#btnGroup_" + personId).children("a").addClass("btn-success");

    var li = $("#" + curLi).next();
    console.log("li.id:" + li.attr("id"));

    var pm = new Person(personId);
    pm.children().done(function (data) {
        // 存在“后代”，而且li不存在，则创建li节点
        if (data.length > 0 && !li.size()) {
            var newli = newLi().attr("id", "gen" + Math.round(Math.random() * 100000)).addClass("btn-toolbar");
            li = $("#" + curLi).after(newli).next();
        }
        $.each(data, function (i, childFs) {
            if ($("#btnGroup_" + childFs.Subject.ConceptId).size()) {
                $("#btnGroup_" + childFs.Subject.ConceptId).remove();
            }

            // 逐一显示每个后代：
            var child = new Person(childFs.Subject.ConceptId);
            child.get().done(function (data2) {
                var btngroup = renderPersonBtnGroup(data2.FriendlyNames[0], data2.ConceptId);

                btngroup.children("a").addClass("btn-success");
                if (li.attr("id") == "gen0") {
                    var moreBtnGroup = $("#morePersons");
                    moreBtnGroup.before(btngroup);
                }
                else
                    li.append(btngroup);

                $(".dropdown-toggle").dropdown();
            });
        });
    });
}

function renderPersonBtnGroup(name, personId, onMenuCreating) {
    // 生成按钮
    var button = newABtn(name).prepend(UserIcon());
    button.addClass("dropdown-toggle").attr("data-toggle", "dropdown");

    // 下拉菜单
    var dmenu;
    if (onMenuCreating == null) {
        dmenu = newDropdownMenu(function (menu) {
            renderPersonBtnMenu(menu, personId);
        });
    }
    else {
        dmenu = newDropdownMenu(function (menu) {
            onMenuCreating(menu, personId);
        });
    }


    // 生成 btn-group
    var btngroup = newBtnGroup().attr("id", "btnGroup_" + personId);
    btngroup.append(button).append(dmenu);

    return btngroup;


}

function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
        $("#myfamilies li").prependTo("#families");
    });
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

// 创建新家族
function createFamily() {
    var fn = $("#txtFamilyName").val();
    if (fn == "") { return; }
    var desc = $("#txtFamilyDesc").val();

    // 创建指定家族的Concept
    var fm = new FamilyManager();
    fm.create(fn, desc).done(function (family, typeFs) {
        // 在左侧显示新增加的家族的按钮，并激活按钮：
        var icon = StarIcon().addClass('nagu-said-status').attr('StatementId', typeFs.StatementId);
        var familyBtn = newA().attr("ConceptId", family.ConceptId).text(family.FriendlyNames[0]).click(familyBtn_onClick);
        familyBtn.prepend(newSpan().addClass('logged').append(icon));

        $("#myfamilies").prepend(newLi().attr("statementId", typeFs.StatementId).addClass("concept-list-item").append(familyBtn));
        familyBtn.click();
    });
    $("#dlgCreateFamily").hide();
}


function createPerson() {
    $("div#dlgCreatePerson div.alert").hide();
    ulError = $("div#dlgCreatePerson ul.error-list").empty();
    var hasError = false;
    var jiazu = $("#sJiazu").val();
    var fn = $("#tbPersonName").val();
    var desc = $("#tbPersonDesc").val();
    var birthYear = $("#tbBirthYear").val();
    var gender = $("#sGender").val();
    var fatherId = $("#tbFatherId").val();
    var motherId = $("#tbMotherId").val();

    if (jiazu == "") {
        hasError = true;
        ulError.append(newLi().append("请选出待创建成员所在的家族"));
    }
    if (fn == "") {
        hasError = true;
        ulError.append(newLi().append("\"姓名\"不能为空"));
    }
    if (desc == "") {
        hasError = true;
        ulError.append(newLi().append("\"简介\"不能为空"));
    }
    if (hasError) {
        $("div#dlgCreatePerson div.alert").show();
        return;
    }
    var pm = new Person();
    pm.create(fn, desc).done(function (fs, typeFs) {
        $("div#dlgCreatePerson input").val("");
        createStatement(person.ConceptId, MorphemeType.Concept, Person.Properties.SuoZaiJiaZu, jiazu, MorphemeType.Concept).done(function () {
            console.log("添加成员所在家族成功");
        });
        createStatement(person.ConceptId, MorphemeType.Concept, Person.Properties.Gender, gender, MorphemeType.Concept).done(function () {
            console.log("添加成员性别成功");
        });
        if (birthYear != "") {
            createStatement(person.ConceptId, MorphemeType.Concept, Person.Properties.BirthYear, birthYear, MorphemeType.Literal);
        }
        if (fatherId != "") {
            createStatement(person.ConceptId, MorphemeType.Concept, Person.Properties.HasFather, fatherId, MorphemeType.Concept);
        }
        if (motherId != "") {
            createStatement(person.ConceptId, MorphemeType.Concept, Person.Properties.HasMother, motherId, MorphemeType.Concept);
        }

        $('.concept-list-item[ConceptId="' + jiazu + '"]').find('a').click();
    });
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

/********************************************************************************************************************************/