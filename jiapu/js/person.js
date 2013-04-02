var curUser, curConcept;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp, dlgSelectDialog;

// 全局变量
var CM, SM, N, MM;
var renderValues;



$(document).ready(function () {
    // 全局变量
    CM = new ConceptManager();
    SM = new StatementManager();
    MM = new MemberManager();
    N = Nagu;
    curConcept = getRequest()['id'];

              $.when(showPerson()).done(
              QC.Login({
                  btnId: "qqLoginBtn",
                  scope: "all",
                  size: "A_M"
              }, afterQCLogin));
//              $("#dlgCreatePerson").modal({
//                  backdrop: false,
//                  keyboard: false,
//                  show: false
//              });

//              $("#tbFather").autocomplete({
//                  minLength: 2,
//                  source: "/conceptapi/search",
//                  focus: function (event, ui) {
//                      $("#tbFather").val(ui.item.FriendlyNames[0]);
//                      return false;
//                  },
//                  select: function (event, ui) {
//                      $("#tbFather").val(ui.item.FriendlyNames[0]);
//                      $("#tbFatherId").val(ui.item.ConceptId);
//                      return false;
//                  }
//              })
//        .data("autocomplete")._renderItem = function (ul, item) {
//            var fn = item.FriendlyNames[0];
//            var desc = item.Descriptions[0] == "" ? "没有描述" : item.Descriptions[0];
//            return $("<li></li>")
//                    .data("item.autocomplete", item)
//                    .append("<a><b>" + fn + "</b>（<em>" + desc + "</em>）</a>")
//                    .appendTo(ul);
//        };

//              $("#tbMother").autocomplete({
//                  minLength: 2,
//                  source: "/conceptapi/search",
//                  focus: function (event, ui) {
//                      $("#tbMother").val(ui.item.FriendlyNames[0]);
//                      return false;
//                  },
//                  select: function (event, ui) {
//                      $("#tbMother").val(ui.item.FriendlyNames[0]);
//                      $("#tbMotherId").val(ui.item.ConceptId);
//                      return false;
//                  }
//              }).data("autocomplete")._renderItem = function (ul, item) {
//                  var fn = item.FriendlyNames[0];
//                  var desc = item.Descriptions[0] == "" ? "没有描述" : item.Descriptions[0];
//                  return $("<li></li>")
//                    .data("item.autocomplete", item)
//                    .append("<a><b>" + fn + "</b>（<em>" + desc + "</em>）</a>")
//                    .appendTo(ul);
//              };
});




function showPerson() {
    var dtd = $.Deferred();

    // 获取当前待显示的Concept的id:
    if (curConcept === undefined) {
        dtd.reject();
        return dtd.promise();
    }

    // 显示“家族成员”详细信息：
    var pm = new Person(curConcept);
    pm.get().done(function (person) {
        // 显示标题
        $(".brand").text(person.FriendlyNames[0] + "@家谱系统");

        // 显示左侧属性列表
        var cdp = new ConceptDetailPanel(curConcept);
        cdp.show($('#conceptDetail'));

        // 显示家族树:
//        $('#gen20 > ul').statementList(fss, {
            clearBefore: true,
            pageSize: 5,
            renderItem: members_statementList_renderItem
        });
    });

    

    $("#qrcode").empty().qrcode({ text: "http://nagu.cc/apps/jiapu/person.html?id=" + curConcept });
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