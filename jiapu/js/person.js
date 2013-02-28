function showPerson() {
    var dtd = $.Deferred();
    var request = getRequest();
    var personId = request["id"];

    // 显示“家族成员”按钮：
    var pm = new Person(personId);
    pm.get().done(function (person) {
        $(".brand").text(person.FriendlyNames[0] + "@家谱系统");
        var btnPerson = newBtnGroup("btnGroup_" + person.ConceptId);
        renderPersonBtnGroup2(btnPerson, person.FriendlyNames[0], personId, btnPerson_OnMenuCreating);
        btnPerson.children("a").addClass("btn-success");
        $("#gen0").append(btnPerson);
        $(".dropdown-toggle").dropdown();
    });

    // 显示属性及值：
    pm.memberProperties().done(function (pvs) {
        var dl = $("#personInfo");
        $.each(pvs, function (i, pv) {
            onShowValueAsStatement2(dl, pv.Key, pv.Value);
        });
        dtd.resolve();
    });
    $("#qrcode").empty().qrcode({ text: "http://nagu.cc/apps/jiapu/person.html?id=" + personId });
    return dtd.promise();
}

function showFamilyTree(personId, curLi) {
    var pm = new Person(personId);

    // 显示父亲
    var fatherLi = $("#" + curLi).prev();
    pm.father().done(function (fss) {
        // 存在“父亲”，而且li不存在，则创建li节点
        if (fss.length > 0 && !fatherLi.size()) {
            var newli = newLi("gen" + Math.round(Math.random() * 100000)).addClass("btn-toolbar");
            fatherLi = $("#" + curLi).before(newli).prev();
        }
        $.each(fss, function (i, fs) {
            // 如果该成员的按钮已存在则返回：
            if ($("#btnGroup_" + fs.Object.ConceptId).size()) {
                return;
            }

            var father = new Person(fs.Object.ConceptId);
            father.get().done(function (father) {
                var btnFather = newBtnGroup("btnGroup_" + father.ConceptId);
                renderPersonBtnGroup2(btnFather, father.FriendlyNames[0], father.ConceptId, btnPerson_OnMenuCreating);
                fatherLi.append(btnFather);
                $(".dropdown-toggle").dropdown();
            });
        });
    });

    // 显示后代：
    var childLi = $("#" + curLi).next();
    pm.children().done(function (children) {
        console.log("children:" + children.length);

        // 存在“后代”，而且li不存在，则创建li节点
        if (children.length > 0 && !childLi.size()) {
            var newli = newLi().attr("id", "gen" + Math.round(Math.random() * 100000)).addClass("btn-toolbar");
            childLi = $("#" + curLi).after(newli).next();
        }
        $.each(children, function (i, childFs) {
            // 如果该成员的按钮已存在则返回：
            if ($("#btnGroup_" + childFs.Subject.ConceptId).size()) {
                return;
            }
            console.log("chilId::::" + childFs.Subject.ConceptId);
            var Child = new Person(childFs.Subject.ConceptId);
            Child.get().done(function (c) {
                var btnChild = newBtnGroup("btnGroup_" + c.ConceptId);
                renderPersonBtnGroup2(btnChild, c.FriendlyNames[0], c.ConceptId, btnPerson_OnMenuCreating);
                childLi.append(btnChild);
                $(".dropdown-toggle").dropdown();
            });
        });
    });

}

function btnPerson_OnMenuCreating(menu, personId) {
    // “星标状态”菜单

    // “详细信息”菜单
    menu.append(newLi().append(newA("person.html?id=" + personId).text("详细信息")));

    // 分隔符
    menu.append(newLi().addClass("divider"));

    // “显示家族关系”菜单
    menu.append(newLi().append(newA().text("显示家族关系").attr("id", "showGenBtn_" + personId).one("click", function () {
        console.log("curLi:::" + $(this).closest(".btn-toolbar").attr("id"));
        showFamilyTree(personId, $(this).closest(".btn-toolbar").attr("id"));
    })));
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